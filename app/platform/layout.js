'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import PlatformShell from '@/components/platform/PlatformShell'
import { THEME } from '@/lib/theme'

export default function PlatformLayout({ children }) {
  const router = useRouter()
  const { user, loading, logout } = useAuth()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/sign-in')
      return
    }
    if (!user.isPlatformAdmin) {
      router.replace('/')
    }
  }, [loading, user, router])

  if (loading || !user) {
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
        Loading…
      </div>
    )
  }

  if (!user.isPlatformAdmin) {
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
        Redirecting…
      </div>
    )
  }

  return (
    <PlatformShell onSignOut={logout} showLeaderDashboard={!!user.orgId}>
      {children}
    </PlatformShell>
  )
}
