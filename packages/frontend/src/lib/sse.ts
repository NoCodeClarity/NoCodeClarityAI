// ── SSE Hook ─────────────────────────────────────────────────────────────────
// Connects to the orchestrator's /stream SSE endpoint and updates React Query
// cache in real-time, replacing polling for instant UI updates.

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export interface SwarmEvent {
  type: string
  taskId: string
  data: any
  timestamp: number
}

export function useSwarmSSE(enabled: boolean) {
  const queryClient = useQueryClient()
  const sourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!enabled) return

    const source = new EventSource('/api/../stream')
    sourceRef.current = source

    source.onmessage = (event) => {
      try {
        const parsed: SwarmEvent = JSON.parse(event.data)

        // Invalidate task queries on any task event
        if (parsed.type.startsWith('task:')) {
          queryClient.invalidateQueries({ queryKey: ['tasks'] })
        }

        // Invalidate snapshot on completion (balances changed)
        if (parsed.type === 'task:complete') {
          queryClient.invalidateQueries({ queryKey: ['snapshot'] })
        }
      } catch {
        // Ignore parse errors (heartbeats, etc.)
      }
    }

    source.onerror = () => {
      // Auto-reconnect is handled by EventSource
      console.warn('SSE connection error — will auto-reconnect')
    }

    return () => {
      source.close()
      sourceRef.current = null
    }
  }, [enabled, queryClient])
}
