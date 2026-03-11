// ── Database Client ──────────────────────────────────────────────────────────
// TASK-015: Singleton Drizzle client backed by postgres.js

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

let _db: ReturnType<typeof drizzle> | null = null

export function getDB() {
  if (_db) return _db
  const url = process.env['DATABASE_URL']
  if (!url) throw new Error('DATABASE_URL environment variable is required')
  const client = postgres(url)
  _db = drizzle(client, { schema })
  return _db
}
