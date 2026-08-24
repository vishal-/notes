import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import { eq, and, gt } from 'drizzle-orm'
import { users, sessions } from '../db/schema'
import type { AppEnv } from './types'

export const authApp = new Hono<AppEnv>()

// Helper to determine secure cookie flag
function isSecure(c: { req: { url: string } }): boolean {
  return c.req.url.startsWith('https://')
}

// 1. Redirect to GitHub OAuth
authApp.get('/github', async (c) => {
  const clientId = c.env.GITHUB_CLIENT_ID || (process.env.GITHUB_CLIENT_ID as string)
  if (!clientId) {
    return c.text('GITHUB_CLIENT_ID is not configured', 500)
  }

  const state = crypto.randomUUID()
  const url = new URL(c.req.url)
  const redirectUri = `${url.origin}/auth/github/callback`

  setCookie(c, 'oauth_state', state, {
    path: '/',
    httpOnly: true,
    secure: isSecure(c),
    sameSite: 'Lax',
    maxAge: 600 // 10 minutes
  })

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize')
  githubAuthUrl.searchParams.set('client_id', clientId)
  githubAuthUrl.searchParams.set('redirect_uri', redirectUri)
  githubAuthUrl.searchParams.set('scope', 'read:user user:email')
  githubAuthUrl.searchParams.set('state', state)

  return c.redirect(githubAuthUrl.toString())
})

// 2. OAuth Callback
authApp.get('/github/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const savedState = getCookie(c, 'oauth_state')

  deleteCookie(c, 'oauth_state', { path: '/' })

  if (!code || !state || !savedState || state !== savedState) {
    return c.text('Invalid OAuth state or missing code', 400)
  }

  const clientId = c.env.GITHUB_CLIENT_ID || (process.env.GITHUB_CLIENT_ID as string)
  const clientSecret = c.env.GITHUB_CLIENT_SECRET || (process.env.GITHUB_CLIENT_SECRET as string)

  if (!clientId || !clientSecret) {
    return c.text('GitHub OAuth credentials not configured', 500)
  }

  const url = new URL(c.req.url)
  const redirectUri = `${url.origin}/auth/github/callback`

  // Exchange code for access token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri
    })
  })

  if (!tokenResponse.ok) {
    return c.text('Failed to exchange code with GitHub', 500)
  }

  const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string }
  if (!tokenData.access_token) {
    return c.text(`GitHub OAuth error: ${tokenData.error || 'No access token received'}`, 400)
  }

  // Fetch GitHub user profile
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'User-Agent': 'Notes-App'
    }
  })

  if (!userResponse.ok) {
    return c.text('Failed to fetch GitHub user profile', 500)
  }

  const githubUser = (await userResponse.json()) as {
    id: number
    login: string
    name?: string | null
    avatar_url?: string | null
  }

  const db = c.get('db')
  const githubIdStr = String(githubUser.id)

  // Find existing user or create a new one
  const existingUsers = await db.select().from(users).where(eq(users.githubId, githubIdStr)).limit(1)
  let userId: string

  const now = Date.now()

  if (existingUsers.length > 0) {
    userId = existingUsers[0].id
    await db
      .update(users)
      .set({
        username: githubUser.login,
        name: githubUser.name || githubUser.login,
        avatarUrl: githubUser.avatar_url || null
      })
      .where(eq(users.id, userId))
  } else {
    userId = crypto.randomUUID()
    await db.insert(users).values({
      id: userId,
      githubId: githubIdStr,
      username: githubUser.login,
      name: githubUser.name || githubUser.login,
      avatarUrl: githubUser.avatar_url || null,
      createdAt: now
    })
  }

  // Create session
  const sessionId = crypto.randomUUID()
  const expiresAt = now + 30 * 24 * 60 * 60 * 1000 // 30 days

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
    createdAt: now
  })

  // Set session cookie
  setCookie(c, 'session_id', sessionId, {
    path: '/',
    httpOnly: true,
    secure: isSecure(c),
    sameSite: 'Lax',
    maxAge: 30 * 24 * 60 * 60
  })

  return c.redirect('/')
})

// 3. Logout
authApp.post('/logout', async (c) => {
  const sessionId = getCookie(c, 'session_id')
  if (sessionId) {
    const db = c.get('db')
    await db.delete(sessions).where(eq(sessions.id, sessionId))
    deleteCookie(c, 'session_id', { path: '/' })
  }
  return c.json({ success: true })
})

authApp.get('/logout', async (c) => {
  const sessionId = getCookie(c, 'session_id')
  if (sessionId) {
    const db = c.get('db')
    await db.delete(sessions).where(eq(sessions.id, sessionId))
    deleteCookie(c, 'session_id', { path: '/' })
  }
  return c.redirect('/')
})

// Auth check middleware
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const sessionId = getCookie(c, 'session_id')
  if (!sessionId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = c.get('db')
  const now = Date.now()

  const validSessions = await db
    .select({
      session: sessions,
      user: users
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)))
    .limit(1)

  if (validSessions.length === 0) {
    deleteCookie(c, 'session_id', { path: '/' })
    return c.json({ error: 'Unauthorized' }, 401)
  }

  c.set('user', validSessions[0].user)
  await next()
})

// Optional auth middleware (doesn't reject if unauthenticated)
export const optionalAuth = createMiddleware<AppEnv>(async (c, next) => {
  const sessionId = getCookie(c, 'session_id')
  if (sessionId) {
    const db = c.get('db')
    const now = Date.now()
    const validSessions = await db
      .select({
        session: sessions,
        user: users
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)))
      .limit(1)

    if (validSessions.length > 0) {
      c.set('user', validSessions[0].user)
    }
  }
  await next()
})
