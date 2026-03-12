import { useState } from 'react'
import { useWallet } from '../lib/wallet-context'
import { Wallet, Zap, TrendingUp, Shield, ArrowRight, Sparkles } from 'lucide-react'

const STRATEGIES = [
  { id: 'yield', name: 'Yield Optimizer', desc: 'Maximize returns across Zest, Arkadiko, and stacking pools', icon: TrendingUp, bg: 'bg-emerald-500/20', color: 'text-emerald-400' },
  { id: 'balanced', name: 'Balanced Growth', desc: 'Split between yield and trading with moderate risk tolerance', icon: Zap, bg: 'bg-[hsl(var(--primary)/0.2)]', color: 'text-[hsl(var(--primary))]' },
  { id: 'conservative', name: 'Capital Preservation', desc: 'Prioritize safety — stacking and low-risk lending only', icon: Shield, bg: 'bg-amber-500/20', color: 'text-amber-400' },
]

export function OnboardingFlow() {
  const { connect, connected, address, setStrategyId, strategyId } = useWallet()
  const [step, setStep] = useState(connected ? 2 : 1)
  const [selectedStrategy, setSelectedStrategy] = useState(strategyId || '')

  const handleDeploy = () => {
    if (selectedStrategy) {
      setStrategyId(selectedStrategy)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center shadow-2xl shadow-[hsl(var(--primary)/0.4)]">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Welcome to <span className="text-[hsl(var(--accent))]">NoCodeClarity</span>
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
            Autonomous agent swarm for Bitcoin DeFi on Stacks. Connect your wallet, choose a strategy, and let the agents work.
          </p>
        </div>

        {/* Steps */}
        <div className="glass-panel rounded-2xl p-8 space-y-6">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-[hsl(var(--primary))] text-white' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>1</div>
            <div className="w-12 h-0.5 bg-[hsl(var(--border))]" />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-[hsl(var(--primary))] text-white' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>2</div>
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <Wallet className="w-12 h-12 text-[hsl(var(--primary))] mx-auto mb-3" />
                <h2 className="text-xl font-bold text-white mb-2">Connect Wallet</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Use Leather or Xverse — your keys never leave the browser.
                </p>
              </div>
              <button
                onClick={() => {
                  connect()
                  // If already connected via localStorage, skip to step 2
                  if (connected) setStep(2)
                  else {
                    // showConnect is async via callback — watch for address change
                    const check = setInterval(() => {
                      if (localStorage.getItem('ncc_address')) {
                        clearInterval(check)
                        setStep(2)
                      }
                    }, 500)
                    setTimeout(() => clearInterval(check), 60000)
                  }
                }}
                className="w-full h-14 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white font-semibold text-lg shadow-lg shadow-[hsl(var(--primary)/0.3)] hover:shadow-[hsl(var(--primary)/0.5)] transition-all active:scale-[0.98]"
              >
                Connect with Leather / Xverse
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-white mb-2">Choose Strategy</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  How should the agent swarm manage your portfolio?
                </p>
              </div>
              <div className="space-y-3">
                {STRATEGIES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStrategy(s.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedStrategy === s.id
                        ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]'
                        : 'border-[hsl(var(--border)/0.5)] bg-[hsl(var(--card)/0.5)] hover:bg-[hsl(var(--card))]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-lg ${s.bg} ${s.color}`}>
                        <s.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{s.name}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{s.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={handleDeploy}
                disabled={!selectedStrategy}
                className="w-full h-14 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white font-semibold text-lg shadow-lg shadow-[hsl(var(--primary)/0.3)] hover:shadow-[hsl(var(--primary)/0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Deploy Strategy <ArrowRight className="w-5 h-5" />
              </button>
              {connected && (
                <button onClick={() => setStep(1)} className="w-full text-center text-sm text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
                  Back to Wallet
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
