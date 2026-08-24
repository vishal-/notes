import { Hono } from 'hono'
import { getDb, ensureTables } from './db/client'
import { authApp } from './server/auth'
import { apiApp } from './server/notes'
import type { AppEnv } from './server/types'

const app = new Hono<AppEnv>()

// DB initialization and automatic table creation middleware
app.use('*', async (c, next) => {
  const dbUrl = c.env.TURSO_DATABASE_URL || (process.env.TURSO_DATABASE_URL as string) || 'file:local.db'
  const authToken = c.env.TURSO_AUTH_TOKEN || (process.env.TURSO_AUTH_TOKEN as string)
  const { db, client } = getDb(dbUrl, authToken)
  c.set('db', db)

  try {
    await ensureTables(client)
  } catch (err) {
    console.error('Error ensuring database tables exist:', err)
  }

  await next()
})

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
