import { clerkClient } from '@clerk/nextjs/server'

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
 * Send a Clerk invitation email so the leader can set a password.
 * Run after POST /api/provision/leader (org + data pre-loaded).
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

  const leaderEmail = String(body.leaderEmail || '').trim().toLowerCase()
  if (!leaderEmail || !leaderEmail.includes('@')) {
    return Response.json({ error: 'Valid leaderEmail is required' }, { status: 400 })
  }

  const base = (process.env.NEXT_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '')
  const redirectUrl =
    typeof body.redirectUrl === 'string' && body.redirectUrl.startsWith('http')
      ? body.redirectUrl
      : `${base}/sign-up`

  try {
    const client = await clerkClient()
    const invitation = await client.invitations.createInvitation({
      emailAddress: leaderEmail,
      redirectUrl,
    })

    return Response.json({
      ok: true,
      id: invitation.id,
      emailAddress: invitation.emailAddress,
      status: invitation.status,
    })
  } catch (err) {
    return Response.json(
      { error: err.message || 'Clerk invitation failed', details: String(err) },
      { status: 502 },
    )
  }
}
