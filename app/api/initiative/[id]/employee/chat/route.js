import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOrCreateAppUser } from '@/lib/auth'
import { resolveEmployeeInviteContext } from '@/lib/employee-init-access'
import { getInitiative, getChatMessages, saveChatMessages } from '@/lib/initiative-store'
import { invokeEmployeeChat } from '@/lib/graph/employee-graph'

async function resolveCtx(initId, token, sessionEmail) {
  return resolveEmployeeInviteContext(initId, { token: token || undefined, sessionEmail })
}

export async function GET(req, { params }) {
  const { id: initId } = params
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  let sessionEmail = null
  if (!token) {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Sign in or use an invite link' }, { status: 401 })
    }
    const u = await getOrCreateAppUser(userId)
    sessionEmail = u?.email || null
  }

  const ctx = await resolveCtx(initId, token, sessionEmail)
  if (!ctx) {
    return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 401 })
  }

  const messages = await getChatMessages(initId, ctx.empEmail)

  return NextResponse.json({ messages })
}

export async function POST(req, { params }) {
  const { id: initId } = params

  try {
    const { message, token, isSystemTrigger } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }

    let sessionEmail = null
    if (!token) {
      const { userId } = await auth()
      if (!userId) {
        return NextResponse.json({ error: 'Sign in or use an invite link' }, { status: 401 })
      }
      const u = await getOrCreateAppUser(userId)
      sessionEmail = u?.email || null
    }

    const ctx = await resolveCtx(initId, token, sessionEmail)
    if (!ctx) {
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
      empEmail: ctx.empEmail,
      employee_name: ctx.employeeName,
      initiative_title: initiative.title,
      week_number: weekNumber,
    }

    const threadId = `emp:${initId}:${ctx.empEmail}`
    const result = await invokeEmployeeChat(empContext, message, threadId)

    const history = await getChatMessages(initId, ctx.empEmail)

    if (!isSystemTrigger) {
      history.push({ from: 'employee', text: message, ts: Date.now() })
    }
    history.push({
      from: 'mosen',
      text: result.response,
      ts: Date.now(),
      artifacts: result.artifacts || [],
    })

    await saveChatMessages(initId, ctx.empEmail, history)

    return NextResponse.json({
      response: result.response,
      artifacts: result.artifacts || [],
    })
  } catch (err) {
    console.error('employee chat error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
