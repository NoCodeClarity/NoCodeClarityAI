// ── Recurring Task Scheduler ──────────────────────────────────────────────────
// Cron-like scheduling for periodic DeFi operations.
// Examples: "compound yield every Friday", "rebalance weekly"

import type { Strategy } from '@nocodeclarity/tools'

export interface RecurringTask {
  id: string
  goal: string
  strategyId: string
  cronExpression: string   // simple: "every:1h", "every:24h", "every:7d"
  enabled: boolean
  lastRunAt: number | null
  nextRunAt: number
  createdAt: number
}

const CRON_INTERVALS: Record<string, number> = {
  '15m':  15 * 60 * 1000,
  '1h':   60 * 60 * 1000,
  '6h':   6 * 60 * 60 * 1000,
  '12h':  12 * 60 * 60 * 1000,
  '24h':  24 * 60 * 60 * 1000,
  '7d':   7 * 24 * 60 * 60 * 1000,
  '14d':  14 * 24 * 60 * 60 * 1000,
  '30d':  30 * 24 * 60 * 60 * 1000,
}

export class TaskScheduler {
  private tasks = new Map<string, RecurringTask>()
  private timer: ReturnType<typeof setInterval> | null = null
  private executeCallback: (goal: string, strategyId: string) => Promise<void>

  constructor(executeCallback: (goal: string, strategyId: string) => Promise<void>) {
    this.executeCallback = executeCallback
  }

  schedule(params: {
    id: string
    goal: string
    strategyId: string
    interval: string  // "15m", "1h", "6h", "12h", "24h", "7d", "14d", "30d"
  }): RecurringTask {
    const intervalMs = CRON_INTERVALS[params.interval]
    if (!intervalMs) {
      throw new Error(
        `Invalid interval "${params.interval}". ` +
        `Valid: ${Object.keys(CRON_INTERVALS).join(', ')}`
      )
    }

    const task: RecurringTask = {
      id: params.id,
      goal: params.goal,
      strategyId: params.strategyId,
      cronExpression: `every:${params.interval}`,
      enabled: true,
      lastRunAt: null,
      nextRunAt: Date.now() + intervalMs,
      createdAt: Date.now(),
    }

    this.tasks.set(params.id, task)
    return task
  }

  cancel(id: string): boolean {
    return this.tasks.delete(id)
  }

  pause(id: string): boolean {
    const task = this.tasks.get(id)
    if (!task) return false
    task.enabled = false
    return true
  }

  resume(id: string): boolean {
    const task = this.tasks.get(id)
    if (!task) return false
    task.enabled = true
    return true
  }

  list(): RecurringTask[] {
    return Array.from(this.tasks.values())
  }

  // Start the tick loop — checks every 60 seconds for due tasks
  start(): void {
    if (this.timer) return
    console.log('✓ Task scheduler started')

    this.timer = setInterval(async () => {
      const now = Date.now()

      for (const task of this.tasks.values()) {
        if (!task.enabled) continue
        if (now < task.nextRunAt) continue

        // Time to run
        const interval = this.parseInterval(task.cronExpression)

        try {
          console.log(`⏰ Recurring task: "${task.goal}" (${task.id})`)
          await this.executeCallback(task.goal, task.strategyId)
          task.lastRunAt = now
          task.nextRunAt = now + interval
        } catch (err: any) {
          console.error(`Recurring task failed (${task.id}):`, err.message)
          task.nextRunAt = now + interval // still reschedule
        }
      }
    }, 60_000) // check every minute
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private parseInterval(cron: string): number {
    const interval = cron.replace('every:', '')
    return CRON_INTERVALS[interval] ?? 24 * 60 * 60 * 1000
  }
}
