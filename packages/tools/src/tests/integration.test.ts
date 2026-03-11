/**
 * Integration tests — run against real Stacks testnet.
 * TASK-024
 * Requires: HIRO_API_KEY (optional but recommended), STACKS_NETWORK=testnet
 *
 * Run: bun test packages/tools/src/tests/integration.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  getWalletState,
  getNetworkState,
  getSBTCPegStatus,
  captureChainSnapshot,
} from '../read/hiro.js'
import { buildSTXTransfer } from '../write/builders.js'

// Public testnet address with known activity
const TEST_ADDRESS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'
const TEST_BTC_ADDRESS = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx'

describe('Read Tools — Testnet', () => {
  it('getWalletState returns typed WalletState', async () => {
    const state = await getWalletState(TEST_ADDRESS, TEST_BTC_ADDRESS, 'testnet')
    expect(state.address).toBe(TEST_ADDRESS)
    expect(typeof state.nonce).toBe('number')
    expect(state.stxBalance.available).toBeTruthy()
    expect(Array.isArray(state.tokenBalances)).toBe(true)
  })

  it('getNetworkState returns positive block heights', async () => {
    const state = await getNetworkState('testnet')
    expect(state.stacksBlockHeight).toBeGreaterThan(0)
    expect(state.bitcoinBlockHeight).toBeGreaterThan(0)
    expect(['low', 'medium', 'high']).toContain(state.congestion)
  })

  it('getSBTCPegStatus returns health 0–100', async () => {
    const status = await getSBTCPegStatus('testnet')
    expect(status.health).toBeGreaterThanOrEqual(0)
    expect(status.health).toBeLessThanOrEqual(100)
    expect(typeof status.signerThresholdMet).toBe('boolean')
  })

  it('captureChainSnapshot returns complete snapshot', async () => {
    const snapshot = await captureChainSnapshot(TEST_ADDRESS, TEST_BTC_ADDRESS, 'testnet')
    expect(snapshot.wallet).toBeDefined()
    expect(snapshot.network).toBeDefined()
    expect(snapshot.sBTCPeg).toBeDefined()
    expect(snapshot.capturedAt).toBeGreaterThan(0)
    expect(Array.isArray(snapshot.protocolExposure)).toBe(true)
  })
})

describe('Write Tools — Transaction Building', () => {
  it('buildSTXTransfer returns valid UnsignedTx', async () => {
    const tx = await buildSTXTransfer({
      senderAddress: TEST_ADDRESS,
      recipient: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
      amountMicroSTX: 1n,
      network: 'testnet',
    })
    expect(tx.id).toBeTruthy()
    expect(tx.hash).toHaveLength(64) // sha256 hex
    expect(tx.serialized).toBeTruthy()
    expect(tx.actionType).toBe('transfer')
    expect(tx.postConditions).toHaveLength(1)
  })

  it('signAndBroadcast throws on hash mismatch', async () => {
    const { signAndBroadcast } = await import('../write/builders.js')
    const tx = await buildSTXTransfer({
      senderAddress: TEST_ADDRESS,
      recipient: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
      amountMicroSTX: 1n,
      network: 'testnet',
    })

    await expect(
      signAndBroadcast({
        unsignedTx: tx,
        approvedHash: 'wrong_hash_intentionally',
        privateKey: 'fake_key',
        network: 'testnet',
      })
    ).rejects.toThrow('SECURITY')
  })
})
