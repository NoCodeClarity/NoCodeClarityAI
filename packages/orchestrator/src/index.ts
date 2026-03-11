// ── StacksSwarm Orchestrator ──────────────────────────────────────────────────
// TASK-016: DB helpers + TASK-017: buildProposal (goal classifier + tx router)
// Pipeline: Goal → [Analyst: snapshot] → [Risk Gate: evaluate] → [Executor: sign+broadcast]

import { EventEmitter } from 'events'
import Anthropic from '@anthropic-ai/sdk'
import { getDB } from './db/client.js'
import { tasks, strategies, memory, knownProtocols } from './db/schema.js'
import { eq, desc } from 'drizzle-orm'
import type {
  Task,
  Strategy,
  RiskConfig,
  GateResult,
  ChainSnapshot,
  UnsignedTx,
  SwarmEvent,
  TaskStep,
} from '@nocodeclarity/tools'
import { captureChainSnapshot } from '@nocodeclarity/tools/read'
import { signAndBroadcast, waitForConfirmation } from '@nocodeclarity/tools/write'
import { analyzeSnapshot, evaluateRisk, describeExecution } from '@nocodeclarity/agents'

const anthropic = new Anthropic()

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_GOAL_LENGTH = 500
const ACTIVE_STATUSES = ['pending', 'analyzing', 'gating', 'executing', 'confirming'] as const

// ── Types ────────────────────────────────────────────────────────────────────

export type { SwarmEvent }

interface SwarmConfig {
  walletAddress: string
  btcAddress: string
  privateKey: string
  network: 'mainnet' | 'testnet'
  db: any
}

// ── Class ────────────────────────────────────────────────────────────────────

export class StacksSwarm extends EventEmitter {
  private walletAddress: string
  private btcAddress: string
  private privateKey: string
  private network: 'mainnet' | 'testnet'
  private pendingApprovals = new Map<string, (approved: boolean) => void>()

  constructor(config: SwarmConfig) {
    super()
    this.walletAddress = config.walletAddress
    this.btcAddress = config.btcAddress
    this.privateKey = config.privateKey
    this.network = config.network
  }

  // ── TASK-016: DB Helpers ─────────────────────────────────────────────────

  private async createTask(goal: string, strategy: Strategy): Promise<Task> {
    const db = getDB()
    const now = Date.now()
    const [row] = await db.insert(tasks).values({
      goal,
      strategyId: strategy.id,
      status: 'pending',
      riskConfig: strategy.riskConfig as any,
      steps: [],
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }).returning()
    if (!row) throw new Error('Failed to create task')
    return this.rowToTask(row)
  }

  async getTask(id: string): Promise<Task | null> {
    const db = getDB()
    const [row] = await db.select().from(tasks).where(eq(tasks.id, id))
    return row ? this.rowToTask(row) : null
  }

  private async updateTaskStatus(id: string, status: Task['status']): Promise<void> {
    await getDB().update(tasks)
      .set({ status, updatedAt: new Date() })
      .where(eq(tasks.id, id))
  }

  private async updateTaskSnapshot(id: string, snapshot: any): Promise<void> {
    await getDB().update(tasks)
      .set({ snapshot, updatedAt: new Date() })
      .where(eq(tasks.id, id))
  }

  private async updateTaskUnsignedTx(id: string, tx: any): Promise<void> {
    await getDB().update(tasks)
      .set({ unsignedTx: tx, updatedAt: new Date() })
      .where(eq(tasks.id, id))
  }

  private async updateTaskGateResult(id: string, result: GateResult): Promise<void> {
    await getDB().update(tasks)
      .set({ gateResult: result as any, updatedAt: new Date() })
      .where(eq(tasks.id, id))
  }

  private async writeTxidToTask(id: string, txid: string): Promise<void> {
    await getDB().update(tasks)
      .set({ txid, updatedAt: new Date() })
      .where(eq(tasks.id, id))
  }

