// ── Orchestrator HTTP Server ──────────────────────────────────────────────────
// TASK-018: Hono HTTP server with SSE, REST API, and kill switch.

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { TransactionVersion } from '@stacks/transactions'
import { StacksSwarm } from './index.js'
import type { SwarmEvent } from './index.js'
import { getDB } from './db/client.js'
import { strategies } from './db/schema.js'
import { eq } from 'drizzle-orm'

// ── Initialize wallet from mnemonic ──────────────────────────────────────────

async function initWallet() {
  const mnemonic = process.env['WALLET_MNEMONIC']
  if (!mnemonic) throw new Error('WALLET_MNEMONIC is required')

  const { generateWallet, getStxAddress } = await import('@stacks/wallet-sdk')
  const wallet = await generateWallet({ secretKey: mnemonic, password: '' })
  const account = wallet.accounts[0]
  if (!account) throw new Error('No account derived from mnemonic')
  const network = (process.env['STACKS_NETWORK'] ?? 'testnet') as 'mainnet' | 'testnet'
  const txVersion = network === 'mainnet'
    ? TransactionVersion.Mainnet
    : TransactionVersion.Testnet
  const address = getStxAddress({ account, transactionVersion: txVersion })
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

  if (!goal || typeof goal !== 'string' || !strategyId) {
    return c.json({ error: 'goal (string) and strategyId are required' }, 400)
  }
  if (goal.length > 500) {
    return c.json({ error: 'goal exceeds maximum length of 500 characters' }, 400)
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

  try {
    const task = await swarm.execute(goal, strategy)
    return c.json({ task }, 201)
  } catch (e: any) {
    return c.json({ error: e.message }, 400)
  }
})

