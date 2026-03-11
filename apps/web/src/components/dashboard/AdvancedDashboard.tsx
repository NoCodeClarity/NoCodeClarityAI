'use client'

import { useState } from 'react'
import { AgentConsole } from '../console/AgentConsole'
import type { Task } from '@nocodeclarity/tools'

export function AdvancedDashboard({ tasks }: { tasks: Task[] }) {
  const [goal, setGoal] = useState('')
  const [strategyId, setStrategyId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submitGoal() {
    if (!goal.trim() || !strategyId) return
    setSubmitting(true)
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, strategyId }),
      })
      setGoal('')
    } catch (e) {
      console.error('Failed to submit goal:', e)
    } finally {
      setSubmitting(false)
    }
  }

  const activeTasks = tasks.filter(t =>
    !['complete', 'rejected', 'failed'].includes(t.status)
  )
  const completedTasks = tasks.filter(t =>
    ['complete', 'rejected', 'failed'].includes(t.status)
  )

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 pt-12">
      {/* Left: Portfolio */}
      <div className="w-72 border-r border-zinc-800 p-6 overflow-y-auto flex-shrink-0">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">
          Portfolio
        </h2>
        <div className="space-y-3">
          <PortfolioItem label="STX" value="—" sub="Available" />
          <PortfolioItem label="sBTC" value="—" sub="Available" />
          <div className="border-t border-zinc-800 pt-3 mt-3">
            <p className="text-xs text-zinc-600 mb-2">Positions</p>
            <PortfolioItem label="Zest" value="—" sub="Deposited" />
            <PortfolioItem label="PoX" value="—" sub="Stacked" />
          </div>
        </div>
      </div>

      {/* Center: Console */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-zinc-800 px-6 py-3 flex items-center gap-3">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Agent Console
          </h2>
          {activeTasks.length > 0 && (
            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
              {activeTasks.length} active
            </span>
          )}
        </div>
        <AgentConsole tasks={tasks} />
      </div>

      {/* Right: Controls */}
      <div className="w-80 border-l border-zinc-800 p-6 flex-shrink-0 space-y-6">
        <div>
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
            Submit Goal
          </h2>
          <textarea
            value={goal}
            onChange={e => setGoal(e.target.value)}
            placeholder={'deposit my sBTC for yield\nstack my STX for 2 cycles\nswap 10 STX for sBTC'}
            className="w-full h-24 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500 resize-none"
          />
          <input
            value={strategyId}
            onChange={e => setStrategyId(e.target.value)}
            placeholder="Strategy ID"
            className="w-full mt-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 focus:outline-none focus:border-orange-500"
          />
          <button
            onClick={submitGoal}
            disabled={!goal.trim() || !strategyId || submitting}
            className="w-full mt-2 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-black text-sm font-medium transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>

        <div>
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
            Recent
          </h2>
          <div className="space-y-2">
            {completedTasks.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  t.status === 'complete' ? 'bg-emerald-500' :
                  t.status === 'rejected' ? 'bg-red-600' : 'bg-zinc-600'
                }`} />
                <span className="text-xs text-zinc-400 truncate">{t.goal}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function PortfolioItem({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-zinc-200">{label}</p>
        <p className="text-xs text-zinc-600">{sub}</p>
      </div>
      <p className="text-sm font-mono text-zinc-300">{value}</p>
    </div>
  )
}
