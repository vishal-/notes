import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'
import { getDb, ensureTables } from './db/client'
import { authApp } from './server/auth'
import { apiApp } from './server/notes'
import type { AppEnv } from './server/types'

const app = new Hono<AppEnv>()

// D1 DB initialization and automatic table creation middleware
const dbMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.env.DB) {
    return c.json(
      {
        error:
          'D1 database binding "DB" is not configured. Please ensure a D1 database is bound to "DB" in wrangler.jsonc or your Cloudflare dashboard.'
      },
      500
    )
  }

  const db = getDb(c.env.DB)
  c.set('db', db)

  try {
    await ensureTables(c.env.DB)
  } catch (err) {
    console.error('Error ensuring database tables exist in D1:', err)
  }

  await next()
})

// Scope DB middleware only to Auth and API routes
app.use('/auth/*', dbMiddleware)
app.use('/api/*', dbMiddleware)

// Mount Auth & API routes
app.route('/auth', authApp)
app.route('/api', apiApp)

// Fallback HTML shell for React SPA
app.get('*', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Notes</title>
    <link rel="manifest" href="/site.webmanifest" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <meta name="theme-color" content="#0f172a" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Notes" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/client/main.tsx"></script>
  </body>
</html>`)
})

export default app
