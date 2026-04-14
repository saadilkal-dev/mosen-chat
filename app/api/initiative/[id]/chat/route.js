import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { invokeLeaderChat, loadInitContext } from '@/lib/graph/leader-graph'
import { getLeaderChatMessages, saveLeaderChatMessages, getInitiativeRow, getConversationSummary, saveConversationSummary } from '@/lib/leader-store'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { ChatAnthropic } from '@langchain/anthropic'
import { SUMMARISE_MODEL_ID } from '@/lib/graph/base'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const WINDOW = 10

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

    const [history, existingSummary] = await Promise.all([
      getLeaderChatMessages(id),
      getConversationSummary(id),
    ])
    history.push({ from: 'leader', text: message.trim(), ts: Date.now() })

    // Build sliding window + rolling summary for LangGraph context
    const allPrior = history.slice(0, -1) // everything before the new user message
    const overflow = allPrior.slice(0, Math.max(0, allPrior.length - WINDOW))
    const recentWindow = allPrior.slice(-WINDOW)

    let summaryToUse = existingSummary
    if (overflow.length > 0) {
      const overflowText = overflow
        .filter(m => m.text?.trim())
        .map(m => `${m.from === 'leader' ? 'Leader' : 'Mosen'}: ${m.text}`)
        .join('\n')
      try {
        const model = new ChatAnthropic({ model: SUMMARISE_MODEL_ID, temperature: 0, maxTokens: 300 })
        const summaryRes = await model.invoke([
          new HumanMessage(
            `Summarize this conversation excerpt in 2-3 sentences, preserving key facts, decisions, and what was agreed:\n\n${existingSummary ? `Previous summary: ${existingSummary}\n\n` : ''}${overflowText}`
          ),
        ])
        const summaryText = typeof summaryRes.content === 'string' ? summaryRes.content : existingSummary
        if (summaryText) {
          summaryToUse = summaryText
          saveConversationSummary(id, summaryToUse).catch(console.error)
        }
      } catch (err) {
        console.error('Summary generation failed:', err)
      }
    }

    const lcHistory = recentWindow
      .filter(m => m.text?.trim())
      .map(m => m.from === 'leader' ? new HumanMessage(m.text) : new AIMessage(m.text))

    const result = await invokeLeaderChat(initContext, message.trim(), threadId, lcHistory, summaryToUse)

    if (result.response && result.response.trim()) {
      history.push({
        from: 'mosen',
        text: result.response,
        ts: Date.now(),
        artifacts: result.artifacts || [],
      })
    }
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
