import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl
  const session = request.cookies.get('mosen_session')

  // Protected routes
  const protectedPaths = ['/dashboard', '/onboarding', '/initiative', '/admin']
  const isProtected = protectedPaths.some(p => pathname.startsWith(p))

  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/initiative/:path*', '/admin/:path*']
}
