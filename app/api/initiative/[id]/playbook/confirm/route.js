import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  getInitiativeRow,
  patchInitiative,
  getPlaybookVersions,
  setPlaybookVersions,
} from '../../../../../../lib/leader-store'
import { backgroundGenerateAllArtifacts } from '../../../../../../lib/artifact-service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/initiative/[id]/playbook/confirm
// Marks the latest draft playbook as active and kicks off background artifact pre-generation.
export async function POST(req, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = params

    const init = await getInitiativeRow(id)
    if (!init) return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    if (init.leader_clerk_id !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    const versions = await getPlaybookVersions(id)
    if (!versions.length) {
      return NextResponse.json({ error: 'No playbook draft found' }, { status: 404 })
    }

    const latest = versions[versions.length - 1]
    if (latest.status === 'active') {
      // Already confirmed — idempotent, just return ok
      return NextResponse.json({ ok: true, alreadyActive: true })
    }

    // Mark as active
    latest.status = 'active'
    await setPlaybookVersions(id, versions)
    await patchInitiative(id, { playbook_generated: true, status: 'active' })

    // Fire-and-forget background pre-generation of all artifacts.
    // By the time the leader clicks an artifact it should already be cached.
    backgroundGenerateAllArtifacts(id, latest).catch(err =>
      console.error('[playbook/confirm] background pre-gen failed:', err.message)
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Playbook confirm error:', err)
    return NextResponse.json({ error: err.message || 'Confirm failed' }, { status: 500 })
  }
}
