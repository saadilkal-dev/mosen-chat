import { requirePlatformAdmin } from '@/lib/platform-admin'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET — roster for any organisation (platform admin).
 */
export async function GET(_req, { params }) {
  const deny = await requirePlatformAdmin()
  if (deny) return deny

  const orgId = params?.orgId
  if (!orgId || typeof orgId !== 'string') {
    return Response.json({ error: 'Invalid organisation id' }, { status: 400 })
  }

  const supabase = getSupabase()
  const { data: org } = await supabase.from('organizations').select('id').eq('id', orgId).maybeSingle()
  if (!org) {
    return Response.json({ error: 'Organisation not found' }, { status: 404 })
  }

  const { data: rows, error } = await supabase
    .from('org_employees')
    .select('id, email, name, department, role, added_at')
    .eq('org_id', orgId)
    .order('added_at', { ascending: true })

  if (error) {
    return Response.json({ error: error.message || 'Could not load roster' }, { status: 500 })
  }

  return Response.json({ employees: rows || [] })
}

/**
 * PATCH — update one roster row ({ email, name?, department?, role? }).
 */
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

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email) {
    return Response.json({ error: 'email is required' }, { status: 400 })
  }

  const patch = {}
  if (typeof body.name === 'string') patch.name = body.name.trim()
  if (typeof body.department === 'string') patch.department = body.department.trim()
  if (typeof body.role === 'string') patch.role = body.role.trim()

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: 'No fields to update' }, { status: 400 })
  }

  const supabase = getSupabase()
  const { data: row, error: findErr } = await supabase
    .from('org_employees')
    .select('id')
    .eq('org_id', orgId)
    .eq('email', email)
    .maybeSingle()

  if (findErr) {
    return Response.json({ error: findErr.message }, { status: 500 })
  }
  if (!row) {
    return Response.json({ error: 'Employee not found on this roster' }, { status: 404 })
  }

  const { data: updated, error: upErr } = await supabase
    .from('org_employees')
    .update(patch)
    .eq('id', row.id)
    .select('id, email, name, department, role, added_at')
    .maybeSingle()

  if (upErr) {
    return Response.json({ error: upErr.message || 'Update failed' }, { status: 500 })
  }

  return Response.json({ ok: true, employee: updated })
}
