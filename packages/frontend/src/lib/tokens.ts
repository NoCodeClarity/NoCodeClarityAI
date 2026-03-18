// ── Stacks Token Registry ────────────────────────────────────────────────────
// Maps known Stacks token symbols to metadata for rich Vault display.

export interface TokenMeta {
  symbol: string
  name: string
  icon: string       // emoji or URL
  protocol: string
  decimals: number
  color: string      // tailwind bg color class
}

// Known tokens on Stacks
export const TOKEN_REGISTRY: Record<string, TokenMeta> = {
  STX: { symbol: 'STX', name: 'Stacks', icon: '⚡', protocol: 'Core', decimals: 6, color: 'bg-purple-500' },
  sBTC: { symbol: 'sBTC', name: 'sBTC (Bitcoin)', icon: '₿', protocol: 'sBTC', decimals: 8, color: 'bg-orange-500' },
  ALEX: { symbol: 'ALEX', name: 'ALEX Lab', icon: '🔬', protocol: 'ALEX', decimals: 8, color: 'bg-cyan-500' },
  VELAR: { symbol: 'VELAR', name: 'Velar', icon: '🌊', protocol: 'Velar', decimals: 8, color: 'bg-blue-500' },
  stSTX: { symbol: 'stSTX', name: 'Stacked STX', icon: '🏗️', protocol: 'Bitflow', decimals: 6, color: 'bg-indigo-500' },
  USDA: { symbol: 'USDA', name: 'Arkadiko USDA', icon: '💵', protocol: 'Arkadiko', decimals: 6, color: 'bg-green-500' },
  DIKO: { symbol: 'DIKO', name: 'Arkadiko', icon: '🦊', protocol: 'Arkadiko', decimals: 6, color: 'bg-amber-500' },
  xBTC: { symbol: 'xBTC', name: 'Wrapped BTC', icon: '🔐', protocol: 'Wrapped', decimals: 8, color: 'bg-yellow-500' },
  WELSH: { symbol: 'WELSH', name: 'Welshcorgicoin', icon: '🐕', protocol: 'Meme', decimals: 6, color: 'bg-rose-500' },
  NOT: { symbol: 'NOT', name: 'Nothing Token', icon: '⭕', protocol: 'Meme', decimals: 6, color: 'bg-gray-500' },
  RUNES: { symbol: 'RUNES', name: 'Runes', icon: '🪨', protocol: 'Runes', decimals: 0, color: 'bg-stone-500' },
  BRC20: { symbol: 'BRC20', name: 'BRC-20', icon: '📜', protocol: 'Ordinals', decimals: 0, color: 'bg-teal-500' },
}

export function getTokenMeta(symbol: string): TokenMeta {
  const upper = symbol.toUpperCase()
  return TOKEN_REGISTRY[upper] ?? {
    symbol: upper,
    name: symbol,
    icon: upper[0] ?? '?',
    protocol: 'Unknown',
    decimals: 6,
    color: 'bg-[hsl(var(--primary))]',
  }
}
