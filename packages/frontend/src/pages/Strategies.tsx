// ── Strategy Marketplace ─────────────────────────────────────────────────────
import { useState } from 'react'
import { Navbar } from '../components/Navbar'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { ShoppingBag, Download, Upload, Shield, Flame, BarChart3, Copy, CheckCircle2 } from 'lucide-react'

interface CommunityStrategy {
  id: string
  name: string
  template: string
  risk: 'low' | 'medium' | 'high'
  description: string
  author: string
  uses: number
}

const COMMUNITY_STRATEGIES: CommunityStrategy[] = [
  { id: 'conservative', name: 'Capital Preservation', template: 'stack_pox', risk: 'low', description: 'PoX stacking only — lock STX for BTC rewards with minimal risk.', author: 'NoCodeClarity', uses: 1240 },
  { id: 'yield', name: 'Yield Optimizer', template: 'deposit_yield', risk: 'medium', description: 'Auto-compound Zest lending yields with sBTC peg monitoring.', author: 'NoCodeClarity', uses: 890 },
  { id: 'balanced', name: 'Balanced Growth', template: 'swap', risk: 'medium', description: 'Diversified swaps across ALEX, Velar, and Bitflow with slippage guards.', author: 'NoCodeClarity', uses: 650 },
  { id: 'aggressive', name: 'Alpha Hunter', template: 'swap', risk: 'high', description: 'Multi-protocol arbitrage across all 7 protocols. High reward, high risk.', author: 'Community', uses: 320 },
  { id: 'peg_guardian', name: 'Peg Guardian', template: 'swap', risk: 'low', description: 'Monitors sBTC peg — swaps to STX when peg drops below 90%.', author: 'Community', uses: 210 },
  { id: 'stacker', name: 'Auto-Stacker', template: 'stack_pox', risk: 'low', description: 'Automatically re-delegates STX as cycles end. Set and forget.', author: 'Community', uses: 180 },
]

const riskColors = {
  low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  high: 'text-red-400 bg-red-500/10 border-red-500/20',
}

const riskIcons = { low: Shield, medium: BarChart3, high: Flame }

export function Strategies() {
  const [imported, setImported] = useState<string | null>(null)
  const [shareCode, setShareCode] = useState('')

  function handleImport(id: string) {
    setImported(id)
    setTimeout(() => setImported(null), 2000)
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />
      <main className="max-w-5xl mx-auto p-4 md:p-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <ShoppingBag className="w-8 h-8 text-[hsl(var(--primary))]" /> Strategy Marketplace
            </h1>
            <p className="text-[hsl(var(--muted-foreground))]">
              Browse, import, and share risk-managed DeFi strategies.
            </p>
          </div>
          {/* Import by share code */}
          <div className="flex gap-2">
            <input
              value={shareCode}
              onChange={(e) => setShareCode(e.target.value)}
              placeholder="Paste share code..."
              className="px-4 py-2 rounded-xl bg-black/40 border border-[hsl(var(--border))] text-white placeholder-[hsl(var(--muted-foreground))] text-sm w-48 focus:outline-none focus:border-[hsl(var(--primary))]"
            />
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(var(--primary)/0.2)] text-[hsl(var(--primary))] text-sm font-medium hover:bg-[hsl(var(--primary)/0.3)] transition-colors">
              <Download className="w-4 h-4" /> Import
            </button>
          </div>
        </div>

        <ErrorBoundary>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {COMMUNITY_STRATEGIES.map(strategy => {
              const RiskIcon = riskIcons[strategy.risk]
              return (
                <div key={strategy.id} className="glass-panel rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-[hsl(var(--primary)/0.3)] transition-colors">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-semibold">{strategy.name}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${riskColors[strategy.risk]}`}>
                        <RiskIcon className="w-3 h-3" /> {strategy.risk}
                      </span>
                    </div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">{strategy.description}</p>
                    <div className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                      <span>by {strategy.author}</span>
                      <span>·</span>
                      <span>{strategy.uses.toLocaleString()} uses</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleImport(strategy.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] text-sm font-medium hover:bg-[hsl(var(--primary)/0.25)] transition-colors"
                    >
                      {imported === strategy.id ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                      {imported === strategy.id ? 'Imported!' : 'Use Strategy'}
                    </button>
                    <button className="p-2.5 rounded-xl border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white transition-colors" title="Copy share code">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </ErrorBoundary>
      </main>
    </div>
  )
}
