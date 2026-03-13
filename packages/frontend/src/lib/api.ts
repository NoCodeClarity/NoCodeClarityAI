// ── API Client ───────────────────────────────────────────────────────────────
const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `API error ${res.status}`)
  }
  return res.json()
}

// ── Snapshot ──────────────────────────────────────────────────────────────────

export interface WalletSnapshot {
  stxBalance: { total: string; available: string; locked: string }
  sBTCBalance: string
  sBTCPegHealth: { ratio: number; healthScore: number }
  tokenBalances: { symbol: string; name: string; balanceFormatted: string }[]
  networkInfo: { poxCycle: number; blockHeight: number }
}

export function fetchSnapshot(address: string): Promise<WalletSnapshot> {
  return request(`/snapshot/${address}`)
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export interface TaskStep {
  agent: string
  action: string
  detail?: string
  status: string
  ts: number
}

export interface TaskRecord {
  id: string
  goal: string
  status: string
  txid?: string
  steps: TaskStep[]
  gateResult?: { reason: string }
  createdAt: number
}

export function fetchTasks(): Promise<{ tasks: TaskRecord[] }> {
  return request('/tasks')
}

// ── Commands ─────────────────────────────────────────────────────────────────

export function submitGoal(goal: string, strategyId: string): Promise<{ taskId: string }> {
  return request('/propose', {
    method: 'POST',
    body: JSON.stringify({ goal, strategyId }),
  })
}

export function approveTask(id: string): Promise<void> {
  return request(`/approve/${id}`, { method: 'POST' })
}

export function rejectTask(id: string): Promise<void> {
  return request(`/reject/${id}`, { method: 'POST' })
}

// ── Broadcast (client-side signed) ──────────────────────────────────────────

export function broadcastTransaction(taskId: string, signedTxHex: string): Promise<{ txid: string; taskId: string }> {
  return request('/broadcast', {
    method: 'POST',
    body: JSON.stringify({ taskId, signedTxHex }),
  })
}

// ── Recovery ─────────────────────────────────────────────────────────────────

export interface RecoveryStats {
  total: number
  byStatus: Record<string, number>
  deadLetterCount: number
}

export function fetchRecoveryStats(): Promise<RecoveryStats> {
  return request('/recovery/stats')
}
