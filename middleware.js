import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

/** App pages that require a Clerk session (APIs use route-level auth instead). */
const isProtectedPage = createRouteMatcher([
  '/dashboard(.*)',
  '/onboarding(.*)',
  '/admin(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isProtectedPage(req)) return
  await auth.protect()
})

export const config = {
  matcher: [
    '/((?!.+\\.[\\w]+$|_next).*)',
    '/',
    '/(api|trpc)(.*)',
  ],
}
