import { cn } from '../lib/utils'
import { CheckCircle, XCircle, Loader2, Clock, ShieldAlert } from 'lucide-react'

type Variant = 'success' | 'warning' | 'destructive' | 'info' | 'outline' | 'default'

const variants: Record<Variant, string> = {
  success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  destructive: 'bg-red-500/20 text-red-400 border-red-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  outline: 'border-[hsl(var(--border))] text-[hsl(var(--foreground))]',
  default: 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.3)]',
}

export function StatusBadge({ status }: { status: string }) {
  let variant: Variant = 'default'
  let icon = null

  switch (status) {
    case 'pending':
    case 'analyzing':
    case 'gating':
    case 'executing':
    case 'confirming':
      variant = 'warning'
      icon = <Loader2 className="w-3 h-3 mr-1 animate-spin" />
      break
    case 'awaiting_approval':
    case 'needs_human':
      variant = 'info'
      icon = <ShieldAlert className="w-3 h-3 mr-1" />
      break
    case 'complete':
      variant = 'success'
      icon = <CheckCircle className="w-3 h-3 mr-1" />
      break
    case 'rejected':
    case 'failed':
    case 'dead':
      variant = 'destructive'
      icon = <XCircle className="w-3 h-3 mr-1" />
      break
    case 'held':
      variant = 'outline'
      icon = <Clock className="w-3 h-3 mr-1" />
      break
  }

  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
      variants[variant],
      ['pending', 'analyzing', 'gating', 'executing', 'confirming'].includes(status) && 'animate-pulse'
    )}>
      {icon}
      {status.replace('_', ' ')}
    </span>
  )
}

export function Badge({ variant = 'default', className, children }: {
  variant?: Variant
  className?: string
  children: React.ReactNode
}) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}
