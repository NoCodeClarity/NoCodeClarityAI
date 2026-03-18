// ── SSE Hook ─────────────────────────────────────────────────────────────────
// Connects to the orchestrator's /stream SSE endpoint and updates React Query
// cache in real-time, replacing polling for instant UI updates.
// Also fires toast notifications on task events.

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '../components/Toast'

export interface SwarmEvent {
  type: string
  taskId: string
  data: any
  timestamp: number
}

export function useSwarmSSE(enabled: boolean) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const sourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!enabled) return

    const source = new EventSource('/stream')
    sourceRef.current = source

    source.onmessage = (event) => {
      try {
        const parsed: SwarmEvent = JSON.parse(event.data)

        // Invalidate task queries on any task event
        if (parsed.type.startsWith('task:')) {
          queryClient.invalidateQueries({ queryKey: ['tasks'] })
        }

        // Fire toasts on key events
        if (parsed.type === 'task:complete') {
          queryClient.invalidateQueries({ queryKey: ['snapshot'] })
          toast('success', `Task completed — tx confirmed on chain`)
        } else if (parsed.type === 'task:failed') {
          toast('error', `Task failed — ${parsed.data?.status ?? 'see activity for details'}`)
        } else if (parsed.type === 'task:awaiting_approval') {
          toast('info', 'New task awaiting your approval')
        } else if (parsed.type === 'task:risk_rejected') {
          toast('error', 'Risk Gate rejected — goal exceeds risk threshold')
        }
      } catch {
        // Ignore parse errors (heartbeats, etc.)
      }
    }

    source.onerror = () => {
      console.warn('SSE connection error — will auto-reconnect')
    }

    return () => {
      source.close()
      sourceRef.current = null
    }
  }, [enabled, queryClient, toast])
}
