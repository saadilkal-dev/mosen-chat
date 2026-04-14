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

    // Get user email
    const { data: userProfile, error: profileError } = await sb
      .from('app_user_profiles')
      .select('email')
      .eq('clerk_id', userId)
      .single()

    if (profileError || !userProfile?.email) {
      return Response.json({ error: 'User profile not found' }, { status: 404 })
    }

    const userEmail = userProfile.email

    // Fetch initiatives where is_public = true
    const { data: initiatives, error: initError } = await sb
      .from('initiatives')
      .select(`
        id,
        title,
        brief,
        brief_summary,
        brief_excerpt,
        playbook,
        created_at,
        published_at,
        is_public,
        shared_with
      `)
      .eq('is_public', true)

    if (initError) {
      console.error('[employee/initiatives] fetch error:', initError)
      return Response.json({ error: 'Failed to fetch initiatives' }, { status: 500 })
    }

    let initiativesWithStatus = []
    if (initiatives && initiatives.length > 0) {
      initiativesWithStatus = initiatives.map(init => {
        let status = 'pending'
        if (init.published_at) {
          status = 'in-progress'
        }

        return {
          id: init.id,
          title: init.title,
          brief_summary: init.brief_summary || 'View the initiative for more details',
          brief_excerpt: init.brief_excerpt || (init.brief ? init.brief.slice(0, 150) : ''),
          leader_name: 'Your leader',
          status,
          published_at: init.published_at,
        }
      })
    }

    return Response.json(initiativesWithStatus)
  } catch (err) {
    console.error('[employee/initiatives] error:', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
