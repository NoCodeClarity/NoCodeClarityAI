import { useWallet } from '../lib/wallet-context'
import { Navbar } from '../components/Navbar'
import { OnboardingFlow } from '../components/OnboardingFlow'
import { PortfolioSidebar } from '../components/PortfolioSidebar'
import { ExecutionFeed } from '../components/ExecutionFeed'
import { CommandPanel } from '../components/CommandPanel'

export function Console() {
  const { connected, strategyId } = useWallet()

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
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Portfolio Sidebar */}
        <aside className="hidden lg:block w-[320px] flex-shrink-0">
          <PortfolioSidebar />
        </aside>

        {/* Center: Live Execution Feed */}
        <main className="flex-1 flex flex-col min-w-0">
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
        <aside className="hidden md:block w-[360px] flex-shrink-0">
          <CommandPanel />
        </aside>
      </div>
    </div>
  )
}
