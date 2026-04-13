import { auth, currentUser } from '@clerk/nextjs/server'

function parseAllowedEmails() {
  const allow = process.env.PLATFORM_ADMIN_EMAILS?.trim()
  if (!allow) return new Set()
  return new Set(allow.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean))
}

/** True when email is in PLATFORM_ADMIN_EMAILS (case-insensitive). */
export function isPlatformAdminEmail(email) {
  if (!email) return false
  const allowed = parseAllowedEmails()
  return allowed.size > 0 && allowed.has(String(email).toLowerCase())
}

/** Signed-in Clerk user is a platform admin (same allowlist as requirePlatformAdmin). */
export async function getIsPlatformAdmin() {
  const cu = await currentUser()
  if (!cu) return false
  const primary =
    cu.emailAddresses?.find((e) => e.id === cu.primaryEmailAddressId) || cu.emailAddresses?.[0]
  const email = (primary?.emailAddress || '').toLowerCase()
  return isPlatformAdminEmail(email)
}

/**
 * Platform operator UI: signed-in user whose email is listed in PLATFORM_ADMIN_EMAILS.
 * Does not use PROVISION_API_SECRET in the browser — secret stays server-side only.
 */
export async function requirePlatformAdmin() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Sign in to use platform onboarding.' }, { status: 401 })
  }

  const allowed = parseAllowedEmails()
  if (allowed.size === 0) {
    return Response.json(
      {
        error:
          'Platform onboarding is not configured. Set PLATFORM_ADMIN_EMAILS in the server environment.',
      },
      { status: 503 },
    )
  }

  const cu = await currentUser()
  const primary =
    cu?.emailAddresses?.find((e) => e.id === cu.primaryEmailAddressId) || cu?.emailAddresses?.[0]
  const email = (primary?.emailAddress || '').toLowerCase()

  if (!email || !allowed.has(email)) {
    return Response.json({ error: 'Not authorized for platform onboarding.' }, { status: 403 })
  }

  return null
}
