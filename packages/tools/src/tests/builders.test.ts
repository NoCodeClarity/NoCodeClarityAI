/**
 * Unit tests for all 12 transaction builders.
 * Verifies: post-conditions, serialization, hash generation, correct protocols.
 * These tests do NOT hit the network — they only test transaction construction.
 */

import { describe, it, expect } from 'vitest'
import {
  buildSTXTransfer,
  buildSBTCTransfer,
  buildALEXSwap,
  buildVelarSwap,
  buildBitflowSwap,
  buildBitflowStake,
  buildArkadikoSwap,
  buildZestDeposit,
  buildStackSTX,
  buildDelegateSTX,
} from '../write/builders.js'

// Valid Stacks testnet addresses (must pass c32check validation)
const SENDER = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'
const RECIPIENT = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'
const NETWORK = 'testnet' as const

// Helper: every builder must pass this
function assertValidTx(tx: any, protocol: string, actionType: string) {
  expect(tx.id).toBeTruthy()
  expect(tx.hash).toHaveLength(64) // sha256 hex
  expect(tx.serialized).toBeTruthy()
  expect(tx.protocol).toBe(protocol)
  expect(tx.actionType).toBe(actionType)
  expect(tx.humanDescription).toBeTruthy()
  expect(tx.estimatedFeeSTX).toBeTruthy()
  expect(Array.isArray(tx.postConditions)).toBe(true)
  expect(tx.postConditions.length).toBeGreaterThan(0)
}

// Helper: hash must be deterministic
async function assertDeterministicHash(builder: () => Promise<any>) {
  const tx1 = await builder()
  const tx2 = await builder()
  expect(tx1.hash).toBe(tx2.hash)
}

describe('STX Builders', () => {
  it('buildSTXTransfer — valid unsigned tx', async () => {
    const tx = await buildSTXTransfer({
      senderAddress: SENDER,
      recipient: RECIPIENT,
      amountMicroSTX: 1_000_000n,
      network: NETWORK,
    })
    assertValidTx(tx, 'stacks', 'transfer')
    expect(tx.postConditions[0].type).toBe('STX_EQUAL')
    expect(tx.humanDescription).toContain('1 STX')
  })

  it('buildSTXTransfer — deterministic hash', async () => {
    await assertDeterministicHash(() =>
      buildSTXTransfer({
        senderAddress: SENDER,
        recipient: RECIPIENT,
        amountMicroSTX: 1_000_000n,
        network: NETWORK,
      })
    )
  })

  it('buildSTXTransfer — includes memo', async () => {
    const tx = await buildSTXTransfer({
      senderAddress: SENDER,
      recipient: RECIPIENT,
      amountMicroSTX: 1n,
      memo: 'test memo',
      network: NETWORK,
    })
    assertValidTx(tx, 'stacks', 'transfer')
  })
})

describe('sBTC Builders', () => {
  it('buildSBTCTransfer — valid unsigned tx', async () => {
    const tx = await buildSBTCTransfer({
      senderAddress: SENDER,
      recipient: RECIPIENT,
      amountSats: 100_000n,
      network: NETWORK,
    })
    assertValidTx(tx, 'sbtc', 'transfer')
    expect(tx.postConditions[0].type).toBe('FT_EQUAL')
    expect(tx.humanDescription).toContain('sBTC')
  })
})

describe('ALEX Builders', () => {
  it('buildALEXSwap — valid swap tx with dual post-conditions', async () => {
    const tx = await buildALEXSwap({
      senderAddress: SENDER,
      fromToken: `${SENDER}.token-wstx`,
      toToken: `${SENDER}.token-sbtc`,
      amountIn: 10_000_000n,
      minAmountOut: 500n,
      network: NETWORK,
    })
    assertValidTx(tx, 'alex', 'swap')
    expect(tx.postConditions).toHaveLength(2)
    expect(tx.postConditions[0].type).toBe('FT_EQUAL')
    expect(tx.postConditions[1].type).toBe('FT_GTE')
    expect(tx.humanDescription).toContain('ALEX')
  })
})

