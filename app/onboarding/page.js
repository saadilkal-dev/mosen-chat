'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../components/providers/AuthProvider'
import { THEME } from '../../lib/theme'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import TeamRosterField from '../../components/org/TeamRosterField'

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading: authLoading, refresh } = useAuth()
  const [orgName, setOrgName] = useState('')
  const [employees, setEmployees] = useState([])
  const [rosterFileName, setRosterFileName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/sign-in')
      return
    }
    if (user.isPlatformAdmin) {
      router.replace('/platform')
      return
    }
    if (user.orgId) {
      router.replace(user.role === 'employee' ? '/employee/home' : '/dashboard')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (authLoading || !user) return
    if (user.orgId) return
    if (!user.onOrgRoster && !user.pendingLeaderProvision && !user.hasLeaderProvisionForEmail) return
    const t = setInterval(() => {
      refresh()
    }, 4000)
    return () => clearInterval(t)
  }, [
    authLoading,
    user?.userId,
    user?.orgId,
    user?.onOrgRoster,
    user?.pendingLeaderProvision,
    user?.hasLeaderProvisionForEmail,
    refresh,
  ])

  async function saveOrganisation() {
    const res = await fetch('/api/org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: orgName.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || 'Could not save organisation.')
    }
    await refresh()
  }

  /** importTeam: true = import uploaded rows; false = organisation only */
  async function completeSetup(importTeam) {
    setError('')
    if (!orgName.trim()) {
      setError('Organisation name is required.')
      return
    }
    if (importTeam && employees.length === 0) {
      setError('Choose a roster file with at least one valid row, or complete setup without importing a team.')
      return
    }

    setLoading(true)
    try {
      await saveOrganisation()

      let profile = await refresh()
      if (!profile?.orgId) {
        await new Promise((r) => setTimeout(r, 150))
        profile = await refresh()
      }
      if (!profile?.orgId) {
        throw new Error('Your organisation was not linked yet. Please click Complete setup again.')
      }

      if (importTeam && employees.length > 0) {
        const body = {
          skipInvites: true,
          employees: employees.map(({ name, email, department, role }) => ({
            name,
            email,
            department: department || '',
            role: role || '',
          })),
        }

        const postEmployees = async () => {
          const res = await fetch('/api/org/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body),
          })
          const data = await res.json().catch(() => ({}))
          return { res, data }
        }

        let { res, data } = await postEmployees()
        const orgNotReady =
          res.status === 400 &&
          String(data.error || '').toLowerCase().includes('organisation')
        if (orgNotReady) {
          await refresh()
          await new Promise((r) => setTimeout(r, 200))
          ;({ res, data } = await postEmployees())
        }

        if (!res.ok) {
          const detail =
            Array.isArray(data.errors) && data.errors.length
              ? ` ${data.errors.slice(0, 5).join(' ')}`
              : ''
          throw new Error((data.error || 'Could not save employees.') + detail)
        }
      }

      await refresh()
      router.push('/dashboard')
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !user) {
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

  if (user.orgId) {
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

  const waitForPreload =
    user.onOrgRoster || user.pendingLeaderProvision || user.hasLeaderProvisionForEmail
  if (waitForPreload) {
    return (
      <div
        style={{
          minHeight: '100vh',
          padding: '32px 16px',
          background: THEME.colors.bg,
          fontFamily: THEME.font,
        }}
      >
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <Card padding={28}>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, color: THEME.colors.text }}>
              Connecting your workspace
            </h1>
            <p style={{ fontSize: 14, color: THEME.colors.textMuted, marginBottom: 20, lineHeight: 1.6 }}>
              Your organisation and team were set up by your administrator. We are linking this account to that
              workspace — use <strong>Refresh</strong> if you are not redirected in a few seconds. You do not need to
              create a new organisation here.
            </p>
            <Button type="button" onClick={() => refresh()}>
              Refresh status
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  const canSubmit = orgName.trim().length > 0

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '32px 16px',
        background: THEME.colors.bg,
        fontFamily: THEME.font,
      }}
    >
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <a href="/emp" style={{ fontSize: 13, color: '#999', textDecoration: 'none' }}>
            I&apos;m an employee, not a leader →
          </a>
        </div>

        <Card padding={24}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: THEME.colors.text }}>
            Set up your workspace
          </h1>
          <p style={{ fontSize: 14, color: THEME.colors.textMuted, marginBottom: 24, lineHeight: 1.55 }}>
            <strong>Organisation name</strong> is required to continue. Adding people is optional — you can skip step 2
            and add them later from <strong>Team</strong> in the sidebar. If you upload a roster here, we save names
            and emails only; <strong>no invitations are sent</strong> at this step.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: THEME.colors.leader.primary,
                  margin: '0 0 10px',
                }}
              >
                Step 1 — Organisation
              </p>
              <Input
                label="Organisation name"
                value={orgName}
                onChange={setOrgName}
                placeholder="e.g. Acme Corp"
                autoFocus
              />
            </div>

            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: THEME.colors.leader.primary,
                  margin: '0 0 10px',
                }}
              >
                Step 2 — Team roster (optional)
              </p>
              <TeamRosterField
                inputId="onboarding-roster-file"
                employees={employees}
                onEmployeesChange={setEmployees}
                fileName={rosterFileName}
                onFileNameChange={setRosterFileName}
              />
            </div>

            {error && (
              <p style={{ color: THEME.colors.error, fontSize: 13, margin: 0 }}>{error}</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
              <Button
                type="button"
                fullWidth
                loading={loading}
                disabled={!canSubmit}
                onClick={() => completeSetup(employees.length > 0)}
              >
                {employees.length > 0 ? 'Complete setup & save team list' : 'Complete setup'}
              </Button>
              <p style={{ fontSize: 12, color: THEME.colors.textMuted, margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
                {employees.length > 0
                  ? 'Saves your organisation and team list (no invites sent). You can add more people later from Team in the sidebar.'
                  : 'Saves your organisation. You can add people anytime from Team in the sidebar (quick add or bulk import).'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
