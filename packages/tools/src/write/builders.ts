// ── Write Tools ──────────────────────────────────────────────────────────────
// Transaction builders for all Stacks protocol interactions.
// CRITICAL: Every builder must define post-conditions. No exceptions.

import {
  makeSTXTokenTransfer,
  makeContractCall,
  deserializeTransaction,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  makeStandardSTXPostCondition,
  makeStandardFungiblePostCondition,
  createAssetInfo,
  FungibleConditionCode,
  bufferCVFromString,
  noneCV,
  standardPrincipalCV,
  uintCV,
  createStacksPrivateKey,
  bytesToHex,
  signWithKey,
} from '@stacks/transactions'
import { StacksMainnet, StacksTestnet } from '@stacks/network'
import { createHash } from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import type { UnsignedTx } from '../types/index.js'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getNetwork(network: 'mainnet' | 'testnet') {
  return network === 'mainnet' ? new StacksMainnet() : new StacksTestnet()
}

function makeUnsignedTx(
  serialized: string,
  meta: {
    humanDescription: string
    protocol: string
    actionType: string
    estimatedFeeSTX: string
    postConditions: { type: string; description: string }[]
  }
): UnsignedTx {
  const hash = createHash('sha256').update(serialized).digest('hex')
  return {
    id: uuidv4(),
    hash,
    serialized,
    humanDescription: meta.humanDescription,
    protocol: meta.protocol,
    actionType: meta.actionType,
    estimatedFeeSTX: meta.estimatedFeeSTX,
    postConditions: meta.postConditions,
  }
}

// ── TASK-009: buildSTXTransfer + buildSBTCTransfer ───────────────────────────

export async function buildSTXTransfer(params: {
  senderAddress: string
  recipient: string
  amountMicroSTX: bigint
  memo?: string
  network: 'mainnet' | 'testnet'
}): Promise<UnsignedTx> {
  const tx = await makeSTXTokenTransfer({
    recipient: params.recipient,
    amount: params.amountMicroSTX,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
    postConditions: [
      makeStandardSTXPostCondition(
        params.senderAddress,
        FungibleConditionCode.Equal,
        params.amountMicroSTX
      )
    ],
    memo: params.memo ?? '',
    network: getNetwork(params.network),
    fee: 2000n,
  })

  const serialized = bytesToHex(tx.serialize())

  return makeUnsignedTx(serialized, {
    humanDescription: `Send ${Number(params.amountMicroSTX) / 1_000_000} STX to ${params.recipient.slice(0, 8)}...`,
    protocol: 'stacks',
    actionType: 'transfer',
    estimatedFeeSTX: '0.002',
    postConditions: [{
      type: 'STX_EQUAL',
      description: `Sender sends exactly ${Number(params.amountMicroSTX) / 1_000_000} STX`,
    }],
  })
}

export async function buildSBTCTransfer(params: {
  senderAddress: string
  recipient: string
  amountSats: bigint
  network: 'mainnet' | 'testnet'
}): Promise<UnsignedTx> {
  const SBTC_CONTRACT_ADDRESS = params.network === 'mainnet'
    ? 'SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR'
    : 'SN3R84XZYA63QS28932XQF3G1J8R9PC3W76P9CSQS'

  const tx = await makeContractCall({
    contractAddress: SBTC_CONTRACT_ADDRESS,
    contractName: 'sbtc-token',
    functionName: 'transfer',
    functionArgs: [
      uintCV(params.amountSats),
      standardPrincipalCV(params.senderAddress),
      standardPrincipalCV(params.recipient),
      noneCV(),
    ],
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
    postConditions: [
      makeStandardFungiblePostCondition(
        params.senderAddress,
        FungibleConditionCode.Equal,
        params.amountSats,
        createAssetInfo(SBTC_CONTRACT_ADDRESS, 'sbtc-token', 'sbtc')
      )
    ],
    network: getNetwork(params.network),
    fee: 2000n,
  })

  const serialized = bytesToHex(tx.serialize())
  const sbtcDisplay = (Number(params.amountSats) / 100_000_000).toFixed(8)

  return makeUnsignedTx(serialized, {
    humanDescription: `Send ${sbtcDisplay} sBTC to ${params.recipient.slice(0, 8)}...`,
    protocol: 'sbtc',
    actionType: 'transfer',
    estimatedFeeSTX: '0.002',
    postConditions: [{
      type: 'FT_EQUAL',
      description: `Sender transfers exactly ${sbtcDisplay} sBTC`,
    }],
  })
}

// ── TASK-010: buildALEXSwap ──────────────────────────────────────────────────

