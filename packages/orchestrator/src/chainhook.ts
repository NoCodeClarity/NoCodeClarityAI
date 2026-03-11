// ── Chainhook Integration ────────────────────────────────────────────────────
// Real-time event streaming from Stacks blockchain via Chainhook.
// Replaces polling-based triggers with event-driven architecture.
//
// Setup:
// 1. Install chainhook: https://docs.hiro.so/chainhook
// 2. Point chainhook's webhook URL to your orchestrator: POST /hooks/chainhook
// 3. Register predicates below or via chainhook CLI

import { logger } from './logger.js'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChainhookPredicate {
  uuid: string
  name: string
  network: 'mainnet' | 'testnet' | 'devnet'
  chain: 'stacks'
  predicate: {
    scope: 'contract_call' | 'print_event' | 'stx_event' | 'ft_event' | 'nft_event' | 'block'
    contract_identifier?: string
    method?: string
  }
  action: {
    http: {
      url: string
      method: 'POST'
      authorization_header: string
    }
  }
}

export interface ChainhookPayload {
  chainhook: {
    uuid: string
    predicate: any
  }
  apply: Array<{
    block_identifier: { index: number; hash: string }
    transactions: Array<{
      transaction_identifier: { hash: string }
      metadata: {
        sender: string
        success: boolean
        kind: any
        receipt: any
      }
    }>
  }>
}

// ── Predicate Builder ────────────────────────────────────────────────────────

export function buildPredicate(params: {
  name: string
  network: 'mainnet' | 'testnet' | 'devnet'
  scope: ChainhookPredicate['predicate']['scope']
  contractId?: string
  method?: string
  webhookUrl: string
  secret: string
}): ChainhookPredicate {
  return {
    uuid: crypto.randomUUID(),
    name: params.name,
    network: params.network,
    chain: 'stacks',
    predicate: {
      scope: params.scope,
      contract_identifier: params.contractId,
      method: params.method,
    },
    action: {
      http: {
        url: params.webhookUrl,
        method: 'POST',
        authorization_header: `Bearer ${params.secret}`,
      },
    },
  }
}

// ── Common Predicates ────────────────────────────────────────────────────────

export function buildStandardPredicates(params: {
  network: 'mainnet' | 'testnet' | 'devnet'
  webhookUrl: string
  secret: string
}) {
  const base = { network: params.network, webhookUrl: params.webhookUrl, secret: params.secret }

  return [
    // sBTC peg-in events
    buildPredicate({
      ...base,
      name: 'sbtc-peg-in',
      scope: 'ft_event',
      contractId: params.network === 'mainnet'
        ? 'SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.sbtc-token'
        : 'SN3R84XZYA63QS28932XQF3G1J8R9PC3W76P9CSQS.sbtc-token',
    }),

    // PoX stacking events
    buildPredicate({
      ...base,
      name: 'pox-stack-stx',
      scope: 'contract_call',
      contractId: 'SP000000000000000000002Q6VF78.pox-4',
      method: 'stack-stx',
    }),

    // ALEX swap events
    buildPredicate({
      ...base,
      name: 'alex-swap',
      scope: 'contract_call',
      contractId: params.network === 'mainnet'
        ? 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.amm-swap-pool-v1-1'
        : 'ST3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.amm-swap-pool-v1-1',
      method: 'swap-helper',
    }),

    // Block events (for cycle tracking)
    buildPredicate({
      ...base,
      name: 'new-block',
      scope: 'block',
    }),
  ]
}

// ── Webhook Handler ──────────────────────────────────────────────────────────

export type ChainhookEventHandler = (
  predicateUuid: string,
  payload: ChainhookPayload
) => Promise<void>

export function createChainhookHandler(
  onEvent: ChainhookEventHandler,
  secret: string
) {
  return async (c: any) => {
    // Validate authorization
    const auth = c.req.header('authorization')
    if (auth !== `Bearer ${secret}`) {
      logger.warn('Chainhook webhook: invalid auth', { auth: auth?.slice(0, 20) })
      return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
      const payload: ChainhookPayload = await c.req.json()
      const uuid = payload.chainhook?.uuid

      if (!uuid) {
        return c.json({ error: 'Missing chainhook UUID' }, 400)
      }

      const txCount = payload.apply?.reduce(
        (sum, block) => sum + (block.transactions?.length ?? 0), 0
      ) ?? 0

      logger.info('Chainhook event received', {
        predicateUuid: uuid,
        blocks: payload.apply?.length ?? 0,
        transactions: txCount,
      })

      await onEvent(uuid, payload)

      return c.json({ received: true, txCount })
    } catch (e: any) {
      logger.error('Chainhook handler error', { error: e.message })
      return c.json({ error: e.message }, 500)
    }
  }
}
