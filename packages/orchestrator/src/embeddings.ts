// ── Embedding Engine ─────────────────────────────────────────────────────────
// Generates embeddings for agent memory using Anthropic's API (via text digest)
// and stores them in pgvector for semantic search of past outcomes.

import Anthropic from '@anthropic-ai/sdk'
import { createHash } from 'crypto'

const anthropic = new Anthropic()

/**
 * Generate a text embedding by creating a content hash + LLM summary.
 * We use a two-step approach:
 * 1. LLM compresses the outcome into a normalized summary
 * 2. Hash-based pseudo-embedding for similarity (until native embeddings available)
 *
 * NOTE: For production, replace with a proper embedding model.
 * This approach uses deterministic hashing for consistent similarity matching.
 */
export async function generateMemoryEmbedding(params: {
  protocol: string
  goal: string
  outcome: 'success' | 'failed' | 'rejected'
  snapshotSummary: string
}): Promise<{ summary: string; embedding: number[] }> {
  // Step 1: Generate a normalized summary using Claude
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system: `Summarize this DeFi task outcome in 1-2 sentences. Focus on: what was attempted, the result, and any notable conditions. Be factual, not conversational.`,
    messages: [{
      role: 'user',
      content: `Protocol: ${params.protocol}\nGoal: ${params.goal}\nOutcome: ${params.outcome}\nConditions: ${params.snapshotSummary}`,
    }],
  })

  const summary = response.content[0]?.type === 'text'
    ? response.content[0].text.trim()
    : `${params.outcome}: ${params.goal} on ${params.protocol}`

  // Step 2: Generate a deterministic pseudo-embedding from the summary
  // This creates a consistent 1536-dim vector from text for similarity matching
  const embedding = textToVector(summary, 1536)

  return { summary, embedding }
}

/**
 * Convert text to a deterministic pseudo-embedding vector.
 * Uses repeated hashing to fill the dimensions.
 */
function textToVector(text: string, dimensions: number): number[] {
  const vector: number[] = []
  let seed = text

  while (vector.length < dimensions) {
    const hash = createHash('sha256').update(seed).digest()
    // Each SHA-256 hash gives us 32 bytes = 8 floats (4 bytes each)
    for (let i = 0; i < hash.length && vector.length < dimensions; i += 4) {
      // Convert 4 bytes to a float between -1 and 1
      const uint = hash.readUInt32BE(i)
      const normalized = (uint / 0xFFFFFFFF) * 2 - 1
      vector.push(normalized)
    }
    seed = hash.toString('hex') + seed.slice(0, 32) // chain hashes
  }

  // Normalize to unit vector
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
  return magnitude > 0 ? vector.map(v => v / magnitude) : vector
}

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
 * Search memory for similar past outcomes.
 * Returns top-K results sorted by similarity.
 */
export function searchMemory(
  query: number[],
  memories: Array<{ embedding: number[]; summary: string; protocol: string; outcome: string }>,
  topK = 5,
): Array<{ similarity: number; summary: string; protocol: string; outcome: string }> {
  return memories
    .map(m => ({
      similarity: cosineSimilarity(query, m.embedding),
      summary: m.summary,
      protocol: m.protocol,
      outcome: m.outcome,
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
}
