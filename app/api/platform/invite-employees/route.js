import { requirePlatformAdmin } from '@/lib/platform-admin'
import { sendClerkInvitationsForEmails } from '@/lib/clerk-invitations'

export const dynamic = 'force-dynamic'

export async function POST(req) {
  const adminErr = await requirePlatformAdmin()
  if (adminErr) return adminErr

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
