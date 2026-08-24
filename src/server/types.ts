import type { D1Database } from '@cloudflare/workers-types'
import type { User } from '../db/schema'
import type { Db } from '../db/client'

export type Bindings = {
  DB: D1Database
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
  SESSION_SECRET?: string
}

export type Variables = {
  db: Db
  user?: User
}

export type AppEnv = {
  Bindings: Bindings
  Variables: Variables
}
