import { useQuery } from '@tanstack/react-query'
import { fetchSnapshot } from '../lib/api'
import { useWallet } from '../lib/wallet-context'
import { formatSTX, formatSBTC } from '../lib/utils'
import { Coins, ShieldCheck, ArrowRight, Layers } from 'lucide-react'

export function PortfolioSidebar() {
  const { address } = useWallet()
  const { data, isLoading, error } = useQuery({
    queryKey: ['snapshot', address],
    queryFn: () => fetchSnapshot(address),
    enabled: !!address,
    refetchInterval: 30000,
  })

  if (isLoading) {
    return (
      <div className="w-full h-full p-6 space-y-6 border-r border-[hsl(var(--border))] bg-[hsl(var(--card)/0.3)]">
        <div className="h-6 w-32 bg-white/10 rounded animate-pulse mb-8" />
        <div className="h-24 w-full bg-white/10 rounded-xl animate-pulse" />
        <div className="h-24 w-full bg-white/10 rounded-xl animate-pulse" />
        <div className="h-48 w-full bg-white/10 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="w-full h-full p-6 border-r border-[hsl(var(--border))] bg-[hsl(var(--card)/0.3)] flex items-center justify-center text-[hsl(var(--muted-foreground))]">
        Failed to load portfolio snapshot.
      </div>
    )
  }

  return (
    <div className="w-full h-full border-r border-[hsl(var(--border))] bg-[hsl(var(--card)/0.2)] overflow-y-auto custom-scrollbar">
      <div className="p-6">
        <h2 className="text-xs font-mono font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-6 flex items-center gap-2">
          <Layers className="w-4 h-4" /> Portfolio Snapshot
        </h2>

        <div className="space-y-4 mb-8">
          {/* STX Balance */}
          <div className="terminal-box bg-[hsl(var(--background)/0.5)]">
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1 flex items-center gap-1">
              <Coins className="w-3 h-3 text-[hsl(var(--primary))]" /> STX Balance
            </p>
            <p className="text-2xl font-bold text-white">{formatSTX(data.stxBalance.total)}</p>
            <div className="flex gap-4 mt-2 pt-2 border-t border-white/5 text-xs text-[hsl(var(--muted-foreground))]">
              <span>Avail: {formatSTX(data.stxBalance.available)}</span>
              <span>Locked: {formatSTX(data.stxBalance.locked)}</span>
            </div>
          </div>

          {/* sBTC Balance */}
          <div className="terminal-box bg-[hsl(var(--background)/0.5)]">
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1 flex items-center gap-1">
              <img src="https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=035" alt="sBTC" className="w-3 h-3 opacity-80" />
              sBTC Balance
            </p>
            <p className="text-2xl font-bold text-white">{formatSBTC(data.sBTCBalance)}</p>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5 text-xs">
              <span className="text-[hsl(var(--muted-foreground))]">Peg Health:</span>
              <span className={`flex items-center gap-1 ${data.sBTCPegHealth.healthScore > 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                <ShieldCheck className="w-3 h-3" /> {data.sBTCPegHealth.ratio}%
              </span>
            </div>
          </div>
        </div>

        {/* Positions */}
        <h3 className="text-xs font-mono font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-4 border-b border-[hsl(var(--border))] pb-2">
          Active Positions
        </h3>
        <div className="space-y-3">
          {data.tokenBalances.length > 0 ? data.tokenBalances.map((t, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-[hsl(var(--border)/0.5)] bg-[hsl(var(--background)/0.3)] hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary)/0.2)] flex items-center justify-center text-[hsl(var(--primary))] font-bold text-xs">
                  {t.symbol[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{t.symbol}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{t.name}</p>
                </div>
              </div>
              <p className="text-sm font-mono text-white">{t.balanceFormatted}</p>
            </div>
          )) : (
            <div className="text-center p-6 border border-dashed border-[hsl(var(--border))] rounded-xl">
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">No active DeFi positions</p>
              <button className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center justify-center w-full gap-1">
                Tell swarm to deploy capital <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
