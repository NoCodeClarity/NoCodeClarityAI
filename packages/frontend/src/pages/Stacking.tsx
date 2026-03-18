// ── PoX Stacking Dashboard ───────────────────────────────────────────────────
import { useState } from 'react'
import { useWallet } from '../lib/wallet-context'
import { useQuery } from '@tanstack/react-query'
import { fetchSnapshot, submitGoal } from '../lib/api'
import { formatSTX } from '../lib/utils'
import { Navbar } from '../components/Navbar'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { Layers, Clock, Zap, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

export function Stacking() {
  const { address, connected, strategyId } = useWallet()
  const [cycles, setCycles] = useState(1)
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const { data: snapshot, isLoading } = useQuery({
    queryKey: ['snapshot', address],
    queryFn: () => fetchSnapshot(address),
    enabled: !!address,
  })

  async function handleStack() {
    if (!amount) return
    setSubmitting(true)
    setResult(null)
    try {
      const goal = `Stack ${amount} microSTX for ${cycles} PoX cycle${cycles > 1 ? 's' : ''}`
      await submitGoal(goal, strategyId || 'conservative')
      setResult({ success: true, message: `Stacking request submitted for ${cycles} cycle(s)` })
      setAmount('')
    } catch (e: any) {
      setResult({ success: false, message: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelegate() {
    if (!amount) return
    setSubmitting(true)
    setResult(null)
    try {
      const goal = `Delegate ${amount} microSTX to a stacking pool`
      await submitGoal(goal, strategyId || 'conservative')
      setResult({ success: true, message: 'Delegation request submitted to agent swarm' })
      setAmount('')
    } catch (e: any) {
      setResult({ success: false, message: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />
      <main className="max-w-5xl mx-auto p-4 md:p-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Layers className="w-8 h-8 text-[hsl(var(--primary))]" /> PoX Stacking
          </h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Stack STX to earn BTC rewards through Proof of Transfer.
          </p>
        </div>

        {!connected ? (
          <div className="glass-panel rounded-2xl p-12 text-center text-[hsl(var(--muted-foreground))]">
            Connect a wallet to manage stacking.
          </div>
        ) : isLoading ? (
          <div className="grid md:grid-cols-3 gap-6 animate-pulse">
            <div className="h-40 glass-panel rounded-2xl" />
            <div className="h-40 glass-panel rounded-2xl" />
            <div className="h-40 glass-panel rounded-2xl" />
          </div>
        ) : (
          <ErrorBoundary>
            <div className="space-y-8">
              {/* Status Cards */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="glass-panel rounded-2xl p-6">
                  <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))] mb-3">
                    <Layers className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider font-mono">Available STX</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{formatSTX(snapshot?.stxBalance.available ?? '0')}</p>
                </div>
                <div className="glass-panel rounded-2xl p-6">
                  <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))] mb-3">
                    <Zap className="w-4 h-4 text-[hsl(var(--primary))]" />
                    <span className="text-xs uppercase tracking-wider font-mono">Locked (PoX)</span>
                  </div>
                  <p className="text-3xl font-bold text-[hsl(var(--primary))]">{formatSTX(snapshot?.stxBalance.locked ?? '0')}</p>
                </div>
                <div className="glass-panel rounded-2xl p-6">
                  <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))] mb-3">
                    <Clock className="w-4 h-4 text-[hsl(var(--accent))]" />
                    <span className="text-xs uppercase tracking-wider font-mono">PoX Cycle</span>
                  </div>
                  <p className="text-3xl font-bold text-[hsl(var(--accent))]">#{snapshot?.networkInfo.poxCycle ?? '—'}</p>
                </div>
              </div>

              {/* Stacking Form */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Solo Stack */}
                <div className="glass-panel rounded-2xl p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-white">Solo Stack</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Lock STX directly in PoX-4 for 1–12 cycles.</p>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount in microSTX"
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-[hsl(var(--border))] text-white placeholder-[hsl(var(--muted-foreground))] font-mono text-sm focus:outline-none focus:border-[hsl(var(--primary))] transition-colors"
                  />
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-[hsl(var(--muted-foreground))]">Cycles:</label>
                    <input
                      type="range"
                      min={1}
                      max={12}
                      value={cycles}
                      onChange={(e) => setCycles(Number(e.target.value))}
                      className="flex-1 accent-[hsl(var(--primary))]"
                    />
                    <span className="font-mono text-white text-sm w-6 text-right">{cycles}</span>
                  </div>
                  <button
                    onClick={handleStack}
                    disabled={submitting || !amount}
                    className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.7)] text-white font-semibold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                    Stack for {cycles} cycle{cycles > 1 ? 's' : ''}
                  </button>
                </div>

                {/* Pool Delegate */}
                <div className="glass-panel rounded-2xl p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-white">Pool Delegation</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Delegate to a stacking pool (e.g. Fast Pool). No minimum.</p>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount in microSTX"
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-[hsl(var(--border))] text-white placeholder-[hsl(var(--muted-foreground))] font-mono text-sm focus:outline-none focus:border-[hsl(var(--primary))] transition-colors"
                  />
                  <button
                    onClick={handleDelegate}
                    disabled={submitting || !amount}
                    className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--accent)/0.7)] text-white font-semibold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Delegate to Pool
                  </button>
                </div>
              </div>

              {/* Result */}
              {result && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${result.success ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/20'}`}>
                  {result.success ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  {result.message}
                </div>
              )}
            </div>
          </ErrorBoundary>
        )}
      </main>
    </div>
  )
}
