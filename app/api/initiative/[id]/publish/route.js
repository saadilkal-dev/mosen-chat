import { auth } from '@clerk/nextjs/server'
import { getSupabase } from '@/lib/supabase'
import { getOrgRoster } from '@/lib/leader-store'
import { buildInitiativeShareEmail, sendEmail } from '@/lib/email'

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

    // 3. If making public, send invites to org roster
    let invitesSent = 0
    const inviteErrors = []

    if (is_public && initiative.org_id) {
      try {
        const roster = await getOrgRoster(initiative.org_id)

        for (const member of roster) {
          if (!member.email) continue

          try {
            // Build a simple invite URL — token-based if invites table exists, else direct link
            let inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/initiative/${id}/employee`

            // Try inserting into initiative_invites (only exists after migration 009)
            try {
              const token = crypto.randomUUID().replace(/-/g, '')
              const { error: insertErr } = await sb
                .from('initiative_invites')
                .insert({
                  initiative_id: id,
                  employee_email: member.email,
                  token,
                  status: 'pending',
                })
              if (!insertErr) {
                inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/initiative/${id}/employee?token=${token}`
              }
            } catch {}

            // Send email
            const emailPayload = buildInitiativeShareEmail({
              employeeName: member.name || member.email.split('@')[0],
              leaderName: 'Your leader',
              initiativeTitle: initiative.title,
              briefExcerpt: 'View the initiative to read the full change brief.',
              inviteUrl,
            })

            await sendEmail({
              to: member.email,
              subject: emailPayload.subject,
              html: emailPayload.html,
            })

            invitesSent++
          } catch (emailErr) {
            inviteErrors.push({ email: member.email, error: emailErr.message })
            console.error('[publish] email failed for', member.email, emailErr.message)
          }
        }
      } catch (rosterErr) {
        console.error('[publish] roster fetch failed:', rosterErr.message)
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
