import { NextResponse } from 'next/server'
import {
  getInviteByToken,
  getInitiative,
  getClosedLoopMessages,
  appendClosedLoopMessage,
  getEmployeeNameFromOrg,
  listDistinctEmailsWithGrantedConsent,
} from '@/lib/initiative-store'
import { sendEmail, buildClosedLoopEmail } from '@/lib/email'

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

  const invite = await getInviteByToken(token)
  if (!invite || !invite.orgId) {
    return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 401 })
  }

  const messages = await getClosedLoopMessages(initId, invite.empEmail)

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

    let recipients = []
    if (empEmail) {
      recipients = [empEmail]
    } else {
      recipients = await listDistinctEmailsWithGrantedConsent(initId)
    }

    const initiative = await getInitiative(initId)
    const orgId = initiative?.orgId

    let deliveredTo = 0
    for (const email of recipients) {
      await appendClosedLoopMessage(initId, email, record)

      let employeeName = email
      if (orgId) {
        employeeName = await getEmployeeNameFromOrg(orgId, email)
      }

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
