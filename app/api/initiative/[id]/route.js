import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { requireAuth, getOrCreateAppUser } from '@/lib/auth'
import {
  getInitiativeRow,
  initiativeRowToLegacy,
  getAssignedEmails,
  getPlaybookVersions,
  getOutreachMessages,
  getPivotEntries,
  briefContentToString,
} from '@/lib/leader-store'
import { getSynthesisReports, getBrief } from '@/lib/initiative-store'

export const dynamic = 'force-dynamic'

export async function GET(req, { params }) {
  try {
    const { id } = params

    // Resolve auth — works for owners and for authenticated employees
    const { userId: clerkUserId } = await auth()

    const row = await getInitiativeRow(id)
    if (!row) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    }

    // Determine caller role
    const isOwner = clerkUserId && clerkUserId === row.leader_clerk_id

    // If not owner, the initiative must be public OR caller is in the same org
    if (!isOwner) {
      // Allow if initiative is public
      if (!row.is_public) {
        // Check if they're in the org
        if (!clerkUserId) {
          return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }
        try {
          const { user } = await requireAuth()
          if (user.orgId !== row.org_id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
          }
        } catch {
          return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }
      }
    }

    const legacy = initiativeRowToLegacy(row)

    // Full leader data only for owners
    if (isOwner) {
      const [employees, playbook, briefRow, synthesis, outreach, pivots] = await Promise.all([
        getAssignedEmails(id),
        getPlaybookVersions(id),
        getBrief(id),
        getSynthesisReports(id),
        getOutreachMessages(id),
        getPivotEntries(id),
      ])

      const brief = briefRow
        ? {
            content: briefContentToString(briefRow.content),
            approved: briefRow.approved,
          }
        : null

      return NextResponse.json({
        initiative: { id, ...legacy, isPublic: !!row.is_public, leaderId: row.leader_clerk_id },
        employees,
        playbook,
        brief,
        synthesis,
        outreach,
        pivots,
        isOwner: true,
      })
    }

    // Employee / public view — minimal data
    const briefRow = await getBrief(id)
    const brief = briefRow?.approved && briefRow.content != null
      ? { content: briefContentToString(briefRow.content), approved: true }
      : null

    return NextResponse.json({
      initiative: {
        id,
        title: row.title,
        isPublic: !!row.is_public,
        leaderId: row.leader_clerk_id,
      },
      brief,
      isOwner: false,
    })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('[initiative GET]', err)
    return NextResponse.json({ error: 'Failed to load initiative' }, { status: 500 })
  }
}
