// ── Strategy Sharing ─────────────────────────────────────────────────────────
// Export/import strategies as portable JSON for community sharing.
// Users can share strategies via URLs, files, or the marketplace.

import type { RiskConfig } from '@nocodeclarity/tools'

export interface ShareableStrategy {
  _format: 'nocodeclarity-strategy-v1'
  name: string
  description: string
  template: string
  mode: 'simple' | 'advanced'
  riskConfig: RiskConfig
  allocations: Record<string, number>
  author?: string
  tags?: string[]
  createdAt: string  // ISO 8601
}

/**
 * Export a strategy as a shareable JSON object.
 */
export function exportStrategy(strategy: {
  name: string
  template: string
  mode: string
  riskConfig: any
  allocations: any
  active: boolean
}, meta?: { author?: string; description?: string; tags?: string[] }): ShareableStrategy {
  return {
    _format: 'nocodeclarity-strategy-v1',
    name: strategy.name,
    description: meta?.description ?? `${strategy.template} strategy`,
    template: strategy.template,
    mode: strategy.mode as 'simple' | 'advanced',
    riskConfig: strategy.riskConfig as RiskConfig,
    allocations: strategy.allocations as Record<string, number>,
    author: meta?.author,
    tags: meta?.tags ?? [strategy.template],
    createdAt: new Date().toISOString(),
  }
}

/**
 * Validate and parse an imported strategy JSON.
 * Returns the validated ShareableStrategy or throws on invalid input.
 */
export function importStrategy(json: unknown): ShareableStrategy {
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid strategy: expected a JSON object')
  }

  const data = json as any

  if (data._format !== 'nocodeclarity-strategy-v1') {
    throw new Error(
      `Unknown format: "${data._format}". ` +
      'Expected "nocodeclarity-strategy-v1".'
    )
  }

  if (!data.name || typeof data.name !== 'string') {
    throw new Error('Invalid strategy: name is required')
  }

  if (!data.riskConfig || typeof data.riskConfig !== 'object') {
    throw new Error('Invalid strategy: riskConfig is required')
  }

  const required = [
    'autoExecuteLimitBTC', 'maxFeePctOfValue', 'minFinalityDepth',
    'minPegHealth', 'maxProtocolExposurePct', 'maxSlippagePct'
  ]
  for (const key of required) {
    if (typeof data.riskConfig[key] !== 'number') {
      throw new Error(`Invalid strategy: riskConfig.${key} must be a number`)
    }
  }

  // Sanitize
  return {
    _format: 'nocodeclarity-strategy-v1',
    name: String(data.name).slice(0, 100),
    description: String(data.description ?? '').slice(0, 500),
    template: String(data.template ?? 'custom').slice(0, 50),
    mode: data.mode === 'advanced' ? 'advanced' : 'simple',
    riskConfig: {
      autoExecuteLimitBTC: Number(data.riskConfig.autoExecuteLimitBTC),
      maxFeePctOfValue: Number(data.riskConfig.maxFeePctOfValue),
      minFinalityDepth: Number(data.riskConfig.minFinalityDepth),
      minPegHealth: Number(data.riskConfig.minPegHealth),
      maxProtocolExposurePct: Number(data.riskConfig.maxProtocolExposurePct),
      maxSlippagePct: Number(data.riskConfig.maxSlippagePct),
      requireConfirmForNewProtocol: data.riskConfig.requireConfirmForNewProtocol ?? true,
      requireConfirmForLiquidationRisk: data.riskConfig.requireConfirmForLiquidationRisk ?? true,
      mode: data.riskConfig.mode ?? (data.mode === 'simple' ? 'moderate' : 'moderate'),
    },
    allocations: data.allocations ?? {},
    author: data.author ? String(data.author).slice(0, 100) : undefined,
    tags: Array.isArray(data.tags) ? data.tags.map((t: any) => String(t).slice(0, 30)).slice(0, 10) : [],
    createdAt: data.createdAt ?? new Date().toISOString(),
  }
}

/**
 * Encode strategy as a base64 URL-safe string for sharing.
 */
export function encodeStrategyURL(strategy: ShareableStrategy): string {
  const json = JSON.stringify(strategy)
  const encoded = Buffer.from(json).toString('base64url')
  return encoded
}

/**
 * Decode a base64 URL-safe strategy string.
 */
export function decodeStrategyURL(encoded: string): ShareableStrategy {
  const json = JSON.parse(Buffer.from(encoded, 'base64url').toString())
  return importStrategy(json)
}
