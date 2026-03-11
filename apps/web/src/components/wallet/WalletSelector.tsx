'use client'

import { useWallet, type WalletProvider } from '@/lib/WalletProvider'
import { useState } from 'react'

const WALLETS: { id: WalletProvider; name: string; icon: string; desc: string }[] = [
  { id: 'leather', name: 'Leather', icon: '🟧', desc: 'Stacks wallet by Hiro' },
  { id: 'xverse', name: 'Xverse', icon: '🟣', desc: 'Bitcoin & Stacks wallet' },
]

export function WalletSelector() {
  const { connected, connecting, accounts, activeAccount, provider, connect, disconnect, switchAccount } = useWallet()
  const [showDropdown, setShowDropdown] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async (walletId: WalletProvider) => {
    setError(null)
    try {
      await connect(walletId)
    } catch (e: any) {
      if (e.message !== 'User cancelled wallet connection') {
        setError(`Could not connect to ${walletId}. Make sure the extension is installed.`)
      }
    }
  }

  if (connected && activeAccount) {
    const shortAddr = `${activeAccount.address.slice(0, 6)}...${activeAccount.address.slice(-4)}`
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-600 transition-colors"
        >
          <span className="text-sm">
            {provider === 'leather' ? '🟧' : '🟣'}
          </span>
          <span className="text-zinc-200 text-sm font-mono">{shortAddr}</span>
          <span className="text-zinc-500 text-xs">▼</span>
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-64 rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl z-50">
            {/* Account list */}
            {accounts.length > 1 && (
              <div className="p-2 border-b border-zinc-800">
                <p className="text-xs text-zinc-500 px-2 mb-1">Accounts</p>
                {accounts.map((acc: { address: string }) => (
                  <button
                    key={acc.address}
                    onClick={() => { switchAccount(acc.address); setShowDropdown(false) }}
                    className={`w-full px-2 py-1.5 rounded text-left text-sm ${
                      acc.address === activeAccount.address
                        ? 'bg-orange-500/10 text-orange-400'
                        : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    {`${acc.address.slice(0, 8)}...${acc.address.slice(-6)}`}
                  </button>
                ))}
              </div>
            )}

            {/* Info */}
            <div className="p-2 border-b border-zinc-800 text-xs text-zinc-500">
              <p>Network: {activeAccount.network}</p>
              <p>Provider: {provider}</p>
            </div>

            {/* Disconnect */}
            <div className="p-2">
              <button
                onClick={() => { disconnect(); setShowDropdown(false) }}
                className="w-full px-2 py-1.5 rounded text-sm text-red-400 hover:bg-red-500/10 text-left"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Not connected — show wallet options
  return (
    <div className="space-y-2">
      {WALLETS.map(w => (
        <button
          key={w.id}
          onClick={() => handleConnect(w.id)}
          disabled={connecting}
          className="w-full flex items-center gap-3 p-4 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-all disabled:opacity-50"
        >
          <span className="text-xl">{w.icon}</span>
          <div className="text-left">
            <p className="text-zinc-200 font-medium">{w.name}</p>
            <p className="text-zinc-500 text-xs">{w.desc}</p>
          </div>
          {connecting && <span className="ml-auto text-zinc-500 text-xs">Connecting...</span>}
        </button>
      ))}
      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
    </div>
  )
}
