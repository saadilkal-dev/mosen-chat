import { NextResponse } from 'next/server'
import { redis } from '../../../../../lib/redis'
import { requireAuth } from '../../../../../lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/initiative/[id]/outreach — Returns outreach messages
export async function GET(req, { params }) {
  try {
    const session = await requireAuth(req)
    const { id } = params

    const outreachRaw = await redis.get(`initiative:${id}:outreach`)
    const messages = outreachRaw ? JSON.parse(outreachRaw) : []

    return NextResponse.json({ messages })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to load outreach' }, { status: 500 })
  }
}

// PUT /api/initiative/[id]/outreach — Approve or edit outreach
export async function PUT(req, { params }) {
  try {
    const session = await requireAuth(req)
    const { id } = params
    const { messageId, approved, editedText } = await req.json()

    if (!messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 })

    const init = await redis.hgetall(`initiative:${id}`)
    if (!init) return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    if (init.leaderId !== session.userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    const outreachRaw = await redis.get(`initiative:${id}:outreach`)
    const messages = outreachRaw ? JSON.parse(outreachRaw) : []

    const msgIndex = messages.findIndex(m => m.id === messageId)
    if (msgIndex === -1) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    if (editedText) messages[msgIndex].draft = editedText
    if (approved !== undefined) {
      messages[msgIndex].status = approved ? 'approved' : 'declined'
      if (approved) messages[msgIndex].sentAt = Date.now()
    }

    await redis.set(`initiative:${id}:outreach`, JSON.stringify(messages))

    // If approved, send via Dev3's email route
    if (approved) {
      try {
        const employees = await redis.smembers(`initiative:${id}:employees`)
        const baseUrl = req.nextUrl?.origin || process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
        for (const empEmail of employees || []) {
          await fetch(`${baseUrl}/api/email/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: req.headers.get('cookie') || '' },
            body: JSON.stringify({
              type: 'outreach',
              to: empEmail,
              data: {
                employeeName: empEmail.split('@')[0],
                initiativeTitle: init.title,
                message: messages[msgIndex].draft
              }
            })
          })
        }
      } catch (emailErr) {
        console.warn('Email sending not available yet:', emailErr.message)
      }
    }

    return NextResponse.json({ ok: true, message: messages[msgIndex] })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to update outreach' }, { status: 500 })
  }
}
