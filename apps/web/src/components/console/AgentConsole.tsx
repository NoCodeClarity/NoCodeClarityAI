'use client'

import type { Task } from '@nocodeclarity/tools'

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-zinc-500',
  analyzing: 'text-blue-400',
  gating: 'text-amber-400',
  needs_human: 'text-orange-400',
  executing: 'text-violet-400',
  confirming: 'text-cyan-400',
  complete: 'text-emerald-400',
  rejected: 'text-red-400',
  failed: 'text-red-500',
  held: 'text-zinc-400',
}

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-zinc-500',
  analyzing: 'bg-blue-400 animate-pulse',
  gating: 'bg-amber-400 animate-pulse',
  needs_human: 'bg-orange-400 animate-pulse',
  executing: 'bg-violet-400 animate-pulse',
  confirming: 'bg-cyan-400 animate-pulse',
  complete: 'bg-emerald-500',
  rejected: 'bg-red-500',
  failed: 'bg-red-600',
  held: 'bg-zinc-500',
}

export function AgentConsole({ tasks }: { tasks: Task[] }) {
  async function approveTask(id: string) {
    try {
      await fetch(`/api/tasks/${id}/approve`, { method: 'POST' })
    } catch (e) {
      console.error('Approval failed:', e)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-3">
      {tasks.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <p className="text-zinc-600 text-sm">No active tasks. Submit a goal to get started.</p>
        </div>
      )}

      {tasks.map(task => (
        <div
          key={task.id}
          className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
        >
          <div className="flex items-start gap-3">
            <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${STATUS_DOT[task.status] ?? 'bg-zinc-500'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-mono uppercase ${STATUS_COLORS[task.status] ?? 'text-zinc-500'}`}>
                  {task.status.replace('_', ' ')}
                </span>
                <span className="text-xs text-zinc-700">
                  {new Date(task.updatedAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-zinc-200">{task.goal}</p>

              {/* Show unsigned tx description if available */}
              {task.unsignedTx && (
                <p className="text-xs text-zinc-500 mt-1">
                  → {task.unsignedTx.humanDescription}
                </p>
              )}

              {/* Show gate result */}
              {task.gateResult && (
                <div className="mt-2 text-xs">
                  <span className={`font-mono ${
                    task.gateResult.decision === 'PROCEED' ? 'text-emerald-400' :
                    task.gateResult.decision === 'NEEDS_HUMAN' ? 'text-orange-400' :
                    task.gateResult.decision === 'REJECT' ? 'text-red-400' : 'text-amber-400'
                  }`}>
                    Gate: {task.gateResult.decision}
                  </span>
                  <span className="text-zinc-600 ml-2">
                    Risk: {task.gateResult.riskScore}/100
                  </span>
                </div>
              )}

              {/* Show txid if available */}
              {task.txid && (
                <a
                  href={`https://explorer.hiro.so/txid/${task.txid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-orange-400 hover:text-orange-300 mt-1 inline-block"
                >
                  {task.txid.slice(0, 12)}... →
                </a>
              )}

              {/* Approve button for needs_human */}
              {task.status === 'needs_human' && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => approveTask(task.id)}
                    className="px-3 py-1 text-xs rounded bg-orange-500 hover:bg-orange-400 text-black font-medium transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    className="px-3 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
