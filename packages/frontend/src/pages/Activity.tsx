import { useQuery } from '@tanstack/react-query'
import { fetchTasks } from '../lib/api'
import { Navbar } from '../components/Navbar'
import { StatusBadge } from '../components/StatusBadge'
import { format } from 'date-fns'
import { Hash, ExternalLink, ArrowRight } from 'lucide-react'

export function Activity() {
  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
  })

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />
      <main className="max-w-5xl mx-auto p-6 md:p-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Activity Feed</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Historical ledger of all swarm executions and transactions.
          </p>
        </div>

        <div className="bg-[hsl(var(--card)/0.4)] border border-[hsl(var(--border))] rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-[hsl(var(--muted-foreground))] animate-pulse">
              Loading history...
            </div>
          ) : data?.tasks.length ? (
            <div className="divide-y divide-[hsl(var(--border))]">
              {data.tasks.map((task) => (
                <div key={task.id} className="p-6 hover:bg-white/5 transition-colors flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Hash className="w-4 h-4 text-[hsl(var(--primary))]" />
                      <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">{task.id}</span>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {format(new Date(task.createdAt), 'PP pp')}
                      </span>
                    </div>
                    <p className="text-white font-medium text-lg">"{task.goal}"</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {task.txid && (
                      <a
                        href={`https://explorer.hiro.so/txid/${task.txid}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-sm text-[hsl(var(--primary))] hover:underline"
                      >
                        View TX <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <StatusBadge status={task.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-[hsl(var(--muted-foreground))]">
              No activity history found.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
