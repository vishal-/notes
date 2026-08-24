import type { User } from '../db/schema'
import type { Db } from '../db/client'

export type Bindings = {
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
  TURSO_DATABASE_URL?: string
  TURSO_AUTH_TOKEN?: string
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
