import { NextResponse } from 'next/server'
import { redis } from '../../../../../lib/redis'
import { requireAuth } from '../../../../../lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/initiative/[id]/playbook — Returns all playbook versions
export async function GET(req, { params }) {
  try {
    const session = await requireAuth(req)
    const { id } = params

    const init = await redis.hgetall(`initiative:${id}`)
    if (!init) return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })

    const playbookRaw = await redis.get(`initiative:${id}:playbook`)
    const versions = playbookRaw ? JSON.parse(playbookRaw) : []

    return NextResponse.json({ versions })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to load playbook' }, { status: 500 })
  }
}

// POST /api/initiative/[id]/playbook — Manual trigger
export async function POST(req, { params }) {
  try {
    const session = await requireAuth(req)
    const { id } = params
    const { brief_summary } = await req.json()

    const init = await redis.hgetall(`initiative:${id}`)
    if (!init) return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    if (init.leaderId !== session.userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    // Import and use the tool directly
    const { createGeneratePlaybook } = await import('../../../../../lib/graph/leader-tools')
    const tool = createGeneratePlaybook(id)
    const result = await tool.invoke({ brief_summary: brief_summary || init.summary || '' })

    return NextResponse.json({ ok: true, result: JSON.parse(result) })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to generate playbook' }, { status: 500 })
  }
}
