import { Link, useLocation } from 'wouter'
import { useWallet } from '../lib/wallet-context'
import { truncateAddress } from '../lib/utils'
import { NetworkToggle } from './NetworkToggle'
import { ThemeToggle } from './ThemeToggle'
import { Activity, Vault, Terminal, Wifi, WifiOff, LogOut, Layers, Zap, ShoppingBag, BarChart3, Menu, X } from 'lucide-react'
import { useState } from 'react'

export function Navbar() {
  const [location] = useLocation()
  const { address, connected, disconnect } = useWallet()
  const [mobileOpen, setMobileOpen] = useState(false)

  const links = [
    { href: '/', label: 'Console', icon: Terminal },
    { href: '/activity', label: 'Activity', icon: Activity },
    { href: '/vault', label: 'Vault', icon: Vault },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/stacking', label: 'Stacking', icon: Layers },
    { href: '/triggers', label: 'Triggers', icon: Zap },
    { href: '/strategies', label: 'Strategies', icon: ShoppingBag },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b border-[hsl(var(--border)/0.5)] bg-[hsl(var(--background)/0.8)] backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 md:px-6 h-14">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-[hsl(var(--primary)/0.3)]">
            ✕
          </div>
          <span className="font-bold text-[hsl(var(--foreground))] tracking-tight hidden sm:inline">
            NoCodeClarity <span className="text-[hsl(var(--accent))]">AI</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden xl:flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <span className={`
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer
                ${location === href
                  ? 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)]'
                }
              `}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </span>
            </Link>
          ))}
        </div>

        {/* Right: Theme + Network + Wallet + Mobile Menu */}
        <div className="flex items-center gap-1.5">
          <div className="hidden md:block"><ThemeToggle /></div>
          <div className="hidden md:block"><NetworkToggle /></div>
          {connected ? (
            <>
              <div className="flex items-center gap-2 bg-[hsl(var(--secondary))] px-3 py-1.5 rounded-full border border-[hsl(var(--border))] text-xs sm:text-sm">
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span className="font-mono text-[hsl(var(--foreground))]">{truncateAddress(address)}</span>
              </div>
              <button
                onClick={disconnect}
                className="hidden sm:block p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
                title="Disconnect"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
              <WifiOff className="w-3 h-3" />
              <span>Not connected</span>
            </div>
          )}
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="xl:hidden p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="xl:hidden border-t border-[hsl(var(--border)/0.3)] bg-[hsl(var(--background)/0.95)] backdrop-blur-xl p-4 space-y-2">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <span
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer
                  ${location === href
                    ? 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.3)]'
                  }
                `}
              >
                <Icon className="w-4 h-4" /> {label}
              </span>
            </Link>
          ))}
          <div className="pt-2 border-t border-[hsl(var(--border)/0.3)] flex items-center gap-2">
            <ThemeToggle />
            <NetworkToggle />
          </div>
          {connected && (
            <button
              onClick={() => { disconnect(); setMobileOpen(false) }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 w-full"
            >
              <LogOut className="w-4 h-4" /> Disconnect
            </button>
          )}
        </div>
      )}
    </nav>
  )
}
