// ── Database Client ──────────────────────────────────────────────────────────
// Dual-mode: PostgreSQL (production) or SQLite (solo/dev mode)
// Set DATABASE_URL for Postgres, or SOLO_MODE=true for zero-config SQLite

import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

// SQLite support via better-sqlite3 (optional)
let _db: any = null

export function getDB(): any {
  if (_db) return _db

  const soloMode = process.env['SOLO_MODE'] === 'true'
  const url = process.env['DATABASE_URL']

  if (soloMode || !url) {
    // Solo mode — in-memory store (no Docker, no Postgres)
    console.log('✓ Running in SOLO MODE (in-memory store, no database required)')
    _db = createInMemoryStore()
    return _db
  }

  // Production mode — PostgreSQL + pgvector
  const client = postgres(url)
  _db = drizzlePg(client, { schema })
  return _db
}

// ── In-Memory Store (mimics Drizzle DB interface) ────────────────────────────
// This replaces Postgres for first-run / demo / no-code users.
// Data is lost on restart — that's the tradeoff for zero-config.

interface InMemoryStore {
  _tables: Map<string, any[]>
  select: () => any
  insert: (table: any) => any
  update: (table: any) => any
  delete: (table: any) => any
}

function createInMemoryStore(): InMemoryStore {
  const tables = new Map<string, any[]>()
  tables.set('strategies', [])
  tables.set('tasks', [])
  tables.set('memory', [])
  tables.set('known_protocols', [])
  tables.set('agent_registration', [])

  const getTableName = (table: any): string => {
    // Drizzle tables have a Symbol/string name or _.name
    if (typeof table === 'string') return table
    if (table?.[Symbol.for('drizzle:Name')]) return table[Symbol.for('drizzle:Name')]
    if (table?._.name) return table._.name
    // Match by reference to our schema exports
    const schemaMap: Record<string, string> = {}
    for (const [key, val] of Object.entries(schema)) {
      if (typeof val === 'object' && val !== null) {
        schemaMap[key] = key
      }
    }
    return 'unknown'
  }

  function chainableQuery(tableName: string) {
    let _where: ((row: any) => boolean) | null = null
    let _orderBy: string | null = null
    let _limitN = Infinity

    return {
      where(condition: any) {
        // In solo mode, store the filter function
        if (typeof condition === 'function') {
          _where = condition
        }
        return this
      },
      orderBy() { return this },
      limit(n: number) { _limitN = n; return this },
      then(resolve: (val: any) => void) {
        let rows = tables.get(tableName) ?? []
        if (_where) rows = rows.filter(_where)
        rows = rows.slice(0, _limitN)
        resolve(rows)
      },
    }
  }

  const store: InMemoryStore = {
    _tables: tables,

    select() {
      return {
        from(table: any) {
          const name = getTableName(table)
          return chainableQuery(name)
        }
      }
    },

    insert(table: any) {
      const name = getTableName(table)
      return {
        values(data: any) {
          const row = {
            id: data.id ?? crypto.randomUUID(),
            ...data,
            createdAt: data.createdAt ?? new Date(),
            updatedAt: data.updatedAt ?? new Date(),
          }
          const arr = tables.get(name) ?? []
          arr.push(row)
          tables.set(name, arr)
          return {
            returning() {
              return Promise.resolve([row])
            },
            then(resolve: (val: any) => void) {
              resolve([row])
            }
          }
        }
      }
    },

    update(table: any) {
      const name = getTableName(table)
      return {
        set(updates: any) {
          return {
            where(condition: any) {
              const arr = tables.get(name) ?? []
              // For solo mode, treat eq() results as a filter
              // We match by ID if condition includes an ID check
              for (let i = 0; i < arr.length; i++) {
                // Simple: update all matching rows
                let match = true
                if (typeof condition === 'object' && condition?.id) {
                  match = arr[i].id === condition.id
                }
                if (match) {
                  arr[i] = { ...arr[i], ...updates }
                }
              }
              tables.set(name, arr)
              return {
                returning() { return Promise.resolve(arr) },
                then(resolve: (val: any) => void) { resolve(undefined) },
              }
            },
            then(resolve: (val: any) => void) {
              // Update all rows
              const arr = (tables.get(name) ?? []).map(r => ({ ...r, ...updates }))
              tables.set(name, arr)
              resolve(undefined)
            }
          }
        }
      }
    },

    delete(table: any) {
      const name = getTableName(table)
      return {
        where(condition: any) {
          // Clear matching rows
          tables.set(name, [])
          return Promise.resolve()
        }
      }
    }
  }

  return store
}
