// ── Orchestrator HTTP Server ──────────────────────────────────────────────────
// TASK-018: Hono HTTP server with SSE, REST API, and kill switch.

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { TransactionVersion } from '@stacks/transactions'
import { StacksSwarm } from './index.js'
import type { SwarmEvent } from './index.js'
import { getDB } from './db/client.js'
import { strategies } from './db/schema.js'
import { eq } from 'drizzle-orm'
import { logger, requestLogger } from './logger.js'
import { createChainhookHandler } from './chainhook.js'
import { TaskRecoveryManager } from './recovery.js'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'

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
  origin: [
    process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000',
    'http://localhost:5173',
  ],
  credentials: true,
}))

// Structured request logging
app.use('*', requestLogger())

// ── Rate limiter for /api/* routes ──────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 30

function rateLimiter() {
  return async (c: any, next: any) => {
    const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? 'unknown'
    const now = Date.now()

    let entry = rateLimitMap.get(ip)
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS }
      rateLimitMap.set(ip, entry)
    }

    entry.count++
    if (entry.count > RATE_LIMIT_MAX) {
      return c.json({ error: 'Rate limit exceeded. Try again in 60 seconds.' }, 429)
    }

    await next()
  }
}

// Apply rate limiter to /api/* routes
app.use('/api/*', rateLimiter())

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip)
  }
}, 5 * 60_000)


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
let recoveryManager: TaskRecoveryManager

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/health', (c) => c.json({ status: 'ok', ts: Date.now() }))

// ── Recovery endpoints ──────────────────────────────────────────────────────

app.get('/recovery/stats', (c) => {
  return c.json(recoveryManager.stats())
})

app.get('/recovery/dead-letter', (c) => {
  return c.json(recoveryManager.getDeadLetterQueue())
})

app.post('/recovery/retry/:id', authMiddleware(), async (c) => {
  const id = c.req.param('id')
  const ok = await recoveryManager.retryDeadLetter(id)
  return ok ? c.json({ retried: true }) : c.json({ error: 'Task not found in dead letter queue' }, 404)
})

