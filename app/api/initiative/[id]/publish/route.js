import { auth } from '@clerk/nextjs/server'
import { getSupabase } from '@/lib/supabase'
import { getOrgRoster } from '@/lib/leader-store'
import { sendInitiativeInvites } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(req, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await req.json()
    const is_public = body.is_public ?? false

    const sb = getSupabase()

    // 1. Fetch the initiative and verify this user owns it
    const { data: initiative, error: initError } = await sb
      .from('initiatives')
      .select('id, title, org_id, leader_clerk_id, is_public')
      .eq('id', id)
      .single()

    if (initError || !initiative) {
      return Response.json({ error: 'Initiative not found' }, { status: 404 })
    }

    if (initiative.leader_clerk_id !== userId) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    // 2. Update the initiative sharing status
    // Attempt to update is_public / published_at columns (from migration 009).
    // If those columns don't exist yet, fall back to just updating updated_at.
    let updated = null
    const patch = {
      updated_at: new Date().toISOString(),
    }

    // Try setting is_public — column added by migration 009
    try {
      const { data: u, error: updateErr } = await sb
        .from('initiatives')
        .update({
          ...patch,
          is_public,
          published_at: is_public ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single()

      if (updateErr) {
        // Column might not exist yet — fall back
        console.warn('[publish] full update failed, trying minimal patch:', updateErr.message)
        await sb.from('initiatives').update(patch).eq('id', id)
        updated = { ...initiative, is_public }
      } else {
        updated = u
      }
    } catch (e) {
      console.warn('[publish] update threw:', e.message)
      updated = { ...initiative, is_public }
    }

    // 2b. If publishing, auto-approve the employee brief so employees can see it
    if (is_public) {
      try {
        const { data: existingBrief } = await sb
          .from('initiative_briefs')
          .select('initiative_id, approved')
          .eq('initiative_id', id)
          .maybeSingle()

        if (existingBrief && !existingBrief.approved) {
          await sb
            .from('initiative_briefs')
            .update({ approved: true, updated_at: new Date().toISOString() })
            .eq('initiative_id', id)
        }
      } catch (briefErr) {
        console.warn('[publish] brief auto-approve failed (non-fatal):', briefErr.message)
      }
    }

    // 3. If making public, send invites to org roster
    let invitesSent = 0

    if (is_public && initiative.org_id) {
      try {
        const roster = await getOrgRoster(initiative.org_id)
        const emails = roster.filter(m => m.email).map(m => m.email)

        if (emails.length > 0) {
          const results = await sendInitiativeInvites(id, initiative.title, emails, initiative.org_id)
          invitesSent = results.filter(r => r.success).length
          const failed = results.filter(r => !r.success)
          if (failed.length) {
            console.error('[publish] some invite emails failed:', failed)
          }
        }
      } catch (rosterErr) {
        console.error('[publish] roster/invite error:', rosterErr.message)
        // Non-fatal — the initiative is still published
      }
    }

    const statusMsg = is_public
      ? invitesSent > 0
        ? `Shared with your team. ${invitesSent} invite${invitesSent !== 1 ? 's' : ''} sent.`
        : 'Published. Invite emails were not sent (no roster or email not configured).'
      : 'Saved as draft. Only you can see this.'

    return Response.json({
      success: true,
      message: statusMsg,
      initiative: updated,
      invites_sent: invitesSent,
    })
  } catch (err) {
    console.error('[publish] unhandled error:', err)
    return Response.json({ error: err.message || 'Failed to publish initiative' }, { status: 500 })
  }
}
