import { NextResponse } from 'next/server'

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL ?? 'http://localhost:3001'
const SECRET = process.env.ORCHESTRATOR_SECRET ?? ''

/**
 * POST /api/wallet/register
 * Bridge: register a frontend-connected wallet address with the orchestrator.
 * This allows the orchestrator to know which wallet the user connected from the UI.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { address, provider, network } = body

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'address is required' }, { status: 400 })
    }

    // Validate Stacks address format
    const prefix = network === 'mainnet' ? 'SP' : 'ST'
    if (!address.startsWith(prefix)) {
      return NextResponse.json(
        { error: `Invalid ${network} address: expected ${prefix}... prefix` },
        { status: 400 }
      )
    }

    // Forward to orchestrator (non-blocking from the UI perspective)
    try {
      await fetch(`${ORCHESTRATOR_URL}/wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-orchestrator-secret': SECRET,
        },
        body: JSON.stringify({ address, provider, network }),
      })
    } catch {
      // Orchestrator may not be running — that's OK for solo/demo mode
    }

    return NextResponse.json({
      registered: true,
      address,
      provider,
      network,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
