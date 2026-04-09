import { NextResponse } from 'next/server'
import { redis } from '../../../../lib/redis'
import { requireAuth } from '../../../../lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/initiative/[id] — Full initiative data
export async function GET(req, { params }) {
  try {
    const session = await requireAuth(req)
    const { id } = params

    const init = await redis.hgetall(`initiative:${id}`)
    if (!init) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    }

    // Verify user belongs to same org
    const user = await redis.hgetall(`user:${session.userId}`)
    if (user?.orgId !== init.orgId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Gather all related data
    const [employees, playbookRaw, briefRaw, synthesisRaw, outreachRaw, pivotsRaw] = await Promise.all([
      redis.smembers(`initiative:${id}:employees`),
      redis.get(`initiative:${id}:playbook`),
      redis.get(`initiative:${id}:brief`),
      redis.get(`initiative:${id}:synthesis`),
      redis.get(`initiative:${id}:outreach`),
      redis.get(`initiative:${id}:pivots`)
    ])

    return NextResponse.json({
      initiative: { id, ...init },
      employees: employees || [],
      playbook: playbookRaw ? JSON.parse(playbookRaw) : [],
      brief: briefRaw ? JSON.parse(briefRaw) : null,
      synthesis: synthesisRaw ? JSON.parse(synthesisRaw) : [],
      outreach: outreachRaw ? JSON.parse(outreachRaw) : [],
      pivots: pivotsRaw ? JSON.parse(pivotsRaw) : []
    })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to load initiative' }, { status: 500 })
  }
}
