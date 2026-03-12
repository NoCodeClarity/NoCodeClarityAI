import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/** Format microSTX to human-readable STX */
export function formatSTX(microSTX: string | number): string {
  const n = Number(microSTX) / 1_000_000
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 }) + ' STX'
}

/** Format satoshis to human-readable sBTC */
export function formatSBTC(sats: string | number): string {
  const n = Number(sats) / 100_000_000
  return n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 }) + ' sBTC'
}

/** Truncate address for display */
export function truncateAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}
