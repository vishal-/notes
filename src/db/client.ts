import { drizzle } from 'drizzle-orm/d1'
import type { D1Database } from '@cloudflare/workers-types'
import * as schema from './schema'

let initialized = false

export async function ensureTables(d1: D1Database) {
  if (initialized) return

  await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      github_id TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL,
      name TEXT,
      avatar_url TEXT,
      created_at INTEGER NOT NULL
    );`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );`)
  ])

  initialized = true
}

export function getDb(d1: D1Database) {
  return drizzle(d1, { schema })
}

export type Db = ReturnType<typeof getDb>
