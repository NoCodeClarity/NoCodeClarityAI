// ── Embedding Engine ─────────────────────────────────────────────────────────
// True semantic embeddings for agent memory.
// Uses OpenAI text-embedding-3-small (1536 dims) when OPENAI_API_KEY is set.
// Falls back to Anthropic summary + deterministic hash vectors otherwise.
// Stored in pgvector for cosine similarity search.

import { createHash } from 'crypto'

// ── Configuration ────────────────────────────────────────────────────────────

const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMS = 1536

// ── Core Types ───────────────────────────────────────────────────────────────

export interface MemoryEntry {
  id: string
  taskId: string
  protocol: string
  goal: string
  outcome: 'success' | 'failed' | 'rejected'
  summary: string
  embedding: number[]
  createdAt: number
}

// ── Embedding Generation ─────────────────────────────────────────────────────

/**
 * Generate a real semantic embedding using OpenAI's API.
 * Falls back to deterministic hash vectors if OPENAI_API_KEY is not set.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env['OPENAI_API_KEY']

  if (apiKey) {
    return generateOpenAIEmbedding(text, apiKey)
  }

  // Fallback: deterministic hash-based pseudo-embedding
  return textToHashVector(text, EMBEDDING_DIMS)
}

/**
 * Call OpenAI's embedding API directly (no SDK dependency).
 */
async function generateOpenAIEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000), // max input safety
      dimensions: EMBEDDING_DIMS,
    }),
  })

  if (!response.ok) {
    const err: any = await response.json().catch(() => ({}))
    console.warn(`OpenAI embedding failed (${response.status}): ${err?.error?.message ?? 'unknown'}. Falling back to hash.`)
    return textToHashVector(text, EMBEDDING_DIMS)
  }

  const data: any = await response.json()
  return data?.data?.[0]?.embedding ?? textToHashVector(text, EMBEDDING_DIMS)
}

// ── Memory Generation ────────────────────────────────────────────────────────

/**
 * Generate a complete memory entry for a completed task.
 * Creates both a summary (via Anthropic) and an embedding vector.
 */
export async function generateMemoryEmbedding(params: {
  protocol: string
  goal: string
  outcome: 'success' | 'failed' | 'rejected'
  snapshotSummary: string
}): Promise<{ summary: string; embedding: number[] }> {
  // Step 1: Generate a normalized summary using Anthropic API
  const summary = await generateSummary(params)

  // Step 2: Generate semantic embedding from the summary
  const embeddingText = `${params.protocol} | ${params.outcome} | ${summary}`
  const embedding = await generateEmbedding(embeddingText)

  return { summary, embedding }
}

/**
 * Generate a task summary using Anthropic API (direct fetch).
 */
async function generateSummary(params: {
  protocol: string
  goal: string
  outcome: string
  snapshotSummary: string
}): Promise<string> {
  const apiKey = process.env['ANTHROPIC_API_KEY']
  if (!apiKey) {
    return `${params.outcome}: ${params.goal} on ${params.protocol}`
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: `Summarize this DeFi task outcome in 1-2 sentences. Focus on: what was attempted, the result, and any notable conditions. Be factual.`,
        messages: [{
          role: 'user',
          content: `Protocol: ${params.protocol}\nGoal: ${params.goal}\nOutcome: ${params.outcome}\nConditions: ${params.snapshotSummary}`,
        }],
      }),
    })

    if (!response.ok) throw new Error(`Anthropic ${response.status}`)
    const data: any = await response.json()
    return data?.content?.[0]?.text?.trim() ?? `${params.outcome}: ${params.goal} on ${params.protocol}`
  } catch {
    return `${params.outcome}: ${params.goal} on ${params.protocol}`
  }
}

// ── Similarity Search ────────────────────────────────────────────────────────

/**
 * Compute cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dotProduct = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!
    magA += a[i]! * a[i]!
    magB += b[i]! * b[i]!
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom > 0 ? dotProduct / denom : 0
}

/**
 * Search in-memory for similar past outcomes.
 * For pgvector users, use SQL: SELECT *, embedding <=> $1 ORDER BY embedding <=> $1 LIMIT $2
 */
export function searchMemory(
  query: number[],
  memories: MemoryEntry[],
  topK = 5,
): Array<{ similarity: number; entry: MemoryEntry }> {
  return memories
    .map(m => ({
      similarity: cosineSimilarity(query, m.embedding),
      entry: m,
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
}

/**
 * Search for similar memories and return context for the analyst agent.
 * This gives the agent "institutional memory" of past task outcomes.
 */
export async function getRelevantMemoryContext(
  goal: string,
  memories: MemoryEntry[],
  topK = 3,
): Promise<string> {
  if (memories.length === 0) return ''

  const queryEmbedding = await generateEmbedding(goal)
  const results = searchMemory(queryEmbedding, memories, topK)

  if (results.length === 0 || results[0].similarity < 0.3) return ''

  const lines = results
    .filter(r => r.similarity >= 0.3)
    .map(r => `- [${r.entry.outcome}] ${r.entry.summary} (similarity: ${(r.similarity * 100).toFixed(0)}%)`)

  return `\n## Relevant Past Outcomes\n${lines.join('\n')}\n`
}

// ── Hash Fallback ────────────────────────────────────────────────────────────

/**
 * Convert text to a deterministic pseudo-embedding vector.
 * Used when OPENAI_API_KEY is not available.
 */
function textToHashVector(text: string, dimensions: number): number[] {
  const vector: number[] = []
  let seed = text

  while (vector.length < dimensions) {
    const hash = createHash('sha256').update(seed).digest()
    for (let i = 0; i < hash.length && vector.length < dimensions; i += 4) {
      const uint = hash.readUInt32BE(i)
      vector.push((uint / 0xFFFFFFFF) * 2 - 1)
    }
    seed = hash.toString('hex') + seed.slice(0, 32)
  }

  // Normalize to unit vector
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
  return magnitude > 0 ? vector.map(v => v / magnitude) : vector
}