app.post('/tasks/:id/approve', authMiddleware(), async (c) => {
  try {
    await swarm.humanApprove(c.req.param('id'))
    return c.json({ approved: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 400)
  }
})

app.post('/tasks/:id/reject', authMiddleware(), async (c) => {
  try {
    await swarm.humanReject(c.req.param('id'))
    return c.json({ rejected: true })
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
  if (!body.name || !body.template || !body.riskConfig) {
    return c.json({ error: 'name, template, and riskConfig are required' }, 400)
  }
  const [row] = await getDB().insert(strategies).values({
    name: String(body.name).slice(0, 100),
    template: String(body.template).slice(0, 50),
    mode: body.mode ?? 'simple',
    riskConfig: body.riskConfig,
    allocations: body.allocations ?? {},
    active: true,
  }).returning()
  return c.json({ strategy: row }, 201)
})

// ── Strategy Sharing (Green tier) ───────────────────────────────────────────

app.get('/strategies/:id/export', authMiddleware(), async (c) => {
  const [row] = await getDB().select().from(strategies).where(eq(strategies.id, c.req.param('id')))
  if (!row) return c.json({ error: 'Strategy not found' }, 404)
  const { exportStrategy, encodeStrategyURL } = await import('./sharing.js')
  const shared = exportStrategy(row)
  return c.json({ strategy: shared, shareCode: encodeStrategyURL(shared) })
})

app.post('/strategies/import', authMiddleware(), async (c) => {
  const body = await c.req.json()
  try {
    const { importStrategy } = await import('./sharing.js')
    let parsed
    if (body.shareCode) {
      const { decodeStrategyURL } = await import('./sharing.js')
      parsed = decodeStrategyURL(body.shareCode)
    } else {
      parsed = importStrategy(body)
    }
    const [row] = await getDB().insert(strategies).values({
      name: parsed.name,
      template: parsed.template,
      mode: parsed.mode,
      riskConfig: parsed.riskConfig,
      allocations: parsed.allocations,
      active: true,
    }).returning()
    return c.json({ strategy: row, imported: true }, 201)
  } catch (e: any) {
    return c.json({ error: e.message }, 400)
  }
})

// ── Recurring Tasks (Red tier) ─────────────────────────────────────────────

import { TaskScheduler } from './scheduler.js'
let scheduler: TaskScheduler

app.get('/recurring', authMiddleware(), (c) => {
  return c.json({ recurring: scheduler?.list() ?? [] })
})

app.post('/recurring', authMiddleware(), async (c) => {
  const body = await c.req.json()
  if (!body.goal || !body.strategyId || !body.interval) {
    return c.json({ error: 'goal, strategyId, and interval are required' }, 400)
  }
  try {
    const task = scheduler.schedule({
      id: crypto.randomUUID(),
      goal: body.goal,
      strategyId: body.strategyId,
      interval: body.interval,
    })
    return c.json({ recurring: task }, 201)
  } catch (e: any) {
    return c.json({ error: e.message }, 400)
  }
})

app.delete('/recurring/:id', authMiddleware(), (c) => {
  const ok = scheduler.cancel(c.req.param('id'))
  return c.json({ cancelled: ok })
})

// ── Chain Triggers (Red tier) ──────────────────────────────────────────────

import { ChainTriggerEngine } from './triggers.js'
let triggerEngine: ChainTriggerEngine

app.get('/triggers', authMiddleware(), (c) => {
  return c.json({ triggers: triggerEngine?.list() ?? [] })
})

app.post('/triggers', authMiddleware(), async (c) => {
  const body = await c.req.json()
  if (!body.name || !body.condition || !body.goal || !body.strategyId) {
    return c.json({ error: 'name, condition, goal, and strategyId are required' }, 400)
  }
  const trigger = triggerEngine.register({
    id: crypto.randomUUID(),
    name: body.name,
    condition: body.condition,
    goal: body.goal,
    strategyId: body.strategyId,
    enabled: true,
    cooldownMs: body.cooldownMs ?? 30 * 60 * 1000,
  })
  return c.json({ trigger }, 201)
})

app.delete('/triggers/:id', authMiddleware(), (c) => {
  const ok = triggerEngine.remove(c.req.param('id'))
  return c.json({ removed: ok })
})

// ── Clarity Analysis (Yellow tier) ─────────────────────────────────────────

app.get('/analyze/:contractId', authMiddleware(), async (c) => {
  try {
    const { analyzeContract } = await import('@nocodeclarity/tools/read/clarity')
    const network = (process.env['STACKS_NETWORK'] ?? 'testnet') as 'mainnet' | 'testnet'
    const result = await analyzeContract(c.req.param('contractId'), network)
    return c.json(result)
  } catch (e: any) {
    return c.json({ error: e.message }, 400)
  }
})

// ── Signer Health (Yellow tier) ────────────────────────────────────────────

app.get('/signers', async (c) => {
  try {
    const { getSignerHealth } = await import('@nocodeclarity/tools/read/signers')
    const network = (process.env['STACKS_NETWORK'] ?? 'testnet') as 'mainnet' | 'testnet'
    const health = await getSignerHealth(network)
    return c.json(health)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
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
    import('./aibtc.js').then(({ registerWithAIBTC, startHeartbeat }) => {
      registerWithAIBTC({
        walletAddress: address,
        btcAddress: '',
        operatorXHandle: process.env['AIBTC_OPERATOR_X_HANDLE'],
      })
      startHeartbeat(address)
    }).catch(err => console.warn('AIBTC module load failed (non-fatal):', err))
  }

  // Start recurring task scheduler
  scheduler = new TaskScheduler(async (goal, strategyId) => {
    const [strategyRow] = await db.select().from(strategies).where(eq(strategies.id, strategyId))
    if (!strategyRow) return
    const strategy = {
      id: strategyRow.id, name: strategyRow.name,
      template: strategyRow.template as any, mode: strategyRow.mode as any,
      riskConfig: strategyRow.riskConfig as any, allocations: strategyRow.allocations as any,
      active: strategyRow.active, createdAt: strategyRow.createdAt.getTime?.() ?? Date.now(),
    }
    await swarm.execute(goal, strategy)
  })
  scheduler.start()

  // Start chain trigger engine
  const { captureChainSnapshot } = await import('@nocodeclarity/tools/read')
  triggerEngine = new ChainTriggerEngine(
    () => captureChainSnapshot(address, '', network),
    async (goal, strategyId) => {
      const [strategyRow] = await db.select().from(strategies).where(eq(strategies.id, strategyId))
      if (!strategyRow) return
      const strategy = {
        id: strategyRow.id, name: strategyRow.name,
        template: strategyRow.template as any, mode: strategyRow.mode as any,
        riskConfig: strategyRow.riskConfig as any, allocations: strategyRow.allocations as any,
        active: strategyRow.active, createdAt: strategyRow.createdAt.getTime?.() ?? Date.now(),
      }
      await swarm.execute(goal, strategy)
    },
  )

  const port = parseInt(process.env['ORCHESTRATOR_PORT'] ?? '3001')
  const mode = process.env['SOLO_MODE'] === 'true' ? 'SOLO' : 'PRODUCTION'
  serve({ fetch: app.fetch, port })
  console.log(`✓ NoCodeClarity AI orchestrator running on :${port} [${mode}]`)
  console.log(`  Wallet: ${address}`)
  console.log(`  Network: ${network}`)
}

main().catch(err => {
  console.error('Orchestrator failed to start:', err)
  process.exit(1)
})
