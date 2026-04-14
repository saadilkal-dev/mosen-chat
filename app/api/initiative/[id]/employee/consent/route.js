import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOrCreateAppUser } from '@/lib/auth'
import { resolveEmployeeInviteContext } from '@/lib/employee-init-access'
import {
  getConsentRecord,
  updateConsentDecision,
  listGrantedConsentsForTheme,
  appendSynthesisReport,
  getAssignedEmployeeCount,
} from '@/lib/initiative-store'
import { CONSENT_STATUS, MIN_SYNTHESIS_THRESHOLD } from '@/lib/constants'
import { getSupabase } from '@/lib/supabase'
import { sendEmail, buildSynthesisNudgeEmail } from '@/lib/email'
import { ChatAnthropic } from '@langchain/anthropic'
import { HumanMessage } from '@langchain/core/messages'
import { SUMMARISE_MODEL_ID } from '@/lib/graph/base'

export async function POST(req, { params }) {
  const { id: initId } = params

  try {
    const { token, consentId, decision, editedText } = await req.json()

    if (!consentId || !decision) {
      return NextResponse.json({ error: 'consentId and decision required' }, { status: 400 })
    }

    let sessionEmail = null
    if (!token) {
      const { userId } = await auth()
      if (!userId) {
        return NextResponse.json({ error: 'Sign in or use an invite link' }, { status: 401 })
      }
      const u = await getOrCreateAppUser(userId)
      sessionEmail = u?.email || null
    }

    const ctx = await resolveEmployeeInviteContext(initId, { token: token || undefined, sessionEmail })
    if (!ctx) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 401 })
    }

    const empEmail = ctx.empEmail
    const record = await getConsentRecord(initId, empEmail, consentId)

    if (!record) {
      return NextResponse.json({ error: 'Consent record not found' }, { status: 404 })
    }

    await updateConsentDecision(initId, empEmail, consentId, {
      status: decision === 'granted' ? CONSENT_STATUS.GRANTED : CONSENT_STATUS.DENIED,
      decidedAtMs: Date.now(),
      proposedText: editedText != null ? editedText : undefined,
    })

    if (decision !== 'granted') {
      return NextResponse.json({ ok: true, thresholdMet: false })
    }

    const theme = record.theme
    const contributions = await listGrantedConsentsForTheme(initId, theme)
    const count = contributions.length
    const thresholdMet = count >= MIN_SYNTHESIS_THRESHOLD

    if (thresholdMet) {
      const totalAssigned = await getAssignedEmployeeCount(initId)
      const responseRate = totalAssigned > 0 ? count / totalAssigned : 0

      const synthesisEntry = {
        id: `syn_${Date.now().toString(36)}`,
        themes: [
          {
            name: theme,
            description: contributions.map((c) => c.proposedText).join(' '),
            sentiment: 'concern',
            count,
            pillar: 'Trust',
          },
        ],
        pillarMapping: { Trust: 7 },
        totalContributors: count,
        responseRate,
        createdAt: Date.now(),
      }

      await appendSynthesisReport(initId, synthesisEntry)

      // Send email notification to the initiative leader
      notifyLeaderOfSynthesis(initId, theme, contributions).catch(err =>
        console.error('[consent] leader notification failed (non-fatal):', err.message)
      )
    }

    return NextResponse.json({ ok: true, thresholdMet })
  } catch (err) {
    console.error('consent route error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function notifyLeaderOfSynthesis(initId, theme, contributions) {
  const sb = getSupabase()

  const { data: initiative } = await sb
    .from('initiatives')
    .select('title, leader_clerk_id')
    .eq('id', initId)
    .maybeSingle()

  if (!initiative?.leader_clerk_id) return

  const { data: leader } = await sb
    .from('app_user_profiles')
    .select('email, name')
    .eq('clerk_user_id', initiative.leader_clerk_id)
    .maybeSingle()

  if (!leader?.email) return

  const insightText = contributions.map(c => c.proposedText).join(' ')

  // Generate a warm, human nudge — not a data report
  let nudgeMessage
  try {
    const model = new ChatAnthropic({ model: SUMMARISE_MODEL_ID, temperature: 0.7, maxTokens: 200 })
    const result = await model.invoke([
      new HumanMessage(
        `You are Mosen, a warm change partner writing to a leader. An employee shared an anonymized insight about "${theme}" for the initiative "${initiative.title}".

The anonymized insight: "${insightText}"

Write a short message (3-5 sentences) to the leader. Rules:
- Sound like a trusted colleague, not a system notification
- Name the signal clearly but without alarm
- Suggest one specific human action (a conversation, a check-in, asking a question)
- No names, no data, no metrics, no bullet points
- End with a question that invites reflection, not defensiveness
- Never use words like "stakeholder", "alignment", "action item", or corporate jargon`
      ),
    ])
    nudgeMessage = typeof result.content === 'string'
      ? result.content
      : Array.isArray(result.content)
        ? result.content.map(b => b?.text || '').join('')
        : ''
  } catch {
    nudgeMessage = `Something came through from your team about "${theme}" on ${initiative.title}.\n\nIt's worth a quiet conversation — not about the change, just about how someone is doing. That kind of check-in matters more than it seems.`
  }

  if (!nudgeMessage.trim()) return

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const initiativeUrl = `${baseUrl}/initiative/${initId}`

  const emailData = buildSynthesisNudgeEmail({
    leaderName: leader.name || 'there',
    initiativeTitle: initiative.title,
    nudgeMessage: nudgeMessage.trim(),
    initiativeUrl,
  })

  await sendEmail({
    to: leader.email,
    subject: emailData.subject,
    html: emailData.html,
  })
}
