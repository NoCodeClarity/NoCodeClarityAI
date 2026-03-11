'use client'

import { useState } from 'react'
import { SimpleOnboarding } from '../components/dashboard/SimpleOnboarding'
import { AdvancedDashboard } from '../components/dashboard/AdvancedDashboard'
import { useSwarmStream } from '../lib/useSwarmStream'

export default function Home() {
  const [onboarded, setOnboarded] = useState(false)
  const { tasks, connected } = useSwarmStream()

  if (!onboarded) {
    return <SimpleOnboarding onComplete={() => setOnboarded(true)} />
  }

  return (
    <div className="relative">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-12 bg-zinc-950/90 backdrop-blur border-b border-zinc-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-zinc-200">NoCodeClarity AI</h1>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
        </div>
        <div className="flex items-center gap-4">
          <a href="/activity" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Activity</a>
          <a href="/vault" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Vault</a>
          <button
            onClick={async () => {
              await fetch('/api/pause', { method: 'POST' })
            }}
            className="px-3 py-1 text-xs rounded bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
          >
            ⏸ Kill Switch
          </button>
        </div>
      </div>

      <AdvancedDashboard tasks={tasks} />
    </div>
  )
}
