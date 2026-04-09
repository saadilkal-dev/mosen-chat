import { auth } from '@clerk/nextjs/server'
import { getOrCreateAppUser } from '../../../../lib/auth'
import { getSupabase } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return Response.json({ user: null })
    }

    const user = await getOrCreateAppUser(userId)
    if (!user) {
      return Response.json({ user: null })
    }

    let orgName = null
    if (user.orgId) {
      const supabase = getSupabase()
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', user.orgId)
        .maybeSingle()
      orgName = org?.name || null
    }

    return Response.json({
      user: {
        ...user,
        orgName,
      },
    })
  } catch {
    return Response.json({ user: null })
  }
}
