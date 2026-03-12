import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTasks, submitGoal, approveTask, rejectTask } from '../lib/api'
import { useWallet } from '../lib/wallet-context'
import { Terminal, AlertTriangle, ShieldAlert, Send } from 'lucide-react'

export function CommandPanel() {
  const { strategyId } = useWallet()
  const [goal, setGoal] = useState('')
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    refetchInterval: 5000,
  })

  const pending = data?.tasks.filter(t =>
    t.status === 'awaiting_approval' || t.status === 'needs_human'
  ) || []

  const submit = useMutation({
    mutationFn: () => submitGoal(goal, strategyId),
    onSuccess: () => {
      setGoal('')
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const approve = useMutation({
    mutationFn: approveTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const reject = useMutation({
    mutationFn: rejectTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (goal.trim() && strategyId) submit.mutate()
  }

  return (
    <div className="w-full h-full border-l border-[hsl(var(--border))] bg-[hsl(var(--card)/0.2)] flex flex-col">
      {/* Command Input */}
      <div className="p-6 border-b border-[hsl(var(--border))]">
        <h2 className="text-xs font-mono font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-4 flex items-center gap-2">
          <Terminal className="w-4 h-4" /> Command Swarm
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Swap 10 STX for sBTC and lend it on Zest..."
            className="w-full h-28 resize-none bg-[hsl(var(--background)/0.5)] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.5)] transition-all"
            maxLength={500}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono">
              {goal.length}/500
            </span>
            <button
              type="submit"
              disabled={!goal.trim() || submit.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white text-sm font-semibold shadow-lg shadow-[hsl(var(--primary)/0.2)] hover:shadow-[hsl(var(--primary)/0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              <Send className="w-4 h-4" />
              {submit.isPending ? 'Submitting...' : 'Execute Goal'}
            </button>
          </div>
        </form>
      </div>

      {/* Pending Approvals */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <h2 className="text-xs font-mono font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" /> Action Required
        </h2>

        {pending.length === 0 ? (
          <div className="text-center p-6 border border-dashed border-[hsl(var(--border))] rounded-xl">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No tasks await approval.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((task) => (
              <div key={task.id} className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3 mb-3">
                  <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white line-clamp-2">"{task.goal}"</p>
                    <p className="text-xs text-amber-400/80 mt-1">Risk Gate Triggered</p>
                  </div>
                </div>

                {task.gateResult?.reason && (
                  <div className="bg-black/40 rounded p-2 mb-4 text-xs font-mono text-white/70 border border-white/5">
                    {task.gateResult.reason}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => reject.mutate(task.id)}
                    disabled={reject.isPending || approve.isPending}
                    className="flex-1 h-8 text-xs rounded-lg border border-white/10 text-[hsl(var(--muted-foreground))] hover:bg-white/5 transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => approve.mutate(task.id)}
                    disabled={reject.isPending || approve.isPending}
                    className="flex-1 h-8 text-xs rounded-lg bg-[hsl(var(--accent))] text-black font-semibold hover:opacity-90 transition-colors disabled:opacity-50"
                  >
                    Approve tx
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
