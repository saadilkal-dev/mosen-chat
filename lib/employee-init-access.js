import { getSupabase } from './supabase'
import { getInviteByToken, getInitiative } from './initiative-store'

/**
 * Resolves which employee email/name is acting for an initiative.
 * - Token: legacy invite link (invites table).
 * - Session: signed-in user must appear in initiative_assignments + org roster for that initiative's org.
 */
export async function resolveEmployeeInviteContext(initiativeId, { token, sessionEmail }) {
  const initiative = await getInitiative(initiativeId)
  if (!initiative) return null

  if (token) {
    const invite = await getInviteByToken(token)
    if (!invite?.orgId || invite.orgId !== initiative.orgId) return null
    return {
      empEmail: invite.empEmail,
      employeeName: invite.name || '',
      orgId: invite.orgId,
    }
  }

  if (sessionEmail) {
    const email = sessionEmail.toLowerCase().trim()
    if (!email) return null

    const supabase = getSupabase()
    const { data: asg } = await supabase
      .from('initiative_assignments')
      .select('emp_email')
      .eq('initiative_id', initiativeId)
      .eq('emp_email', email)
      .maybeSingle()

    if (!asg) return null

    const { data: emp } = await supabase
      .from('org_employees')
      .select('name')
      .eq('org_id', initiative.orgId)
      .eq('email', email)
      .maybeSingle()

    return {
      empEmail: email,
      employeeName: (emp?.name || '').trim(),
      orgId: initiative.orgId,
    }
  }

  return null
}
