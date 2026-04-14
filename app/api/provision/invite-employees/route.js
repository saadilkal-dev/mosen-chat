import { sendClerkInvitationsForEmails } from '@/lib/clerk-invitations'

export const dynamic = 'force-dynamic'

function requireProvisionSecret(req) {
  const secret = process.env.PROVISION_API_SECRET?.trim()
  if (!secret) {
    return Response.json(
      { error: 'Provisioning is not configured (set PROVISION_API_SECRET in .env.local).' },
      { status: 503 },
    )
  }
  const header = req.headers.get('x-provision-secret')
  const auth = req.headers.get('authorization')
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null
  const provided = header || bearer
  if (!provided || provided !== secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

/**
 * Send Clerk invitation emails for roster employees (set password, then sign in).
 * Pre-requisite: emails exist in org_employees from POST /api/provision/leader (or dashboard import).
 */
export async function POST(req) {
  const authErr = requireProvisionSecret(req)
  if (authErr) return authErr

  let body
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const emails = Array.isArray(body.emails) ? body.emails : []
  const normalized = [...new Set(emails.map((e) => String(e || '').trim().toLowerCase()).filter((e) => e.includes('@')))]
  if (normalized.length === 0) {
    return Response.json({ error: 'emails array with at least one valid address is required' }, { status: 400 })
  }

  const base = (process.env.NEXT_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '')
  const redirectUrl =
    typeof body.redirectUrl === 'string' && body.redirectUrl.startsWith('http')
      ? body.redirectUrl
      : `${base}/sign-up`

  const results = await sendClerkInvitationsForEmails(normalized, redirectUrl)
  const ok = results.filter((r) => r.ok).length

  return Response.json({ ok: ok > 0, sent: ok, total: normalized.length, results })
}
