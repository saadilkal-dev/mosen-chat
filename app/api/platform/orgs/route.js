import { requirePlatformAdmin } from '@/lib/platform-admin'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function countByOrg(rows, key = 'org_id') {
  const m = {}
  for (const row of rows || []) {
    const id = row[key]
    if (!id) continue
    m[id] = (m[id] || 0) + 1
  }
  return m
}

/**
 * GET — list all organisations (platform admin).
 */
export async function GET() {
  const deny = await requirePlatformAdmin()
  if (deny) return deny

  const supabase = getSupabase()
  const { data: orgs, error: orgErr } = await supabase
    .from('organizations')
    .select('id, name, created_at, admin_user_id')
    .order('created_at', { ascending: false })

  if (orgErr) {
    return Response.json({ error: orgErr.message || 'Could not load organisations' }, { status: 500 })
  }

  const list = orgs || []
  const ids = list.map((o) => o.id)
  if (ids.length === 0) {
    return Response.json({ orgs: [] })
  }

  const [{ data: provisions }, { data: empRows }, { data: initRows }, { data: profileRows }] = await Promise.all([
    supabase.from('leader_provisions').select('org_id, leader_email, claimed_at, claimed_clerk_user_id').in('org_id', ids),
    supabase.from('org_employees').select('org_id').in('org_id', ids),
    supabase.from('initiatives').select('org_id').in('org_id', ids),
    supabase.from('app_user_profiles').select('org_id, clerk_user_id, email, name, role').in('org_id', ids),
  ])

  const provByOrg = new Map((provisions || []).map((p) => [p.org_id, p]))
  const empCount = countByOrg(empRows)
  const initCount = countByOrg(initRows)

  const profilesByOrg = {}
  for (const p of profileRows || []) {
    if (!p.org_id) continue
    if (!profilesByOrg[p.org_id]) profilesByOrg[p.org_id] = []
    profilesByOrg[p.org_id].push({
      clerkUserId: p.clerk_user_id,
      email: p.email,
      name: p.name,
      role: p.role,
    })
  }

  const orgsOut = list.map((o) => {
    const lp = provByOrg.get(o.id)
    return {
      id: o.id,
      name: o.name,
      createdAt: o.created_at,
      adminUserId: o.admin_user_id,
      leaderEmail: lp?.leader_email || null,
      provisionClaimedAt: lp?.claimed_at || null,
      claimedClerkUserId: lp?.claimed_clerk_user_id || null,
      employeeCount: empCount[o.id] || 0,
      initiativeCount: initCount[o.id] || 0,
      appUsers: profilesByOrg[o.id] || [],
    }
  })

  return Response.json({ orgs: orgsOut })
}
