import { auth, currentUser } from '@clerk/nextjs/server'
import { getSupabase } from './supabase'

/**
 * Loads or creates the Postgres app profile for a Clerk user.
 */
export async function getOrCreateAppUser(clerkUserId) {
  const supabase = getSupabase()
  const cu = await currentUser()
  if (!cu) return null

  const primary = cu.emailAddresses?.find(e => e.id === cu.primaryEmailAddressId)
    || cu.emailAddresses?.[0]
  const email = (primary?.emailAddress || '').toLowerCase()
  const name = [cu.firstName, cu.lastName].filter(Boolean).join(' ').trim()
    || (email ? email.split('@')[0] : '')
    || 'User'

  const { data: row } = await supabase
    .from('app_user_profiles')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()

  const now = new Date().toISOString()

  if (!row || !row.email) {
    await supabase.from('app_user_profiles').upsert(
      {
        clerk_user_id: clerkUserId,
        email,
        name,
        org_id: row?.org_id ?? null,
        role: row?.role || 'leader',
        created_at: row?.created_at || now,
        updated_at: now,
      },
      { onConflict: 'clerk_user_id' },
    )
  } else if (email && row.email !== email) {
    await supabase
      .from('app_user_profiles')
      .update({ email, name, updated_at: now })
      .eq('clerk_user_id', clerkUserId)
  }

  const { data: fresh } = await supabase
    .from('app_user_profiles')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!fresh) return null

  const orgId = fresh.org_id && String(fresh.org_id).trim() !== '' ? String(fresh.org_id) : null

  return {
    userId: clerkUserId,
    name: fresh.name || name,
    email: fresh.email || email,
    orgId,
    role: fresh.role || 'leader',
  }
}

export async function requireAuth() {
  const { userId } = await auth()
  if (!userId) {
    throw Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = await getOrCreateAppUser(userId)
  if (!user) {
    throw Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return { userId, user }
}
