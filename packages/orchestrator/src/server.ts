// ── Orchestrator HTTP Server ──────────────────────────────────────────────────
// TASK-018: Hono HTTP server with SSE, REST API, and kill switch.

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { StacksSwarm } from './index.js'
import type { SwarmEvent } from './index.js'
import { getDB } from './db/client.js'
import { strategies } from './db/schema.js'
import { eq } from 'drizzle-orm'
import { registerWithAIBTC, startHeartbeat } from './aibtc.js'

// ── Initialize wallet from mnemonic ──────────────────────────────────────────

async function initWallet() {
  const mnemonic = process.env['WALLET_MNEMONIC']
  if (!mnemonic) throw new Error('WALLET_MNEMONIC is required')

  // Dynamic import to handle ESM/CJS differences
  const { generateWallet, getStxAddress } = await import('@stacks/wallet-sdk')
  const wallet = await generateWallet({ secretKey: mnemonic, password: '' })
  const account = wallet.accounts[0]
  if (!account) throw new Error('No account derived from mnemonic')
  const network = (process.env['STACKS_NETWORK'] ?? 'testnet') as 'mainnet' | 'testnet'
  const address = getStxAddress({ account, transactionVersion: network === 'mainnet' ? 22 : 26 })
  return { address, privateKey: account.stxPrivateKey, network }
}

// ── SSE client registry ───────────────────────────────────────────────────────

const sseClients = new Set<(event: SwarmEvent) => void>()

function broadcastEvent(event: SwarmEvent) {
  sseClients.forEach(send => send(event))
}

// ── App setup ─────────────────────────────────────────────────────────────────

const app = new Hono()

app.use('*', cors({
  origin: process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000',
  credentials: true,
}))

// Auth middleware for mutating routes
function authMiddleware() {
  return async (c: any, next: any) => {
    const secret = c.req.header('x-orchestrator-secret')
    if (secret !== process.env['ORCHESTRATOR_SECRET']) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    await next()
  }
}

// ── Swarm instance (initialized at startup) ───────────────────────────────────

let swarm: StacksSwarm

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/health', (c) => c.json({ status: 'ok', ts: Date.now() }))

// Kill switch — no auth, must be instant
app.post('/pause', async (c) => {
  await swarm.pause()
  return c.json({ paused: true, ts: Date.now() })
})

// SSE stream
app.get('/stream', (c) => {
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  const send = (event: SwarmEvent) => {
    writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      .catch(() => sseClients.delete(send))
  }

  sseClients.add(send)

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    writer.write(encoder.encode(': heartbeat\n\n')).catch(() => {
      clearInterval(heartbeat)
      sseClients.delete(send)
    })
  }, 30_000)

  c.req.raw.signal.addEventListener('abort', () => {
    clearInterval(heartbeat)
    sseClients.delete(send)
    writer.close().catch(() => {})
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
})

// Tasks
app.get('/tasks', authMiddleware(), async (c) => {
  const taskList = await swarm.listTasks(50)
  return c.json({ tasks: taskList })
})

app.get('/tasks/:id', authMiddleware(), async (c) => {
  const task = await swarm.getTask(c.req.param('id'))
  if (!task) return c.json({ error: 'Not found' }, 404)
  return c.json({ task })
})

app.post('/tasks', authMiddleware(), async (c) => {
  const body = await c.req.json()
  const { goal, strategyId } = body as { goal: string; strategyId: string }

  if (!goal || !strategyId) {
    return c.json({ error: 'goal and strategyId are required' }, 400)
  }

  const db = getDB()
  const [strategyRow] = await db.select().from(strategies).where(eq(strategies.id, strategyId))
  if (!strategyRow) return c.json({ error: 'Strategy not found' }, 404)

  const strategy = {
    id: strategyRow.id,
    name: strategyRow.name,
    template: strategyRow.template as any,
    mode: strategyRow.mode as any,
    riskConfig: strategyRow.riskConfig as any,
    allocations: strategyRow.allocations as any,
    active: strategyRow.active,
    createdAt: strategyRow.createdAt.getTime(),
  }

  const task = await swarm.execute(goal, strategy)
  return c.json({ task }, 201)
})

app.post('/tasks/:id/approve', authMiddleware(), async (c) => {
  try {
    await swarm.humanApprove(c.req.param('id'))
    return c.json({ approved: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 400)
  }
})

// Strategies
app.get('/strategies', authMiddleware(), async (c) => {
  const rows = await getDB().select().from(strategies)
  return c.json({ strategies: rows })
})

app.post('/strategies', authMiddleware(), async (c) => {
  const body = await c.req.json()
  const [row] = await getDB().insert(strategies).values({
    name: body.name,
    template: body.template,
    mode: body.mode ?? 'simple',
    riskConfig: body.riskConfig,
    allocations: body.allocations ?? {},
    active: true,
  }).returning()
  return c.json({ strategy: row }, 201)
})

// ── Startup ───────────────────────────────────────────────────────────────────

async function main() {
  const { address, privateKey, network } = await initWallet()
  const db = getDB()

  swarm = new StacksSwarm({
    walletAddress: address,
    btcAddress: '', // NOTE: BTC address derivation from wallet not yet implemented
    privateKey,
    network,
    db,
  })

  // Forward all swarm events to SSE clients
  swarm.on('task:created', broadcastEvent)
  swarm.on('task:step', broadcastEvent)
  swarm.on('task:needs_human', broadcastEvent)
  swarm.on('task:executing', broadcastEvent)
  swarm.on('task:complete', broadcastEvent)
  swarm.on('task:rejected', broadcastEvent)
  swarm.on('task:failed', broadcastEvent)

  // Register with AIBTC network (non-blocking, non-fatal)
  if (process.env['AIBTC_REGISTER'] === 'true') {
    registerWithAIBTC({
      walletAddress: address,
      btcAddress: '',
      operatorXHandle: process.env['AIBTC_OPERATOR_X_HANDLE'],
    })
    startHeartbeat(address)
  }

  const port = parseInt(process.env['ORCHESTRATOR_PORT'] ?? '3001')
  serve({ fetch: app.fetch, port })
  console.log(`✓ NoCodeClarity AI orchestrator running on :${port}`)
  console.log(`  Wallet: ${address}`)
  console.log(`  Network: ${network}`)
}

main().catch(err => {
  console.error('Orchestrator failed to start:', err)
  process.exit(1)
})
