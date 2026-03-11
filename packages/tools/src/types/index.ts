// ── Shared Types ─────────────────────────────────────────────────────────────
// This file is the single source of truth for all types used across packages.
// DO NOT MODIFY — all other packages import from here.

// ── Wallet ───────────────────────────────────────────────────────────────────

export interface TokenBalanceSchema {
  contractId: string
  symbol: string
  name: string
  balance: string
  decimals: number
  balanceFormatted: string
  balanceBTC?: string
}

export interface WalletState {
  address: string
  btcAddress: string
  stxBalance: {
    total: string
    locked: string
    available: string
    totalBTC: string
  }
  tokenBalances: TokenBalanceSchema[]
  nftCount: number
  nonce: number
}

// ── Network ──────────────────────────────────────────────────────────────────

export interface NetworkState {
  stacksBlockHeight: number
  bitcoinBlockHeight: number
  finalityDepth: number
  estimatedFeeRate: string
  congestion: 'low' | 'medium' | 'high'
  poxCycle: number
  blocksUntilNextCycle: number
}

// ── sBTC Peg ─────────────────────────────────────────────────────────────────

export interface PegStatus {
  health: number
  pegInQueueDepth: number
  pegOutQueueDepth: number
  signerThresholdMet: boolean
  lastBitcoinBlock: number
  finalityDepth: number
}

// ── Chain Snapshot ────────────────────────────────────────────────────────────

export interface ChainSnapshot {
  wallet: WalletState
  network: NetworkState
  sBTCPeg: PegStatus
  protocolExposure: {
    protocol: string
    valueUSD: number
    percentOfPortfolio: number
  }[]
  capturedAt: number
}

// ── Transaction ──────────────────────────────────────────────────────────────

export interface UnsignedTx {
  id: string
  hash: string
  serialized: string
  humanDescription: string
  protocol: string
  actionType: string
  estimatedFeeSTX: string
  postConditions: {
    type: string
    description: string
  }[]
}

// ── Risk ──────────────────────────────────────────────────────────────────────

export interface RiskConfig {
  autoExecuteLimitBTC: number
  maxFeePctOfValue: number
  minFinalityDepth: number
  minPegHealth: number
  maxProtocolExposurePct: number
  maxSlippagePct: number
  requireConfirmForNewProtocol: boolean
  requireConfirmForLiquidationRisk: boolean
  mode: 'conservative' | 'moderate' | 'aggressive'
}

// ── Gate ──────────────────────────────────────────────────────────────────────

export type GateDecision = 'PROCEED' | 'NEEDS_HUMAN' | 'HOLD' | 'REJECT'

export interface GateResult {
  decision: GateDecision
  reasons: string[]
  riskScore: number
  timestamp: number
}

// ── Strategy ─────────────────────────────────────────────────────────────────

export interface Strategy {
  id: string
  name: string
  template: 'conservative_yield' | 'moderate_yield' | 'aggressive_yield' | 'pox_stacking'
  mode: 'simple' | 'advanced'
  riskConfig: RiskConfig
  allocations: Record<string, number>
  active: boolean
  createdAt: number
}

// ── Task ──────────────────────────────────────────────────────────────────────

export interface Task {
  id: string
  goal: string
  strategyId: string
  status: 'pending' | 'analyzing' | 'gating' | 'needs_human' | 'executing' | 'confirming' | 'complete' | 'rejected' | 'failed' | 'held'
  riskConfig: RiskConfig
  snapshot?: ChainSnapshot
  unsignedTx?: UnsignedTx
  gateResult?: GateResult
  txid?: string
  holdCount: number
  steps: TaskStep[]
  createdAt: number
  updatedAt: number
}

export interface TaskStep {
  agent: 'analyst' | 'risk_gate' | 'executor'
  action: string
  result: string
  timestamp: number
}

// ── Swarm Events ─────────────────────────────────────────────────────────────

export interface SwarmEvent {
  type: 'task:created' | 'task:step' | 'task:needs_human' | 'task:executing' | 'task:complete' | 'task:rejected' | 'task:failed'
  taskId: string
  data: any
  timestamp: number
}