  private rowToTask(row: any): Task {
    return {
      id: row.id,
      goal: row.goal,
      strategyId: row.strategyId ?? row.strategy_id ?? '',
      status: row.status as Task['status'],
      riskConfig: (row.riskConfig ?? row.risk_config) as RiskConfig,
      snapshot: (row.snapshot ?? undefined) as ChainSnapshot | undefined,
      unsignedTx: (row.unsignedTx ?? row.unsigned_tx ?? undefined) as UnsignedTx | undefined,
      gateResult: (row.gateResult ?? row.gate_result ?? undefined) as GateResult | undefined,
      txid: row.txid ?? undefined,
      holdCount: row.holdCount ?? row.hold_count ?? 0,
      steps: (row.steps ?? []) as TaskStep[],
      createdAt: row.createdAt?.getTime?.() ?? Date.now(),
      updatedAt: row.updatedAt?.getTime?.() ?? Date.now(),
    }
  }

  async listTasks(limit = 50): Promise<Task[]> {
    const rows = await getDB().select().from(tasks)
      .orderBy(desc(tasks.createdAt))
      .limit(limit)
    return rows.map(r => this.rowToTask(r))
  }

  async pause(): Promise<void> {
    // Halt ALL active tasks — not just pending
    const db = getDB()
    for (const status of ACTIVE_STATUSES) {
      await db.update(tasks)
        .set({ status: 'held', updatedAt: new Date() })
        .where(eq(tasks.status, status))
    }
  }

  // ── Emit helper ──────────────────────────────────────────────────────────

  private emitEvent(type: SwarmEvent['type'], taskId: string, data: any) {
    const event: SwarmEvent = { type, taskId, data, timestamp: Date.now() }
    this.emit(type, event)
  }

  // ── TASK-017: buildProposal ──────────────────────────────────────────────

