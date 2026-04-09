import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

/** App pages that require a Clerk session (APIs use route-level auth instead). */
const isProtectedPage = createRouteMatcher([
  '/dashboard(.*)',
  '/onboarding(.*)',
  '/admin(.*)',
  '/initiative(.*)',
])

export default clerkMiddleware(async (getAuth, req) => {
  if (!isProtectedPage(req)) return
  await getAuth().protect()
})

export const config = {
  matcher: [
    '/((?!.+\\.[\\w]+$|_next).*)',
    '/',
    '/(api|trpc)(.*)',
  ],
}
