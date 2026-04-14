import { clerkClient } from '@clerk/nextjs/server'

/**
 * Sends Clerk invitations (set password / accept invite). Uses ignoreExisting to avoid errors for users already in the org.
 */
export async function sendClerkInvitationsForEmails(emails, redirectUrl) {
  const client = await clerkClient()
  const list = [...new Set((emails || []).map((e) => String(e || '').trim().toLowerCase()).filter((e) => e.includes('@')))]
  const results = []
  for (const emailAddress of list) {
    try {
      const invitation = await client.invitations.createInvitation({
        emailAddress,
        redirectUrl,
        ignoreExisting: true,
      })
      results.push({ emailAddress, ok: true, id: invitation.id, status: invitation.status })
    } catch (err) {
      results.push({ emailAddress, ok: false, error: err.message || String(err) })
    }
  }
  return results
}
