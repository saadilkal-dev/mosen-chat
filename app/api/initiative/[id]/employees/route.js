import { NextResponse } from 'next/server'
import { redis } from '../../../../../lib/redis'
import { requireAuth } from '../../../../../lib/auth'

export const dynamic = 'force-dynamic'

// POST /api/initiative/[id]/employees — Assign employees to initiative
export async function POST(req, { params }) {
  try {
    const session = await requireAuth(req)
    const { id } = params
    const { emails } = await req.json()

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'At least one email is required' }, { status: 400 })
    }

    const init = await redis.hgetall(`initiative:${id}`)
    if (!init) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    }

    // Verify leader owns initiative
    if (init.leaderId !== session.userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Validate emails exist in org roster
    const user = await redis.hgetall(`user:${session.userId}`)
    const rosterRaw = await redis.get(`org:${user.orgId}:employees`)
    const roster = rosterRaw ? JSON.parse(rosterRaw) : []
    const rosterEmails = new Set(roster.map(e => e.email?.toLowerCase()))

    const validEmails = emails.filter(e => rosterEmails.has(e.toLowerCase()))
    const invalidEmails = emails.filter(e => !rosterEmails.has(e.toLowerCase()))

    if (validEmails.length === 0) {
      return NextResponse.json({ error: 'No valid employee emails found in organization roster' }, { status: 400 })
    }

    // Add to initiative employee set
    for (const email of validEmails) {
      await redis.sadd(`initiative:${id}:employees`, email.toLowerCase())
    }

    await redis.hset(`initiative:${id}`, { updatedAt: Date.now() })

    return NextResponse.json({
      ok: true,
      count: validEmails.length,
      invalidEmails: invalidEmails.length > 0 ? invalidEmails : undefined
    })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to assign employees' }, { status: 500 })
  }
}
