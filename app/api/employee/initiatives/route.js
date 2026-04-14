import { auth } from '@clerk/nextjs/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sb = getSupabase()

    // Get user email — used to match shared_with and initiative_invites
    const { data: userProfile, error: profileError } = await sb
      .from('app_user_profiles')
      .select('email')
      .eq('clerk_id', userId)
      .single()

    if (profileError || !userProfile?.email) {
      return Response.json({ error: 'User profile not found' }, { status: 404 })
    }

    const userEmail = userProfile.email

    // Fetch initiatives where the user's email is in the shared_with array.
    // This correctly scopes to initiatives the user was explicitly shared on,
    // regardless of whether they're a leader or employee role in the system.
    const { data: sharedInitiatives, error: sharedError } = await sb
      .from('initiatives')
      .select('id, title, brief_summary, brief_excerpt, published_at, is_public, leader_clerk_id')
      .contains('shared_with', [userEmail])

    if (sharedError) {
      console.error('[employee/initiatives] shared_with fetch error:', sharedError)
      return Response.json({ error: 'Failed to fetch initiatives' }, { status: 500 })
    }

    // Also check initiative_invites table (token-based invites that have been accepted or are pending)
    const { data: inviteRows, error: inviteError } = await sb
      .from('initiative_invites')
      .select('initiative_id, status')
      .eq('employee_email', userEmail)
      .neq('status', 'declined')

    if (inviteError) {
      console.error('[employee/initiatives] invites fetch error:', inviteError)
    }

    // Collect invited initiative IDs not already in sharedInitiatives
    const sharedIds = new Set((sharedInitiatives || []).map(i => i.id))
    const invitedIds = (inviteRows || [])
      .map(r => r.initiative_id)
      .filter(id => !sharedIds.has(id))

    let invitedInitiatives = []
    if (invitedIds.length > 0) {
      const { data, error } = await sb
        .from('initiatives')
        .select('id, title, brief_summary, brief_excerpt, published_at, is_public, leader_clerk_id')
        .in('id', invitedIds)
      if (!error && data) invitedInitiatives = data
    }

    const allInitiatives = [...(sharedInitiatives || []), ...invitedInitiatives]

    // Look up leader names for all unique leader_clerk_ids
    const leaderIds = [...new Set(allInitiatives.map(i => i.leader_clerk_id).filter(Boolean))]
    let leaderNameMap = {}
    if (leaderIds.length > 0) {
      const { data: profiles } = await sb
        .from('app_user_profiles')
        .select('clerk_id, name, email')
        .in('clerk_id', leaderIds)
      if (profiles) {
        for (const p of profiles) leaderNameMap[p.clerk_id] = p.name || p.email || 'Your leader'
      }
    }

    const result = allInitiatives.map(init => ({
      id: init.id,
      title: init.title,
      brief_summary: init.brief_summary || 'View the initiative for more details',
      brief_excerpt: init.brief_excerpt || '',
      leader_name: leaderNameMap[init.leader_clerk_id] || 'Your leader',
      status: init.published_at ? 'in-progress' : 'pending',
      published_at: init.published_at,
      is_public: init.is_public,
    }))

    return Response.json(result)
  } catch (err) {
    console.error('[employee/initiatives] error:', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
