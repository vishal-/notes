import { createClient, type Client } from '@libsql/client/web'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

let initialized = false

export async function ensureTables(client: Client) {
  if (initialized) return

  await client.batch([
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      github_id TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL,
      name TEXT,
      avatar_url TEXT,
      created_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );`
  ], 'write')

  initialized = true
}

export function getDb(url: string, authToken?: string) {
  const client = createClient({
    url,
    authToken
  })
  const db = drizzle(client, { schema })
  return { db, client }
}

export type Db = ReturnType<typeof drizzle<typeof schema>>