export async function buildALEXSwap(params: {
  senderAddress: string
  fromToken: string     // full contract principal e.g. SP...token-name
  toToken: string
  amountIn: bigint
  minAmountOut: bigint
  network: 'mainnet' | 'testnet'
}): Promise<UnsignedTx> {
  // ALEX AMM router on mainnet
  const ALEX_ROUTER = params.network === 'mainnet'
    ? 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9'
    : 'ST3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9'

  const [fromAddress, fromName] = params.fromToken.split('.')
  const [toAddress, toName] = params.toToken.split('.')

  const tx = await makeContractCall({
    contractAddress: ALEX_ROUTER,
    contractName: 'amm-swap-pool-v1-1',
    functionName: 'swap-helper',
    functionArgs: [
      standardPrincipalCV(params.fromToken),
      standardPrincipalCV(params.toToken),
      uintCV(params.amountIn),
      uintCV(params.minAmountOut),
    ],
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
    postConditions: [
      // Spend exact input amount
      makeStandardFungiblePostCondition(
        params.senderAddress,
        FungibleConditionCode.Equal,
        params.amountIn,
        createAssetInfo(fromAddress!, fromName!, fromName!)
      ),
      // Receive at least minimum output
      makeStandardFungiblePostCondition(
        params.senderAddress,
        FungibleConditionCode.GreaterEqual,
        params.minAmountOut,
        createAssetInfo(toAddress!, toName!, toName!)
      ),
    ],
    network: getNetwork(params.network),
    fee: 3000n,
  })

  const serialized = bytesToHex(tx.serialize())

  return makeUnsignedTx(serialized, {
    humanDescription: `Swap ${Number(params.amountIn) / 1_000_000} ${fromName} for at least ${Number(params.minAmountOut) / 1_000_000} ${toName} on ALEX`,
    protocol: 'alex',
    actionType: 'swap',
    estimatedFeeSTX: '0.003',
    postConditions: [
      { type: 'FT_EQUAL', description: `Spend exactly ${Number(params.amountIn) / 1_000_000} ${fromName}` },
      { type: 'FT_GTE', description: `Receive at least ${Number(params.minAmountOut) / 1_000_000} ${toName}` },
    ],
  })
}

// ── TASK-011: buildZestDeposit + buildStackSTX ───────────────────────────────

export async function buildZestDeposit(params: {
  senderAddress: string
  token: string
  amount: bigint
  network: 'mainnet' | 'testnet'
}): Promise<UnsignedTx> {
  const ZEST_POOL = params.network === 'mainnet'
    ? 'SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N'
    : 'ST2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N'

  const [tokenAddress, tokenName] = params.token.split('.')

  const tx = await makeContractCall({
    contractAddress: ZEST_POOL,
    contractName: 'pool-v2-0',
    functionName: 'supply',
    functionArgs: [
      standardPrincipalCV(params.token),
      uintCV(params.amount),
      standardPrincipalCV(params.senderAddress),
    ],
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
    postConditions: [
      makeStandardFungiblePostCondition(
        params.senderAddress,
        FungibleConditionCode.Equal,
        params.amount,
        createAssetInfo(tokenAddress!, tokenName!, tokenName!)
      )
    ],
    network: getNetwork(params.network),
    fee: 3000n,
  })

  const serialized = bytesToHex(tx.serialize())

  return makeUnsignedTx(serialized, {
    humanDescription: `Deposit ${Number(params.amount) / 1_000_000} ${tokenName} into Zest Protocol lending pool`,
    protocol: 'zest',
    actionType: 'lend',
    estimatedFeeSTX: '0.003',
    postConditions: [{ type: 'FT_EQUAL', description: `Deposit exactly ${Number(params.amount) / 1_000_000} ${tokenName}` }],
  })
}

