import { NextResponse } from 'next/server'
import { sendEmail, buildInviteEmail, buildOutreachEmail, buildClosedLoopEmail } from '@/lib/email'
import { logEmailSend } from '@/lib/initiative-store'

function mkId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export async function POST(req) {
  try {
    const { type, to, data } = await req.json()

    if (!type || !to || !data) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let emailPayload
    if (type === 'invite') {
      const { employeeName, initiativeTitle, inviteUrl } = data
      emailPayload = buildInviteEmail({ employeeName, initiativeTitle, inviteUrl })
    } else if (type === 'outreach') {
      const { employeeName, message, initiativeTitle, chatUrl } = data
      emailPayload = buildOutreachEmail({ employeeName, message, initiativeTitle, chatUrl })
    } else if (type === 'closed-loop') {
      const { employeeName, closedLoopMessage, changeDescription } = data
      if (!changeDescription || changeDescription.trim().length < 20) {
        return NextResponse.json({ error: 'changeDescription is too vague' }, { status: 400 })
      }
      emailPayload = buildClosedLoopEmail({ employeeName, closedLoopMessage, changeDescription })
    } else {
      return NextResponse.json({ error: 'Invalid email type' }, { status: 400 })
    }

    const result = await sendEmail({ to, ...emailPayload })
    const emailId = mkId()

    await logEmailSend({
      id: emailId,
      type,
      to,
      subject: emailPayload.subject,
      providerId: result?.id || '',
    })

    return NextResponse.json({ ok: true, emailId })
  } catch (err) {
    console.error('email/send error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
