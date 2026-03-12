import { useQuery } from '@tanstack/react-query'
import { fetchTasks } from '../lib/api'
import { StatusBadge } from './StatusBadge'
import { format } from 'date-fns'
import { Hash, Clock, ExternalLink, Bot } from 'lucide-react'

export function ExecutionFeed() {
  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    refetchInterval: 5000,
  })

  if (isLoading) {
    return (
      <div className="p-8 text-center text-[hsl(var(--muted-foreground))] font-mono text-sm animate-pulse">
        Loading agent telemetry...
      </div>
    )
  }

  const tasks = data?.tasks || []

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
          <Bot className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">Swarm is Idle</h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-md">
          Agents are standing by. Submit a natural language goal on the right to trigger the analysis and execution pipeline.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[hsl(260,20%,3%)]">
      <div className="max-w-4xl mx-auto space-y-6">
        {tasks.map((task) => (
          <div key={task.id} className="terminal-box relative overflow-hidden group">
            {/* Left accent line */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[hsl(var(--primary)/0.5)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/5">
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-2 mb-1">
                  <Hash className="w-3 h-3" /> {task.id.slice(0, 8)}
                  <span className="text-white/20">•</span>
                  <Clock className="w-3 h-3" /> {format(new Date(task.createdAt), 'MMM d, HH:mm')}
                </p>
                <p className="text-base text-white font-medium">"{task.goal}"</p>
              </div>
              <div className="flex items-center gap-3">
                {task.txid && (
                  <a
                    href={`https://explorer.hiro.so/txid/${task.txid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center gap-1"
                  >
                    TXID <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <StatusBadge status={task.status} />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {task.steps.map((step, i) => (
                <div key={i} className="flex gap-4 items-start text-xs">
                  <div className="w-24 flex-shrink-0 pt-0.5 text-[hsl(var(--muted-foreground))] text-right">
                    {format(new Date(step.ts), 'HH:mm:ss')}
                  </div>
                  <div className="flex-1 border-l-2 border-white/10 pl-4 pb-4 relative">
                    <div className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ${
                      step.status === 'error' ? 'bg-red-500'
                        : step.status === 'success' ? 'bg-emerald-500'
                        : 'bg-[hsl(var(--primary))]'
                    }`} />
                    <span className="font-semibold text-white/80 mr-2">[{step.agent}]</span>
                    <span className="text-[hsl(var(--muted-foreground))]">{step.action}</span>
                    {step.detail && (
                      <div className="mt-2 p-2 bg-black/40 rounded border border-white/5 text-white/60 whitespace-pre-wrap font-mono text-[10px]">
                        {step.detail}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading indicator for active tasks */}
              {['pending', 'analyzing', 'gating', 'executing', 'confirming'].includes(task.status) && (
                <div className="flex gap-4 items-start text-xs opacity-50 animate-pulse">
                  <div className="w-24 flex-shrink-0 text-right">...</div>
                  <div className="flex-1 border-l-2 border-white/10 pl-4 relative">
                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[hsl(var(--primary))]" />
                    <span className="text-[hsl(var(--muted-foreground))]">Agents are working...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
