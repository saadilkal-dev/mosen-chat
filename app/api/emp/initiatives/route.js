import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { user } = await requireAuth()
    const email = user.email?.toLowerCase()
    if (!email) return NextResponse.json({ initiatives: [] })

    const sb = getSupabase()

    // 1. Get all initiative IDs this employee is assigned to
    const { data: assignments, error: aErr } = await sb
      .from('initiative_assignments')
      .select('initiative_id')
      .eq('emp_email', email)

    if (aErr) throw aErr
    if (!assignments || assignments.length === 0) return NextResponse.json({ initiatives: [] })

    const ids = assignments.map(a => a.initiative_id)

    // 2. Get initiative details
    const { data: rows, error: iErr } = await sb
      .from('initiatives')
      .select('id, title, status, org_id, updated_at')
      .in('id', ids)
      .order('updated_at', { ascending: false })

    if (iErr) throw iErr

    // 3. Get invite tokens per org (one token per org per employee)
    const orgIds = [...new Set((rows || []).map(r => r.org_id).filter(Boolean))]
    const tokenByOrg = new Map()
    for (const orgId of orgIds) {
      const { data: empRow } = await sb
        .from('org_employees')
        .select('invite_token')
        .eq('org_id', orgId)
        .eq('email', email)
        .maybeSingle()
      if (empRow?.invite_token) tokenByOrg.set(orgId, empRow.invite_token)
    }

    // 4. Shape response
    const initiatives = (rows || []).map(r => {
      const token = tokenByOrg.get(r.org_id) || null
      return {
        id: r.id,
        title: r.title || 'Untitled Initiative',
        status: r.status || 'active',
        token,
        chatUrl: token
          ? `/initiative/${r.id}/employee?token=${encodeURIComponent(token)}`
          : `/initiative/${r.id}/employee`,
      }
    })

    return NextResponse.json({ initiatives })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('emp/initiatives error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
