'use client'

import { ClerkProvider } from '@clerk/nextjs'
import AuthProvider from './AuthProvider'

export default function Providers({ children }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <AuthProvider>{children}</AuthProvider>
    </ClerkProvider>
  )
}
