import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getInitiativeRow, appendPivotEntry } from '@/lib/leader-store'
import { createVersionPlaybook } from '@/lib/graph/leader-tools'
import { mkId } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function POST(req, { params }) {
  try {
    const { userId } = await requireAuth()
    const { id } = params
    const { changeDescription, acceptedSynthesisId } = await req.json()

    if (!changeDescription || changeDescription.trim().length < 10) {
      return NextResponse.json({ error: 'A specific change description is required (at least 10 characters)' }, { status: 400 })
    }

    const hollow = [
      'feedback was heard',
      'we listened',
      'changes were made',
      'we are working on it',
      'noted',
      'acknowledged',
    ]
    if (hollow.some((p) => changeDescription.toLowerCase().includes(p))) {
      return NextResponse.json({ error: 'Description is too vague. Describe the specific change that was made.' }, { status: 400 })
    }

    const init = await getInitiativeRow(id)
    if (!init) return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    if (init.leader_clerk_id !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    const pivotId = mkId()
    const pivot = {
      id: pivotId,
      changeDescription,
      synthesisId: acceptedSynthesisId || null,
      createdAt: Date.now(),
    }

    await appendPivotEntry(id, pivot)

    try {
      const versionTool = createVersionPlaybook(id)
      await versionTool.invoke({ changes: changeDescription, change_note: `Pivot: ${changeDescription}` })
    } catch (vErr) {
      console.warn('Playbook versioning failed:', vErr.message)
    }

    try {
      const baseUrl = req.nextUrl?.origin || process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
      await fetch(`${baseUrl}/api/initiative/${id}/employee/closed-loop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: req.headers.get('cookie') || '' },
        body: JSON.stringify({
          changeDescription,
          message: `Based on employee feedback, a change was made: ${changeDescription}`,
          pivotId,
        }),
      })
    } catch (clErr) {
      console.warn('Closed loop delivery failed:', clErr.message)
    }

    return NextResponse.json({ ok: true, pivot })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to log pivot' }, { status: 500 })
  }
}
