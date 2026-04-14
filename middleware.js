import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

/** Routes that bypass Clerk (token-based access). */
const isPublicPage = createRouteMatcher([
  '/initiative/:id/employee(.*)',
])

/** App pages that require a Clerk session (APIs use route-level auth instead). */
const isProtectedPage = createRouteMatcher([
  '/dashboard(.*)',
  '/employee/home(.*)',
  '/onboarding(.*)',
  '/admin(.*)',
  '/initiative(.*)',
  '/platform(.*)',
])

export default clerkMiddleware(async (getAuth, req) => {
  if (isPublicPage(req)) return
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
