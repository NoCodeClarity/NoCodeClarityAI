import { useWallet } from '../lib/wallet-context'
import { Navbar } from '../components/Navbar'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { OnboardingFlow } from '../components/OnboardingFlow'
import { PortfolioSidebar } from '../components/PortfolioSidebar'
import { ExecutionFeed } from '../components/ExecutionFeed'
import { CommandPanel } from '../components/CommandPanel'
import { SBTCPanel } from '../components/SBTCPanel'
import { useState } from 'react'
import { BarChart3, Terminal as TerminalIcon, ArrowDownUp } from 'lucide-react'

type MobileTab = 'feed' | 'command' | 'portfolio'

export function Console() {
  const { connected, strategyId } = useWallet()
  const [mobileTab, setMobileTab] = useState<MobileTab>('feed')

  // Show onboarding if no wallet or no strategy selected
  if (!connected || !strategyId) {
    return (
      <div className="min-h-screen flex flex-col bg-[hsl(var(--background))]">
        <Navbar />
        <OnboardingFlow />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[hsl(var(--background))] overflow-hidden">
      <Navbar />

      {/* Mobile Tab Bar */}
      <div className="flex lg:hidden border-b border-[hsl(var(--border)/0.3)]">
        {([
          { id: 'feed' as MobileTab, label: 'Feed', icon: TerminalIcon },
          { id: 'command' as MobileTab, label: 'Command', icon: ArrowDownUp },
          { id: 'portfolio' as MobileTab, label: 'Portfolio', icon: BarChart3 },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMobileTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium transition-colors ${
              mobileTab === id
                ? 'text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))]'
                : 'text-[hsl(var(--muted-foreground))]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Desktop 3-panel layout */}
      <div className="flex-1 hidden lg:flex overflow-hidden">
        {/* Left: Portfolio Sidebar */}
        <aside className="w-[320px] flex-shrink-0 overflow-y-auto">
          <PortfolioSidebar />
          <div className="p-4">
            <ErrorBoundary>
              <SBTCPanel />
            </ErrorBoundary>
          </div>
        </aside>

        {/* Center: Live Execution Feed */}
        <main className="flex-1 flex flex-col min-w-0 border-x border-[hsl(var(--border)/0.3)]">
          <div className="bg-[hsl(var(--secondary)/0.3)] border-b border-[hsl(var(--border))] px-6 py-3 flex items-center justify-between">
            <h2 className="text-xs font-mono font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
              Live Execution Feed
            </h2>
            <div className="flex gap-2 items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-500 font-mono">MONITORING</span>
            </div>
          </div>
          <ExecutionFeed />
        </main>

        {/* Right: Command Panel */}
        <aside className="w-[360px] flex-shrink-0">
          <CommandPanel />
        </aside>
      </div>

      {/* Mobile single-panel layout */}
      <div className="flex-1 lg:hidden overflow-y-auto">
        {mobileTab === 'feed' && (
          <ErrorBoundary>
            <div className="bg-[hsl(var(--secondary)/0.3)] border-b border-[hsl(var(--border))] px-4 py-3 flex items-center justify-between">
              <h2 className="text-xs font-mono font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Live Execution Feed
              </h2>
              <div className="flex gap-2 items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-500 font-mono">LIVE</span>
              </div>
            </div>
            <ExecutionFeed />
          </ErrorBoundary>
        )}
        {mobileTab === 'command' && (
          <ErrorBoundary>
            <CommandPanel />
            <div className="p-4">
              <SBTCPanel />
            </div>
          </ErrorBoundary>
        )}
        {mobileTab === 'portfolio' && (
          <ErrorBoundary>
            <PortfolioSidebar />
          </ErrorBoundary>
        )}
      </div>
    </div>
  )
}
