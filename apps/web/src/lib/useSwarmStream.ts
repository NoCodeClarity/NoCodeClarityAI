'use client'

import { useState, useEffect, useRef } from 'react'
import type { SwarmEvent, Task } from '@nocodeclarity/tools'

export function useSwarmStream(orchestratorUrl?: string) {
  const [events, setEvents] = useState<SwarmEvent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const url = orchestratorUrl ?? process.env['NEXT_PUBLIC_ORCHESTRATOR_URL'] ?? 'http://localhost:3001'
    const es = new EventSource(`${url}/stream`)
    eventSourceRef.current = es

    es.onopen = () => setConnected(true)

    es.onmessage = (e) => {
      try {
        const event: SwarmEvent = JSON.parse(e.data)
        setEvents(prev => [...prev, event])

        // Refresh tasks on key events
        if (['task:created', 'task:complete', 'task:rejected', 'task:failed', 'task:needs_human'].includes(event.type)) {
          fetchTasks()
        }
      } catch {
        // Ignore malformed events
      }
    }

    es.onerror = () => {
      setConnected(false)
    }

    // Initial task fetch
    fetchTasks()

    return () => {
      es.close()
      setConnected(false)
    }
  }, [orchestratorUrl])

  async function fetchTasks() {
    try {
      const res = await fetch('/api/tasks')
      const data = await res.json()
      setTasks(data.tasks ?? [])
    } catch {
      // API may not be available yet
    }
  }

  return { events, tasks, connected, refetchTasks: fetchTasks }
}
