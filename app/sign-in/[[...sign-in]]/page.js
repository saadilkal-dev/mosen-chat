import { SignIn } from '@clerk/nextjs'

function safeRedirectUrl(raw) {
  if (typeof raw !== 'string') return undefined
  const t = raw.trim()
  if (!t) return undefined
  if (t.startsWith('/')) return t
  try {
    const u = new URL(t)
    if (u.protocol === 'http:' || u.protocol === 'https:') return t
  } catch {
    return undefined
  }
  return undefined
}

export default function SignInPage({ searchParams }) {
  const redirectUrl = safeRedirectUrl(searchParams?.redirect_url)

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
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        {...(redirectUrl ? { forceRedirectUrl: redirectUrl } : {})}
        appearance={{
          variables: {
            colorPrimary: '#534AB7',
            borderRadius: '12px',
            fontFamily: "'DM Sans', system-ui, sans-serif",
          },
          elements: {
            footerAction: { display: 'none' },
          },
        }}
      />
    </div>
  )
}
