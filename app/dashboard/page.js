'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { THEME } from '../../lib/theme'
import { fmt } from '../../lib/utils'
import { useAuth } from '../../components/providers/AuthProvider'
import AppShell from '../../components/layout/AppShell'
import Sidebar from '../../components/layout/Sidebar'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading, logout, refresh } = useAuth()
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
  }, [authLoading, user, router])

  const loadInitiatives = useCallback(async () => {
    setListLoading(true)
    try {
      const res = await fetch('/api/initiative', { credentials: 'include' })
      if (res.status === 404 || res.status === 405) {
        setInitiatives([])
        return
      }
      if (!res.ok) {
        setInitiatives([])
        return
      }
      const data = await res.json().catch(() => ({}))
      const list = Array.isArray(data.initiatives) ? data.initiatives : []
      setInitiatives(list)
    } catch {
      setInitiatives([])
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user?.orgId) return
    loadInitiatives()
  }, [user?.orgId, loadInitiatives])

  const handleLogout = async () => {
    await logout()
    router.replace('/')
  }

  const handleNewInitiative = () => {
    router.push('/initiative/new')
  }

  const handleSelect = id => {
    router.push(`/initiative/${id}`)
  }

  if (authLoading || !user?.orgId) {
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

  return (
    <AppShell
      sidebar={(
        <Sidebar
          user={user}
          orgName={user.orgName}
          initiatives={initiatives}
          activeId={null}
          onSelect={handleSelect}
          onNew={handleNewInitiative}
          onLogout={handleLogout}
        />
      )}
    >
      <TopBar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
        ]}
        actions={(
          <Button size="sm" onClick={() => refresh()}>
            Refresh
          </Button>
        )}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: THEME.colors.text }}>Initiatives</h1>
            <Button onClick={handleNewInitiative}>New Initiative</Button>
          </div>

          {listLoading ? (
            <p style={{ color: THEME.colors.textMuted, fontSize: 14 }}>Loading initiatives…</p>
          ) : initiatives.length === 0 ? (
            <Card padding={40} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 15, color: THEME.colors.textMuted, marginBottom: 16, lineHeight: 1.6 }}>
                No initiatives yet. Create one to start a change brief and playbook with Mosen.
              </p>
              <Button onClick={handleNewInitiative}>Create your first initiative</Button>
            </Card>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 16,
              }}
            >
              {initiatives.map(init => (
                <Card
                  key={init.id}
                  hover
                  onClick={() => handleSelect(init.id)}
                  padding={18}
                >
                  <div style={{ fontSize: 15, fontWeight: 600, color: THEME.colors.text, marginBottom: 8 }}>
                    {init.title || 'Untitled'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <Badge
                      color={
                        init.status === 'active'
                          ? THEME.colors.success
                          : init.status === 'draft'
                            ? THEME.colors.textMuted
                            : THEME.colors.warning
                      }
                    >
                      {init.status || 'draft'}
                    </Badge>
                    {init.lastActivity != null && (
                      <span style={{ fontSize: 11, color: THEME.colors.textLight }}>
                        {fmt(init.lastActivity)}
                      </span>
                    )}
                  </div>
                  {init.employeeCount != null && (
                    <div style={{ fontSize: 12, color: THEME.colors.textMuted }}>
                      {init.employeeCount} team members
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
