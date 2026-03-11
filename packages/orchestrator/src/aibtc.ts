/**
 * AIBTC Network registration and heartbeat.
 * TASK-023: Registers the swarm agent with aibtc.com on first run.
 * Sends heartbeat every 5 minutes to signal liveness.
 */

const AIBTC_BASE = 'https://aibtc.com/api'

export async function registerWithAIBTC(params: {
  walletAddress: string
  btcAddress: string
  operatorXHandle?: string
}): Promise<boolean> {
  try {
    const res = await fetch(`${AIBTC_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stx_address: params.walletAddress,
        btc_address: params.btcAddress,
        operator: params.operatorXHandle,
        agent_name: 'NoCodeClarity AI',
        version: '1.0.0',
      }),
    })

    if (res.ok) {
      console.log('✓ Registered with AIBTC network')
      return true
    }

    const err = await res.text()
    console.warn('AIBTC registration failed:', err)
    return false
  } catch (e) {
    console.warn('AIBTC registration error (non-fatal):', e)
    return false
  }
}

export function startHeartbeat(walletAddress: string): ReturnType<typeof setInterval> {
  return setInterval(async () => {
    try {
      await fetch(`${AIBTC_BASE}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress }),
      })
    } catch {
      // Heartbeat failure is non-fatal — agent keeps running
    }
  }, 5 * 60 * 1000) // every 5 minutes
}