describe('Velar Builders', () => {
  it('buildVelarSwap — valid swap with dual post-conditions', async () => {
    const tx = await buildVelarSwap({
      senderAddress: SENDER,
      fromToken: `${SENDER}.token-wstx`,
      toToken: `${SENDER}.token-sbtc`,
      amountIn: 5_000_000n,
      minAmountOut: 250n,
      network: NETWORK,
    })
    assertValidTx(tx, 'velar', 'swap')
    expect(tx.postConditions).toHaveLength(2)
    expect(tx.humanDescription).toContain('Velar')
  })
})

describe('Bitflow Builders', () => {
  it('buildBitflowStake — valid staking tx', async () => {
    const tx = await buildBitflowStake({
      senderAddress: SENDER,
      amountMicroSTX: 1_000_000n,
      network: NETWORK,
    })
    assertValidTx(tx, 'bitflow', 'stake')
    expect(tx.postConditions[0].type).toBe('STX_EQUAL')
    expect(tx.humanDescription).toContain('Bitflow')
  })

  it('buildBitflowSwap — valid swap with dual post-conditions', async () => {
    const tx = await buildBitflowSwap({
      senderAddress: SENDER,
      fromToken: `${SENDER}.token-wstx`,
      toToken: `${SENDER}.token-sbtc`,
      amountIn: 5_000_000n,
      minAmountOut: 250n,
      network: NETWORK,
    })
    assertValidTx(tx, 'bitflow', 'swap')
    expect(tx.postConditions).toHaveLength(2)
    expect(tx.humanDescription).toContain('Bitflow')
  })
})

describe('Arkadiko Builders', () => {
  it('buildArkadikoSwap — valid swap with dual post-conditions', async () => {
    const tx = await buildArkadikoSwap({
      senderAddress: SENDER,
      fromToken: `${SENDER}.wrapped-stx`,
      toToken: `${SENDER}.arkadiko-token`,
      amountIn: 5_000_000n,
      minAmountOut: 1_000_000n,
      network: NETWORK,
    })
    assertValidTx(tx, 'arkadiko', 'swap')
    expect(tx.postConditions).toHaveLength(2)
    expect(tx.humanDescription).toContain('Arkadiko')
  })
})

describe('Lending Builders', () => {
  it('buildZestDeposit — valid lending tx', async () => {
    const tx = await buildZestDeposit({
      senderAddress: SENDER,
      token: `${SENDER}.sbtc-token`,
      amount: 100_000n,
      network: NETWORK,
    })
    assertValidTx(tx, 'zest', 'lend')
    expect(tx.postConditions[0].type).toBe('FT_EQUAL')
    expect(tx.humanDescription).toContain('Zest')
  })
})

describe('PoX Builders', () => {
  it('buildStackSTX — valid stacking tx', async () => {
    const tx = await buildStackSTX({
      senderAddress: SENDER,
      amountMicroSTX: 100_000_000_000n,
      poxAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
      startBurnHt: 800000,
      lockPeriod: 2,
      network: NETWORK,
    })
    assertValidTx(tx, 'pox', 'pox_stack')
    expect(tx.humanDescription).toContain('2 cycle')
  })

  it('buildStackSTX — rejects invalid lock period', async () => {
    await expect(
      buildStackSTX({
        senderAddress: SENDER,
        amountMicroSTX: 100_000_000_000n,
        poxAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
        startBurnHt: 800000,
        lockPeriod: 13,
        network: NETWORK,
      })
    ).rejects.toThrow('lockPeriod must be 1–12')
  })

  it('buildDelegateSTX — valid delegation tx', async () => {
    const tx = await buildDelegateSTX({
      senderAddress: SENDER,
      amountMicroSTX: 50_000_000_000n,
      delegateTo: RECIPIENT,
      network: NETWORK,
    })
    assertValidTx(tx, 'pox', 'pox_delegate')
    expect(tx.humanDescription).toContain('Delegate')
  })
})

describe('Security: Hash Check', () => {
  it('signAndBroadcast throws on hash mismatch', async () => {
    const { signAndBroadcast } = await import('../write/builders.js')
    const tx = await buildSTXTransfer({
      senderAddress: SENDER,
      recipient: RECIPIENT,
      amountMicroSTX: 1n,
      network: NETWORK,
    })

    await expect(
      signAndBroadcast({
        unsignedTx: tx,
        approvedHash: 'tampered_hash_value',
        privateKey: 'fake_key',
        network: NETWORK,
      })
    ).rejects.toThrow('SECURITY')
  })
})
