import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'
import { getInitiativeRow, getAssignedEmails, getEmployeeInviteUrl, briefContentToString } from '@/lib/leader-store'
import { sendEmail, buildInviteEmail } from '@/lib/email'
import { logEmailSend } from '@/lib/initiative-store'

export const dynamic = 'force-dynamic'

function mkLogId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
}

export async function GET(req, { params }) {
  try {
    await requireAuth()
    const { id } = params
    const supabase = getSupabase()
    const { data } = await supabase.from('initiative_briefs').select('*').eq('initiative_id', id).maybeSingle()
    if (!data) {
      return NextResponse.json({ brief: null })
    }
    const brief = {
      ...data,
      content: briefContentToString(data.content),
    }
    return NextResponse.json({ brief })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to load brief' }, { status: 500 })
  }
}

export async function PUT(req, { params }) {
  try {
    const { userId } = await requireAuth()
    const { id } = params
    const { content, approved } = await req.json()

    const init = await getInitiativeRow(id)
    if (!init) return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    if (init.leader_clerk_id !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    const supabase = getSupabase()
    const { data: existing } = await supabase.from('initiative_briefs').select('*').eq('initiative_id', id).maybeSingle()

    const row = {
      initiative_id: id,
      content: existing?.content ?? {},
      approved: existing?.approved ?? false,
      updated_at: new Date().toISOString(),
    }

    if (content !== undefined) {
      row.content = typeof content === 'string' ? { body: content } : content
    }
    if (approved !== undefined) row.approved = approved

    const { data: brief, error } = await supabase
      .from('initiative_briefs')
      .upsert(row, { onConflict: 'initiative_id' })
      .select()
      .single()
    if (error) throw error

    if (approved === true) {
      const employees = await getAssignedEmails(id)
      const baseUrl = req.nextUrl?.origin || process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
      for (const empEmail of employees) {
        try {
          const inviteUrl = await getEmployeeInviteUrl(init.org_id, empEmail, id, baseUrl)
          const { data: empRow } = await supabase
            .from('org_employees')
            .select('name')
            .eq('org_id', init.org_id)
            .eq('email', empEmail)
            .maybeSingle()
          const employeeName = empRow?.name || empEmail.split('@')[0]
          const emailPayload = buildInviteEmail({
            employeeName,
            initiativeTitle: init.title,
            inviteUrl,
          })
          const result = await sendEmail({ to: empEmail, ...emailPayload })
          await logEmailSend({
            id: mkLogId(),
            type: 'invite',
            to: empEmail,
            subject: emailPayload.subject,
            providerId: result?.id || '',
          })
        } catch (emailErr) {
          console.error(`Invite email failed for ${empEmail}:`, emailErr)
        }
      }
    }

    return NextResponse.json({ ok: true, brief })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to update brief' }, { status: 500 })
  }
}
