import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { mkId } from '@/lib/utils'
import { getSupabase } from '@/lib/supabase'
import { listInitiativesForOrg, createInitiativeRow, countAssignedEmployees, initiativeRowToLegacy } from '@/lib/leader-store'

export const dynamic = 'force-dynamic'

function serializeErr(err) {
  if (!err) return 'Unknown error'
  if (typeof err.message === 'string' && err.message) return err.message
  return String(err)
}

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

    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { title, type } = body || {}

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!user.orgId) {
      return NextResponse.json({ error: 'User must belong to an organization' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { data: orgRow, error: orgErr } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', user.orgId)
      .maybeSingle()
    if (orgErr) throw orgErr
    if (!orgRow) {
      return NextResponse.json(
        {
          error:
            'Your organisation was not found in the database. Complete onboarding again (organisation name) or fix your workspace.',
        },
        { status: 400 },
      )
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
    console.error('[POST /api/initiative]', err)
    const detail = serializeErr(err)
    return NextResponse.json(
      { error: 'Failed to create initiative', detail },
      { status: 500 },
    )
  }
}
