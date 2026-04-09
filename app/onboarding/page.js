'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../components/providers/AuthProvider'
import * as XLSX from 'xlsx'
import { THEME } from '../../lib/theme'
import { employeesFromObjects, parseCSVText } from '../../lib/utils'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'

const STEPS = ['Organisation', 'Team roster', 'Invite']

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading: authLoading, refresh } = useAuth()
  const [step, setStep] = useState(0)
  const [orgName, setOrgName] = useState('')
  const [employees, setEmployees] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [doneMessage, setDoneMessage] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/sign-in')
      return
    }
    if (user.orgId) {
      router.replace('/dashboard')
    }
  }, [authLoading, user, router])

  const parseFile = useCallback(async file => {
    const lower = file.name.toLowerCase()
    setError('')
    if (lower.endsWith('.csv')) {
      const text = await file.text()
      const rows = employeesFromObjects(parseCSVText(text))
      if (rows.length === 0) {
        setError(
          'No valid rows found. Use a header row with an email column (e.g. "email", "Email address", or "Work email"). Quoted fields and UTF-8 (Excel) exports are supported.',
        )
      }
      setEmployees(rows)
      return
    }
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      const rows = employeesFromObjects(json)
      if (rows.length === 0) {
        setError(
          'No valid rows found. The sheet needs a column that contains email addresses (e.g. "email" or "Email address").',
        )
      }
      setEmployees(rows)
      return
    }
    setError('Please upload a .csv or .xlsx file.')
  }, [])

  const onDrop = useCallback(e => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) parseFile(f)
  }, [parseFile])

  async function submitOrg(e) {
    e.preventDefault()
    setError('')
    if (!orgName.trim()) {
      setError('Organisation name is required.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: orgName.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Could not save organisation.')
        setLoading(false)
        return
      }
      setStep(1)
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  async function submitEmployees() {
    setError('')
    if (employees.length === 0) {
      setError('Add at least one employee with a valid email, or skip by uploading later from settings.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/org/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ employees }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Could not save employees.')
        setLoading(false)
        return
      }
      setDoneMessage(
        data.added != null
          ? `Invites prepared for ${data.added} new team members (${data.total} total on roster).`
          : 'Team roster saved.',
      )
      setStep(2)
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  async function finish() {
    setLoading(true)
    setError('')
    try {
      const profile = await refresh()
      if (!profile?.orgId) {
        setError('Could not load your workspace. Refresh the page and try again.')
        return
      }
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !user || user.orgId) {
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
    <div
      style={{
        minHeight: '100vh',
        padding: '32px 16px',
        background: THEME.colors.bg,
        fontFamily: THEME.font,
      }}
    >
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {STEPS.map((label, i) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: i <= step ? THEME.colors.leader.primary : THEME.colors.textMuted,
                fontWeight: i === step ? 600 : 400,
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: i <= step ? THEME.colors.leader.light : THEME.colors.border,
                  color: i <= step ? THEME.colors.leader.primary : THEME.colors.textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </span>
              {label}
            </div>
          ))}
        </div>

        {step === 0 && (
          <Card padding={24}>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: THEME.colors.text }}>
              Name your organisation
            </h1>
            <p style={{ fontSize: 14, color: THEME.colors.textMuted, marginBottom: 20, lineHeight: 1.5 }}>
              This is how your workspace will appear to you and your team.
            </p>
            <form onSubmit={submitOrg} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input
                label="Organisation name"
                value={orgName}
                onChange={setOrgName}
                placeholder="e.g. Acme Corp"
                autoFocus
              />
              {error && <p style={{ color: THEME.colors.error, fontSize: 13, margin: 0 }}>{error}</p>}
              <Button type="submit" fullWidth loading={loading}>
                Continue
              </Button>
            </form>
          </Card>
        )}

        {step === 1 && (
          <Card padding={24}>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: THEME.colors.text }}>
              Upload your team
            </h1>
            <p style={{ fontSize: 14, color: THEME.colors.textMuted, marginBottom: 16, lineHeight: 1.5 }}>
              Drop a CSV or Excel file with columns: name, email, department, role.
            </p>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              style={{
                border: `2px dashed ${dragOver ? THEME.colors.leader.primary : THEME.colors.border}`,
                borderRadius: THEME.radius.md,
                padding: 36,
                textAlign: 'center',
                background: dragOver ? THEME.colors.leader.light : '#F5F5F2',
                marginBottom: 16,
              }}
            >
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                style={{ display: 'none' }}
                id="roster-file"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) parseFile(f)
                  e.target.value = ''
                }}
              />
              <label htmlFor="roster-file" style={{ cursor: 'pointer', color: THEME.colors.leader.primary, fontWeight: 600 }}>
                Choose file
              </label>
              <span style={{ color: THEME.colors.textMuted }}> or drag and drop here</span>
            </div>
            {error && <p style={{ color: THEME.colors.error, fontSize: 13, marginBottom: 12 }}>{error}</p>}
            {employees.length > 0 && (
              <div style={{ overflow: 'auto', maxHeight: 280, marginBottom: 16, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.sm }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: THEME.colors.bg, textAlign: 'left' }}>
                      <th style={{ padding: 8 }}>Name</th>
                      <th style={{ padding: 8 }}>Email</th>
                      <th style={{ padding: 8 }}>Department</th>
                      <th style={{ padding: 8 }}>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.slice(0, 50).map((r, i) => (
                      <tr key={`${r.email}-${i}`} style={{ borderTop: `1px solid ${THEME.colors.border}` }}>
                        <td style={{ padding: 8 }}>{r.name}</td>
                        <td style={{ padding: 8 }}>{r.email}</td>
                        <td style={{ padding: 8 }}>{r.department}</td>
                        <td style={{ padding: 8 }}>{r.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {employees.length > 50 && (
                  <div style={{ padding: 8, fontSize: 11, color: THEME.colors.textMuted }}>
                    Showing 50 of {employees.length} rows.
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Button onClick={submitEmployees} loading={loading} disabled={employees.length === 0}>
                Confirm & send invites
              </Button>
              <Button
                variant="secondary"
                onClick={() => { setStep(2); setDoneMessage('You can add employees anytime from the dashboard.') }}
              >
                Skip for now
              </Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card padding={24}>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: THEME.colors.text }}>
              You&apos;re set
            </h1>
            <p style={{ fontSize: 14, color: THEME.colors.textMuted, lineHeight: 1.6, marginBottom: 20 }}>
              {doneMessage || 'Your workspace is ready.'}
            </p>
            {error && (
              <p style={{ color: THEME.colors.error, fontSize: 13, marginBottom: 12 }}>{error}</p>
            )}
            <Button onClick={finish} fullWidth loading={loading}>
              Go to dashboard
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