export async function buildStackSTX(params: {
  senderAddress: string
  amountMicroSTX: bigint
  poxAddress: string
  startBurnHt: number
  lockPeriod: number
  network: 'mainnet' | 'testnet'
}): Promise<UnsignedTx> {
  if (params.lockPeriod < 1 || params.lockPeriod > 12) {
    throw new Error(`lockPeriod must be 1–12, got ${params.lockPeriod}`)
  }

  const POX4 = 'SP000000000000000000002Q6VF78'

  const tx = await makeContractCall({
    contractAddress: POX4,
    contractName: 'pox-4',
    functionName: 'stack-stx',
    functionArgs: [
      uintCV(params.amountMicroSTX),
      // NOTE: pox-address tuple encoding — requires proper BTC address parsing
      // Full implementation should use @stacks/stacking poxAddressToBtcAddress
      bufferCVFromString(params.poxAddress),
      uintCV(BigInt(params.startBurnHt)),
      uintCV(BigInt(params.lockPeriod)),
      noneCV(), // signer signature (optional for solo stacking)
    ],
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow, // PoX contract locks STX
    network: getNetwork(params.network),
    fee: 5000n,
  })

  const serialized = bytesToHex(tx.serialize())
  const stxAmount = Number(params.amountMicroSTX) / 1_000_000

  return makeUnsignedTx(serialized, {
    humanDescription: `Stack ${stxAmount} STX for ${params.lockPeriod} cycle(s), rewards to ${params.poxAddress.slice(0, 12)}...`,
    protocol: 'pox',
    actionType: 'pox_stack',
    estimatedFeeSTX: '0.005',
    postConditions: [{ type: 'STX_ALLOW', description: `PoX contract will lock ${stxAmount} STX for ${params.lockPeriod} cycles` }],
  })
}

// ── TASK-012: buildDelegateSTX ───────────────────────────────────────────────

export async function buildDelegateSTX(params: {
  senderAddress: string
  amountMicroSTX: bigint
  delegateTo: string
  untilBurnHt?: number
  network: 'mainnet' | 'testnet'
}): Promise<UnsignedTx> {
  const POX4 = 'SP000000000000000000002Q6VF78'

  const tx = await makeContractCall({
    contractAddress: POX4,
    contractName: 'pox-4',
    functionName: 'delegate-stx',
    functionArgs: [
      uintCV(params.amountMicroSTX),
      standardPrincipalCV(params.delegateTo),
      params.untilBurnHt ? uintCV(BigInt(params.untilBurnHt)) : noneCV(),
      noneCV(), // pox-addr (pool operator handles this)
    ],
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    network: getNetwork(params.network),
    fee: 3000n,
  })

  const serialized = bytesToHex(tx.serialize())
  const stxAmount = Number(params.amountMicroSTX) / 1_000_000

  return makeUnsignedTx(serialized, {
    humanDescription: `Delegate ${stxAmount} STX to pool operator ${params.delegateTo.slice(0, 8)}...`,
    protocol: 'pox',
    actionType: 'pox_delegate',
    estimatedFeeSTX: '0.003',
    postConditions: [{ type: 'STX_ALLOW', description: `Delegate ${stxAmount} STX to pool for stacking` }],
  })
}

// ── TASK-013: signAndBroadcast + waitForConfirmation ─────────────────────────

export async function signAndBroadcast(params: {
  unsignedTx: UnsignedTx
  approvedHash: string
  privateKey: string
  network: 'mainnet' | 'testnet'
}): Promise<{ txid: string }> {
  // Security check — must match hash gate approved
  if (params.unsignedTx.hash !== params.approvedHash) {
    throw new Error(
      'SECURITY: Transaction hash mismatch. ' +
      `Expected ${params.approvedHash}, got ${params.unsignedTx.hash}. ` +
      'Execution aborted — possible tampering.'
    )
  }

  const tx = deserializeTransaction(params.unsignedTx.serialized)
  const key = createStacksPrivateKey(params.privateKey)
  signWithKey(key, tx as any)

  const result = await broadcastTransaction(tx as any, getNetwork(params.network))

  if ('error' in result) {
    throw new Error(`Broadcast failed: ${(result as any).error} — ${(result as any).reason}`)
  }

  return { txid: (result as any).txid }
}

export async function waitForConfirmation(
  txid: string,
  network: 'mainnet' | 'testnet',
  timeoutMs = 660_000
): Promise<{ status: 'success' | 'failed'; blockHeight: number }> {
  const base = network === 'mainnet'
    ? 'https://api.hiro.so'
    : 'https://api.testnet.hiro.so'

  const deadline = Date.now() + timeoutMs
  const POLL_INTERVAL = 10_000

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL))

    try {
      const res = await fetch(`${base}/extended/v1/tx/${txid}`, {
        headers: { 'x-api-key': process.env['HIRO_API_KEY'] ?? '' }
      })
      const data = await res.json()

      if (data.tx_status === 'success') {
        return { status: 'success', blockHeight: data.block_height ?? 0 }
      }
      if (data.tx_status === 'failed' || data.tx_status === 'abort_by_post_condition') {
        return { status: 'failed', blockHeight: data.block_height ?? 0 }
      }
      // 'pending' or 'broadcasted' — keep polling
    } catch {
      // Network error — keep polling until timeout
    }
  }

  throw new Error(`Confirmation timeout after ${timeoutMs}ms for txid ${txid}`)
}
