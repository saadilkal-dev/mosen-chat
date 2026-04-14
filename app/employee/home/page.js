'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { THEME } from '@/lib/theme'
import { useAuth } from '@/components/providers/AuthProvider'
import AppShell from '@/components/layout/AppShell'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

export default function EmployeeHomePage() {
  const router = useRouter()
  const { user, loading: authLoading, logout } = useAuth()
  const [initiatives, setInitiatives] = useState([])
  const [listLoading, setListLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/sign-in')
      return
    }
    if (!user.orgId) {
      router.replace('/onboarding')
      return
    }
    // Leaders can also be employees on other initiatives — don't redirect them away
  }, [authLoading, user, router])

  const loadList = useCallback(async () => {
    setListLoading(true)
    try {
      const res = await fetch('/api/employee/initiatives', { credentials: 'include' })
      if (!res.ok) {
        setInitiatives([])
        return
      }
      const data = await res.json().catch(() => ({}))
      // API returns an array directly
      setInitiatives(Array.isArray(data) ? data : (Array.isArray(data.initiatives) ? data.initiatives : []))
    } catch {
      setInitiatives([])
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user?.orgId) return
    loadList()
  }, [user?.orgId, loadList])

  if (authLoading || !user || !user.orgId) {
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
        }}
      >
        Loading…
      </div>
    )
  }

  const E = THEME.colors.employee

  return (
    <AppShell
      sidebar={(
        <Sidebar
          user={user}
          orgName={user.orgName}
          initiatives={initiatives}
          activeId={null}
          onSelect={(id) => router.push(`/initiative/${id}`)}
          teamCount={0}
          onLogout={logout}
          employeeMode
          showPlatformAdmin={!!user.isPlatformAdmin}
        />
      )}
    >
      <TopBar breadcrumbs={[{ label: 'Home', href: '/employee/home' }]} />
      <div style={{ padding: '24px 28px 40px', maxWidth: 880, margin: '0 auto' }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: THEME.colors.text,
            margin: '0 0 8px',
            letterSpacing: '-0.02em',
          }}
        >
          Your initiatives
        </h1>
        <p style={{ fontSize: 14, color: THEME.colors.textMuted, margin: '0 0 24px', lineHeight: 1.55 }}>
          Open an initiative you have been assigned to. You sign in with your work email — no separate
          onboarding step.
        </p>

        {listLoading ? (
          <p style={{ color: THEME.colors.textMuted, fontSize: 14 }}>Loading…</p>
        ) : initiatives.length === 0 ? (
          <Card padding={28}>
            <p style={{ fontSize: 15, color: THEME.colors.text, margin: 0, lineHeight: 1.6 }}>
              You are not assigned to any initiatives yet. When your leader adds you to an initiative, it will
              appear here.
            </p>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {initiatives.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => router.push(`/initiative/${item.id}`)}
                style={{
                  textAlign: 'left',
                  padding: 18,
                  borderRadius: THEME.radius.md,
                  border: `1px solid ${THEME.colors.border}`,
                  background: THEME.colors.surface,
                  cursor: 'pointer',
                  fontFamily: THEME.font,
                  boxShadow: THEME.shadow.sm,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: THEME.colors.text }}>{item.title}</span>
                  <Badge color={THEME.colors.textMuted}>{item.status || 'draft'}</Badge>
                </div>
                <span style={{ fontSize: 13, color: E.primary, marginTop: 8, display: 'inline-block' }}>
                  Continue →
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
