// ── Drizzle Schema ───────────────────────────────────────────────────────────
// TASK-014: Database tables for strategies, tasks, memory, known protocols,
// and agent registration.

import {
  pgTable, text, jsonb, boolean, integer,
  timestamp, vector, uuid, index
} from 'drizzle-orm/pg-core'

export const strategies = pgTable('strategies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  template: text('template').notNull(), // conservative_yield | moderate_yield | aggressive_yield | pox_stacking
  mode: text('mode').notNull().default('simple'), // simple | advanced
  riskConfig: jsonb('risk_config').notNull(),
  allocations: jsonb('allocations').notNull().default('{}'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  goal: text('goal').notNull(),
  strategyId: uuid('strategy_id').references(() => strategies.id),
  status: text('status').notNull().default('pending'),
  riskConfig: jsonb('risk_config').notNull(),
  snapshot: jsonb('snapshot'),
  unsignedTx: jsonb('unsigned_tx'),
  gateResult: jsonb('gate_result'),
  txid: text('txid'),
  holdCount: integer('hold_count').notNull().default(0),
  steps: jsonb('steps').notNull().default('[]'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const memory = pgTable('memory', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => tasks.id),
  protocol: text('protocol').notNull(),
  outcome: text('outcome').notNull(), // success | failed | rejected
  summary: text('summary').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  embeddingIdx: index('memory_embedding_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
}))

export const knownProtocols = pgTable('known_protocols', {
  id: uuid('id').primaryKey().defaultRandom(),
  address: text('address').notNull(),
  strategyId: uuid('strategy_id').references(() => strategies.id),
  firstSeenAt: timestamp('first_seen_at').notNull().defaultNow(),
})

export const agentRegistration = pgTable('agent_registration', {
  id: uuid('id').primaryKey().defaultRandom(),
  networkAddress: text('network_address'),
  registeredAt: timestamp('registered_at'),
  lastHeartbeat: timestamp('last_heartbeat'),
  status: text('status').notNull().default('unregistered'),
})
