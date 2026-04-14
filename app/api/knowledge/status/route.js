import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ragStatus } from '../../../../lib/rag-retriever'

export const dynamic = 'force-dynamic'

/**
 * GET /api/knowledge/status
 * Returns whether RAG is active, how many chunks are ingested, and any issues.
 */
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const status = await ragStatus()
    return NextResponse.json(status)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
