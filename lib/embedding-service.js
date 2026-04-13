/**
 * Query Embedding Service — Gemini gemini-embedding-001 (768 dims)
 *
 * Must match the ingestion script (pdf_rag_app.py) which uses:
 *   model = gemini-embedding-001
 *   output_dimensionality = 768
 *   task_type = RETRIEVAL_DOCUMENT (for docs) / RETRIEVAL_QUERY (for queries)
 */

const GEMINI_MODEL = 'gemini-embedding-001'
const EMBEDDING_DIM = 768
const GEMINI_EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:embedContent`

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
