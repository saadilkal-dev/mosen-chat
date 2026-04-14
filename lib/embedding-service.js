/**
 * Query Embedding Service — Gemini gemini-embedding-001 (768 dims)
 *
 * Must match the ingestion script (pdf_rag_app.py) which uses:
 *   model = gemini-embedding-001
 *   output_dimensionality = 768
 *   task_type = RETRIEVAL_DOCUMENT (for docs) / RETRIEVAL_QUERY (for queries)
 */

import { getSupabase } from './supabase.js'

const GEMINI_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001'
const EMBEDDING_DIM = 768
const GEMINI_EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:embedContent`

const CHUNK_SIZE = 1500 // chars per chunk (~375 tokens)
const CHUNK_OVERLAP = 200

function getGeminiKey() {
  const k = process.env.GEMINI_API_KEY
  if (!k) throw new Error('GEMINI_API_KEY is not set')
  return k
}

/**
 * Embed a single query for semantic search.
 * Uses RETRIEVAL_QUERY task type + output_dimensionality=768
 * to match the 768-dim vectors stored by pdf_rag_app.py.
 */
export async function embedQuery(text) {
  const res = await fetch(`${GEMINI_EMBED_URL}?key=${getGeminiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${GEMINI_MODEL}`,
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_QUERY',
      outputDimensionality: EMBEDDING_DIM,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini embedQuery error (${res.status}): ${err}`)
  }

  const data = await res.json()
  return data.embedding.values
}

/**
 * Embed a document chunk for storage.
 */
async function embedDocument(text) {
  const res = await fetch(`${GEMINI_EMBED_URL}?key=${getGeminiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${GEMINI_MODEL}`,
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_DOCUMENT',
      outputDimensionality: EMBEDDING_DIM,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini embedDocument error (${res.status}): ${err}`)
  }

  const data = await res.json()
  return data.embedding.values
}

/**
 * Split text into overlapping chunks.
 */
function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end).trim())
    if (end === text.length) break
    start += chunkSize - overlap
  }
  return chunks.filter((c) => c.length > 50)
}

/**
 * Ingest a document: chunk → embed → upsert into knowledge_embedding.
 */
export async function ingestDocument(source, text, metadata = {}) {
  const chunks = chunkText(text)
  const sb = getSupabase()

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embedDocument(chunks[i])
    const { error } = await sb.from('knowledge_embedding').upsert(
      {
        source,
        chunk_index: i,
        content: chunks[i],
        embedding,
        metadata,
      },
      { onConflict: 'source,chunk_index' },
    )
    if (error) throw new Error(`Failed to store chunk ${i}: ${error.message}`)
  }

  return { source, chunks: chunks.length }
}

/**
 * List all distinct sources in the knowledge base.
 */
export async function listSources() {
  const sb = getSupabase()
  const { data, error } = await sb.from('knowledge_embedding').select('source, chunk_index').order('source')
  if (error) throw new Error(error.message)

  const counts = {}
  for (const row of data || []) {
    counts[row.source] = (counts[row.source] || 0) + 1
  }
  return Object.entries(counts).map(([source, chunks]) => ({ source, chunks }))
}

/**
 * Delete all chunks for a given source.
 */
export async function deleteSource(source) {
  const sb = getSupabase()
  const { error, count } = await sb.from('knowledge_embedding').delete({ count: 'exact' }).eq('source', source)
  if (error) throw new Error(error.message)
  return { deleted: count || 0 }
}
