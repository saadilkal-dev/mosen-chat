import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getInitiativeRow, getOutreachMessages, setOutreachMessages, getAssignedEmails } from '@/lib/leader-store'
import { getSupabase } from '@/lib/supabase'
import { sendEmail, buildOutreachEmail } from '@/lib/email'
import { logEmailSend } from '@/lib/initiative-store'

export const dynamic = 'force-dynamic'

function mkLogId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
}

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
      const employees = await getAssignedEmails(id)
      const baseUrl = req.nextUrl?.origin || process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
      const supabase = getSupabase()
      for (const empEmail of employees || []) {
        try {
          const { data: empRow } = await supabase
            .from('org_employees')
            .select('invite_token, name')
            .eq('org_id', init.org_id)
            .eq('email', empEmail)
            .maybeSingle()
          const chatUrl = empRow?.invite_token
            ? `${baseUrl}/initiative/${id}/employee?token=${encodeURIComponent(empRow.invite_token)}`
            : `${baseUrl}/initiative/${id}/employee`
          const emailPayload = buildOutreachEmail({
            employeeName: empRow?.name || empEmail.split('@')[0],
            initiativeTitle: init.title,
            message: messages[msgIndex].draft,
            chatUrl,
          })
          const result = await sendEmail({ to: empEmail, ...emailPayload })
          await logEmailSend({
            id: mkLogId(),
            type: 'outreach',
            to: empEmail,
            subject: emailPayload.subject,
            providerId: result?.id || '',
          })
        } catch (emailErr) {
          console.error(`Outreach email failed for ${empEmail}:`, emailErr)
        }
      }
    }

    return NextResponse.json({ ok: true, message: messages[msgIndex] })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to update outreach' }, { status: 500 })
  }
}
