import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOrCreateAppUser } from '@/lib/auth'
import { resolveEmployeeInviteContext } from '@/lib/employee-init-access'
import { getInitiative, getBrief } from '@/lib/initiative-store'
import { briefContentToString } from '@/lib/leader-store'
import { getSupabase } from '@/lib/supabase'

export async function GET(req, { params }) {
  const { id: initId } = params
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  let sessionEmail = null
  if (!token) {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Sign in or use an invite link' }, { status: 401 })
    }
    const u = await getOrCreateAppUser(userId)
    sessionEmail = u?.email || null
  }

  const ctx = await resolveEmployeeInviteContext(initId, { token: token || undefined, sessionEmail })
  if (!ctx) {
    return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 401 })
  }

  const initiative = await getInitiative(initId)
  if (!initiative) {
    return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
  }

  const brief = await getBrief(initId)

  // Primary: use the approved employee brief from initiative_briefs
  if (brief?.approved && brief.content != null) {
    return NextResponse.json({
      employeeName: ctx.employeeName || '',
      brief: { content: briefContentToString(brief.content), initiativeTitle: initiative.title },
      initiativeTitle: initiative.title || '',
    })
  }

  // Fallback: if the initiative is published (is_public = true), surface the
  // leader's brief_data as the employee brief so they're not blocked.
  // This covers initiatives shared before the leader clicked "Approve & Send".
  try {
    const sb = getSupabase()
    const { data: row } = await sb
      .from('initiatives')
      .select('is_public, brief_data')
      .eq('id', initId)
      .maybeSingle()

    if (row?.is_public && row.brief_data) {
      // Extract readable content from brief_data (JSONB with area answers)
      const briefData = row.brief_data || {}
      const sections = [
        briefData.what_changing  ? `What's changing:\n${briefData.what_changing}`     : null,
        briefData.why_changing   ? `Why it matters:\n${briefData.why_changing}`       : null,
        briefData.who_affected   ? `Who's affected:\n${briefData.who_affected}`       : null,
        briefData.success_90d    ? `What success looks like:\n${briefData.success_90d}` : null,
        briefData.uncertainty    ? `What we don't know yet:\n${briefData.uncertainty}` : null,
      ].filter(Boolean)

      // Prefer the summary field if available — it's the narrative form
      const generatedBody = briefData.summary || null

      const briefText = generatedBody || (sections.length ? sections.join('\n\n') : null)

      if (briefText) {
        // Persist this as an approved brief so future requests skip the fallback
        try {
          sb.from('initiative_briefs')
            .upsert({
              initiative_id: initId,
              content: { body: briefText },
              approved: true,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'initiative_id' })
            .then(() => {})
            .catch(() => {})
        } catch {}

        return NextResponse.json({
          employeeName: ctx.employeeName || '',
          brief: { content: briefText, initiativeTitle: initiative.title },
          initiativeTitle: initiative.title || '',
        })
      }
    }
  } catch (fallbackErr) {
    console.warn('[employee/brief] fallback brief_data read failed:', fallbackErr.message)
  }

  return NextResponse.json({
    employeeName: ctx.employeeName || '',
    brief: null,
    initiativeTitle: initiative.title || '',
  })
}
