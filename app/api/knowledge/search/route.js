import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { embedQuery } from '../../../../lib/embedding-service'
import { getSupabase } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * POST /api/knowledge/search
 * Body: { query: string, topK?: number, threshold?: number }
 *
 * Test endpoint — embeds the query and searches mosen-knowledge via RPC.
 */
export async function POST(req) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { query, topK = 10, threshold = 0.5 } = await req.json()
    if (!query) return NextResponse.json({ error: 'query is required' }, { status: 400 })

    const queryEmbedding = await embedQuery(query)

    const sb = getSupabase()
    const { data, error } = await sb.rpc('match_knowledge', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_count: topK,
      match_threshold: threshold,
    })

    if (error) throw new Error(`RPC failed: ${error.message}`)

    return NextResponse.json({
      query,
      results: data || [],
      count: (data || []).length,
    })
  } catch (err) {
    console.error('Knowledge search error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
