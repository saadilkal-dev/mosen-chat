import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOrCreateAppUser } from '@/lib/auth'
import { resolveEmployeeInviteContext } from '@/lib/employee-init-access'
import { getInitiative, getBrief } from '@/lib/initiative-store'
import { briefContentToString } from '@/lib/leader-store'

export async function GET(req, { params }) {
  const { id: initId } = params
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  let sessionEmail = null
  if (!token) {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Sign in or use an invite link' }, { status: 401 })
    }
    const u = await getOrCreateAppUser(userId)
    sessionEmail = u?.email || null
  }

  const ctx = await resolveEmployeeInviteContext(initId, { token: token || undefined, sessionEmail })
  if (!ctx) {
    return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 401 })
  }

  const initiative = await getInitiative(initId)
  if (!initiative) {
    return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
  }

  const brief = await getBrief(initId)

  return NextResponse.json({
    employeeName: ctx.employeeName || '',
    brief:
      brief?.approved && brief.content != null
        ? { content: briefContentToString(brief.content), initiativeTitle: initiative.title }
        : null,
    initiativeTitle: initiative.title || '',
  })
}
