// ── Chain Triggers Page ──────────────────────────────────────────────────────
import { useState } from 'react'
import { useWallet } from '../lib/wallet-context'
import { Navbar } from '../components/Navbar'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { Zap, Plus, Trash2, Bell, Activity } from 'lucide-react'

interface Trigger {
  id: string
  name: string
  condition: { type: string; value: number }
  goal: string
  enabled: boolean
}

const CONDITION_TYPES = [
  { value: 'peg_health_below', label: 'sBTC peg drops below', placeholder: '85' },
  { value: 'peg_health_above', label: 'sBTC peg rises above', placeholder: '95' },
  { value: 'stx_balance_above', label: 'STX balance exceeds', placeholder: '10000000000' },
  { value: 'stx_balance_below', label: 'STX balance drops below', placeholder: '1000000' },
  { value: 'pox_cycle_ending_in', label: 'PoX cycle ends within N blocks', placeholder: '200' },
  { value: 'congestion_level', label: 'Congestion level is', placeholder: '1' },
]

export function Triggers() {
  const { connected } = useWallet()
  const [triggers, setTriggers] = useState<Trigger[]>([])
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [condType, setCondType] = useState(CONDITION_TYPES[0].value)
  const [condValue, setCondValue] = useState('')
  const [goal, setGoal] = useState('')

  function handleCreate() {
    if (!name || !condValue || !goal) return
    const trigger: Trigger = {
      id: crypto.randomUUID(),
      name,
      condition: { type: condType, value: Number(condValue) },
      goal,
      enabled: true,
    }
    setTriggers(prev => [...prev, trigger])
    setName('')
    setCondValue('')
    setGoal('')
    setShowNew(false)
  }

  function handleRemove(id: string) {
    setTriggers(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />
      <main className="max-w-5xl mx-auto p-4 md:p-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Zap className="w-8 h-8 text-[hsl(var(--accent))]" /> Chain Triggers
            </h1>
            <p className="text-[hsl(var(--muted-foreground))]">
              Automated actions when chain conditions are met.
            </p>
          </div>
          <button
            onClick={() => setShowNew(!showNew)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white font-medium text-sm shadow-lg"
          >
            <Plus className="w-4 h-4" /> New Trigger
          </button>
        </div>

        {!connected ? (
          <div className="glass-panel rounded-2xl p-12 text-center text-[hsl(var(--muted-foreground))]">
            Connect a wallet to manage triggers.
          </div>
        ) : (
          <ErrorBoundary>
            <div className="space-y-6">
              {/* New Trigger Form */}
              {showNew && (
                <div className="glass-panel rounded-2xl p-6 space-y-4 border-2 border-[hsl(var(--primary)/0.3)]">
                  <h3 className="text-lg font-semibold text-white">Create Trigger</h3>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Trigger name"
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-[hsl(var(--border))] text-white placeholder-[hsl(var(--muted-foreground))] text-sm focus:outline-none focus:border-[hsl(var(--primary))] transition-colors"
                  />
                  <div className="grid md:grid-cols-2 gap-3">
                    <select
                      value={condType}
                      onChange={(e) => setCondType(e.target.value)}
                      className="px-4 py-3 rounded-xl bg-black/40 border border-[hsl(var(--border))] text-white text-sm focus:outline-none focus:border-[hsl(var(--primary))]"
                    >
                      {CONDITION_TYPES.map(ct => (
                        <option key={ct.value} value={ct.value}>{ct.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={condValue}
                      onChange={(e) => setCondValue(e.target.value)}
                      placeholder={CONDITION_TYPES.find(ct => ct.value === condType)?.placeholder}
                      className="px-4 py-3 rounded-xl bg-black/40 border border-[hsl(var(--border))] text-white placeholder-[hsl(var(--muted-foreground))] font-mono text-sm focus:outline-none focus:border-[hsl(var(--primary))] transition-colors"
                    />
                  </div>
                  <input
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="Goal to execute when triggered (e.g., 'Swap all sBTC for STX')"
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-[hsl(var(--border))] text-white placeholder-[hsl(var(--muted-foreground))] text-sm focus:outline-none focus:border-[hsl(var(--primary))] transition-colors"
                  />
                  <div className="flex gap-3">
                    <button onClick={handleCreate} className="flex-1 px-5 py-3 rounded-xl bg-[hsl(var(--primary))] text-white font-semibold text-sm">Create Trigger</button>
                    <button onClick={() => setShowNew(false)} className="px-5 py-3 rounded-xl border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] text-sm hover:text-white">Cancel</button>
                  </div>
                </div>
              )}

              {/* Trigger List */}
              {triggers.length === 0 && !showNew ? (
                <div className="glass-panel rounded-2xl p-12 text-center space-y-4">
                  <Bell className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto" />
                  <p className="text-[hsl(var(--muted-foreground))]">No triggers configured. Create one to automate chain reactions.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {triggers.map(trigger => (
                    <div key={trigger.id} className="glass-panel rounded-2xl p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent))] rounded-xl flex items-center justify-center">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-white font-medium">{trigger.name}</h4>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            When {trigger.condition.type.replace(/_/g, ' ')} = {trigger.condition.value} → "{trigger.goal}"
                          </p>
                        </div>
                      </div>
                      <button onClick={() => handleRemove(trigger.id)} className="p-2 text-[hsl(var(--muted-foreground))] hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ErrorBoundary>
        )}
      </main>
    </div>
  )
}
