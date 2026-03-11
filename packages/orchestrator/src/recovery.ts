// ── Error Recovery ───────────────────────────────────────────────────────────
// Restart resilience for the orchestrator.
// Recovers stuck tasks, retries failed tasks, and manages a dead letter queue.

import { logger } from './logger.js'

// ── Types ────────────────────────────────────────────────────────────────────

export interface TaskRecord {
  id: string
  goal: string
  strategyId: string
  status: 'pending' | 'analyzing' | 'gating' | 'executing' | 'complete' | 'rejected' | 'failed' | 'dead'
  retryCount: number
  maxRetries: number
  lastError?: string
  createdAt: number
  updatedAt: number
  completedAt?: number
}

export interface RecoveryConfig {
  maxRetries: number           // default: 3
  retryDelayMs: number         // default: 30_000 (30 seconds)
  retryBackoffMultiplier: number  // default: 2 (exponential backoff)
  staleTaskTimeoutMs: number   // default: 300_000 (5 minutes)
  deadLetterMaxAge: number     // default: 7 * 24 * 60 * 60 * 1000 (7 days)
}

const DEFAULT_CONFIG: RecoveryConfig = {
  maxRetries: 3,
  retryDelayMs: 30_000,
  retryBackoffMultiplier: 2,
  staleTaskTimeoutMs: 300_000,
  deadLetterMaxAge: 7 * 24 * 60 * 60 * 1000,
}

// ── Recovery Manager ─────────────────────────────────────────────────────────

export class TaskRecoveryManager {
  private tasks = new Map<string, TaskRecord>()
  private deadLetterQueue: TaskRecord[] = []
  private config: RecoveryConfig
  private executeFn: (goal: string, strategyId: string) => Promise<void>

  constructor(
    executeFn: (goal: string, strategyId: string) => Promise<void>,
    config: Partial<RecoveryConfig> = {},
  ) {
    this.executeFn = executeFn
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // ── Task Lifecycle ───────────────────────────────────────────────────────

  /** Register a new task for tracking */
  track(id: string, goal: string, strategyId: string): TaskRecord {
    const record: TaskRecord = {
      id,
      goal,
      strategyId,
      status: 'pending',
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    this.tasks.set(id, record)
    return record
  }

  /** Update task status */
  updateStatus(id: string, status: TaskRecord['status'], error?: string): void {
    const task = this.tasks.get(id)
    if (!task) return

    task.status = status
    task.updatedAt = Date.now()
    if (error) task.lastError = error
    if (status === 'complete' || status === 'rejected') {
      task.completedAt = Date.now()
    }

    logger.info(`Task ${id} → ${status}`, { taskId: id, status, error })
  }

  /** Mark a task as failed and decide: retry or dead letter */
  async handleFailure(id: string, error: string): Promise<'retrying' | 'dead'> {
    const task = this.tasks.get(id)
    if (!task) return 'dead'

    task.lastError = error
    task.retryCount++
    task.updatedAt = Date.now()

    if (task.retryCount >= task.maxRetries) {
      // Move to dead letter queue
      task.status = 'dead'
      this.deadLetterQueue.push(task)
      this.tasks.delete(id)
      logger.warn(`Task ${id} moved to dead letter queue after ${task.retryCount} retries`, {
        taskId: id, retries: task.retryCount, lastError: error,
      })
      return 'dead'
    }

    // Schedule retry with exponential backoff
    const delay = this.config.retryDelayMs * Math.pow(this.config.retryBackoffMultiplier, task.retryCount - 1)
    task.status = 'pending'

    logger.info(`Retrying task ${id} in ${delay}ms (attempt ${task.retryCount}/${task.maxRetries})`, {
      taskId: id, retryCount: task.retryCount, delayMs: delay,
    })

    setTimeout(async () => {
      try {
        await this.executeFn(task.goal, task.strategyId)
      } catch (err: any) {
        await this.handleFailure(id, err.message)
      }
    }, delay)

    return 'retrying'
  }

  // ── Recovery on Restart ──────────────────────────────────────────────────

  /** Recover tasks that were in-progress when the orchestrator crashed */
  async recoverStaleTasks(): Promise<number> {
    const now = Date.now()
    let recovered = 0

    for (const task of this.tasks.values()) {
      const isStale = ['analyzing', 'gating', 'executing'].includes(task.status)
        && (now - task.updatedAt) > this.config.staleTaskTimeoutMs

      if (isStale) {
        logger.warn(`Recovering stale task ${task.id} (was ${task.status} for ${Math.round((now - task.updatedAt) / 1000)}s)`, {
          taskId: task.id, previousStatus: task.status,
        })

        task.status = 'pending'
        task.updatedAt = now
        recovered++

        // Re-execute
        try {
          await this.executeFn(task.goal, task.strategyId)
        } catch (err: any) {
          await this.handleFailure(task.id, err.message)
        }
      }
    }

    if (recovered > 0) {
      logger.info(`Recovered ${recovered} stale tasks on restart`)
    }

    return recovered
  }

  // ── Dead Letter Queue ────────────────────────────────────────────────────

  /** Get all tasks in the dead letter queue */
  getDeadLetterQueue(): TaskRecord[] {
    return [...this.deadLetterQueue]
  }

  /** Retry a specific dead letter task (manual recovery) */
  async retryDeadLetter(id: string): Promise<boolean> {
    const idx = this.deadLetterQueue.findIndex(t => t.id === id)
    if (idx === -1) return false

    const task = this.deadLetterQueue.splice(idx, 1)[0]!
    task.status = 'pending'
    task.retryCount = 0
    task.updatedAt = Date.now()
    this.tasks.set(task.id, task)

    logger.info(`Dead letter task ${id} requeued for retry`, { taskId: id })

    try {
      await this.executeFn(task.goal, task.strategyId)
    } catch (err: any) {
      await this.handleFailure(task.id, err.message)
    }

    return true
  }

  /** Purge old dead letter entries */
  purgeDeadLetters(): number {
    const now = Date.now()
    const before = this.deadLetterQueue.length
    this.deadLetterQueue = this.deadLetterQueue.filter(
      t => (now - (t.completedAt ?? t.updatedAt)) < this.config.deadLetterMaxAge
    )
    const purged = before - this.deadLetterQueue.length
    if (purged > 0) {
      logger.info(`Purged ${purged} dead letter entries older than ${this.config.deadLetterMaxAge / 86400000}d`)
    }
    return purged
  }

  // ── Queries ──────────────────────────────────────────────────────────────

  /** Get all tracked tasks */
  list(): TaskRecord[] {
    return Array.from(this.tasks.values())
  }

  /** Get a specific task */
  get(id: string): TaskRecord | undefined {
    return this.tasks.get(id)
  }

  /** Get stats */
  stats(): {
    total: number
    byStatus: Record<string, number>
    deadLetterCount: number
    oldestStaleMs: number | null
  } {
    const byStatus: Record<string, number> = {}
    let oldestStale: number | null = null
    const now = Date.now()

    for (const task of this.tasks.values()) {
      byStatus[task.status] = (byStatus[task.status] ?? 0) + 1
      if (['analyzing', 'gating', 'executing'].includes(task.status)) {
        const age = now - task.updatedAt
        if (oldestStale === null || age > oldestStale) {
          oldestStale = age
        }
      }
    }

    return {
      total: this.tasks.size,
      byStatus,
      deadLetterCount: this.deadLetterQueue.length,
      oldestStaleMs: oldestStale,
    }
  }
}
