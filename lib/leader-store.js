import { getSupabase } from './supabase.js'
import { getSynthesisReports } from './initiative-store.js'

function sb() {
  return getSupabase()
}

export async function listInitiativesForOrg(orgId) {
  const { data, error } = await sb()
    .from('initiatives')
    .select('*')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createInitiativeRow({ id, orgId, leaderClerkId, title, initiativeType }) {
  const now = new Date().toISOString()
  const { error } = await sb().from('initiatives').insert({
    id,
    org_id: orgId,
    title: title.trim(),
    leader_clerk_id: leaderClerkId,
    initiative_type: initiativeType || 'leader',
    status: 'draft',
    created_at: now,
    updated_at: now,
  })
  if (error) throw error
}

export async function getInitiativeRow(id) {
  const { data, error } = await sb().from('initiatives').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data || null
}

/** Map DB row to flat shape similar to legacy Redis hash for UI/API. */
export function initiativeRowToLegacy(init) {
  if (!init) return null
  const briefData = init.brief_data && typeof init.brief_data === 'object' ? init.brief_data : {}
  return {
    title: init.title,
    type: init.initiative_type,
    summary: init.summary || '',
    orgId: init.org_id,
    leaderId: init.leader_clerk_id,
    status: init.status,
    briefComplete: init.brief_complete ? 'true' : 'false',
    playbookGenerated: init.playbook_generated ? 'true' : 'false',
    createdAt: init.created_at ? new Date(init.created_at).getTime() : Date.now(),
    updatedAt: init.updated_at ? new Date(init.updated_at).getTime() : Date.now(),
    ...briefData,
  }
}

export async function patchInitiative(id, patch) {
  const row = { ...patch, updated_at: new Date().toISOString() }
  const { error } = await sb().from('initiatives').update(row).eq('id', id)
  if (error) throw error
}

export async function saveBriefAnswerField(initiativeId, field, value) {
  const init = await getInitiativeRow(initiativeId)
  if (!init) throw new Error('Initiative not found')
  const briefData = { ...(init.brief_data || {}), [field]: value }
  const updates = {
    brief_data: briefData,
    updated_at: new Date().toISOString(),
  }
  if (field === 'summary') {
    updates.summary = value
    updates.brief_complete = true
  }
  const { error } = await sb().from('initiatives').update(updates).eq('id', initiativeId)
  if (error) throw error
}

export async function getPlaybookVersions(initiativeId) {
  const { data } = await sb().from('initiative_playbooks').select('versions').eq('initiative_id', initiativeId).maybeSingle()
  const v = data?.versions
  return Array.isArray(v) ? v : []
}

export async function setPlaybookVersions(initiativeId, versions) {
  const { error } = await sb().from('initiative_playbooks').upsert(
    {
      initiative_id: initiativeId,
      versions,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'initiative_id' },
  )
  if (error) throw error
}

export async function getOutreachMessages(initiativeId) {
  const { data } = await sb().from('initiative_outreach_store').select('messages').eq('initiative_id', initiativeId).maybeSingle()
  const m = data?.messages
  return Array.isArray(m) ? m : []
}

export async function setOutreachMessages(initiativeId, messages) {
  const { error } = await sb().from('initiative_outreach_store').upsert(
    {
      initiative_id: initiativeId,
      messages,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'initiative_id' },
  )
  if (error) throw error
}

export async function getPivotEntries(initiativeId) {
  const { data } = await sb().from('initiative_pivot_log').select('entries').eq('initiative_id', initiativeId).maybeSingle()
  const e = data?.entries
  return Array.isArray(e) ? e : []
}

export async function appendPivotEntry(initiativeId, pivot) {
  const entries = await getPivotEntries(initiativeId)
  entries.push(pivot)
  const { error } = await sb().from('initiative_pivot_log').upsert(
    {
      initiative_id: initiativeId,
      entries,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'initiative_id' },
  )
  if (error) throw error
}

export async function getLeaderChatMessages(initiativeId) {
  const { data } = await sb().from('initiative_leader_chats').select('messages').eq('initiative_id', initiativeId).maybeSingle()
  const m = data?.messages
  return Array.isArray(m) ? m : []
}

export async function saveLeaderChatMessages(initiativeId, messages) {
  const { error } = await sb().from('initiative_leader_chats').upsert(
    {
      initiative_id: initiativeId,
      messages,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'initiative_id' },
  )
  if (error) throw error
}

export async function countAssignedEmployees(initiativeId) {
  const { count, error } = await sb()
    .from('initiative_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('initiative_id', initiativeId)
  if (error) throw error
  return count || 0
}

export async function getAssignedEmails(initiativeId) {
  const { data, error } = await sb()
    .from('initiative_assignments')
    .select('emp_email')
    .eq('initiative_id', initiativeId)
  if (error) throw error
  return (data || []).map((r) => r.emp_email)
}

export async function assignEmailsToInitiative(initiativeId, emails) {
  const rows = [...new Set(emails.map((e) => e.toLowerCase()))].map((emp_email) => ({
    initiative_id: initiativeId,
    emp_email,
  }))
  if (rows.length === 0) return
  const { error } = await sb().from('initiative_assignments').upsert(rows, { onConflict: 'initiative_id,emp_email' })
  if (error) throw error
  await sb().from('initiatives').update({ updated_at: new Date().toISOString() }).eq('id', initiativeId)
}

export async function getOrgRoster(orgId) {
  const { data, error } = await sb().from('org_employees').select('email, name, invite_token').eq('org_id', orgId)
  if (error) throw error
  return data || []
}

export async function getOrgName(orgId) {
  const { data } = await sb().from('organizations').select('name').eq('id', orgId).maybeSingle()
  return data?.name || ''
}

export async function getProfileName(clerkUserId) {
  const { data } = await sb().from('app_user_profiles').select('name').eq('clerk_user_id', clerkUserId).maybeSingle()
  return data?.name || ''
}

export async function upsertEmployeeBriefFromLeader(initiativeId, brief) {
  const body = typeof brief.content === 'string' ? brief.content : String(brief.content?.body ?? brief.content ?? '')
  const { error } = await sb().from('initiative_briefs').upsert(
    {
      initiative_id: initiativeId,
      content: { body },
      approved: !!brief.approved,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'initiative_id' },
  )
  if (error) throw error
}

/** Normalize initiative_briefs.content to plain string for employee UI. */
export function briefContentToString(content) {
  if (content == null) return ''
  if (typeof content === 'string') return content
  if (typeof content === 'object' && content.body != null) return String(content.body)
  return String(content)
}

export async function loadLeaderInitContext(initId, clerkUserId) {
  const init = await getInitiativeRow(initId)
  if (!init) {
    throw new Error('Initiative not found')
  }
  if (init.leader_clerk_id !== clerkUserId) {
    throw new Error('Not authorized to access this initiative')
  }

  const orgName = await getOrgName(init.org_id)
  const leaderName = await getProfileName(clerkUserId)

  let synthesisText = null
  const reports = await getSynthesisReports(initId)
  const latest = Array.isArray(reports) && reports.length ? reports[reports.length - 1] : null
  if (latest?.themes) {
    synthesisText = latest.themes.map((t) => `${t.name} (${t.pillar}): ${t.description}`).join('; ')
  }

  const createdAt = init.created_at ? new Date(init.created_at).getTime() : Date.now()
  const weekNumber = Math.max(1, Math.ceil((Date.now() - createdAt) / (7 * 24 * 60 * 60 * 1000)))

  return {
    initId,
    title: init.title || 'Untitled Initiative',
    orgName,
    leaderName,
    briefComplete: !!init.brief_complete,
    summary: init.summary || '',
    weekNumber,
    synthesis: synthesisText,
  }
}

export async function getEmployeeInviteUrl(orgId, email, initiativeId, baseUrl) {
  const { data } = await sb()
    .from('org_employees')
    .select('invite_token')
    .eq('org_id', orgId)
    .eq('email', email)
    .maybeSingle()
  const token = data?.invite_token
  if (!token) return `${baseUrl}/initiative/${initiativeId}/employee`
  return `${baseUrl}/initiative/${initiativeId}/employee?token=${encodeURIComponent(token)}`
}
