import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { invokeLeaderChat, loadInitContext } from '@/lib/graph/leader-graph'
import { getLeaderChatMessages, saveLeaderChatMessages, getInitiativeRow } from '@/lib/leader-store'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req, { params }) {
  try {
    const { user } = await requireAuth()
    const { id } = params

    const init = await getInitiativeRow(id)
    if (!init) return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    if (user.orgId !== init.org_id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    const messages = await getLeaderChatMessages(id)
    return NextResponse.json({ messages })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to load chat' }, { status: 500 })
  }
}

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
