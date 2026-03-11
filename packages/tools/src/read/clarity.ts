// ── Clarity Contract Analyzer ─────────────────────────────────────────────────
// Read Clarity contract source and analyze it with LLM for risks.
// Yellow-tier feature: "analyze this contract before I deposit"

const HIRO_API_MAINNET = 'https://api.hiro.so'
const HIRO_API_TESTNET = 'https://api.testnet.hiro.so'

function getApi(network: 'mainnet' | 'testnet'): string {
  return network === 'mainnet' ? HIRO_API_MAINNET : HIRO_API_TESTNET
}

function getHeaders(): Record<string, string> {
  const key = process.env['HIRO_API_KEY']
  return key ? { 'x-api-key': key } : {}
}

export interface ContractInfo {
  contractId: string
  source: string
  abi: {
    functions: Array<{
      name: string
      access: 'public' | 'read_only' | 'private'
      args: Array<{ name: string; type: string }>
      outputs: { type: string }
    }>
    variables: Array<{ name: string; type: string; access: string }>
    maps: Array<{ name: string; key: string; value: string }>
  }
  publishedAt: string
}

/**
 * Fetch a Clarity contract's source code and ABI from the Hiro API.
 */
export async function getContractSource(
  contractId: string,
  network: 'mainnet' | 'testnet' = 'testnet'
): Promise<ContractInfo> {
  const [address, name] = contractId.split('.')
  if (!address || !name) {
    throw new Error(`Invalid contract ID "${contractId}". Expected format: SP123.contract-name`)
  }

  const api = getApi(network)

  // Get source
  const sourceRes = await fetch(
    `${api}/v2/contracts/source/${address}/${name}`,
    { headers: getHeaders() }
  )
  if (!sourceRes.ok) {
    throw new Error(`Contract not found: ${contractId} (${sourceRes.status})`)
  }
  const sourceData = await sourceRes.json()

  // Get ABI
  const abiRes = await fetch(
    `${api}/v2/contracts/interface/${address}/${name}`,
    { headers: getHeaders() }
  )
  const abiData = abiRes.ok ? await abiRes.json() : { functions: [], variables: [], maps: [] }

  return {
    contractId,
    source: sourceData.source ?? '',
    abi: {
      functions: (abiData.functions ?? []).map((f: any) => ({
        name: f.name,
        access: f.access,
        args: f.args ?? [],
        outputs: f.outputs ?? { type: 'unknown' },
      })),
      variables: abiData.variables ?? [],
      maps: abiData.maps ?? [],
    },
    publishedAt: sourceData.publish_height ?? 'unknown',
  }
}

/**
 * Analyze a Clarity contract for risks using LLM.
 * Returns a structured risk assessment.
 */
export async function analyzeContract(
  contractId: string,
  network: 'mainnet' | 'testnet' = 'testnet'
): Promise<{
  contractId: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  summary: string
  findings: string[]
  publicFunctions: string[]
}> {
  const info = await getContractSource(contractId, network)

  // Use Anthropic API directly (avoids @anthropic-ai/sdk type dependency)
  const apiKey = process.env['ANTHROPIC_API_KEY']
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY required for contract analysis')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: `You are a Clarity smart contract security auditor. Analyze the contract source code and return a JSON risk assessment.

Return ONLY valid JSON in this exact format:
{
  "riskLevel": "low" | "medium" | "high" | "critical",
  "summary": "one-sentence summary",
  "findings": ["finding 1", "finding 2"]
}

Key things to check:
- Does it have admin/owner functions that could rug?
- Are there unchecked token transfers?
- Does it use tx-sender safely?
- Are there missing post-conditions?
- Is it upgradeable (contract-call to dynamic addresses)?`,
      messages: [{
        role: 'user',
        content: `Contract: ${contractId}\n\nSource:\n${info.source.slice(0, 8000)}`,
      }],
    }),
  })

  if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`)
  const respData: any = await response.json()

  const text = respData.content?.[0]?.type === 'text' ? respData.content[0].text : '{}'

  let analysis: any
  try {
    analysis = JSON.parse(text)
  } catch {
    analysis = {
      riskLevel: 'medium',
      summary: 'Could not parse LLM output — manual review recommended.',
      findings: ['Automated analysis failed; review source manually.'],
    }
  }

  return {
    contractId,
    riskLevel: analysis.riskLevel ?? 'medium',
    summary: analysis.summary ?? 'Analysis unavailable',
    findings: analysis.findings ?? [],
    publicFunctions: info.abi.functions
      .filter(f => f.access === 'public')
      .map(f => `${f.name}(${f.args.map((a: any) => a.name).join(', ')})`),
  }
}
