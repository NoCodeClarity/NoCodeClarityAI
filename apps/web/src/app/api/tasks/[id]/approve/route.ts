import { NextRequest, NextResponse } from 'next/server'

const ORCHESTRATOR = process.env['ORCHESTRATOR_URL'] ?? 'http://localhost:3001'
const SECRET = process.env['ORCHESTRATOR_SECRET'] ?? ''

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const res = await fetch(`${ORCHESTRATOR}/tasks/${params.id}/approve`, {
    method: 'POST',
    headers: { 'x-orchestrator-secret': SECRET },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
