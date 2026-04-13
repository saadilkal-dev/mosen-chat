/**
 * RAG Retriever
 *
 * Retrieves relevant knowledge chunks from Supabase pgvector.
 * Table: knowledge_embeddings (columns: id, source, chunk_index, content, embedding, metadata, created_at)
 *
 * Flow:
 *   1. Embed user query with Gemini
 *   2. Call match_knowledge() RPC for cosine similarity search
 *   3. Return top-K results formatted for system prompt injection
 *
 * Fallback: if anything fails → return full static MOSEN_KNOWLEDGE
 */

import { embedQuery } from './embedding-service.js'
import { getSupabase } from './supabase.js'
import { MOSEN_KNOWLEDGE, LEADER_CONTEXT } from './mosen-knowledge.js'

const RAG_TOP_K = 10
const RAG_THRESHOLD = 0.5
const MAX_CONTEXT_CHARS = 4000

const RAG_DEBUG =
  process.env.RAG_DEBUG === '1' ||
  process.env.RAG_DEBUG === 'true'

/**
 * @param {string} userMessage
 * @param {'leader'|'employee'} persona
 * @returns {Promise<string>}
 */
export async function retrieveContext(userMessage, persona = 'leader') {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[RAG] GEMINI_API_KEY not set, using static knowledge')
    return staticFallback(persona)
  }

  try {
    // 1. Embed the query
    const queryEmbedding = await embedQuery(userMessage)

    // 2. Search via RPC
    const sb = getSupabase()
    const { data, error } = await sb.rpc('match_knowledge', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_count: RAG_TOP_K,
      match_threshold: RAG_THRESHOLD,
    })

    if (error) {
      console.error('[RAG] match_knowledge RPC failed:', error.message)
      return staticFallback(persona)
    }

    if (!data || data.length === 0) {
      console.info(
        `[RAG] vector search returned 0 rows (threshold=${RAG_THRESHOLD}, topK=${RAG_TOP_K}) — using static knowledge`
      )
      return staticFallback(persona)
    }

    // 3. Deduplicate and format
    const seen = new Set()
    const unique = data.filter(r => {
      const k = (r.content || '').slice(0, 80)
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })

    let block = '=== RELEVANT KNOWLEDGE (from your organization) ===\n\n'
    let charCount = 0
    let injected = 0

    for (const r of unique) {
      const source = r.source || 'knowledge-base'
      const sim = Math.round((r.similarity || 0.5) * 100)
      const entry = `[${source} • ${sim}% relevant]\n${r.content || ''}\n\n---\n\n`
      if (charCount + entry.length > MAX_CONTEXT_CHARS) break
      block += entry
      charCount += entry.length
      injected += 1
      if (RAG_DEBUG) {
        const preview = (r.content || '').replace(/\s+/g, ' ').slice(0, 120)
        console.info(`[RAG] chunk ${injected}: source=${source} similarity=${sim}% preview="${preview}${preview.length >= 120 ? '…' : ''}"`)
      }
    }

    const sourcesSummary = [...new Set(unique.slice(0, injected).map(r => r.source || 'knowledge-base'))].join(', ')
    console.info(
      `[RAG] injected ${injected} chunk(s), ~${charCount} chars, persona=${persona} (rpc=${data.length} rows, deduped=${unique.length}) sources=[${sourcesSummary}]`
    )

    if (persona === 'leader') block += `\n${LEADER_CONTEXT}`
    return block
  } catch (err) {
    console.error('[RAG] retrieval failed:', err.message)
    return staticFallback(persona)
  }
}

export async function ragStatus() {
  if (!process.env.GEMINI_API_KEY) {
    return { available: false, reason: 'GEMINI_API_KEY not set' }
  }
  try {
    const sb = getSupabase()
    const { count, error } = await sb
      .from('mosen-knowledge')
      .select('id', { count: 'exact', head: true })
    if (error) return { available: false, reason: `Supabase error: ${error.message}` }
    return {
      available: (count || 0) > 0,
      chunks: count || 0,
      reason: count > 0 ? 'ready' : 'no embeddings in mosen-knowledge table',
    }
  } catch (err) {
    return { available: false, reason: err.message }
  }
}

function staticFallback(persona) {
  if (persona === 'leader') return `${MOSEN_KNOWLEDGE}\n\n${LEADER_CONTEXT}`
  return MOSEN_KNOWLEDGE
}
