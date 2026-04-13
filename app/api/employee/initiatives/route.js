import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * Initiatives assigned to the signed-in user (by email), scoped to their org.
 */
export async function GET() {
  try {
    const { user } = await requireAuth()
    const email = (user.email || '').toLowerCase()
    if (!email || !user.orgId) {
      return NextResponse.json({ initiatives: [] })
    }

    const supabase = getSupabase()
    const { data: assignments, error: aErr } = await supabase
      .from('initiative_assignments')
      .select('initiative_id')
      .eq('emp_email', email)

    if (aErr || !assignments?.length) {
      return NextResponse.json({ initiatives: [] })
    }

    const ids = [...new Set(assignments.map((r) => r.initiative_id))]
    const { data: rows, error: iErr } = await supabase
      .from('initiatives')
      .select('id, title, status, updated_at')
      .in('id', ids)
      .eq('org_id', user.orgId)
      .order('updated_at', { ascending: false })

    if (iErr || !rows) {
      return NextResponse.json({ initiatives: [] })
    }

    const initiatives = rows.map((r) => ({
      id: r.id,
      title: r.title || 'Untitled',
      status: r.status || 'draft',
      lastActivity: r.updated_at ? new Date(r.updated_at).getTime() : Date.now(),
    }))

    return NextResponse.json({ initiatives })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to load initiatives' }, { status: 500 })
  }
}
