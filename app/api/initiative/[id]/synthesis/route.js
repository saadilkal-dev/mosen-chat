import { NextResponse } from 'next/server'
import { redis } from '../../../../../lib/redis'
import { requireAuth } from '../../../../../lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/initiative/[id]/synthesis — Returns synthesis reports (READ ONLY from Dev3)
export async function GET(req, { params }) {
  try {
    const session = await requireAuth(req)
    const { id } = params

    const init = await redis.hgetall(`initiative:${id}`)
    if (!init) return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })

    const synthesisRaw = await redis.get(`initiative:${id}:synthesis`)
    const reports = synthesisRaw ? JSON.parse(synthesisRaw) : []

    // Ensure no individual attribution leaks through
    const sanitized = (Array.isArray(reports) ? reports : [reports]).map(report => ({
      ...report,
      themes: (report.themes || []).map(t => ({
        name: t.name,
        description: t.description,
        sentiment: t.sentiment,
        contributorCount: t.contributorCount,
        percentage: t.percentage,
        pillar: t.pillar
      }))
    }))

    return NextResponse.json({ reports: sanitized })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to load synthesis' }, { status: 500 })
  }
}
