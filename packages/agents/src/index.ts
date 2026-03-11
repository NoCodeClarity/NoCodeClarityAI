// ── Agents ────────────────────────────────────────────────────────────────────
// Three agents: Analyst, Risk Gate, Executor
// Each agent is a function that takes context and returns a result.

import Anthropic from '@anthropic-ai/sdk'
import type {
  ChainSnapshot,
  GateResult,
  GateDecision,
  RiskConfig,
  UnsignedTx,
} from '@nocodeclarity/tools'

const anthropic = new Anthropic()

// ── Analyst Agent ────────────────────────────────────────────────────────────

export async function analyzeSnapshot(
  snapshot: ChainSnapshot,
  goal: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    system: `You are a Stacks blockchain analyst agent. Analyze the chain snapshot and assess whether the user's goal is feasible given current market conditions. Be concise.

Key factors to assess:
- Wallet balance sufficiency
- Network congestion level
- sBTC peg health
- PoX cycle timing
- Protocol exposure limits

Return a brief assessment (max 200 words) ending with FEASIBLE or INFEASIBLE.`,
    messages: [{
      role: 'user',
      content: `Goal: ${goal}\n\nSnapshot:\n${JSON.stringify(snapshot, null, 2)}`
    }]
  })

  return response.content[0]?.type === 'text'
    ? response.content[0].text
    : 'Analysis unavailable'
}

// ── Risk Gate Agent ──────────────────────────────────────────────────────────

export async function evaluateRisk(
  unsignedTx: UnsignedTx,
  snapshot: ChainSnapshot,
  riskConfig: RiskConfig
): Promise<GateResult> {
  const reasons: string[] = []
  let riskScore = 0

  // 1. Value check — is this above auto-execute limit?
  const estimatedValueBTC = parseFloat(unsignedTx.estimatedFeeSTX) / 1000 // rough conversion
  const exceedsAutoLimit = estimatedValueBTC > riskConfig.autoExecuteLimitBTC

  // 2. Fee check — is fee reasonable vs value?
  const feeSTX = parseFloat(unsignedTx.estimatedFeeSTX)
  if (feeSTX > riskConfig.maxFeePctOfValue) {
    reasons.push(`Fee ${feeSTX} STX may exceed ${riskConfig.maxFeePctOfValue}% of transaction value`)
    riskScore += 20
  }

  // 3. sBTC peg health check
  if (snapshot.sBTCPeg.health < riskConfig.minPegHealth) {
    reasons.push(`sBTC peg health ${snapshot.sBTCPeg.health} below minimum ${riskConfig.minPegHealth}`)
    riskScore += 30
  }

  // 4. Finality check
  if (snapshot.sBTCPeg.finalityDepth < riskConfig.minFinalityDepth) {
    reasons.push(`Finality depth ${snapshot.sBTCPeg.finalityDepth} below minimum ${riskConfig.minFinalityDepth}`)
    riskScore += 15
  }

  // 5. Network congestion
  if (snapshot.network.congestion === 'high') {
    reasons.push('Network congestion is HIGH — transaction may be delayed')
    riskScore += 10
  }

  // 6. Protocol exposure
  for (const exposure of snapshot.protocolExposure) {
    if (exposure.percentOfPortfolio > riskConfig.maxProtocolExposurePct) {
      reasons.push(`${exposure.protocol} exposure ${exposure.percentOfPortfolio.toFixed(1)}% exceeds limit ${riskConfig.maxProtocolExposurePct}%`)
      riskScore += 20
    }
  }

  // Determine decision
  let decision: GateDecision
  if (riskScore >= 60) {
    decision = 'REJECT'
  } else if (exceedsAutoLimit || riskScore >= 30) {
    decision = 'NEEDS_HUMAN'
  } else if (reasons.length > 0 && riskScore >= 15) {
    decision = 'HOLD'
  } else {
    decision = 'PROCEED'
  }

  // If gate output is uncertain, REJECT — never proceed
  if (decision !== 'PROCEED' && decision !== 'NEEDS_HUMAN' && decision !== 'HOLD' && decision !== 'REJECT') {
    decision = 'REJECT'
    reasons.push('Gate output uncertain — defaulting to REJECT')
  }

  return {
    decision,
    reasons: reasons.length > 0 ? reasons : ['All risk checks passed'],
    riskScore: Math.min(100, riskScore),
    timestamp: Date.now(),
  }
}

// ── Executor Agent ───────────────────────────────────────────────────────────

export async function describeExecution(
  unsignedTx: UnsignedTx,
  gateResult: GateResult
): Promise<string> {
  return [
    `Action: ${unsignedTx.humanDescription}`,
    `Protocol: ${unsignedTx.protocol}`,
    `Gate Decision: ${gateResult.decision}`,
    `Risk Score: ${gateResult.riskScore}/100`,
    `Reasons: ${gateResult.reasons.join('; ')}`,
    `Post-conditions: ${unsignedTx.postConditions.map(pc => pc.description).join('; ')}`,
  ].join('\n')
}
