import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import {
  getInitiativeRow,
  initiativeRowToLegacy,
  getAssignedEmails,
  getPlaybookVersions,
  getOutreachMessages,
  getPivotEntries,
  briefContentToString,
} from '@/lib/leader-store'
import { getSynthesisReports, getBrief } from '@/lib/initiative-store'

export const dynamic = 'force-dynamic'

export async function GET(req, { params }) {
  try {
    const { user } = await requireAuth()
    const { id } = params

    const row = await getInitiativeRow(id)
    if (!row) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    }

    if (user.orgId !== row.org_id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const legacy = initiativeRowToLegacy(row)
    const [employees, playbook, briefRow, synthesis, outreach, pivots] = await Promise.all([
      getAssignedEmails(id),
      getPlaybookVersions(id),
      getBrief(id),
      getSynthesisReports(id),
      getOutreachMessages(id),
      getPivotEntries(id),
    ])

    const brief = briefRow
      ? {
          content: briefContentToString(briefRow.content),
          approved: briefRow.approved,
        }
      : null

    return NextResponse.json({
      initiative: { id, ...legacy },
      employees,
      playbook,
      brief,
      synthesis,
      outreach,
      pivots,
    })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to load initiative' }, { status: 500 })
  }
}
