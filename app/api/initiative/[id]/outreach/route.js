import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getInitiativeRow, getOutreachMessages, setOutreachMessages, getOrgRoster } from '@/lib/leader-store'

export const dynamic = 'force-dynamic'

export async function GET(req, { params }) {
  try {
    await requireAuth()
    const { id } = params
    const messages = await getOutreachMessages(id)
    return NextResponse.json({ messages })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to load outreach' }, { status: 500 })
  }
}

export async function PUT(req, { params }) {
  try {
    const { userId } = await requireAuth()
    const { id } = params
    const { messageId, approved, editedText } = await req.json()

    if (!messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 })

    const init = await getInitiativeRow(id)
    if (!init) return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    if (init.leader_clerk_id !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    const messages = await getOutreachMessages(id)
    const msgIndex = messages.findIndex((m) => m.id === messageId)
    if (msgIndex === -1) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    if (editedText) messages[msgIndex].draft = editedText
    if (approved !== undefined) {
      messages[msgIndex].status = approved ? 'approved' : 'declined'
      if (approved) messages[msgIndex].sentAt = Date.now()
    }

    await setOutreachMessages(id, messages)

    if (approved) {
      try {
        const roster = await getOrgRoster(init.org_id)
        const baseUrl = req.nextUrl?.origin || process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
        for (const empRow of roster || []) {
          const chatUrl = empRow.invite_token
            ? `${baseUrl}/initiative/${id}/employee?token=${encodeURIComponent(empRow.invite_token)}`
            : `${baseUrl}/initiative/${id}/employee`
          await fetch(`${baseUrl}/api/email/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: req.headers.get('cookie') || '' },
            body: JSON.stringify({
              type: 'outreach',
              to: empRow.email,
              data: {
                employeeName: empRow.name || empRow.email.split('@')[0],
                initiativeTitle: init.title,
                message: messages[msgIndex].draft,
                chatUrl,
              },
            }),
          })
        }
      } catch (emailErr) {
        console.warn('Outreach email send failed:', emailErr.message)
      }
    }

    return NextResponse.json({ ok: true, message: messages[msgIndex] })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to update outreach' }, { status: 500 })
  }
}
