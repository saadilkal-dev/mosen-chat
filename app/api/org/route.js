import { requireAuth } from '../../../lib/auth'
import { mkId } from '../../../lib/utils'
import { getSupabase } from '../../../lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req) {
  try {
    const { userId } = await requireAuth()
    const { name } = await req.json()

    if (!name || !name.trim()) {
      return Response.json({ error: 'Organisation name is required' }, { status: 400 })
    }

    const orgId = mkId()
    const supabase = getSupabase()

    const { error: orgErr } = await supabase.from('organizations').insert({
      id: orgId,
      name: name.trim(),
      admin_user_id: userId,
    })
    if (orgErr) throw orgErr

    const { error: userErr } = await supabase
      .from('app_user_profiles')
      .update({ org_id: orgId, updated_at: new Date().toISOString() })
      .eq('clerk_user_id', userId)
    if (userErr) throw userErr

    return Response.json({ ok: true, orgId }, { status: 201 })
  } catch (err) {
    if (err instanceof Response) return err
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req) {
  try {
    const { user } = await requireAuth()
    if (!user.orgId) {
      return Response.json({ org: null })
    }

    const supabase = getSupabase()
    const { data: org, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', user.orgId)
      .maybeSingle()

    if (error) throw error
    if (!org) return Response.json({ org: null })

    return Response.json({ org: { id: org.id, name: org.name, created_at: org.created_at, admin_user_id: org.admin_user_id } })
  } catch (err) {
    if (err instanceof Response) return err
    return Response.json({ error: err.message }, { status: 500 })
  }
}
