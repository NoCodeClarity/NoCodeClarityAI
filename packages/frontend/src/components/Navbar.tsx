import { Link, useLocation } from 'wouter'
import { useWallet } from '../lib/wallet-context'
import { truncateAddress } from '../lib/utils'
import { Activity, Vault, Terminal, Wifi, WifiOff, LogOut } from 'lucide-react'

export function Navbar() {
  const [location] = useLocation()
  const { address, connected, disconnect } = useWallet()

  const links = [
    { href: '/', label: 'Console', icon: Terminal },
    { href: '/activity', label: 'Activity', icon: Activity },
    { href: '/vault', label: 'Vault', icon: Vault },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b border-[hsl(var(--border)/0.5)] bg-[hsl(var(--background)/0.8)] backdrop-blur-xl">
      <div className="flex items-center justify-between px-6 h-14">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-[hsl(var(--primary)/0.3)]">
            ✕
          </div>
          <span className="font-bold text-white tracking-tight hidden sm:inline">
            NoCodeClarity <span className="text-[hsl(var(--accent))]">AI</span>
          </span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <span className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer
                ${location === href
                  ? 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-[hsl(var(--muted)/0.5)]'
                }
              `}>
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{label}</span>
              </span>
            </Link>
          ))}
        </div>

        {/* Wallet */}
        <div className="flex items-center gap-3">
          {connected ? (
            <>
              <div className="flex items-center gap-2 bg-[hsl(var(--secondary))] px-3 py-1.5 rounded-full border border-[hsl(var(--border))] text-sm">
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span className="font-mono text-white">{truncateAddress(address)}</span>
              </div>
              <button
                onClick={disconnect}
                className="p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
                title="Disconnect"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
              <WifiOff className="w-3 h-3" />
              <span className="hidden sm:inline">Not connected</span>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
