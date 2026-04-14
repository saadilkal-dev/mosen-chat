import { clerkClient } from '@clerk/nextjs/server'
import { requirePlatformAdmin } from '@/lib/platform-admin'

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
