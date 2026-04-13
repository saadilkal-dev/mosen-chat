import { auth } from '@clerk/nextjs/server'
import { getOrCreateAppUser } from '../../../../lib/auth'
import { getIsPlatformAdmin } from '../../../../lib/platform-admin'
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

    const isPlatformAdmin = await getIsPlatformAdmin()

    const supabase = getSupabase()
    let orgName = null
    if (user.orgId) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', user.orgId)
        .maybeSingle()
      orgName = org?.name || null
    }

    let onOrgRoster = false
    let pendingLeaderProvision = false
    let hasLeaderProvisionForEmail = false
    if (!user.orgId && user.email) {
      const em = user.email.toLowerCase()
      const { count: rosterCount } = await supabase
        .from('org_employees')
        .select('id', { count: 'exact', head: true })
        .eq('email', em)
      const { count: lpPending } = await supabase
        .from('leader_provisions')
        .select('id', { count: 'exact', head: true })
        .eq('leader_email', em)
        .is('claimed_at', null)
      const { data: lpRow } = await supabase
        .from('leader_provisions')
        .select('claimed_at, claimed_clerk_user_id')
        .eq('leader_email', em)
        .maybeSingle()
      onOrgRoster = (rosterCount || 0) > 0
      pendingLeaderProvision = (lpPending || 0) > 0
      hasLeaderProvisionForEmail = !!(
        lpRow &&
        (!lpRow.claimed_at || lpRow.claimed_clerk_user_id === userId)
      )
    }

    return Response.json({
      user: {
        ...user,
        orgName,
        onOrgRoster,
        pendingLeaderProvision,
        hasLeaderProvisionForEmail,
        isPlatformAdmin,
      },
    })
  } catch {
    return Response.json({ user: null })
  }
}
