import { NextResponse } from 'next/server'
import { getInviteByToken, getInitiative, getChatMessages, saveChatMessages } from '@/lib/initiative-store'
import { invokeEmployeeChat } from '@/lib/graph/employee-graph'

export async function GET(req, { params }) {
  const { id: initId } = params
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 401 })
  }

  const invite = await getInviteByToken(token)
  if (!invite || !invite.orgId) {
    return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 401 })
  }

  const messages = await getChatMessages(initId, invite.empEmail)

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

    const empContext = {
      initId,
      empEmail: invite.empEmail,
      employee_name: invite.name,
      initiative_title: initiative.title,
      week_number: weekNumber,
    }

    const threadId = `emp:${initId}:${invite.empEmail}`
    const result = await invokeEmployeeChat(empContext, message, threadId)

    const history = await getChatMessages(initId, invite.empEmail)

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
