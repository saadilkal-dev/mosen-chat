import { getSupabase } from './supabase.js'
import { CONSENT_STATUS } from './constants.js'

function sb() {
  return getSupabase()
}

export async function getInviteByToken(token) {
  if (!token) return null
  const { data, error } = await sb().from('invites').select('*').eq('token', token).maybeSingle()
  if (error || !data) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null
  return {
    orgId: data.org_id,
    empEmail: data.emp_email,
    name: data.emp_name || '',
  }
}

export async function getInitiative(initiativeId) {
  const { data, error } = await sb().from('initiatives').select('*').eq('id', initiativeId).maybeSingle()
  if (error || !data) return null
  const createdMs = data.created_at ? new Date(data.created_at).getTime() : Date.now()
  return {
    id: data.id,
    orgId: data.org_id,
    title: data.title || '',
    createdAt: createdMs,
  }
}

export async function getBrief(initiativeId) {
  const { data, error } = await sb()
    .from('initiative_briefs')
    .select('*')
    .eq('initiative_id', initiativeId)
    .maybeSingle()
  if (error || !data) return null
  return {
    content: data.content,
    approved: !!data.approved,
  }
}

export async function getChatMessages(initiativeId, empEmail) {
  const { data, error } = await sb()
    .from('initiative_chats')
    .select('messages')
    .eq('initiative_id', initiativeId)
    .eq('emp_email', empEmail)
    .maybeSingle()
  if (error || !data?.messages) return []
  return Array.isArray(data.messages) ? data.messages : []
}

export async function saveChatMessages(initiativeId, empEmail, messages) {
  // Use update-or-insert pattern that preserves other columns (e.g. conversation_summary)
  const { data: existing } = await sb()
    .from('initiative_chats')
    .select('initiative_id')
    .eq('initiative_id', initiativeId)
    .eq('emp_email', empEmail)
    .maybeSingle()

  if (existing) {
    // Row exists — only update messages, never touch conversation_summary
    const { error } = await sb()
      .from('initiative_chats')
      .update({ messages, updated_at: new Date().toISOString() })
      .eq('initiative_id', initiativeId)
      .eq('emp_email', empEmail)
    if (error) throw error
  } else {
    // New row — insert with empty summary
    const { error } = await sb()
      .from('initiative_chats')
      .insert({ initiative_id: initiativeId, emp_email: empEmail, messages, updated_at: new Date().toISOString() })
    if (error) throw error
  }
}

export async function getEmployeeConversationSummary(initiativeId, empEmail) {
  const { data } = await sb()
    .from('initiative_chats')
    .select('conversation_summary')
    .eq('initiative_id', initiativeId)
    .eq('emp_email', empEmail)
    .maybeSingle()
  return data?.conversation_summary || ''
}

export async function saveEmployeeConversationSummary(initiativeId, empEmail, summary) {
  // Only update the summary column — never touch the messages column
  const { error } = await sb()
    .from('initiative_chats')
    .update({ conversation_summary: summary, updated_at: new Date().toISOString() })
    .eq('initiative_id', initiativeId)
    .eq('emp_email', empEmail)
  if (error) throw error
}

export async function getConsentRecord(initiativeId, empEmail, consentId) {
  const { data, error } = await sb()
    .from('initiative_consents')
    .select('*')
    .eq('initiative_id', initiativeId)
    .eq('emp_email', empEmail)
    .eq('consent_id', consentId)
    .maybeSingle()
  if (error || !data) return null
  return {
    theme: data.theme,
    proposedText: data.proposed_text,
    status: data.status,
    empEmail: data.emp_email,
  }
}

export async function upsertConsentRequest(initiativeId, empEmail, consentId, row) {
  const { error } = await sb().from('initiative_consents').upsert(
    {
      initiative_id: initiativeId,
      emp_email: empEmail,
      consent_id: consentId,
      theme: row.theme,
      proposed_text: row.proposedText,
      status: row.status,
      created_at_ms: row.createdAt,
      decided_at_ms: row.decidedAt ?? null,
    },
    { onConflict: 'initiative_id,emp_email,consent_id' },
  )
  if (error) throw error
}

export async function updateConsentDecision(initiativeId, empEmail, consentId, { status, decidedAtMs, proposedText }) {
  const patch = {
    status,
    decided_at_ms: decidedAtMs,
  }
  if (proposedText != null) patch.proposed_text = proposedText
  const { error } = await sb()
    .from('initiative_consents')
    .update(patch)
    .eq('initiative_id', initiativeId)
    .eq('emp_email', empEmail)
    .eq('consent_id', consentId)
  if (error) throw error
}

export async function countGrantedConsentsForTheme(initiativeId, theme) {
  const { count, error } = await sb()
    .from('initiative_consents')
    .select('*', { count: 'exact', head: true })
    .eq('initiative_id', initiativeId)
    .eq('theme', theme)
    .eq('status', CONSENT_STATUS.GRANTED)
  if (error) throw error
  return count || 0
}

export async function listGrantedConsentsForTheme(initiativeId, theme) {
  const { data, error } = await sb()
    .from('initiative_consents')
    .select('*')
    .eq('initiative_id', initiativeId)
    .eq('theme', theme)
    .eq('status', CONSENT_STATUS.GRANTED)
  if (error) throw error
  return (data || []).map((r) => ({
    theme: r.theme,
    proposedText: r.proposed_text,
    status: r.status,
    empEmail: r.emp_email,
  }))
}

