'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SignUp } from '@clerk/nextjs'

/**
 * Self-service /sign-up is disabled unless Clerk opened this URL for an invitation
 * (query params include __clerk* keys).
 */
export default function SignUpGate() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [ready, setReady] = useState(false)

  const allowSignUp = useMemo(() => {
    const keys = [...searchParams.keys()]
    if (keys.some((k) => k.startsWith('__clerk'))) return true
    const s = searchParams.toString()
    return s.includes('ticket') || s.includes('__clerk')
  }, [searchParams])

  useEffect(() => {
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    if (!allowSignUp) {
      router.replace('/sign-in')
    }
  }, [ready, allowSignUp, router])

  if (!ready || !allowSignUp) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FAFAF8',
          fontFamily: "'DM Sans', system-ui, sans-serif",
          color: '#999',
          fontSize: 14,
        }}
      >
        Loading…
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#FAFAF8',
      }}
    >
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        appearance={{
          variables: {
            colorPrimary: '#534AB7',
            borderRadius: '12px',
            fontFamily: "'DM Sans', system-ui, sans-serif",
          },
        }}
      />
    </div>
  )
}
