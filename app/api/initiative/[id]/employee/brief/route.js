import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export async function GET(req, { params }) {
  const { id: initId } = params
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 401 })
  }

  const invite = await redis.hgetall(`invite:${token}`)
  if (!invite || !invite.orgId) {
    return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 401 })
  }

  const initiative = await redis.hgetall(`initiative:${initId}`)
  if (!initiative) {
    return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
  }

  const briefRaw = await redis.get(`initiative:${initId}:brief`)
  const brief = briefRaw ? JSON.parse(briefRaw) : null

  return NextResponse.json({
    employeeName: invite.name || '',
    brief: brief?.approved
      ? { content: brief.content, initiativeTitle: initiative.title }
      : null,
    initiativeTitle: initiative.title || '',
  })
}
