import { getSupabase } from './supabase'
import { validateEmail } from './utils'

/**
 * If this user has no org yet but a leader_provisions row exists for their email,
 * attach them as org admin and mark the provision claimed.
 */
export async function claimLeaderProvisionIfAny(clerkUserId, email) {
  const em = (email || '').toLowerCase().trim()
  if (!em || !validateEmail(em)) return false

  const supabase = getSupabase()

  const { data: profile } = await supabase
    .from('app_user_profiles')
    .select('org_id')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()

  if (profile?.org_id) return false

  const { data: prov, error: provErr } = await supabase
    .from('leader_provisions')
    .select('id, org_id')
    .eq('leader_email', em)
    .is('claimed_at', null)
    .maybeSingle()

  if (provErr || !prov) return false

  const { data: org } = await supabase
    .from('organizations')
    .select('admin_user_id')
    .eq('id', prov.org_id)
    .maybeSingle()

  if (!org || org.admin_user_id) return false

  const now = new Date().toISOString()

  const { error: orgUp } = await supabase
    .from('organizations')
    .update({ admin_user_id: clerkUserId })
    .eq('id', prov.org_id)
    .is('admin_user_id', null)

  if (orgUp) return false

  await supabase
    .from('app_user_profiles')
    .update({ org_id: prov.org_id, role: 'leader', updated_at: now })
    .eq('clerk_user_id', clerkUserId)

  await supabase
    .from('leader_provisions')
    .update({ claimed_at: now, claimed_clerk_user_id: clerkUserId })
    .eq('id', prov.id)

  return true
}

/**
 * If leader_provisions was claimed for this Clerk user but profile.org_id is missing (rare desync), repair it.
 */
export async function repairLeaderOrgIfProvisionClaimed(clerkUserId) {
  const supabase = getSupabase()
  const { data: prov } = await supabase
    .from('leader_provisions')
    .select('org_id')
    .eq('claimed_clerk_user_id', clerkUserId)
    .maybeSingle()

  if (!prov?.org_id) return false

  const { data: profile } = await supabase
    .from('app_user_profiles')
    .select('org_id')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()

  if (profile?.org_id === prov.org_id) return false

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('app_user_profiles')
    .update({ org_id: prov.org_id, role: 'leader', updated_at: now })
    .eq('clerk_user_id', clerkUserId)

  return !error
}
