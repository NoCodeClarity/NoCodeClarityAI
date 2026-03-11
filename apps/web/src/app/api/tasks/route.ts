import { NextRequest, NextResponse } from 'next/server'

const ORCHESTRATOR = process.env['ORCHESTRATOR_URL'] ?? 'http://localhost:3001'
const SECRET = process.env['ORCHESTRATOR_SECRET'] ?? ''

export async function GET() {
  const res = await fetch(`${ORCHESTRATOR}/tasks`, {
    headers: { 'x-orchestrator-secret': SECRET }
  })
  const data = await res.json()
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const res = await fetch(`${ORCHESTRATOR}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-orchestrator-secret': SECRET,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
