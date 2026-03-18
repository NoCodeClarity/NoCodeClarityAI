// ── Network Toggle ───────────────────────────────────────────────────────────
import { useWallet } from '../lib/wallet-context'
import { Globe, TestTube2 } from 'lucide-react'
import { cn } from '../lib/utils'

export function NetworkToggle() {
  const { network, setNetwork } = useWallet()

  return (
    <div className="flex items-center gap-1 bg-[hsl(var(--secondary)/0.5)] rounded-full p-1 border border-[hsl(var(--border))]">
      <button
        onClick={() => setNetwork('mainnet')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
          network === 'mainnet'
            ? 'bg-[hsl(var(--primary))] text-white shadow-md'
            : 'text-[hsl(var(--muted-foreground))] hover:text-white'
        )}
      >
        <Globe className="w-3 h-3" /> Mainnet
      </button>
      <button
        onClick={() => setNetwork('testnet')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
          network === 'testnet'
            ? 'bg-amber-500 text-white shadow-md'
            : 'text-[hsl(var(--muted-foreground))] hover:text-white'
        )}
      >
        <TestTube2 className="w-3 h-3" /> Testnet
      </button>
    </div>
  )
}
