import { getSupabase } from './supabase'
import { validateEmail } from './utils'

/**
 * Links a Clerk user to their org from org_employees by email (HR pre-provision).
 * Skips if the profile already has an org (e.g. leader).
 */
export async function linkEmployeeFromRoster(clerkUserId, email) {
  const em = (email || '').toLowerCase().trim()
  if (!em || !validateEmail(em)) return false

  const supabase = getSupabase()

  const { data: profile } = await supabase
    .from('app_user_profiles')
    .select('org_id, role')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()

  if (profile?.org_id) return false

  const { data: roster, error: rosterErr } = await supabase
    .from('org_employees')
    .select('id, org_id, name, email')
    .eq('email', em)
    .limit(1)
    .maybeSingle()

  if (rosterErr || !roster) return false

  const now = new Date().toISOString()
  const displayName = (roster.name || '').trim() || em.split('@')[0]

  const { error: upErr } = await supabase
    .from('app_user_profiles')
    .update({
      org_id: roster.org_id,
      role: 'employee',
      name: displayName,
      updated_at: now,
    })
    .eq('clerk_user_id', clerkUserId)

  if (upErr) return false
  return true
}
