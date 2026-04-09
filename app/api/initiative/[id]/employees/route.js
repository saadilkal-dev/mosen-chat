import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getInitiativeRow, getOrgRoster, assignEmailsToInitiative } from '@/lib/leader-store'

export const dynamic = 'force-dynamic'

export async function POST(req, { params }) {
  try {
    const { userId, user } = await requireAuth()
    const { id } = params
    const { emails } = await req.json()

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'At least one email is required' }, { status: 400 })
    }

    const init = await getInitiativeRow(id)
    if (!init) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    }

    if (init.leader_clerk_id !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const roster = await getOrgRoster(user.orgId)
    const rosterEmails = new Set(roster.map((e) => e.email?.toLowerCase()))

    const validEmails = emails.filter((e) => rosterEmails.has(e.toLowerCase()))
    const invalidEmails = emails.filter((e) => !rosterEmails.has(e.toLowerCase()))

    if (validEmails.length === 0) {
      return NextResponse.json({ error: 'No valid employee emails found in organization roster' }, { status: 400 })
    }

    await assignEmailsToInitiative(id, validEmails)

    return NextResponse.json({
      ok: true,
      count: validEmails.length,
      invalidEmails: invalidEmails.length > 0 ? invalidEmails : undefined,
    })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to assign employees' }, { status: 500 })
  }
}
