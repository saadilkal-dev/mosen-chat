import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { mkId } from '@/lib/utils'
import { listInitiativesForOrg, createInitiativeRow, countAssignedEmployees, initiativeRowToLegacy } from '@/lib/leader-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { user } = await requireAuth()
    if (!user.orgId) {
      return NextResponse.json({ initiatives: [] })
    }

    const rows = await listInitiativesForOrg(user.orgId)
    const initiatives = await Promise.all(
      rows.map(async (init) => {
        const id = init.id
        const count = await countAssignedEmployees(id)
        const legacy = initiativeRowToLegacy(init)
        return {
          id,
          title: legacy.title || 'Untitled',
          status: legacy.status || 'draft',
          employeeCount: count,
          lastActivity: legacy.updatedAt || legacy.createdAt || Date.now(),
          briefComplete: legacy.briefComplete === 'true',
        }
      }),
    )

    initiatives.sort((a, b) => b.lastActivity - a.lastActivity)

    return NextResponse.json({ initiatives })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to load initiatives' }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const { userId, user } = await requireAuth()
    const { title, type } = await req.json()

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!user.orgId) {
      return NextResponse.json({ error: 'User must belong to an organization' }, { status: 400 })
    }

    const initId = mkId()
    await createInitiativeRow({
      id: initId,
      orgId: user.orgId,
      leaderClerkId: userId,
      title: title.trim(),
      initiativeType: type || 'leader',
    })

    return NextResponse.json({ ok: true, initId })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to create initiative' }, { status: 500 })
  }
}
