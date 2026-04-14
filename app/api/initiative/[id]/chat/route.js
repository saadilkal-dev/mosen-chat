import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { invokeLeaderChat, loadInitContext } from '@/lib/graph/leader-graph'
import {
  getLeaderChatMessages,
  saveLeaderChatMessages,
  getInitiativeRow,
  getConversationSummary,
  saveConversationSummary,
  clearPendingPhaseCompletionFlag,
} from '@/lib/leader-store'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { ChatAnthropic } from '@langchain/anthropic'
import { SUMMARISE_MODEL_ID } from '@/lib/graph/base'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const WINDOW = 10

function buildLeaderSessionStartInstruction(initContext) {
  const name = initContext.leaderName?.trim() || 'there'
  const title = initContext.title || 'this initiative'
  if (!initContext.briefComplete) {
    return `[SESSION_START] The leader (${name}) just opened "${title}" — there are no messages in this thread yet. Send your opening turn for the change brief: brief warm introduction, then exactly ONE question (3–4 sentences total, no bullet lists). Use their name and the initiative title where it feels natural.`
  }
  return `[SESSION_START] The leader (${name}) opened "${title}" again; the change brief is already complete. Send a short welcoming line and ONE question about what they want to focus on — 3 sentences max, no bullet lists.`
}

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
    const body = await req.json()
    const { message, isSystemTrigger } = body || {}

    const initContext = await loadInitContext(id, userId)
    const threadId = `initiative:${id}:chat:leader`

    let history = await getLeaderChatMessages(id)

    if (isSystemTrigger) {
      const lastMosen = [...history].reverse().find((m) => m.from === 'mosen')
      if (lastMosen) {
        return NextResponse.json({
          response: lastMosen.text,
          artifacts: lastMosen.artifacts || [],
          alreadyStarted: true,
        })
      }

      const instruction = buildLeaderSessionStartInstruction(initContext)
      const result = await invokeLeaderChat(initContext, instruction, threadId, [], '')

      history = await getLeaderChatMessages(id)
      if (history.some((m) => m.from === 'mosen')) {
        const won = [...history].reverse().find((m) => m.from === 'mosen')
        return NextResponse.json({
          response: won.text,
          artifacts: won.artifacts || [],
          alreadyStarted: true,
        })
      }

      if (result.response && result.response.trim()) {
        history.push({
          from: 'mosen',
          text: result.response,
          ts: Date.now(),
          artifacts: result.artifacts || [],
        })
      }
      await saveLeaderChatMessages(id, history)
      await clearPendingPhaseCompletionFlag(id).catch(() => {})

      return NextResponse.json({
        response: result.response,
        artifacts: result.artifacts || [],
      })
    }

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const [historyForTurn, existingSummary] = await Promise.all([
      getLeaderChatMessages(id),
      getConversationSummary(id),
    ])
    history = historyForTurn
    history.push({ from: 'leader', text: message.trim(), ts: Date.now() })

    const allPrior = history.slice(0, -1)
    const overflow = allPrior.slice(0, Math.max(0, allPrior.length - WINDOW))
    const recentWindow = allPrior.slice(-WINDOW)

    let summaryToUse = existingSummary
    if (overflow.length > 0) {
      const overflowText = overflow
        .filter((m) => m.text?.trim())
        .map((m) => `${m.from === 'leader' ? 'Leader' : 'Mosen'}: ${m.text}`)
        .join('\n')
      try {
        const model = new ChatAnthropic({ model: SUMMARISE_MODEL_ID, temperature: 0, maxTokens: 300 })
        const summaryRes = await model.invoke([
          new HumanMessage(
            `Summarize this conversation excerpt in 2-3 sentences, preserving key facts, decisions, and what was agreed:\n\n${existingSummary ? `Previous summary: ${existingSummary}\n\n` : ''}${overflowText}`,
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
      .filter((m) => m.text?.trim())
      .map((m) => (m.from === 'leader' ? new HumanMessage(m.text) : new AIMessage(m.text)))

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

    await clearPendingPhaseCompletionFlag(id).catch(() => {})

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
