import { requirePlatformAdmin } from '@/lib/platform-admin'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function PATCH(req, { params }) {
  const deny = await requirePlatformAdmin()
  if (deny) return deny

  const orgId = params?.orgId
  if (!orgId || typeof orgId !== 'string') {
    return Response.json({ error: 'Invalid organisation id' }, { status: 400 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return Response.json({ error: 'Organisation name is required' }, { status: 400 })
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('organizations')
    .update({ name })
    .eq('id', orgId)
    .select('id, name, created_at, admin_user_id')
    .maybeSingle()

  if (error) {
    return Response.json({ error: error.message || 'Update failed' }, { status: 500 })
  }
  if (!data) {
    return Response.json({ error: 'Organisation not found' }, { status: 404 })
  }

  return Response.json({ ok: true, org: data })
}
