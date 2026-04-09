import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { invokeEmployeeChat } from '@/lib/graph/employee-graph'

// ── GET — load chat history ────────────────────────────────────────────────────
export async function GET(req, { params }) {
  const { id: initId } = params
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 401 })
  }

  const invite = await redis.hgetall(`invite:${token}`)
  if (!invite || !invite.orgId) {
    return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 401 })
  }

  const raw = await redis.get(`initiative:${initId}:chat:${invite.empEmail}`)
  const messages = raw ? JSON.parse(raw) : []

  return NextResponse.json({ messages })
}

// ── POST — send message ────────────────────────────────────────────────────────
export async function POST(req, { params }) {
  const { id: initId } = params

  try {
    const { message, token, isSystemTrigger } = await req.json()

    if (!message || !token) {
      return NextResponse.json({ error: 'message and token required' }, { status: 400 })
    }

    const invite = await redis.hgetall(`invite:${token}`)
    if (!invite || !invite.orgId) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 401 })
    }

    const initiative = await redis.hgetall(`initiative:${initId}`)
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

    // For system triggers, only persist Mosen's response (not the trigger itself)
    const chatKey = `initiative:${initId}:chat:${invite.empEmail}`
    const existing = await redis.get(chatKey)
    const history = existing ? JSON.parse(existing) : []

    if (!isSystemTrigger) {
      history.push({ from: 'employee', text: message, ts: Date.now() })
    }
    history.push({ from: 'mosen', text: result.response, ts: Date.now(), artifacts: result.artifacts || [] })

    await redis.set(chatKey, JSON.stringify(history))

    return NextResponse.json({
      response: result.response,
      artifacts: result.artifacts || [],
    })
  } catch (err) {
    console.error('employee chat error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
