// ── Analytics Dashboard ──────────────────────────────────────────────────────
import { useWallet } from '../lib/wallet-context'
import { useQuery } from '@tanstack/react-query'
import { fetchTasks, fetchSnapshot, fetchRecoveryStats } from '../lib/api'
import { Navbar } from '../components/Navbar'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { BarChart3, TrendingUp, CheckCircle2, AlertTriangle, ShieldCheck, Clock, Layers, Activity } from 'lucide-react'

export function Analytics() {
  const { address, connected } = useWallet()

  const { data: taskData } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    enabled: connected,
  })

  const { data: snapshot } = useQuery({
    queryKey: ['snapshot', address],
    queryFn: () => fetchSnapshot(address),
    enabled: !!address,
  })

  const { data: recovery } = useQuery({
    queryKey: ['recovery'],
    queryFn: fetchRecoveryStats,
    enabled: connected,
  })

  const tasks = taskData?.tasks ?? []
  const completed = tasks.filter(t => t.status === 'complete')
  const failed = tasks.filter(t => t.status === 'failed')
  const pending = tasks.filter(t => t.status === 'pending' || t.status === 'awaiting_approval')
  const successRate = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0

  // Calculate average risk score from gate results
  const riskScores = tasks
    .filter(t => t.gateResult && typeof (t.gateResult as any).score === 'number')
    .map(t => (t.gateResult as any).score as number)
  const avgRisk = riskScores.length > 0 ? Math.round(riskScores.reduce((a, b) => a + b, 0) / riskScores.length) : 0

  const stxBalance = snapshot ? Number(snapshot.stxBalance.total) / 1_000_000 : 0
  const lockedStx = snapshot ? Number(snapshot.stxBalance.locked) / 1_000_000 : 0

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />
      <main className="max-w-6xl mx-auto p-4 md:p-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-[hsl(var(--primary))]" /> Analytics
          </h1>
          <p className="text-[hsl(var(--muted-foreground))]">Platform performance and portfolio metrics.</p>
        </div>

        {!connected ? (
          <div className="glass-panel rounded-2xl p-12 text-center text-[hsl(var(--muted-foreground))]">
            Connect a wallet to view analytics.
          </div>
        ) : (
          <ErrorBoundary>
            <div className="space-y-8">
              {/* Top KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPI icon={CheckCircle2} label="Success Rate" value={`${successRate}%`} color="text-emerald-400" />
                <KPI icon={Activity} label="Total Tasks" value={tasks.length.toString()} color="text-[hsl(var(--primary))]" />
                <KPI icon={ShieldCheck} label="Avg Risk Score" value={avgRisk.toString()} color="text-amber-400" />
                <KPI icon={Clock} label="Pending" value={pending.length.toString()} color="text-[hsl(var(--accent))]" />
              </div>

              {/* Portfolio Overview */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="glass-panel rounded-2xl p-6">
                  <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-mono mb-2">Total STX</p>
                  <p className="text-3xl font-bold text-white">{stxBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    {lockedStx > 0 ? `${lockedStx.toLocaleString()} locked in PoX` : 'None locked in PoX'}
                  </p>
                </div>
                <div className="glass-panel rounded-2xl p-6">
                  <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-mono mb-2">sBTC Balance</p>
                  <p className="text-3xl font-bold text-[hsl(var(--accent))]">
                    {snapshot ? (Number(snapshot.sBTCBalance) / 1e8).toFixed(4) : '—'}
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    Peg: {snapshot?.sBTCPegHealth.ratio ?? '—'}%
                  </p>
                </div>
                <div className="glass-panel rounded-2xl p-6">
                  <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-mono mb-2">Recovery Queue</p>
                  <p className="text-3xl font-bold text-white">{recovery?.deadLetterCount ?? 0}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    {recovery?.total ?? 0} total recoveries
                  </p>
                </div>
              </div>

              {/* Task Breakdown */}
              <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[hsl(var(--primary))]" /> Task Breakdown
                </h3>
                <div className="space-y-3">
                  <ProgressBar label="Completed" count={completed.length} total={tasks.length} color="bg-emerald-500" />
                  <ProgressBar label="Failed" count={failed.length} total={tasks.length} color="bg-red-500" />
                  <ProgressBar label="Pending" count={pending.length} total={tasks.length} color="bg-amber-500" />
                </div>
              </div>

              {/* Recent Completed */}
              {completed.length > 0 && (
                <div className="glass-panel rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" /> Recent Completions
                  </h3>
                  <div className="space-y-2">
                    {completed.slice(-5).reverse().map(task => (
                      <div key={task.id} className="flex items-center justify-between py-2 border-b border-[hsl(var(--border)/0.3)] last:border-0">
                        <span className="text-sm text-[hsl(var(--foreground))] truncate max-w-[60%]">{task.goal}</span>
                        <div className="flex items-center gap-2">
                          {task.txid && (
                            <a
                              href={`https://explorer.hiro.so/txid/${task.txid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[hsl(var(--primary))] hover:underline font-mono"
                            >
                              {task.txid.slice(0, 8)}…
                            </a>
                          )}
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ErrorBoundary>
        )}
      </main>
    </div>
  )
}

function KPI({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-mono">{label}</span>
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function ProgressBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-[hsl(var(--muted-foreground))]">{label}</span>
        <span className="text-white font-mono">{count}</span>
      </div>
      <div className="h-2 bg-[hsl(var(--muted)/0.3)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
