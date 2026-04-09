import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getInitiativeRow } from '@/lib/leader-store'
import { getSynthesisReports } from '@/lib/initiative-store'

export const dynamic = 'force-dynamic'

export async function GET(req, { params }) {
  try {
    await requireAuth()
    const { id } = params

    const init = await getInitiativeRow(id)
    if (!init) return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })

    const reports = await getSynthesisReports(id)
    const sanitized = (Array.isArray(reports) ? reports : [reports]).map((report) => ({
      ...report,
      themes: (report.themes || []).map((t) => ({
        name: t.name,
        description: t.description,
        sentiment: t.sentiment,
        contributorCount: t.contributorCount ?? t.count,
        percentage: t.percentage,
        pillar: t.pillar,
      })),
    }))

    return NextResponse.json({ reports: sanitized })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to load synthesis' }, { status: 500 })
  }
}
