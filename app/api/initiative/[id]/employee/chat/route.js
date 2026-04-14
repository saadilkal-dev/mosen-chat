import { NextResponse } from 'next/server'
import { getInviteByToken, getInitiative, getChatMessages, saveChatMessages, getBrief, getEmployeeConversationSummary, saveEmployeeConversationSummary } from '@/lib/initiative-store'
import { getPlaybookVersions, briefContentToString } from '@/lib/leader-store'
import { invokeEmployeeChat } from '@/lib/graph/employee-graph'
import { buildEmployeeCurrentActivityString } from '@/lib/playbook-helpers'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { ChatAnthropic } from '@langchain/anthropic'
import { SUMMARISE_MODEL_ID } from '@/lib/graph/base'

export const maxDuration = 60

const WINDOW = 10

export async function GET(req, { params }) {
  const { id: initId } = params
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  // Resolve identity via token OR session (mirrors the brief route pattern)
  let empEmail = null

  if (token) {
    const invite = await getInviteByToken(token)
    if (!invite || !invite.orgId) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 401 })
    }
    empEmail = invite.empEmail
  } else {
    // Fall back to session auth
    const { resolveEmployeeInviteContext } = await import('@/lib/employee-init-access')
    const { auth } = await import('@clerk/nextjs/server')
    const { getOrCreateAppUser } = await import('@/lib/auth')
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Token or session required' }, { status: 401 })
    }
    const u = await getOrCreateAppUser(userId)
    const ctx = await resolveEmployeeInviteContext(initId, { sessionEmail: u?.email || null })
    if (!ctx) {
      return NextResponse.json({ error: 'No access to this initiative' }, { status: 403 })
    }
    empEmail = ctx.empEmail
  }

  const messages = await getChatMessages(initId, empEmail)
  return NextResponse.json({ messages })
}

export async function POST(req, { params }) {
  const { id: initId } = params

  try {
    const { message, token, isSystemTrigger } = await req.json()

    if (!message || !token) {
      return NextResponse.json({ error: 'message and token required' }, { status: 400 })
    }

    const invite = await getInviteByToken(token)
    if (!invite || !invite.orgId) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 401 })
    }

    const initiative = await getInitiative(initId)
    if (!initiative) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    }

    const createdAt = Number(initiative.createdAt) || Date.now()
    const weekNumber = Math.max(1, Math.ceil((Date.now() - createdAt) / (7 * 24 * 60 * 60 * 1000)))

    const briefRow = await getBrief(initId)
    const changeBriefText = briefRow?.content ? briefContentToString(briefRow.content) : ''
    const playbookVersions = await getPlaybookVersions(initId)
    const latestPlaybook = playbookVersions.length ? playbookVersions[playbookVersions.length - 1] : null
    const phases = latestPlaybook?.phases || []
    const currentActivityStr = buildEmployeeCurrentActivityString(phases)

    // Load existing history + rolling summary
    const [existingMessages, existingSummary] = await Promise.all([
      getChatMessages(initId, invite.empEmail),
      getEmployeeConversationSummary(initId, invite.empEmail),
    ])
    const isFirstMessage = !existingMessages || existingMessages.length === 0

    const empContext = {
      initId,
      empEmail: invite.empEmail,
      employee_name: invite.name,
      initiative_title: initiative.title,
      week_number: weekNumber,
      change_brief: changeBriefText.trim() ? changeBriefText : null,
      current_activity: currentActivityStr || null,
      isFirstMessage,
    }

    // Build sliding window of prior messages + rolling summary (mirrors leader chat)
    const allPrior = existingMessages.filter(m => m.text?.trim())
    const overflow = allPrior.slice(0, Math.max(0, allPrior.length - WINDOW))
    const recentWindow = allPrior.slice(-WINDOW)

    let summaryToUse = existingSummary
    if (overflow.length > 0) {
      const overflowText = overflow
        .map(m => `${m.from === 'employee' ? 'Employee' : 'Mosen'}: ${m.text}`)
        .join('\n')
      try {
        const model = new ChatAnthropic({ model: SUMMARISE_MODEL_ID, temperature: 0, maxTokens: 300 })
        const summaryRes = await model.invoke([
          new HumanMessage(
            `Summarize this conversation excerpt in 2-3 sentences, preserving key emotions, concerns, decisions, and what was discussed:\n\n${existingSummary ? `Previous summary: ${existingSummary}\n\n` : ''}${overflowText}`
          ),
        ])
        const summaryText = typeof summaryRes.content === 'string' ? summaryRes.content : existingSummary
        if (summaryText) {
          summaryToUse = summaryText
          saveEmployeeConversationSummary(initId, invite.empEmail, summaryToUse).catch(console.error)
        }
      } catch (err) {
        console.error('Employee summary generation failed:', err)
      }
    }

    const lcHistory = recentWindow
      .map(m => m.from === 'employee' ? new HumanMessage(m.text) : new AIMessage(m.text))

    const threadId = `emp:${initId}:${invite.empEmail}`
    const result = await invokeEmployeeChat(empContext, message, threadId, lcHistory, summaryToUse)

    const history = [...existingMessages]

    if (!isSystemTrigger) {
      history.push({ from: 'employee', text: message, ts: Date.now() })
    }
    history.push({
      from: 'mosen',
      text: result.response,
      ts: Date.now(),
      artifacts: result.artifacts || [],
    })

    await saveChatMessages(initId, invite.empEmail, history)

    return NextResponse.json({
      response: result.response,
      artifacts: result.artifacts || [],
    })
  } catch (err) {
    console.error('employee chat error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
