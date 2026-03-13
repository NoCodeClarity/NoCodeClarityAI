import { useState } from 'react'
import { useWallet } from '../lib/wallet-context'
import { ShieldCheck, Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'

interface TransactionSignerProps {
  taskId: string
  unsignedTxHex?: string
  description: string
  onComplete?: (txid: string) => void
  onCancel?: () => void
}

export function TransactionSigner({ taskId, unsignedTxHex, description, onComplete, onCancel }: TransactionSignerProps) {
  const { address } = useWallet()
  const [status, setStatus] = useState<'preview' | 'signing' | 'broadcasting' | 'success' | 'error'>('preview')
  const [txid, setTxid] = useState<string>('')
  const [error, setError] = useState<string>('')

  async function handleSign() {
    if (!unsignedTxHex || !address) return

    try {
      setStatus('signing')

      // Call Stacks Connect to sign via wallet popup
      const { openSTXTransfer } = await import('@stacks/connect')

      // For contract calls, we use openContractCall; for STX transfers, openSTXTransfer
      // The unsigned tx hex tells us which type, but Stacks Connect takes params not raw hex
      // So we broadcast the pre-signed tx from the server pipeline directly
      // The server already signs with WALLET_MNEMONIC; this component is for
      // the approval UX layer (user confirms they want it broadcast)

      setStatus('broadcasting')

      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, signedTxHex: unsignedTxHex }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Broadcast failed')
      }

      const data = await res.json()
      setTxid(data.txid)
      setStatus('success')
      onComplete?.(data.txid)
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed')
      setStatus('error')
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[hsl(var(--border))] pb-4">
        <div className="w-10 h-10 bg-[hsl(var(--primary)/0.2)] text-[hsl(var(--primary))] rounded-xl flex items-center justify-center">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Transaction Review</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Review and confirm this transaction</p>
        </div>
      </div>

      {/* Description */}
      <div className="terminal-box p-4">
        <p className="text-sm text-[hsl(var(--foreground))] whitespace-pre-wrap">{description}</p>
      </div>

      {/* Status display */}
      {status === 'signing' && (
        <div className="flex items-center gap-3 text-[hsl(var(--accent))]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Waiting for wallet approval...</span>
        </div>
      )}

      {status === 'broadcasting' && (
        <div className="flex items-center gap-3 text-[hsl(var(--primary))]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Broadcasting to Stacks network...</span>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Transaction broadcast successfully!</span>
          </div>
          {txid && (
            <a
              href={`https://explorer.hiro.so/txid/${txid}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[hsl(var(--primary))] hover:underline"
            >
              View on Explorer <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-red-400">
            <XCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Transaction failed</span>
          </div>
          <p className="text-xs text-red-400/80 font-mono">{error}</p>
        </div>
      )}

      {/* Action buttons */}
      {status === 'preview' && (
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSign}
            className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white font-semibold text-sm shadow-lg shadow-[hsl(var(--primary)/0.3)] hover:shadow-[hsl(var(--primary)/0.5)] transition-all"
          >
            Sign & Broadcast
          </button>
          <button
            onClick={onCancel}
            className="px-5 py-3 rounded-xl border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] text-sm hover:text-white hover:border-white/30 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
