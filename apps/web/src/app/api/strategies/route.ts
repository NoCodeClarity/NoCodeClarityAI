import { NextRequest, NextResponse } from 'next/server'

const ORCHESTRATOR = process.env['ORCHESTRATOR_URL'] ?? 'http://localhost:3001'
const SECRET = process.env['ORCHESTRATOR_SECRET'] ?? ''

export async function GET() {
  const res = await fetch(`${ORCHESTRATOR}/strategies`, {
    headers: { 'x-orchestrator-secret': SECRET }
  })
  return NextResponse.json(await res.json())
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const res = await fetch(`${ORCHESTRATOR}/strategies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-orchestrator-secret': SECRET,
    },
    body: JSON.stringify(body),
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
