// ── Structured Logger ────────────────────────────────────────────────────────
// JSON-structured logging with request tracing and agent decision logging.

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  ts: string
  msg: string
  taskId?: string
  agent?: string
  traceId?: string
  [key: string]: unknown
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const MIN_LEVEL = (process.env['LOG_LEVEL'] ?? 'info') as LogLevel

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL]
}

function emit(entry: LogEntry): void {
  const line = JSON.stringify(entry)
  if (entry.level === 'error') {
    console.error(line)
  } else if (entry.level === 'warn') {
    console.warn(line)
  } else {
    console.log(line)
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function createLogger(defaults: { taskId?: string; agent?: string; traceId?: string } = {}) {
  function log(level: LogLevel, msg: string, extra: Record<string, unknown> = {}) {
    if (!shouldLog(level)) return
    emit({
      level,
      ts: new Date().toISOString(),
      msg,
      ...defaults,
      ...extra,
    })
  }

  return {
    debug: (msg: string, extra?: Record<string, unknown>) => log('debug', msg, extra),
    info: (msg: string, extra?: Record<string, unknown>) => log('info', msg, extra),
    warn: (msg: string, extra?: Record<string, unknown>) => log('warn', msg, extra),
    error: (msg: string, extra?: Record<string, unknown>) => log('error', msg, extra),

    /** Create a child logger with additional defaults */
    child: (childDefaults: Record<string, unknown>) =>
      createLogger({ ...defaults, ...childDefaults } as any),
  }
}

// Root logger
export const logger = createLogger()

// ── Request Tracing Middleware ────────────────────────────────────────────────

let traceCounter = 0

export function generateTraceId(): string {
  return `req-${Date.now()}-${++traceCounter}`
}

/** Hono middleware for request logging */
export function requestLogger() {
  return async (c: any, next: () => Promise<void>) => {
    const traceId = generateTraceId()
    c.set('traceId', traceId)

    const start = performance.now()
    const method = c.req.method
    const path = c.req.path

    logger.info(`→ ${method} ${path}`, { traceId, method, path })

    await next()

    const ms = (performance.now() - start).toFixed(1)
    const status = c.res.status
    logger.info(`← ${method} ${path} ${status} ${ms}ms`, {
      traceId, method, path, status, durationMs: parseFloat(ms),
    })
  }
}

// ── Agent Decision Logger ────────────────────────────────────────────────────

export function logAgentDecision(params: {
  taskId: string
  agent: 'analyst' | 'risk_gate' | 'executor'
  action: string
  decision?: string
  riskScore?: number
  reasons?: string[]
}) {
  logger.info(`[${params.agent}] ${params.action}`, {
    taskId: params.taskId,
    agent: params.agent,
    decision: params.decision,
    riskScore: params.riskScore,
    reasons: params.reasons,
  })
}
