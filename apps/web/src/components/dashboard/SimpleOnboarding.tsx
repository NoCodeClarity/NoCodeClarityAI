'use client'

import { useState } from 'react'

const RISK_PROFILES = [
  {
    id: 'conservative',
    label: 'Conservative',
    description: 'Lending only. Lowest risk.',
    icon: '🛡️',
    color: 'border-emerald-500/30 bg-emerald-500/5',
  },
  {
    id: 'moderate',
    label: 'Moderate',
    description: 'Lending + DEX liquidity.',
    icon: '⚖️',
    color: 'border-amber-500/30 bg-amber-500/5',
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    description: 'All protocols. Higher yield, more risk.',
    icon: '🔥',
    color: 'border-red-500/30 bg-red-500/5',
  },
] as const

export function SimpleOnboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<'connect' | 'risk' | 'amount' | 'deploy'>('connect')
  const [connecting, setConnecting] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [risk, setRisk] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate')
  const [threshold, setThreshold] = useState('0.001')

  const selectedProfile = RISK_PROFILES.find(p => p.id === risk)!

  async function connectWallet() {
    setConnecting(true)
    try {
      // Dynamic import to avoid SSR issues
      const { showConnect } = await import('@stacks/connect')
      await new Promise<void>((resolve, reject) => {
        showConnect({
          appDetails: { name: 'NoCodeClarity AI', icon: '/logo.png' },
          onFinish: () => resolve(),
          onCancel: () => reject(new Error('Wallet connection cancelled')),
        })
      })
      setStep('risk')
    } catch (e: any) {
      if (e.message !== 'Wallet connection cancelled') {
        console.error('Wallet connection failed:', e)
      }
    } finally {
      setConnecting(false)
    }
  }

  async function deployStrategy() {
    setDeploying(true)
    try {
      const res = await fetch('/api/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${selectedProfile.label} Strategy`,
          template: `${risk}_yield`,
          mode: 'simple',
          riskConfig: {
            autoExecuteLimitBTC: parseFloat(threshold),
            maxFeePctOfValue: 2,
            minFinalityDepth: 6,
            minPegHealth: 90,
            maxProtocolExposurePct: 40,
            maxSlippagePct: 1,
            requireConfirmForNewProtocol: true,
            requireConfirmForLiquidationRisk: true,
            mode: risk,
          },
          allocations: risk === 'conservative'
            ? { zest: 100 }
            : risk === 'moderate'
            ? { zest: 60, alex: 40 }
            : { zest: 40, alex: 30, arkadiko: 30 },
        }),
      })
      if (!res.ok) throw new Error('Failed to create strategy')
      onComplete()
    } catch (e) {
      console.error('Strategy deployment failed:', e)
    } finally {
      setDeploying(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-100">NoCodeClarity AI</h1>
          <p className="text-zinc-500 mt-1 text-sm">AI agent swarm for Bitcoin on Stacks</p>
        </div>

        {/* Step 1: Connect */}
        {step === 'connect' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-800 p-6 text-center">
              <p className="text-zinc-300 mb-4">Connect your Leather wallet to get started.</p>
              <button
                onClick={connectWallet}
                disabled={connecting}
                className="w-full py-3 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-semibold transition-colors"
              >
                {connecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Risk Profile */}
        {step === 'risk' && (
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm text-center">Choose your risk profile.</p>
            <div className="space-y-2">
              {RISK_PROFILES.map(profile => (
                <button
                  key={profile.id}
                  onClick={() => setRisk(profile.id)}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    risk === profile.id
                      ? profile.color + ' ring-1 ring-offset-1 ring-offset-zinc-950'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{profile.icon}</span>
                    <div>
                      <p className="text-zinc-200 font-medium">{profile.label}</p>
                      <p className="text-zinc-500 text-xs">{profile.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep('amount')}
              className="w-full py-3 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-semibold transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 3: Auto-execute Threshold */}
        {step === 'amount' && (
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm text-center">
              Set the max BTC value the AI can execute without your approval.
            </p>
            <div className="rounded-xl border border-zinc-800 p-6">
              <label className="text-xs text-zinc-500 uppercase tracking-wider">
                Auto-execute limit (BTC)
              </label>
              <input
                type="number"
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
                step="0.001"
                min="0"
                className="w-full mt-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 text-lg font-mono focus:outline-none focus:border-orange-500"
              />
              <p className="text-zinc-600 text-xs mt-2">
                Transactions above this value will require your manual approval.
              </p>
            </div>
            <button
              onClick={() => setStep('deploy')}
              className="w-full py-3 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-semibold transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 4: Deploy */}
        {step === 'deploy' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-800 p-6">
              <h3 className="text-zinc-200 font-medium mb-3">Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Profile</span>
                  <span className="text-zinc-200">{selectedProfile.icon} {selectedProfile.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Auto-execute under</span>
                  <span className="text-zinc-200 font-mono">{threshold} BTC</span>
                </div>
              </div>
            </div>
            <button
              onClick={deployStrategy}
              disabled={deploying}
              className="w-full py-3 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-semibold transition-colors"
            >
              {deploying ? 'Deploying...' : 'Deploy Strategy'}
            </button>
          </div>
        )}

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {['connect', 'risk', 'amount', 'deploy'].map((s, i) => (
            <span
              key={s}
              className={`w-2 h-2 rounded-full ${
                step === s ? 'bg-orange-500' :
                ['connect', 'risk', 'amount', 'deploy'].indexOf(step) > i ? 'bg-orange-500/30' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
