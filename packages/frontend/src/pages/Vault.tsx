import { useQuery } from '@tanstack/react-query'
import { fetchSnapshot } from '../lib/api'
import { useWallet } from '../lib/wallet-context'
import { getTokenMeta } from '../lib/tokens'
import { Navbar } from '../components/Navbar'
import { formatSTX, formatSBTC, truncateAddress } from '../lib/utils'
import { Coins, Wallet, ShieldCheck, MoreHorizontal } from 'lucide-react'

export function Vault() {
  const { address, connected } = useWallet()
  const { data, isLoading } = useQuery({
    queryKey: ['snapshot', address],
    queryFn: () => fetchSnapshot(address),
    enabled: !!address,
  })

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />
      <main className="max-w-5xl mx-auto p-6 md:p-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Coins className="w-8 h-8 text-[hsl(var(--primary))]" /> The Vault
            </h1>
            <p className="text-[hsl(var(--muted-foreground))]">
              Comprehensive view of your Stacks DeFi positions.
            </p>
          </div>
          {address && (
            <div className="hidden md:flex items-center gap-2 bg-[hsl(var(--secondary)/0.5)] px-4 py-2 rounded-full border border-[hsl(var(--border))] font-mono text-sm text-white">
              <Wallet className="w-4 h-4 text-[hsl(var(--primary))]" />
              {truncateAddress(address)}
            </div>
          )}
        </div>

        {!connected ? (
          <div className="bg-[hsl(var(--card)/0.4)] border border-[hsl(var(--border))] rounded-2xl p-12 text-center">
            <p className="text-[hsl(var(--muted-foreground))] mb-4">Connect a wallet to view your vault.</p>
          </div>
        ) : isLoading ? (
          <div className="grid md:grid-cols-2 gap-6 animate-pulse">
            <div className="h-48 bg-[hsl(var(--card)/0.4)] rounded-2xl border border-[hsl(var(--border))]" />
            <div className="h-48 bg-[hsl(var(--card)/0.4)] rounded-2xl border border-[hsl(var(--border))]" />
          </div>
        ) : data ? (
          <div className="space-y-8">
            {/* Balance Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* STX Card */}
              <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.5)] bg-gradient-to-br from-[hsl(var(--card)/0.8)] to-[hsl(var(--background))] p-8 shadow-xl">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Coins className="w-32 h-32" />
                </div>
                <h3 className="text-sm font-mono text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">Total STX Value</h3>
                <p className="text-4xl font-bold text-white mb-6">{formatSTX(data.stxBalance.total)}</p>
                <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Liquid</p>
                    <p className="font-mono text-white">{formatSTX(data.stxBalance.available)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Locked (PoX)</p>
                    <p className="font-mono text-white">{formatSTX(data.stxBalance.locked)}</p>
                  </div>
                </div>
              </div>

              {/* sBTC Card */}
              <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.5)] bg-gradient-to-br from-[hsl(var(--accent)/0.1)] to-[hsl(var(--background))] p-8 shadow-xl">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <img src="https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=035" className="w-32 h-32 grayscale" alt="BTC" />
                </div>
                <h3 className="text-sm font-mono text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">Total sBTC Value</h3>
                <p className="text-4xl font-bold text-white mb-6">{formatSBTC(data.sBTCBalance)}</p>
                <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Network Peg Health</p>
                    <p className={`font-mono ${data.sBTCPegHealth.healthScore > 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {data.sBTCPegHealth.ratio}% (Score: {data.sBTCPegHealth.healthScore})
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">PoX Cycle</p>
                    <p className="font-mono text-white">#{data.networkInfo.poxCycle}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Yield Positions Table */}
            <h2 className="text-xl font-bold text-white mt-12 mb-6 border-b border-[hsl(var(--border))] pb-2">
              Yield Positions
            </h2>
            <div className="bg-[hsl(var(--card)/0.4)] border border-[hsl(var(--border))] rounded-2xl overflow-hidden">
              {data.tokenBalances.length === 0 ? (
                <div className="p-12 text-center text-[hsl(var(--muted-foreground))]">
                  No active yield positions found in connected wallet.
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-black/40 border-b border-[hsl(var(--border))] text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-mono">
                    <tr>
                      <th className="p-4 font-medium">Asset</th>
                      <th className="p-4 font-medium">Protocol</th>
                      <th className="p-4 font-medium text-right">Balance</th>
                      <th className="p-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {data.tokenBalances.map((t, i) => {
                      const meta = getTokenMeta(t.symbol)
                      return (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${meta.color} flex items-center justify-center text-white font-bold text-sm`}>
                              {meta.icon}
                            </div>
                            <span className="font-medium text-white">{meta.symbol}</span>
                          </div>
                        </td>
                        <td className="p-4 text-[hsl(var(--muted-foreground))]">{meta.name} <span className="text-xs opacity-60">({meta.protocol})</span></td>
                        <td className="p-4 text-right font-mono text-white">{t.balanceFormatted}</td>
                        <td className="p-4">
                          <button className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-[hsl(var(--card)/0.4)] border border-[hsl(var(--border))] rounded-2xl p-12 text-center text-red-400">
            Failed to load vault data.
          </div>
        )}
      </main>
    </div>
  )
}