  private async buildProposal(
    goal: string,
    snapshot: ChainSnapshot,
    _strategy: Strategy
  ): Promise<UnsignedTx> {
    const { buildZestDeposit, buildDelegateSTX, buildALEXSwap, buildSTXTransfer, buildSBTCTransfer } =
      await import('@nocodeclarity/tools/write')

    // Step 1: classify goal
    const classifyResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      system: `Classify the user's goal into exactly one template.
Return ONLY the template name, nothing else.
Templates: deposit_yield, stack_pox, swap, transfer, unknown`,
      messages: [{ role: 'user', content: goal }]
    })

    const template = (
      classifyResponse.content[0]?.type === 'text'
        ? classifyResponse.content[0].text.trim()
        : 'unknown'
    ) as 'deposit_yield' | 'stack_pox' | 'swap' | 'transfer' | 'unknown'

    if (template === 'unknown') {
      throw new Error(
        `Could not understand goal: "${goal}". ` +
        `Try: "deposit my sBTC for yield", "stack my STX for 2 cycles", ` +
        `"swap 10 STX for sBTC", or "send 1 STX to SP..."`
      )
    }

    // Step 2: extract parameters using LLM
    const extractResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: `Extract transaction parameters from the user's goal.
Return ONLY valid JSON. No preamble. No markdown.
Available wallet: ${JSON.stringify(snapshot.wallet.stxBalance)}
Token balances: ${JSON.stringify(snapshot.wallet.tokenBalances)}
Template: ${template}

For deposit_yield: { "token": "stx" | "sbtc", "amount": number_in_base_units }
For stack_pox: { "amount": number_in_microSTX, "cycles": number_1_to_12 }
For swap: { "fromToken": "stx" | "sbtc", "toToken": "stx" | "sbtc", "amount": number_in_base_units }
For transfer: { "token": "stx" | "sbtc", "amount": number_in_base_units, "recipient": "SP..." }`,
      messages: [{ role: 'user', content: goal }]
    })

    const paramsText = extractResponse.content[0]?.type === 'text'
      ? extractResponse.content[0].text.trim()
      : '{}'

    let params: any
    try {
      params = JSON.parse(paramsText)
    } catch {
      throw new Error('Could not parse goal parameters. Please be more specific.')
    }

    const SBTC_CONTRACT = this.network === 'mainnet'
      ? 'SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.sbtc-token'
      : 'SN3R84XZYA63QS28932XQF3G1J8R9PC3W76P9CSQS.sbtc-token'

    // Step 3: build transaction
    switch (template) {
      case 'deposit_yield': {
        const token = params.token === 'sbtc' ? SBTC_CONTRACT : 'STX'
        const amount = BigInt(Math.floor(params.amount ?? 0))
        if (amount <= 0n) throw new Error('Amount must be greater than 0')
        return buildZestDeposit({
          senderAddress: this.walletAddress,
          token,
          amount,
          network: this.network,
        })
      }

      case 'stack_pox': {
        const amount = BigInt(Math.floor(params.amount ?? 0))
        const cycles = Math.min(12, Math.max(1, params.cycles ?? 1))
        if (amount <= 0n) throw new Error('Amount must be greater than 0')
        return buildDelegateSTX({
          senderAddress: this.walletAddress,
          amountMicroSTX: amount,
          delegateTo: 'SP21YTSM60CAY6D011EZVEVNKXVW8QVZE9B0KGPQ', // Fast Pool mainnet
          network: this.network,
        })
      }

      case 'swap': {
        const fromToken = params.fromToken === 'sbtc' ? SBTC_CONTRACT : 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.token-wstx'
        const toToken = params.toToken === 'sbtc' ? SBTC_CONTRACT : 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.token-wstx'
        const amountIn = BigInt(Math.floor(params.amount ?? 0))
        const minAmountOut = amountIn * 99n / 100n // 1% slippage
        return buildALEXSwap({
          senderAddress: this.walletAddress,
          fromToken,
          toToken,
          amountIn,
          minAmountOut,
          network: this.network,
        })
      }

      case 'transfer': {
        const validPrefix = this.network === 'mainnet' ? 'SP' : 'ST'
        if (!params.recipient || !params.recipient.startsWith(validPrefix)) {
          throw new Error(`Transfer requires a valid Stacks address (starts with ${validPrefix})`)
        }
        const amount = BigInt(Math.floor(params.amount ?? 0))
        if (params.token === 'sbtc') {
          return buildSBTCTransfer({
            senderAddress: this.walletAddress,
            recipient: params.recipient,
            amountSats: amount,
            network: this.network,
          })
        }
        return buildSTXTransfer({
          senderAddress: this.walletAddress,
          recipient: params.recipient,
          amountMicroSTX: amount,
          network: this.network,
        })
      }

      default:
        throw new Error(`Unhandled template: ${template}`)
    }
  }

  // ── Execute Pipeline ─────────────────────────────────────────────────────

  async execute(goal: string, strategy: Strategy): Promise<Task> {
    // Input sanitization
    if (!goal || typeof goal !== 'string') {
      throw new Error('Goal must be a non-empty string')
    }
    if (goal.length > MAX_GOAL_LENGTH) {
      throw new Error(`Goal exceeds maximum length of ${MAX_GOAL_LENGTH} characters`)
    }
    // Strip any control characters — prevent prompt injection via hidden chars
    const sanitizedGoal = goal.replace(/[\x00-\x1f\x7f-\x9f]/g, '').trim()
    if (!sanitizedGoal) {
      throw new Error('Goal is empty after sanitization')
    }

    const task = await this.createTask(sanitizedGoal, strategy)
    this.emitEvent('task:created', task.id, { goal: sanitizedGoal })

    // Run pipeline asynchronously
    this.runPipeline(task.id, sanitizedGoal, strategy).catch(err => {
      this.updateTaskStatus(task.id, 'failed')
      this.emitEvent('task:failed', task.id, { error: err.message })
    })

    return task
  }

  private async runPipeline(taskId: string, goal: string, strategy: Strategy) {
    // Step 1: Analyst — capture chain snapshot
    await this.updateTaskStatus(taskId, 'analyzing')
    this.emitEvent('task:step', taskId, { agent: 'analyst', action: 'Capturing chain snapshot...' })

    const snapshot = await captureChainSnapshot(
      this.walletAddress,
      this.btcAddress,
      this.network
    )
    await this.updateTaskSnapshot(taskId, snapshot)

    const analysis = await analyzeSnapshot(snapshot, goal)
    this.emitEvent('task:step', taskId, { agent: 'analyst', action: 'Analysis complete', result: analysis })

    if (analysis.includes('INFEASIBLE')) {
      await this.updateTaskStatus(taskId, 'rejected')
      this.emitEvent('task:rejected', taskId, { reason: analysis })
      return
    }

    // Step 2: Build proposal
    this.emitEvent('task:step', taskId, { agent: 'analyst', action: 'Building transaction proposal...' })
    const unsignedTx = await this.buildProposal(goal, snapshot, strategy)
    await this.updateTaskUnsignedTx(taskId, unsignedTx)

    // Step 3: Risk Gate — evaluate
    await this.updateTaskStatus(taskId, 'gating')
    this.emitEvent('task:step', taskId, { agent: 'risk_gate', action: 'Evaluating risk...' })

    const gateResult = await evaluateRisk(unsignedTx, snapshot, strategy.riskConfig)
    await this.updateTaskGateResult(taskId, gateResult)

    const executionSummary = await describeExecution(unsignedTx, gateResult)
    this.emitEvent('task:step', taskId, { agent: 'risk_gate', action: 'Gate evaluation complete', result: executionSummary })

    // Handle gate decision
    switch (gateResult.decision) {
      case 'REJECT':
        await this.updateTaskStatus(taskId, 'rejected')
        this.emitEvent('task:rejected', taskId, { gateResult })
        return

      case 'HOLD':
        await this.updateTaskStatus(taskId, 'held')
        this.emitEvent('task:step', taskId, { agent: 'risk_gate', action: 'Task held — will retry' })
        return

      case 'NEEDS_HUMAN':
        await this.updateTaskStatus(taskId, 'needs_human')
        this.emitEvent('task:needs_human', taskId, { unsignedTx, gateResult })
        // Wait for human approval
        const approved = await this.waitForHumanApproval(taskId)
        if (!approved) {
          await this.updateTaskStatus(taskId, 'rejected')
          this.emitEvent('task:rejected', taskId, { reason: 'Human rejected' })
          return
        }
        break

      case 'PROCEED':
        break
    }

    // Step 4: Executor — sign and broadcast
    await this.updateTaskStatus(taskId, 'executing')
    this.emitEvent('task:executing', taskId, { unsignedTx })

    const { txid } = await signAndBroadcast({
      unsignedTx,
      approvedHash: unsignedTx.hash,
      privateKey: this.privateKey,
      network: this.network,
    })
    await this.writeTxidToTask(taskId, txid)

    // Step 5: Wait for confirmation
    await this.updateTaskStatus(taskId, 'confirming')
    this.emitEvent('task:step', taskId, { agent: 'executor', action: `Waiting for confirmation: ${txid}` })

    const confirmation = await waitForConfirmation(txid, this.network)

    if (confirmation.status === 'success') {
      await this.updateTaskStatus(taskId, 'complete')
      this.emitEvent('task:complete', taskId, { txid, blockHeight: confirmation.blockHeight })
    } else {
      await this.updateTaskStatus(taskId, 'failed')
      this.emitEvent('task:failed', taskId, { txid, status: confirmation.status })
    }
  }

  // ── Human Approval ───────────────────────────────────────────────────────

  private waitForHumanApproval(taskId: string): Promise<boolean> {
    return new Promise(resolve => {
      // Timeout after 30 minutes
      const timeout = setTimeout(() => {
        this.pendingApprovals.delete(taskId)
        resolve(false)
      }, 30 * 60 * 1000)

      this.pendingApprovals.set(taskId, (approved) => {
        clearTimeout(timeout)
        this.pendingApprovals.delete(taskId)
        resolve(approved)
      })
    })
  }

  async humanApprove(taskId: string): Promise<void> {
    const resolver = this.pendingApprovals.get(taskId)
    if (!resolver) throw new Error(`No pending approval for task ${taskId}`)
    resolver(true)
  }

  async humanReject(taskId: string): Promise<void> {
    const resolver = this.pendingApprovals.get(taskId)
    if (!resolver) throw new Error(`No pending approval for task ${taskId}`)
    resolver(false)
  }
}
