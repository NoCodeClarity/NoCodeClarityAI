'use client'

import { useState, useEffect } from 'react'

export default function VaultPage() {
  const [strategies, setStrategies] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/strategies').then(r => r.json()).then(d => setStrategies(d.strategies ?? []))
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 pt-16">
      <h1 className="text-xl font-semibold mb-2">Vault</h1>
      <p className="text-zinc-500 text-sm mb-6">Strategy configuration and risk settings.</p>

      {strategies.length === 0 && (
        <p className="text-zinc-500 text-sm">No strategies configured.</p>
      )}

      {strategies.map(s => (
        <div key={s.id} className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 mb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-medium text-zinc-200">{s.name}</p>
              <p className="text-xs text-zinc-500">{s.template} · {s.mode}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              s.active ? 'bg-emerald-900/30 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
            }`}>
              {s.active ? 'Active' : 'Paused'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-zinc-950 rounded p-2">
              <p className="text-zinc-500">Auto-execute under</p>
              <p className="text-zinc-200 font-mono">{s.risk_config?.autoExecuteLimitBTC} BTC</p>
            </div>
            <div className="bg-zinc-950 rounded p-2">
              <p className="text-zinc-500">Mode</p>
              <p className="text-zinc-200 font-mono">{s.risk_config?.mode}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
