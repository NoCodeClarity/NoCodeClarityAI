// ── Stacks Signer Health Monitor ──────────────────────────────────────────────
// Monitor Nakamoto signer health and PoX cycle timing.
// Yellow-tier feature: unique to Stacks.

const HIRO_API_MAINNET = 'https://api.hiro.so'
const HIRO_API_TESTNET = 'https://api.testnet.hiro.so'

function getApi(network: 'mainnet' | 'testnet'): string {
  return network === 'mainnet' ? HIRO_API_MAINNET : HIRO_API_TESTNET
}

function getHeaders(): Record<string, string> {
  const key = process.env['HIRO_API_KEY']
  return key ? { 'x-api-key': key } : {}
}

export interface SignerHealth {
  totalSigners: number
  activeSigners: number
  healthPct: number         // 0–100
  currentCycle: number
  currentCycleEnd: number   // block height
  blocksUntilCycleEnd: number
  nextCycleStart: number
  rewardPhase: 'prepare' | 'reward'
  stackingMinimum: string   // in microSTX
}

/**
 * Get the current signer set health and PoX cycle status.
 */
export async function getSignerHealth(
  network: 'mainnet' | 'testnet' = 'testnet'
): Promise<SignerHealth> {
  const api = getApi(network)

  // Get PoX info
  const poxRes = await fetch(`${api}/v2/pox`, { headers: getHeaders() })
  const pox = poxRes.ok ? await poxRes.json() : {}

  // Get chain tip for block height
  const infoRes = await fetch(`${api}/v2/info`, { headers: getHeaders() })
  const info = infoRes.ok ? await infoRes.json() : {}

  const currentHeight = info.stacks_tip_height ?? 0
  const currentCycle = pox.current_cycle?.id ?? 0
  const rewardCycleLength = pox.reward_cycle_length ?? 2100
  const prepareLength = pox.prepare_phase_block_length ?? 100
  const cycleStart = pox.current_cycle?.min_threshold_ustx ? currentHeight : 0

  // Calculate cycle end
  const cycleEnd = (currentCycle + 1) * rewardCycleLength
  const blocksUntilEnd = Math.max(0, cycleEnd - currentHeight)
  const prepareStart = cycleEnd - prepareLength
  const inPrepare = currentHeight >= prepareStart
  const rewardPhase = inPrepare ? 'prepare' : 'reward'

  // Get signer set info (Nakamoto)
  let totalSigners = 0
  let activeSigners = 0

  try {
    const signersRes = await fetch(
      `${api}/extended/v2/pox/cycles/${currentCycle}`,
      { headers: getHeaders() }
    )
    if (signersRes.ok) {
      const signerData = await signersRes.json()
      totalSigners = signerData.total_signers ?? 0
      activeSigners = signerData.total_signers ?? 0 // API may not distinguish
    }
  } catch {
    // Signer API may not be available on testnet
    totalSigners = 0
    activeSigners = 0
  }

  return {
    totalSigners,
    activeSigners,
    healthPct: totalSigners > 0 ? Math.round((activeSigners / totalSigners) * 100) : 0,
    currentCycle,
    currentCycleEnd: cycleEnd,
    blocksUntilCycleEnd: blocksUntilEnd,
    nextCycleStart: cycleEnd + 1,
    rewardPhase,
    stackingMinimum: pox.min_threshold_ustx?.toString() ?? '0',
  }
}
