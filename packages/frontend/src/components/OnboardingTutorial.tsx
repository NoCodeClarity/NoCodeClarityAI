// ── Onboarding Tutorial ──────────────────────────────────────────────────────
import { useState } from 'react'
import { useWallet } from '../lib/wallet-context'
import { Sparkles, ArrowRight, Terminal, Layers, Shield, Zap, X } from 'lucide-react'

interface TutorialStep {
  icon: typeof Sparkles
  title: string
  description: string
  example?: string
}

const STEPS: TutorialStep[] = [
  {
    icon: Terminal,
    title: 'Type a Goal in Plain English',
    description: 'Tell the agents what you want to do. They handle the complexity.',
    example: '"Swap 10 STX for sBTC on ALEX"',
  },
  {
    icon: Shield,
    title: 'AI Risk Gate Protects You',
    description: 'Every transaction is scored for risk. If it exceeds your threshold, it\'s blocked automatically.',
  },
  {
    icon: Layers,
    title: 'Review & Approve',
    description: 'See the unsigned transaction, post-conditions, and estimated fees before anything touches the chain.',
  },
  {
    icon: Zap,
    title: 'Set & Forget with Triggers',
    description: 'Create chain triggers to auto-execute goals when conditions are met — like "swap to STX if sBTC peg drops below 90%".',
  },
]

export function OnboardingTutorial() {
  const { connected } = useWallet()
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('ncc_tutorial_dismissed') === 'true')
  const [step, setStep] = useState(0)

  if (!connected || dismissed) return null

  const currentStep = STEPS[step]
  const Icon = currentStep.icon
  const isLast = step === STEPS.length - 1

  function handleDismiss() {
    setDismissed(true)
    localStorage.setItem('ncc_tutorial_dismissed', 'true')
  }

  return (
    <div className="relative mx-4 mt-4 mb-2">
      <div className="glass-panel rounded-2xl p-6 border-2 border-[hsl(var(--primary)/0.3)] relative overflow-hidden">
        {/* Gradient accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))]" />

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-[hsl(var(--primary)/0.2)] text-[hsl(var(--primary))] rounded-2xl flex items-center justify-center shrink-0">
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono">STEP {step + 1}/{STEPS.length}</span>
              <Sparkles className="w-3 h-3 text-[hsl(var(--accent))]" />
              <span className="text-xs text-[hsl(var(--accent))] font-medium">Getting Started</span>
            </div>
            <h3 className="text-white font-semibold text-lg mb-1">{currentStep.title}</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">{currentStep.description}</p>
            {currentStep.example && (
              <div className="bg-black/30 rounded-lg px-3 py-2 border border-[hsl(var(--border)/0.3)] font-mono text-sm text-[hsl(var(--primary))] mb-3">
                {currentStep.example}
              </div>
            )}
            <div className="flex items-center gap-3">
              {/* Dots */}
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-[hsl(var(--primary))] w-5' : 'bg-[hsl(var(--muted)/0.5)]'}`}
                  />
                ))}
              </div>
              <div className="flex-1" />
              {isLast ? (
                <button
                  onClick={handleDismiss}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white font-medium text-sm shadow-lg"
                >
                  Start Building <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setStep(s => s + 1)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(var(--primary)/0.2)] text-[hsl(var(--primary))] text-sm font-medium hover:bg-[hsl(var(--primary)/0.3)] transition-colors"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
