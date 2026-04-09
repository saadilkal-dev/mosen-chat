import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { CONSENT_STATUS, MIN_SYNTHESIS_THRESHOLD } from '@/lib/constants'

export async function POST(req, { params }) {
  const { id: initId } = params

  try {
    const { token, consentId, decision, editedText } = await req.json()

    if (!token || !consentId || !decision) {
      return NextResponse.json({ error: 'token, consentId, and decision required' }, { status: 400 })
    }

    const invite = await redis.hgetall(`invite:${token}`)
    if (!invite || !invite.orgId) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 401 })
    }

    const empEmail = invite.empEmail
    const consentKey = `initiative:${initId}:consent:${empEmail}:${consentId}`
    const record = await redis.hgetall(consentKey)

    if (!record) {
      return NextResponse.json({ error: 'Consent record not found' }, { status: 404 })
    }

    const update = {
      status: decision === 'granted' ? CONSENT_STATUS.GRANTED : CONSENT_STATUS.DENIED,
      decidedAt: Date.now(),
    }
    if (editedText) update.proposedText = editedText

    await redis.hset(consentKey, update)

    if (decision !== 'granted') {
      return NextResponse.json({ ok: true, thresholdMet: false })
    }

    // Check if synthesis threshold is now met for this theme
    const theme = record.theme
    const pattern = `initiative:${initId}:consent:*:*`
    const keys = await redis.keys(pattern)
    let count = 0
    const contributions = []

    for (const key of keys) {
      const r = await redis.hgetall(key)
      if (r && r.theme === theme && r.status === CONSENT_STATUS.GRANTED) {
        count++
        contributions.push(r)
      }
    }

    const thresholdMet = count >= MIN_SYNTHESIS_THRESHOLD

    if (thresholdMet) {
      // Generate synthesis
      const totalAssigned = await redis.scard(`initiative:${initId}:employees`)
      const responseRate = totalAssigned > 0 ? count / totalAssigned : 0

      const synthesisEntry = {
        id: `syn_${Date.now().toString(36)}`,
        themes: [
          {
            name: theme,
            description: contributions.map((c) => c.proposedText).join(' '),
            sentiment: 'concern',
            count,
            pillar: 'Trust', // default — employee-graph tool does richer mapping via Claude
          },
        ],
        pillarMapping: { Trust: 7 },
        totalContributors: count,
        responseRate,
        createdAt: Date.now(),
      }

      const existingRaw = await redis.get(`initiative:${initId}:synthesis`)
      const reports = existingRaw ? JSON.parse(existingRaw) : []
      reports.push(synthesisEntry)
      await redis.set(`initiative:${initId}:synthesis`, JSON.stringify(reports))
    }

    return NextResponse.json({ ok: true, thresholdMet })
  } catch (err) {
    console.error('consent route error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
