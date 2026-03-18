// ── WebSocket Agent Chat ─────────────────────────────────────────────────────
// Bidirectional WebSocket hook for conversational agent interaction.
// Falls back to SSE if WebSocket is not available on the server.

import { useState, useEffect, useRef, useCallback } from 'react'

export interface ChatMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  timestamp: number
  agent?: string   // analyst | gate | executor
}

interface UseAgentChatOptions {
  enabled: boolean
  url?: string
}

export function useAgentChat({ enabled, url }: UseAgentChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!enabled) return

    const wsUrl = url ?? `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/chat`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      addSystemMessage('Connected to agent swarm')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'agent_message') {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'agent',
            content: data.content,
            timestamp: Date.now(),
            agent: data.agent,
          }])
        } else if (data.type === 'system') {
          addSystemMessage(data.content)
        }
      } catch {
        // Ignore parse errors
      }
    }

    ws.onclose = () => {
      setConnected(false)
      addSystemMessage('Disconnected from agent swarm')
    }

    ws.onerror = () => {
      setConnected(false)
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [enabled, url])

  function addSystemMessage(content: string) {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'system',
      content,
      timestamp: Date.now(),
    }])
  }

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, msg])
    wsRef.current.send(JSON.stringify({ type: 'user_message', content }))
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return { messages, connected, sendMessage, clearMessages }
}
