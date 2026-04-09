import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { sendEmail, buildClosedLoopEmail } from '@/lib/email'
import { CONSENT_STATUS } from '@/lib/constants'

function mkId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

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

  const raw = await redis.get(`initiative:${initId}:closedloop:${invite.empEmail}`)
  const messages = raw ? JSON.parse(raw) : []

  return NextResponse.json({ messages })
}

export async function POST(req, { params }) {
  const { id: initId } = params

  try {
    const { empEmail, changeDescription, message, pivotId } = await req.json()

    if (!changeDescription || changeDescription.trim().length < 20) {
      return NextResponse.json({ error: 'changeDescription is too vague' }, { status: 400 })
    }
    const hollow = ['your feedback was heard', 'thank you for your input', 'we appreciate']
    if (hollow.some((h) => changeDescription.toLowerCase().includes(h))) {
      return NextResponse.json({ error: 'changeDescription is hollow' }, { status: 400 })
    }

    const record = {
      id: mkId(),
      changeDescription,
      message,
      pivotId,
      createdAt: Date.now(),
    }

    // Determine recipients
    let recipients = []
    if (empEmail) {
      recipients = [empEmail]
    } else {
      // Deliver to all employees who consented to at least one theme
      const pattern = `initiative:${initId}:consent:*:*`
      const keys = await redis.keys(pattern)
      const seen = new Set()
      for (const key of keys) {
        const r = await redis.hgetall(key)
        if (r && r.status === CONSENT_STATUS.GRANTED && !seen.has(r.empEmail)) {
          seen.add(r.empEmail)
          recipients.push(r.empEmail)
        }
      }
    }

    const initiative = await redis.hgetall(`initiative:${initId}`)

    let deliveredTo = 0
    for (const email of recipients) {
      // Persist to Redis
      const key = `initiative:${initId}:closedloop:${email}`
      const existingRaw = await redis.get(key)
      const existing = existingRaw ? JSON.parse(existingRaw) : []
      existing.push(record)
      await redis.set(key, JSON.stringify(existing))

      // Get employee name from org roster
      const orgId = initiative?.orgId
      let employeeName = email
      if (orgId) {
        const rosterRaw = await redis.get(`org:${orgId}:employees`)
        const roster = rosterRaw ? JSON.parse(rosterRaw) : []
        const emp = roster.find((e) => e.email === email)
        if (emp) employeeName = emp.name
      }

      // Send email
      try {
        const emailPayload = buildClosedLoopEmail({
          employeeName,
          closedLoopMessage: message,
          changeDescription,
        })
        await sendEmail({ to: email, ...emailPayload })
      } catch (emailErr) {
        console.error(`closed-loop email failed for ${email}:`, emailErr)
      }

      deliveredTo++
    }

    return NextResponse.json({ ok: true, deliveredTo })
  } catch (err) {
    console.error('closed-loop route error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
