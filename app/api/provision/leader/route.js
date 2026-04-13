import { executeProvisionLeader } from '../../../../lib/provision-leader-core'

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
 * Pre-create organisation + optional roster for a leader email before they sign in.
 * On first Clerk sign-in, lib/leaderProvision.js attaches org_id to their profile.
 * Auth: x-provision-secret or Bearer (automation / scripts).
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

  return executeProvisionLeader(body)
}
