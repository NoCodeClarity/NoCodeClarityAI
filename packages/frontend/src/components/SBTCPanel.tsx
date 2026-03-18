// ── sBTC Actions Panel ───────────────────────────────────────────────────────
import { useState } from 'react'
import { useWallet } from '../lib/wallet-context'
import { useQuery } from '@tanstack/react-query'
import { fetchSnapshot, submitGoal } from '../lib/api'
import { formatSBTC, formatSTX } from '../lib/utils'
import { ArrowDownUp, Shield, TrendingUp, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

type SBTCAction = 'deposit' | 'withdraw' | null

export function SBTCPanel() {
  const { address, strategyId, connected } = useWallet()
  const [action, setAction] = useState<SBTCAction>(null)
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const { data: snapshot } = useQuery({
    queryKey: ['snapshot', address],
    queryFn: () => fetchSnapshot(address),
    enabled: !!address,
  })

  async function handleSubmit() {
    if (!amount || !action) return
    setSubmitting(true)
    setResult(null)

    try {
      const goal = action === 'deposit'
        ? `Deposit ${amount} sBTC into the Zest lending pool for yield`
        : `Withdraw ${amount} sBTC from the Zest lending pool`
      await submitGoal(goal, strategyId || 'yield')
      setResult({ success: true, message: `${action === 'deposit' ? 'Deposit' : 'Withdrawal'} submitted to agent swarm` })
      setAmount('')
      setAction(null)
    } catch (e: any) {
      setResult({ success: false, message: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  if (!connected) return null

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent))] rounded-xl flex items-center justify-center">
          <ArrowDownUp className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-white font-semibold">sBTC Actions</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Deposit or withdraw sBTC for yield</p>
        </div>
      </div>

      {/* Balances */}
      {snapshot && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/30 rounded-xl p-3 border border-[hsl(var(--border)/0.3)]">
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">STX Balance</p>
            <p className="font-mono text-white font-medium">{formatSTX(snapshot.stxBalance.available)}</p>
          </div>
          <div className="bg-black/30 rounded-xl p-3 border border-[hsl(var(--border)/0.3)]">
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">sBTC Balance</p>
            <p className="font-mono text-[hsl(var(--accent))] font-medium">{formatSBTC(snapshot.sBTCBalance)}</p>
          </div>
        </div>
      )}

      {/* Peg Health */}
      {snapshot && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/20 border border-[hsl(var(--border)/0.2)]">
          <Shield className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Peg Health</span>
          <span className={`text-xs font-mono ml-auto ${snapshot.sBTCPegHealth.healthScore > 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {snapshot.sBTCPegHealth.ratio}% ({snapshot.sBTCPegHealth.healthScore}/100)
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setAction('deposit')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
            action === 'deposit'
              ? 'bg-[hsl(var(--primary))] text-white shadow-lg'
              : 'bg-[hsl(var(--secondary)/0.5)] text-[hsl(var(--muted-foreground))] hover:text-white border border-[hsl(var(--border))]'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Deposit
        </button>
        <button
          onClick={() => setAction('withdraw')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
            action === 'withdraw'
              ? 'bg-[hsl(var(--accent))] text-white shadow-lg'
              : 'bg-[hsl(var(--secondary)/0.5)] text-[hsl(var(--muted-foreground))] hover:text-white border border-[hsl(var(--border))]'
          }`}
        >
          <ArrowDownUp className="w-4 h-4" /> Withdraw
        </button>
      </div>

      {/* Amount Input */}
      {action && (
        <div className="space-y-3">
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount in sats"
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-[hsl(var(--border))] text-white placeholder-[hsl(var(--muted-foreground))] font-mono text-sm focus:outline-none focus:border-[hsl(var(--primary))] transition-colors"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[hsl(var(--muted-foreground))]">sBTC sats</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || !amount}
            className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white font-semibold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[hsl(var(--primary)/0.5)] transition-all flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {action === 'deposit' ? 'Deposit sBTC for Yield' : 'Withdraw sBTC'}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${result.success ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
          {result.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {result.message}
        </div>
      )}
    </div>
  )
}
