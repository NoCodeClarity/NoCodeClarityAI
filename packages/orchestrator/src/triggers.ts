// ── Chainhook Event Triggers ──────────────────────────────────────────────────
// React to on-chain events via Hiro Chainhook predicates.
// Example: "when sBTC peg drops below 85, hedge my position"

import type { ChainSnapshot } from '@nocodeclarity/tools'

export interface ChainTrigger {
  id: string
  name: string
  condition: TriggerCondition
  goal: string          // goal to execute when condition fires
  strategyId: string
  enabled: boolean
  lastCheckedAt: number
  lastFiredAt: number | null
  firedCount: number
  cooldownMs: number    // min time between firings (default: 30 min)
}

export type TriggerCondition =
  | { type: 'peg_health_below'; threshold: number }
  | { type: 'peg_health_above'; threshold: number }
  | { type: 'stx_balance_above'; microSTX: number }
  | { type: 'stx_balance_below'; microSTX: number }
  | { type: 'pox_cycle_ending_in'; blocks: number }
  | { type: 'congestion_level'; level: 'low' | 'medium' | 'high' }
  | { type: 'custom'; evaluate: string }  // Claude-interpreted condition

export class ChainTriggerEngine {
  private triggers = new Map<string, ChainTrigger>()
  private timer: ReturnType<typeof setInterval> | null = null
  private snapshotFn: () => Promise<ChainSnapshot>
  private executeFn: (goal: string, strategyId: string) => Promise<void>

  constructor(
    snapshotFn: () => Promise<ChainSnapshot>,
    executeFn: (goal: string, strategyId: string) => Promise<void>,
  ) {
    this.snapshotFn = snapshotFn
    this.executeFn = executeFn
  }

  register(trigger: Omit<ChainTrigger, 'lastCheckedAt' | 'lastFiredAt' | 'firedCount'>): ChainTrigger {
    const full: ChainTrigger = {
      ...trigger,
      lastCheckedAt: 0,
      lastFiredAt: null,
      firedCount: 0,
    }
    this.triggers.set(trigger.id, full)
    return full
  }

  remove(id: string): boolean {
    return this.triggers.delete(id)
  }

  list(): ChainTrigger[] {
    return Array.from(this.triggers.values())
  }

  // Evaluate all triggers against a snapshot
  async evaluate(snapshot: ChainSnapshot): Promise<string[]> {
    const fired: string[] = []
    const now = Date.now()

    for (const trigger of this.triggers.values()) {
      if (!trigger.enabled) continue

      // Cooldown check
      if (trigger.lastFiredAt && (now - trigger.lastFiredAt) < trigger.cooldownMs) {
        continue
      }

      const shouldFire = this.checkCondition(trigger.condition, snapshot)
      trigger.lastCheckedAt = now

      if (shouldFire) {
        console.log(`🔔 Trigger fired: "${trigger.name}" → "${trigger.goal}"`)
        trigger.lastFiredAt = now
        trigger.firedCount++
        fired.push(trigger.id)

        try {
          await this.executeFn(trigger.goal, trigger.strategyId)
        } catch (err: any) {
          console.error(`Trigger execution failed (${trigger.id}):`, err.message)
        }
      }
    }

    return fired
  }

  private checkCondition(condition: TriggerCondition, snapshot: ChainSnapshot): boolean {
    switch (condition.type) {
      case 'peg_health_below':
        return snapshot.sBTCPeg.health < condition.threshold

      case 'peg_health_above':
        return snapshot.sBTCPeg.health > condition.threshold

      case 'stx_balance_above':
        return parseInt(snapshot.wallet.stxBalance.available) > condition.microSTX

      case 'stx_balance_below':
        return parseInt(snapshot.wallet.stxBalance.available) < condition.microSTX

      case 'pox_cycle_ending_in':
        // Check if PoX cycle ends within N blocks
        if (!snapshot.pox) return false
        const blocksRemaining = snapshot.pox.currentCycleEnd - snapshot.network.stacksBlockHeight
        return blocksRemaining > 0 && blocksRemaining <= condition.blocks

      case 'congestion_level':
        return snapshot.network.congestion === condition.level

      case 'custom':
        // Custom conditions evaluated at a higher layer (LLM)
        return false

      default:
        return false
    }
  }

  // Poll chain state every N minutes
  start(intervalMs = 5 * 60 * 1000): void {
    if (this.timer) return
    if (this.triggers.size === 0) return

    console.log(`✓ Chain trigger engine started (${this.triggers.size} triggers, polling every ${intervalMs / 1000}s)`)

    this.timer = setInterval(async () => {
      try {
        const snapshot = await this.snapshotFn()
        await this.evaluate(snapshot)
      } catch (err: any) {
        console.error('Trigger poll failed:', err.message)
      }
    }, intervalMs)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}
