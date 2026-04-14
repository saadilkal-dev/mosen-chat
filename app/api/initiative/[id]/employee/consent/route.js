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
    }

    return NextResponse.json({ ok: true, thresholdMet })
  } catch (err) {
    console.error('consent route error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
