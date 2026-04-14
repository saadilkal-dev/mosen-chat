import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import {
  getInitiativeRow,
  getPlaybookVersions,
  markActivityComplete,
  setPendingPhaseCompletionFlag,
} from '@/lib/leader-store'
import { createGeneratePlaybook } from '@/lib/graph/leader-tools'

export const dynamic = 'force-dynamic'

export async function GET(req, { params }) {
  try {
    const { userId } = await requireAuth()
    const { id } = params
    const init = await getInitiativeRow(id)
    if (!init) return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    if (init.leader_clerk_id !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    const versions = await getPlaybookVersions(id)
    return NextResponse.json({ versions })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to load playbook' }, { status: 500 })
  }
}

export async function POST(req, { params }) {
  try {
    const { userId } = await requireAuth()
    const { id } = params
    const { brief_summary } = await req.json()

    const init = await getInitiativeRow(id)
    if (!init) return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    if (init.leader_clerk_id !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    const tool = createGeneratePlaybook(id)
    const result = await tool.invoke({ brief_summary: brief_summary || init.summary || '' })
    const parsed = typeof result === 'string' ? JSON.parse(result) : result

    return NextResponse.json({ ok: true, result: parsed })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to generate playbook' }, { status: 500 })
  }
}

export async function PUT(req, { params }) {
  try {
    const { userId } = await requireAuth()
    const { id } = params
    const body = await req.json()
    const { phaseIndex, activityIndex, completed } = body

    if (typeof phaseIndex !== 'number' || typeof activityIndex !== 'number' || typeof completed !== 'boolean') {
      return NextResponse.json({ error: 'phaseIndex, activityIndex, and completed (boolean) required' }, { status: 400 })
    }

    const init = await getInitiativeRow(id)
    if (!init) return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    if (init.leader_clerk_id !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    await markActivityComplete(id, phaseIndex, activityIndex, completed)

    const versions = await getPlaybookVersions(id)
    const latest = versions[versions.length - 1]
    const phase = latest.phases?.[phaseIndex]
    const acts = phase?.activities || []
    const allDone = acts.length > 0 && acts.every((a) => a?.completed === true)
    if (allDone && phase?.name) {
      await setPendingPhaseCompletionFlag(id, {
        phaseIndex,
        phaseName: phase.name,
        at: Date.now(),
      })
    }

    return NextResponse.json({ ok: true, versions })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('Playbook PUT error:', err)
    return NextResponse.json({ error: err.message || 'Failed to update playbook' }, { status: 500 })
  }
}
