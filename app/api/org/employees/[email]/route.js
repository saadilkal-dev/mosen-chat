import { requireAuth } from '../../../../../lib/auth'
import { validateEmail } from '../../../../../lib/utils'
import { getSupabase } from '../../../../../lib/supabase'

export const dynamic = 'force-dynamic'

export async function DELETE(_req, context) {
  try {
    const { user } = await requireAuth()
    if (!user.orgId) {
      return Response.json({ error: 'You must belong to an organisation' }, { status: 400 })
    }

    const raw = context?.params?.email
    const decoded = decodeURIComponent(typeof raw === 'string' ? raw : '')
    const email = decoded.trim().toLowerCase()

    if (!email || !validateEmail(email)) {
      return Response.json({ error: 'Invalid email' }, { status: 400 })
    }

    const orgId = user.orgId
    const supabase = getSupabase()

    const { data: row, error: selErr } = await supabase
      .from('org_employees')
      .select('id, invite_token')
      .eq('org_id', orgId)
      .eq('email', email)
      .maybeSingle()

    if (selErr) throw selErr
    if (!row) {
      return Response.json({ error: 'Team member not found' }, { status: 404 })
    }

    const { data: inits } = await supabase.from('initiatives').select('id').eq('org_id', orgId)
    const initiativeIds = (inits || []).map((i) => i.id)
    if (initiativeIds.length > 0) {
      const { error: asgErr } = await supabase
        .from('initiative_assignments')
        .delete()
        .eq('emp_email', email)
        .in('initiative_id', initiativeIds)
      if (asgErr) throw asgErr
    }

    const { error: invErr } = await supabase.from('invites').delete().eq('token', row.invite_token)
    if (invErr) throw invErr

    const { error: delErr } = await supabase.from('org_employees').delete().eq('id', row.id)
    if (delErr) throw delErr

    return Response.json({ ok: true, email })
  } catch (err) {
    if (err instanceof Response) return err
    return Response.json({ error: err.message }, { status: 500 })
  }
}
