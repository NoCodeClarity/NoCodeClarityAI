/**
 * Unit tests for orchestrator modules: scheduler, triggers, sharing.
 * These tests run in-memory — no external dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TaskScheduler } from '../scheduler.js'
import { ChainTriggerEngine } from '../triggers.js'
import { exportStrategy, importStrategy, encodeStrategyURL, decodeStrategyURL } from '../sharing.js'
import type { ChainSnapshot } from '@nocodeclarity/tools'

// ── Mock snapshot for trigger tests ──────────────────────────────────────────

const mockSnapshot: ChainSnapshot = {
  wallet: {
    address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    btcAddress: '',
    stxBalance: { total: '5000000000', locked: '0', available: '5000000000', totalBTC: '0' },
    tokenBalances: [],
    nftCount: 0,
    nonce: 5,
  },
  network: {
    stacksBlockHeight: 100000,
    bitcoinBlockHeight: 850000,
    finalityDepth: 6,
    estimatedFeeRate: '0.002',
    congestion: 'low',
    poxCycle: 88,
    blocksUntilNextCycle: 150,
  },
  sBTCPeg: {
    health: 97,
    pegInQueueDepth: 3,
    pegOutQueueDepth: 1,
    signerThresholdMet: true,
    lastBitcoinBlock: 850000,
    finalityDepth: 6,
  },
  protocolExposure: [],
  capturedAt: Date.now(),
}

// ── Scheduler Tests ──────────────────────────────────────────────────────────

describe('TaskScheduler', () => {
  let scheduler: TaskScheduler
  const mockCallback = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    scheduler = new TaskScheduler(mockCallback)
    mockCallback.mockClear()
  })

  it('schedule — creates a recurring task', () => {
    const task = scheduler.schedule({
      id: 'test-1',
      goal: 'compound yield',
      strategyId: 'strat-1',
      interval: '24h',
    })
    expect(task).toBeDefined()
    expect(scheduler.list()).toHaveLength(1)
    expect(scheduler.list()[0].id).toBe('test-1')
  })

  it('schedule — rejects invalid intervals', () => {
    expect(() => scheduler.schedule({
      id: 'test-2',
      goal: 'invalid',
      strategyId: 'strat-1',
      interval: '5s', // not valid
    })).toThrow('Invalid interval')
  })

  it('cancel — removes a task', () => {
    scheduler.schedule({
      id: 'test-3',
      goal: 'test',
      strategyId: 'strat-1',
      interval: '1h',
    })
    expect(scheduler.list()).toHaveLength(1)
    const ok = scheduler.cancel('test-3')
    expect(ok).toBe(true)
    expect(scheduler.list()).toHaveLength(0)
  })

  it('cancel — returns false for non-existent task', () => {
    const ok = scheduler.cancel('non-existent')
    expect(ok).toBe(false)
  })

  it('pause/resume — toggles task enabled state', () => {
    scheduler.schedule({
      id: 'test-4',
      goal: 'test',
      strategyId: 'strat-1',
      interval: '1h',
    })
    scheduler.pause('test-4')
    expect(scheduler.list()[0].enabled).toBe(false)
    scheduler.resume('test-4')
    expect(scheduler.list()[0].enabled).toBe(true)
  })
})

// ── Trigger Tests ────────────────────────────────────────────────────────────

describe('ChainTriggerEngine', () => {
  let engine: ChainTriggerEngine
  const mockSnapshotFn = vi.fn().mockResolvedValue(mockSnapshot)
  const mockExecuteFn = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    engine = new ChainTriggerEngine(mockSnapshotFn, mockExecuteFn)
    mockExecuteFn.mockClear()
  })

  it('register — adds a trigger', () => {
    engine.register({
      id: 'trig-1',
      name: 'Peg drop hedge',
      condition: { type: 'peg_health_below', threshold: 85 },
      goal: 'swap sBTC to STX',
      strategyId: 'strat-1',
      enabled: true,
      cooldownMs: 60_000,
    })
    expect(engine.list()).toHaveLength(1)
    expect(engine.list()[0].name).toBe('Peg drop hedge')
  })

  it('remove — deletes a trigger', () => {
    engine.register({
      id: 'trig-2',
      name: 'test',
      condition: { type: 'stx_balance_above', microSTX: 1000 },
      goal: 'test',
      strategyId: 'strat-1',
      enabled: true,
      cooldownMs: 60_000,
    })
    const ok = engine.remove('trig-2')
    expect(ok).toBe(true)
    expect(engine.list()).toHaveLength(0)
  })

  it('remove — returns false for non-existent trigger', () => {
    expect(engine.remove('non-existent')).toBe(false)
  })

  it('evaluate — fires trigger when condition met', async () => {
    engine.register({
      id: 'trig-3',
      name: 'Low congestion batch',
      condition: { type: 'congestion_level', level: 'low' },
      goal: 'batch swap',
      strategyId: 'strat-1',
      enabled: true,
      cooldownMs: 60_000,
    })

    const fired = await engine.evaluate(mockSnapshot)
    expect(fired).toContain('trig-3')
    expect(mockExecuteFn).toHaveBeenCalledWith('batch swap', 'strat-1')
  })

  it('evaluate — does not fire when condition not met', async () => {
    engine.register({
      id: 'trig-4',
      name: 'Peg drop',
      condition: { type: 'peg_health_below', threshold: 50 }, // snapshot has 97
      goal: 'hedge',
      strategyId: 'strat-1',
      enabled: true,
      cooldownMs: 60_000,
    })

    const fired = await engine.evaluate(mockSnapshot)
    expect(fired).not.toContain('trig-4')
    expect(mockExecuteFn).not.toHaveBeenCalled()
  })
})

// ── Sharing Tests ────────────────────────────────────────────────────────────

describe('Strategy Sharing', () => {
  const mockStrategy = {
    id: 'strat-1',
    name: 'Test Strategy',
    template: 'conservative_yield' as const,
    mode: 'simple' as const,
    riskConfig: {
      autoExecuteLimitBTC: 0.001,
      maxFeePctOfValue: 2,
      minFinalityDepth: 6,
      minPegHealth: 90,
      maxProtocolExposurePct: 40,
      maxSlippagePct: 1,
      requireConfirmForNewProtocol: true,
      requireConfirmForLiquidationRisk: true,
      mode: 'conservative' as const,
    },
    allocations: { zest: 100 },
    active: true,
    createdAt: Date.now(),
  }

  it('exportStrategy — produces valid portable format', () => {
    const exported = exportStrategy(mockStrategy)
    expect(exported._format).toBe('nocodeclarity-strategy-v1')
    expect(exported.name).toBe('Test Strategy')
    expect(exported.riskConfig).toBeDefined()
    expect(exported.allocations).toEqual({ zest: 100 })
  })

  it('importStrategy — parses exported format', () => {
    const exported = exportStrategy(mockStrategy)
    const imported = importStrategy(exported)
    expect(imported.name).toBe('Test Strategy')
    expect(imported.riskConfig.autoExecuteLimitBTC).toBe(0.001)
    expect(imported.riskConfig.requireConfirmForNewProtocol).toBe(true)
    expect(imported.riskConfig.mode).toBe('conservative')
  })

  it('importStrategy — rejects invalid format', () => {
    expect(() => importStrategy({ bad: 'data' })).toThrow()
  })

  it('importStrategy — rejects missing riskConfig fields', () => {
    expect(() => importStrategy({
      _format: 'nocodeclarity-strategy-v1',
      name: 'bad',
      riskConfig: { autoExecuteLimitBTC: 0.001 }, // missing other fields
    })).toThrow()
  })

  it('encode/decode URL — round trip', () => {
    const exported = exportStrategy(mockStrategy)
    const code = encodeStrategyURL(exported)
    expect(typeof code).toBe('string')
    expect(code.length).toBeGreaterThan(0)

    const decoded = decodeStrategyURL(code)
    expect(decoded.name).toBe('Test Strategy')
    expect(decoded.riskConfig.autoExecuteLimitBTC).toBe(0.001)
  })
})
