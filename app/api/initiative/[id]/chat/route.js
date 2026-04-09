import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { invokeLeaderChat, loadInitContext } from '@/lib/graph/leader-graph'
import { getLeaderChatMessages, saveLeaderChatMessages } from '@/lib/leader-store'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req, { params }) {
  try {
    const { userId } = await requireAuth()
    const { id } = params
    const { message } = await req.json()

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const initContext = await loadInitContext(id, userId)
    const threadId = `initiative:${id}:chat:leader`

    const history = await getLeaderChatMessages(id)
    history.push({ from: 'leader', text: message.trim(), ts: Date.now() })

    const result = await invokeLeaderChat(initContext, message.trim(), threadId)

    history.push({
      from: 'mosen',
      text: result.response,
      ts: Date.now(),
      artifacts: result.artifacts || [],
    })
    await saveLeaderChatMessages(id, history)

    return NextResponse.json({
      response: result.response,
      artifacts: result.artifacts || [],
    })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('Leader chat error:', err)
    return NextResponse.json({ error: err.message || 'Chat failed' }, { status: 500 })
  }
}
