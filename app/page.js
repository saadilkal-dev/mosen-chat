'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { THEME } from '../lib/theme'
import { useAuth } from '../components/providers/AuthProvider'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

function MosenLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: THEME.colors.leader.avatarBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="8" r="4" fill={THEME.colors.leader.primary} />
          <path
            d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
            stroke={THEME.colors.leader.primary}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="8" r="2" fill={THEME.colors.leader.avatarBg} />
        </svg>
      </div>
      <span style={{ fontSize: 26, fontWeight: 700, color: THEME.colors.text, letterSpacing: '-0.02em' }}>
        Mosen
      </span>
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading || !user) return
    if (user.orgId) {
      router.replace('/dashboard')
    } else {
      router.replace('/onboarding')
    }
  }, [loading, user, router])

  if (loading || user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: THEME.colors.bg,
          fontFamily: THEME.font,
          color: THEME.colors.textMuted,
          fontSize: 14,
        }}
      >
        {loading ? 'Loading…' : ''}
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        background: THEME.colors.bg,
        fontFamily: THEME.font,
      }}
    >
      <Card padding={28} style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <MosenLogo />
          <p style={{ fontSize: 14, color: THEME.colors.textMuted, lineHeight: 1.6 }}>
            Sign in with your account to manage change initiatives and your organisation.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link href="/sign-in" style={{ textDecoration: 'none' }}>
            <Button fullWidth>Sign in</Button>
          </Link>
          <Link href="/sign-up" style={{ textDecoration: 'none' }}>
            <Button fullWidth variant="secondary">
              Create account
            </Button>
          </Link>
        </div>
      </Card>

      <p style={{ marginTop: 28, fontSize: 13, color: THEME.colors.textMuted, textAlign: 'center' }}>
        Trying the original prototype?{' '}
        <a href="/leader" style={{ color: THEME.colors.leader.primary, fontWeight: 600 }}>
          Leader
        </a>
        {' · '}
        <a href="/employee" style={{ color: THEME.colors.employee.primary, fontWeight: 600 }}>
          Employee
        </a>
      </p>
    </div>
  )
}
