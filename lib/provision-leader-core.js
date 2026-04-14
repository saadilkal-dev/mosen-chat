import { mkId, validateEmail } from './utils'
import { getSupabase } from './supabase'

/**
 * Shared body for POST /api/provision/leader and /api/platform/provision-leader.
 * @returns {Promise<Response>}
 */
export async function executeProvisionLeader(body) {
  const leaderEmail = String(body.leaderEmail || '').trim().toLowerCase()
  const orgName = String(body.orgName || '').trim()
  const employees = Array.isArray(body.employees) ? body.employees : []

  if (!leaderEmail || !validateEmail(leaderEmail)) {
    return Response.json({ error: 'Valid leaderEmail is required' }, { status: 400 })
  }
  if (!orgName) {
    return Response.json({ error: 'orgName is required' }, { status: 400 })
  }

  const orgId = mkId()
  const supabase = getSupabase()

  const { error: orgErr } = await supabase.from('organizations').insert({
    id: orgId,
    name: orgName,
    admin_user_id: null,
  })
  if (orgErr) {
    return Response.json({ error: orgErr.message }, { status: 500 })
  }

  const { error: lpErr } = await supabase.from('leader_provisions').insert({
    org_id: orgId,
    leader_email: leaderEmail,
  })
  if (lpErr) {
    await supabase.from('organizations').delete().eq('id', orgId)
    if (String(lpErr.message || '').includes('duplicate') || lpErr.code === '23505') {
      return Response.json(
        { error: 'A pending provision already exists for this leader email.' },
        { status: 409 },
      )
    }
    return Response.json({ error: lpErr.message }, { status: 500 })
  }

  const errors = []
  let added = 0
  const existingEmails = new Set()

  for (const emp of employees) {
    const email = String(emp.email || '').trim().toLowerCase()
    if (!email || !validateEmail(email)) {
      errors.push(`Invalid email: ${emp.email || 'empty'}`)
      continue
    }
    if (existingEmails.has(email)) continue
    existingEmails.add(email)

    const { error: empErr } = await supabase.from('org_employees').insert({
      org_id: orgId,
      email,
      name: String(emp.name || '').trim(),
      department: String(emp.department || '').trim(),
      role: String(emp.role || '').trim(),
      invite_token: null,
    })
    if (empErr) {
      errors.push(`${email}: ${empErr.message}`)
      continue
    }
    added++
  }

  return Response.json(
    {
      ok: true,
      orgId,
      leaderEmail,
      rosterAdded: added,
      rosterErrors: errors.length ? errors : undefined,
    },
    { status: 201 },
  )
}
