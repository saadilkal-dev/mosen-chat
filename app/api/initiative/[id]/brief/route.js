import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'
import { getInitiativeRow, getAssignedEmails, getEmployeeInviteUrl, briefContentToString } from '@/lib/leader-store'

export const dynamic = 'force-dynamic'

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
      if (employees.length > 0) {
        try {
          for (const empEmail of employees) {
            const inviteUrl = await getEmployeeInviteUrl(init.org_id, empEmail, id, baseUrl)
            const { data: empRow } = await supabase
              .from('org_employees')
              .select('name')
              .eq('org_id', init.org_id)
              .eq('email', empEmail)
              .maybeSingle()
            const employeeName = empRow?.name || empEmail.split('@')[0]
            await fetch(`${baseUrl}/api/email/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Cookie: req.headers.get('cookie') || '' },
              body: JSON.stringify({
                type: 'invite',
                to: empEmail,
                data: {
                  employeeName,
                  initiativeTitle: init.title,
                  inviteUrl,
                },
              }),
            })
          }
        } catch (emailErr) {
          console.warn('Invite email send failed:', emailErr.message)
        }
      }
    }

    return NextResponse.json({ ok: true, brief })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to update brief' }, { status: 500 })
  }
}
