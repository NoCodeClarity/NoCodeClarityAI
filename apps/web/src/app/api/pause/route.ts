import { NextResponse } from 'next/server'

const ORCHESTRATOR = process.env['ORCHESTRATOR_URL'] ?? 'http://localhost:3001'

export async function POST() {
  const res = await fetch(`${ORCHESTRATOR}/pause`, { method: 'POST' })
  return NextResponse.json(await res.json())
}
