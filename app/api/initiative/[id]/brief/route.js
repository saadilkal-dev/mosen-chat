import { NextResponse } from 'next/server'
import { redis } from '../../../../../lib/redis'
import { requireAuth } from '../../../../../lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/initiative/[id]/brief — Returns employee brief
export async function GET(req, { params }) {
  try {
    const session = await requireAuth(req)
    const { id } = params

    const briefRaw = await redis.get(`initiative:${id}:brief`)
    if (!briefRaw) {
      return NextResponse.json({ brief: null })
    }

    return NextResponse.json({ brief: JSON.parse(briefRaw) })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to load brief' }, { status: 500 })
  }
}

// PUT /api/initiative/[id]/brief — Approve or edit brief
export async function PUT(req, { params }) {
  try {
    const session = await requireAuth(req)
    const { id } = params
    const { content, approved } = await req.json()

    const init = await redis.hgetall(`initiative:${id}`)
    if (!init) return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    if (init.leaderId !== session.userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    const briefRaw = await redis.get(`initiative:${id}:brief`)
    const brief = briefRaw ? JSON.parse(briefRaw) : { createdAt: Date.now() }

    if (content !== undefined) brief.content = content
    if (approved !== undefined) brief.approved = approved
    brief.updatedAt = Date.now()

    await redis.set(`initiative:${id}:brief`, JSON.stringify(brief))

    // If approved, trigger invite emails via Dev3's route
    if (approved === true) {
      const employees = await redis.smembers(`initiative:${id}:employees`)
      if (employees && employees.length > 0) {
        // Call Dev3's email route (fire and forget — gracefully handle if not yet available)
        try {
          const baseUrl = req.nextUrl?.origin || process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
          for (const empEmail of employees) {
            await fetch(`${baseUrl}/api/email/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Cookie: req.headers.get('cookie') || '' },
              body: JSON.stringify({
                type: 'invite',
                to: empEmail,
                data: {
                  employeeName: empEmail.split('@')[0],
                  initiativeTitle: init.title,
                  inviteUrl: `${baseUrl}/initiative/${id}/employee`
                }
              })
            })
          }
        } catch (emailErr) {
          console.warn('Email sending not available yet (Dev3 route):', emailErr.message)
        }
      }
    }

    return NextResponse.json({ ok: true, brief })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to update brief' }, { status: 500 })
  }
}
