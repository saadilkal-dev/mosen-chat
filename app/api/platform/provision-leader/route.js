import { requirePlatformAdmin } from '@/lib/platform-admin'
import { executeProvisionLeader } from '@/lib/provision-leader-core'

export const dynamic = 'force-dynamic'

/**
 * Same as POST /api/provision/leader but auth = signed-in platform admin (PLATFORM_ADMIN_EMAILS).
 * PROVISION_API_SECRET is not sent from the browser.
 */
export async function POST(req) {
  const adminErr = await requirePlatformAdmin()
  if (adminErr) return adminErr

  let body
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  return executeProvisionLeader(body)
}