export async function listDistinctEmailsWithGrantedConsent(initiativeId) {
  const { data, error } = await sb()
    .from('initiative_consents')
    .select('emp_email')
    .eq('initiative_id', initiativeId)
    .eq('status', CONSENT_STATUS.GRANTED)
  if (error) throw error
  const seen = new Set()
  const out = []
  for (const row of data || []) {
    if (!seen.has(row.emp_email)) {
      seen.add(row.emp_email)
      out.push(row.emp_email)
    }
  }
  return out
}

export async function getSynthesisReports(initiativeId) {
  const { data, error } = await sb()
    .from('initiative_synthesis')
    .select('reports')
    .eq('initiative_id', initiativeId)
    .maybeSingle()
  if (error || !data?.reports) return []
  return Array.isArray(data.reports) ? data.reports : []
}

export async function appendSynthesisReport(initiativeId, entry) {
  const existing = await getSynthesisReports(initiativeId)
  existing.push(entry)
  const { error } = await sb().from('initiative_synthesis').upsert(
    {
      initiative_id: initiativeId,
      reports: existing,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'initiative_id' },
  )
  if (error) throw error

  try {
    const { data: row } = await sb().from('initiatives').select('brief_data').eq('id', initiativeId).maybeSingle()
    const brief_data = { ...(row?.brief_data || {}) }
    brief_data.leader_flags = { ...(brief_data.leader_flags || {}), unread_synthesis: true }
    await sb()
      .from('initiatives')
      .update({ brief_data, updated_at: new Date().toISOString() })
      .eq('id', initiativeId)
  } catch {
    /* non-fatal */
  }
}

/**
 * How many assigned employees have sent at least one employee message after sentAtMs (outreach send time).
 */
export async function countEmployeeEngagementAfter(initiativeId, sentAtMs, assignedEmails) {
  if (!Array.isArray(assignedEmails) || assignedEmails.length === 0 || !sentAtMs) {
    return { assigned: assignedEmails?.length || 0, chattedSinceSend: 0 }
  }
  let chattedSinceSend = 0
  for (const empEmail of assignedEmails) {
    const msgs = await getChatMessages(initiativeId, empEmail)
    const ts = (m) => (typeof m.ts === 'number' ? m.ts : new Date(m.ts || 0).getTime())
    const employeeAfter = msgs.some(
      (m) => m.from === 'employee' && ts(m) >= sentAtMs - 5000,
    )
    if (employeeAfter) chattedSinceSend++
  }
  return { assigned: assignedEmails.length, chattedSinceSend }
}

export async function getAssignedEmployeeCount(initiativeId) {
  const { count, error } = await sb()
    .from('initiative_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('initiative_id', initiativeId)
  if (error) throw error
  if (count && count > 0) return count

  const init = await getInitiative(initiativeId)
  if (!init?.orgId) return 0
  const { count: orgCount, error: orgErr } = await sb()
    .from('org_employees')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', init.orgId)
  if (orgErr) throw orgErr
  return orgCount || 0
}

export async function appendEmployeeResponse(initiativeId, empEmail, record) {
  const { data } = await sb()
    .from('initiative_responses')
    .select('responses')
    .eq('initiative_id', initiativeId)
    .eq('emp_email', empEmail)
    .maybeSingle()
  const responses = data?.responses && Array.isArray(data.responses) ? [...data.responses] : []
  responses.push(record)
  const { error } = await sb().from('initiative_responses').upsert(
    {
      initiative_id: initiativeId,
      emp_email: empEmail,
      responses,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'initiative_id,emp_email' },
  )
  if (error) throw error
}

export async function appendClosedLoopMessage(initiativeId, empEmail, record) {
  const { data } = await sb()
    .from('initiative_closed_loops')
    .select('messages')
    .eq('initiative_id', initiativeId)
    .eq('emp_email', empEmail)
    .maybeSingle()
  const messages = data?.messages && Array.isArray(data.messages) ? [...data.messages] : []
  messages.push(record)
  const { error } = await sb().from('initiative_closed_loops').upsert(
    {
      initiative_id: initiativeId,
      emp_email: empEmail,
      messages,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'initiative_id,emp_email' },
  )
  if (error) throw error
}

export async function getClosedLoopMessages(initiativeId, empEmail) {
  const { data, error } = await sb()
    .from('initiative_closed_loops')
    .select('messages')
    .eq('initiative_id', initiativeId)
    .eq('emp_email', empEmail)
    .maybeSingle()
  if (error || !data?.messages) return []
  return Array.isArray(data.messages) ? data.messages : []
}

export async function getEmployeeNameFromOrg(orgId, email) {
  const { data, error } = await sb()
    .from('org_employees')
    .select('name,email')
    .eq('org_id', orgId)
    .eq('email', email)
    .maybeSingle()
  if (error || !data) return email
  return data.name || email
}

export async function logEmailSend({ id, type, to, subject, providerId }) {
  const { error } = await sb().from('email_send_logs').insert({
    id,
    type,
    to_email: to,
    subject,
    sent_at_ms: Date.now(),
    provider_id: providerId || '',
  })
  if (error) throw error
}
