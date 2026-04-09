import { NextResponse } from 'next/server'
import { redis } from '../../../../../lib/redis'
import { requireAuth } from '../../../../../lib/auth'
import { mkId } from '../../../../../lib/utils'

export const dynamic = 'force-dynamic'

// POST /api/initiative/[id]/pivot — Log pivot action
export async function POST(req, { params }) {
  try {
    const session = await requireAuth(req)
    const { id } = params
    const { changeDescription, acceptedSynthesisId } = await req.json()

    if (!changeDescription || changeDescription.trim().length < 10) {
      return NextResponse.json({ error: 'A specific change description is required (at least 10 characters)' }, { status: 400 })
    }

    // Reject hollow descriptions
    const hollow = ['feedback was heard', 'we listened', 'changes were made', 'we are working on it', 'noted', 'acknowledged']
    if (hollow.some(p => changeDescription.toLowerCase().includes(p))) {
      return NextResponse.json({ error: 'Description is too vague. Describe the specific change that was made.' }, { status: 400 })
    }

    const init = await redis.hgetall(`initiative:${id}`)
    if (!init) return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    if (init.leaderId !== session.userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    const pivotId = mkId()
    const pivot = { id: pivotId, changeDescription, synthesisId: acceptedSynthesisId || null, createdAt: Date.now() }

    const existing = await redis.get(`initiative:${id}:pivots`)
    const pivots = existing ? JSON.parse(existing) : []
    pivots.push(pivot)
    await redis.set(`initiative:${id}:pivots`, JSON.stringify(pivots))

    // Trigger playbook versioning
    try {
      const { createVersionPlaybook } = await import('../../../../../lib/graph/leader-tools')
      const versionTool = createVersionPlaybook(id)
      await versionTool.invoke({ changes: changeDescription, change_note: `Pivot: ${changeDescription}` })
    } catch (vErr) {
      console.warn('Playbook versioning failed:', vErr.message)
    }

    // Trigger closed-loop via Dev3's route
    try {
      const baseUrl = req.nextUrl?.origin || process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
      await fetch(`${baseUrl}/api/initiative/${id}/employee/closed-loop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: req.headers.get('cookie') || '' },
        body: JSON.stringify({ changeDescription, message: `Based on employee feedback, a change was made: ${changeDescription}`, pivotId })
      })
    } catch (clErr) {
      console.warn('Closed loop delivery not available yet:', clErr.message)
    }

    return NextResponse.json({ ok: true, pivot })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to log pivot' }, { status: 500 })
  }
}
