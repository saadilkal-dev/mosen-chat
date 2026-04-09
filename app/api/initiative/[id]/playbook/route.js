import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getInitiativeRow, getPlaybookVersions } from '@/lib/leader-store'
import { createGeneratePlaybook } from '@/lib/graph/leader-tools'

export const dynamic = 'force-dynamic'

export async function GET(req, { params }) {
  try {
    await requireAuth()
    const { id } = params
    const init = await getInitiativeRow(id)
    if (!init) return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })

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
