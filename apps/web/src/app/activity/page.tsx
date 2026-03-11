'use client'

import { useState, useEffect } from 'react'
import type { Task } from '@nocodeclarity/tools'

export default function ActivityPage() {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    fetch('/api/tasks').then(r => r.json()).then(d => setTasks(d.tasks ?? []))
  }, [])

  const completed = tasks.filter(t =>
    ['complete', 'rejected', 'failed'].includes(t.status)
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 pt-16">
      <h1 className="text-xl font-semibold mb-6">Activity</h1>
      <div className="space-y-2">
        {completed.length === 0 && (
          <p className="text-zinc-500 text-sm">No completed tasks yet.</p>
        )}
        {completed.map(task => (
          <div key={task.id} className="flex items-center gap-4 p-4 rounded-lg bg-zinc-900 border border-zinc-800">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              task.status === 'complete' ? 'bg-emerald-500' :
              task.status === 'rejected' ? 'bg-amber-500' : 'bg-red-500'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-200 truncate">{task.goal}</p>
              <p className="text-xs text-zinc-500">
                {new Date(task.updatedAt).toLocaleString()}
              </p>
            </div>
            {task.txid && (
              <a
                href={`https://explorer.hiro.so/txid/${task.txid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-orange-400 hover:text-orange-300 flex-shrink-0"
              >
                Explorer →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
