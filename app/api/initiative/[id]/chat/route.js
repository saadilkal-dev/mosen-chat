import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../../lib/auth'
import { invokeLeaderChat, loadInitContext } from '../../../../../lib/graph/leader-graph'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/initiative/[id]/chat — Leader LangGraph chat
export async function POST(req, { params }) {
  try {
    const session = await requireAuth(req)
    const { id } = params
    const { message } = await req.json()

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Load initiative context (also validates ownership)
    const initContext = await loadInitContext(id, session.userId)

    // Thread ID for conversation persistence
    const threadId = `initiative:${id}:chat:leader`

    // Invoke the leader graph
    const result = await invokeLeaderChat(initContext, message.trim(), threadId)

    return NextResponse.json({
      response: result.response,
      artifacts: result.artifacts || []
    })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('Leader chat error:', err)
    return NextResponse.json({ error: err.message || 'Chat failed' }, { status: 500 })
  }
}