app.post('/recovery/purge', authMiddleware(), async (c) => {
  const purged = recoveryManager.purgeDeadLetters()
  return c.json({ purged })
})

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
  // Sanitize goal
  const goal = String(body.goal).slice(0, 500).replace(/[\x00-\x1f\x7f-\x9f]/g, '')
  if (!goal.trim()) return c.json({ error: 'goal cannot be empty' }, 400)
  // Limit total recurring tasks (DoS prevention)
  if ((scheduler?.list() ?? []).length >= 20) {
    return c.json({ error: 'Maximum 20 recurring tasks allowed' }, 400)
  }
  try {
    const task = scheduler.schedule({
      id: crypto.randomUUID(),
      goal,
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
  // Validate condition type (whitelist)
  const validTypes = ['peg_health_below', 'peg_health_above', 'stx_balance_above', 'stx_balance_below', 'pox_cycle_ending_in', 'congestion_level']
  if (!body.condition.type || !validTypes.includes(body.condition.type)) {
    return c.json({ error: `Invalid condition type. Valid: ${validTypes.join(', ')}` }, 400)
  }
  // Sanitize goal
  const goal = String(body.goal).slice(0, 500).replace(/[\x00-\x1f\x7f-\x9f]/g, '')
  if (!goal.trim()) return c.json({ error: 'goal cannot be empty' }, 400)
  // Limit total triggers (DoS prevention)
  if ((triggerEngine?.list() ?? []).length >= 10) {
    return c.json({ error: 'Maximum 10 triggers allowed' }, 400)
  }
  const trigger = triggerEngine.register({
    id: crypto.randomUUID(),
    name: String(body.name).slice(0, 100),
    condition: body.condition,
    goal,
    strategyId: body.strategyId,
    enabled: true,
    cooldownMs: Math.max(60_000, body.cooldownMs ?? 30 * 60 * 1000),
  })
  return c.json({ trigger }, 201)
})

app.delete('/triggers/:id', authMiddleware(), (c) => {
  const ok = triggerEngine.remove(c.req.param('id'))
  return c.json({ removed: ok })
})

// ── Clarity Analysis (Yellow tier) ─────────────────────────────────────────

app.get('/analyze/:contractId', authMiddleware(), async (c) => {
  const contractId = c.req.param('contractId')
  // Validate contractId format: SPXXXX.contract-name or STXXXX.contract-name
  if (!/^(SP|ST)[A-Z0-9]{30,}\.[-a-zA-Z0-9]+$/.test(contractId)) {
    return c.json({ error: 'Invalid contract ID format. Expected: SP123.contract-name' }, 400)
  }
  try {
    const { analyzeContract } = await import('@nocodeclarity/tools/read/clarity')
    const network = (process.env['STACKS_NETWORK'] ?? 'testnet') as 'mainnet' | 'testnet'
    const result = await analyzeContract(contractId, network)
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

  // Initialize error recovery
  recoveryManager = new TaskRecoveryManager(async (goal, strategyId) => {
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
  await recoveryManager.recoverStaleTasks()

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

  // Chainhook webhook endpoint
  const chainhookSecret = process.env['ORCHESTRATOR_SECRET'] ?? ''
  app.post('/hooks/chainhook', createChainhookHandler(
    async (predicateUuid, payload) => {
      logger.info('Processing chainhook event', {
        predicateUuid,
        blocks: payload.apply?.length ?? 0,
      })
      // Evaluate triggers against chainhook events
      if (triggerEngine) {
        const { captureChainSnapshot } = await import('@nocodeclarity/tools/read')
        const snapshot = await captureChainSnapshot(address, '', network)
        await triggerEngine.evaluate(snapshot)
      }
    },
    chainhookSecret,
  ))

  // ── Frontend API endpoints (no auth — wallet-connected users) ────────────

  app.get('/api/snapshot/:address', async (c) => {
    const addr = c.req.param('address')
    if (!/^(SP|ST)[A-Z0-9]{30,}$/.test(addr)) {
      return c.json({ error: 'Invalid Stacks address' }, 400)
    }
    try {
      const { captureChainSnapshot } = await import('@nocodeclarity/tools/read')
      const snapshot = await captureChainSnapshot(addr, '', network)
      return c.json(snapshot)
    } catch (e: any) {
      return c.json({ error: e.message }, 500)
    }
  })

  app.get('/api/tasks', async (c) => {
    const taskList = await swarm.listTasks(50)
    return c.json({ tasks: taskList })
  })

  app.post('/api/propose', async (c) => {
    const body = await c.req.json()
    const { goal, strategyId } = body as { goal: string; strategyId: string }
    if (!goal || typeof goal !== 'string') {
      return c.json({ error: 'goal (string) is required' }, 400)
    }
    if (goal.length > 500) {
      return c.json({ error: 'goal exceeds 500 characters' }, 400)
    }
    // For frontend, use a default strategy if strategyId maps to a template name
    const defaultTemplates: Record<string, any> = {
      yield: { id: 'yield', name: 'Yield Optimizer', template: 'deposit_yield', mode: 'simple', riskConfig: { maxSlippage: 0.02, maxValue: 50_000_000 }, allocations: {}, active: true, createdAt: Date.now() },
      balanced: { id: 'balanced', name: 'Balanced Growth', template: 'swap', mode: 'simple', riskConfig: { maxSlippage: 0.03, maxValue: 100_000_000 }, allocations: {}, active: true, createdAt: Date.now() },
      conservative: { id: 'conservative', name: 'Capital Preservation', template: 'stack_pox', mode: 'simple', riskConfig: { maxSlippage: 0.01, maxValue: 200_000_000 }, allocations: {}, active: true, createdAt: Date.now() },
    }
    let strategy = defaultTemplates[strategyId]
    if (!strategy) {
      // Try DB lookup
      const [row] = await getDB().select().from(strategies).where(eq(strategies.id, strategyId))
      if (!row) return c.json({ error: 'Strategy not found' }, 404)
      strategy = {
        id: row.id, name: row.name, template: row.template as any,
        mode: row.mode as any, riskConfig: row.riskConfig as any,
        allocations: row.allocations as any, active: row.active,
        createdAt: row.createdAt.getTime(),
      }
    }
    try {
      const task = await swarm.execute(goal, strategy)
      return c.json({ task, taskId: task.id }, 201)
    } catch (e: any) {
      return c.json({ error: e.message }, 400)
    }
  })

  // Broadcast a client-signed transaction
  app.post('/api/broadcast', async (c) => {
    const body = await c.req.json()
    const { taskId, signedTxHex } = body as { taskId: string; signedTxHex: string }
    if (!taskId || !signedTxHex) {
      return c.json({ error: 'taskId and signedTxHex are required' }, 400)
    }

    try {
      const { broadcastTransaction, deserializeTransaction } = await import('@stacks/transactions')
      const { StacksMainnet, StacksTestnet } = await import('@stacks/network')
      const stacksNetwork = network === 'mainnet' ? new StacksMainnet() : new StacksTestnet()

      // Deserialize to verify it's a valid transaction
      const tx = deserializeTransaction(signedTxHex)

      // Broadcast
      const result = await broadcastTransaction(tx, stacksNetwork)
      const txid = typeof result === 'string' ? result : (result as any).txid ?? result.toString()

      // Update task with txid
      const task = await swarm.getTask(taskId)
      if (task) {
        await swarm.recordBroadcast(taskId, txid)
      }

      return c.json({ txid, taskId })
    } catch (e: any) {
      return c.json({ error: e.message }, 400)
    }
  })

  app.post('/api/approve/:id', async (c) => {
    try {
      await swarm.humanApprove(c.req.param('id'))
      return c.json({ approved: true })
    } catch (e: any) {
      return c.json({ error: e.message }, 400)
    }
  })

  app.post('/api/reject/:id', async (c) => {
    try {
      await swarm.humanReject(c.req.param('id'))
      return c.json({ rejected: true })
    } catch (e: any) {
      return c.json({ error: e.message }, 400)
    }
  })

  // ── Static file serving for frontend ────────────────────────────────────

  const frontendDist = resolve(import.meta.dirname ?? __dirname, '../../../frontend/dist')
  if (existsSync(frontendDist)) {
    // Serve static assets
    app.use('/assets/*', serveStatic({ root: frontendDist }))
    app.get('/favicon.ico', serveStatic({ root: frontendDist, path: '/favicon.ico' }))
    app.get('/logo.svg', serveStatic({ root: frontendDist, path: '/logo.svg' }))

    // SPA fallback — serve index.html for all non-API routes
    const indexHtml = readFileSync(join(frontendDist, 'index.html'), 'utf-8')
    app.get('*', (c) => {
      // Skip API and v1 routes
      const path = c.req.path
      if (path.startsWith('/api/') || path.startsWith('/v1/') || path.startsWith('/hooks/')) {
        return c.notFound()
      }
      return c.html(indexHtml)
    })
    console.log(`  Frontend: serving from ${frontendDist}`)
  }

  // ── API v1 group (all routes also available at /v1/ prefix) ──────────────
  const v1 = new Hono()
  v1.route('/', app)
  const root = new Hono()
  root.route('/v1', app)
  root.route('/', app) // backward compat

  const port = parseInt(process.env['ORCHESTRATOR_PORT'] ?? '3001')
  const mode = process.env['SOLO_MODE'] === 'true' ? 'SOLO' : 'PRODUCTION'
  serve({ fetch: root.fetch, port })
  logger.info('NoCodeClarity AI orchestrator started', {
    port, mode, wallet: address, network,
    apiVersion: 'v1',
    chainhookWebhook: `http://localhost:${port}/hooks/chainhook`,
    frontend: existsSync(frontendDist) ? 'serving' : 'not found',
  })
  console.log(`✓ NoCodeClarity AI orchestrator running on :${port} [${mode}]`)
  console.log(`  Wallet: ${address}`)
  console.log(`  Network: ${network}`)
  console.log(`  API: http://localhost:${port}/v1/health`)
  console.log(`  Chainhook: POST http://localhost:${port}/hooks/chainhook`)
}

main().catch(err => {
  logger.error('Orchestrator failed to start', { error: err.message })
  console.error('Orchestrator failed to start:', err)
  process.exit(1)
})
