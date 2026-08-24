import { Hono } from 'hono'
import { getDb } from './db/client'
import { authApp } from './server/auth'
import { apiApp } from './server/notes'
import type { AppEnv } from './server/types'

const app = new Hono<AppEnv>()

// DB initialization middleware
app.use('*', async (c, next) => {
  const dbUrl = c.env.TURSO_DATABASE_URL || (process.env.TURSO_DATABASE_URL as string) || 'file:local.db'
  const authToken = c.env.TURSO_AUTH_TOKEN || (process.env.TURSO_AUTH_TOKEN as string)
  const db = getDb(dbUrl, authToken)
  c.set('db', db)
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Notes</title>
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
