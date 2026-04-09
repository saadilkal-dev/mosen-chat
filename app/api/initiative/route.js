import { NextResponse } from 'next/server'
import { redis } from '../../../lib/redis'
import { requireAuth } from '../../../lib/auth'
import { mkId } from '../../../lib/utils'
import { INITIATIVE_STATUS } from '../../../lib/constants'

export const dynamic = 'force-dynamic'

// GET /api/initiative — List initiatives for user's org
export async function GET(req) {
  try {
    const session = await requireAuth(req)
    const user = await redis.hgetall(`user:${session.userId}`)
    if (!user?.orgId) {
      return NextResponse.json({ initiatives: [] })
    }

    const initIds = await redis.smembers(`org:${user.orgId}:initiatives`)
    if (!initIds || initIds.length === 0) {
      return NextResponse.json({ initiatives: [] })
    }

    const initiatives = await Promise.all(
      initIds.map(async (id) => {
        const init = await redis.hgetall(`initiative:${id}`)
        const employees = await redis.smembers(`initiative:${id}:employees`)
        return {
          id,
          title: init?.title || 'Untitled',
          status: init?.status || 'draft',
          employeeCount: employees?.length || 0,
          lastActivity: init?.updatedAt || init?.createdAt || Date.now(),
          briefComplete: init?.briefComplete === 'true'
        }
      })
    )

    // Sort by last activity descending
    initiatives.sort((a, b) => b.lastActivity - a.lastActivity)

    return NextResponse.json({ initiatives })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to load initiatives' }, { status: 500 })
  }
}

// POST /api/initiative — Create a new initiative
export async function POST(req) {
  try {
    const session = await requireAuth(req)
    const { title, type } = await req.json()

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const user = await redis.hgetall(`user:${session.userId}`)
    if (!user?.orgId) {
      return NextResponse.json({ error: 'User must belong to an organization' }, { status: 400 })
    }

    const initId = mkId()
    const now = Date.now()

    await redis.hset(`initiative:${initId}`, {
      title: title.trim(),
      type: type || 'leader',
      summary: '',
      orgId: user.orgId,
      leaderId: session.userId,
      status: INITIATIVE_STATUS.DRAFT,
      briefComplete: 'false',
      createdAt: now,
      updatedAt: now
    })

    // Add to org's initiative set
    await redis.sadd(`org:${user.orgId}:initiatives`, initId)

    return NextResponse.json({ ok: true, initId })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to create initiative' }, { status: 500 })
  }
}
