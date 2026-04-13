import { Suspense } from 'react'
import SignUpGate from './SignUpGate'

/** Invitation links include Clerk query params — see SignUpGate. Otherwise redirect to sign-in. */
export default function SignUpPage() {
  return (
    <Suspense
      fallback={(
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FAFAF8',
            color: '#999',
            fontSize: 14,
          }}
        >
          Loading…
        </div>
      )}
    >
      <SignUpGate />
    </Suspense>
  )
}
