'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { THEME } from '../../lib/theme'
import { fmt, validateEmail } from '../../lib/utils'
import { useAuth } from '../../components/providers/AuthProvider'
import AppShell from '../../components/layout/AppShell'
import Sidebar from '../../components/layout/Sidebar'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import TeamRosterField from '../../components/org/TeamRosterField'
import Modal from '../../components/ui/Modal'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading, logout, refresh } = useAuth()
  const [teamModalOpen, setTeamModalOpen] = useState(false)
  const [initiatives, setInitiatives] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [rosterEmployees, setRosterEmployees] = useState([])
  const [rosterFileName, setRosterFileName] = useState('')
  const [teamList, setTeamList] = useState([])
  const [teamLoading, setTeamLoading] = useState(true)
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')
  const [bulkOpen, setBulkOpen] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [department, setDepartment] = useState('')
  const [role, setRole] = useState('')
  const [addOneLoading, setAddOneLoading] = useState(false)
  const [addOneError, setAddOneError] = useState('')
  const [addOneSuccess, setAddOneSuccess] = useState('')
  const [removingEmail, setRemovingEmail] = useState(null)
  const [rosterRemoveError, setRosterRemoveError] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/sign-in')
      return
    }
    if (user.orgId) return

    let cancelled = false
    ;(async () => {
      const profile = await refresh()
      if (cancelled) return
      if (!profile?.orgId) {
        router.replace('/onboarding')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authLoading, user?.userId, user?.orgId, router, refresh])

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

  const loadTeam = useCallback(async () => {
    setTeamLoading(true)
    setImportError('')
    try {
      const res = await fetch('/api/org/employees', { credentials: 'include' })
      if (!res.ok) {
        setTeamList([])
        return
      }
      const data = await res.json().catch(() => ({}))
      setTeamList(Array.isArray(data.employees) ? data.employees : [])
    } catch {
      setTeamList([])
    } finally {
      setTeamLoading(false)
    }
  }, [])

  const handleRemoveMember = async (row) => {
    const label = row.name?.trim() || row.email
    if (
      !window.confirm(
        `Remove ${label} from your team? Their invite will be revoked and they will be unassigned from all initiatives in this organisation.`,
      )
    ) {
      return
    }
    setRosterRemoveError('')
    setRemovingEmail(row.email)
    try {
      const res = await fetch(`/api/org/employees/${encodeURIComponent(row.email)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Could not remove team member.')
      }
      await loadTeam()
      await refresh()
    } catch (err) {
      setRosterRemoveError(err.message || 'Could not remove team member.')
    } finally {
      setRemovingEmail(null)
    }
  }

  useEffect(() => {
    if (!user?.orgId) return
    loadTeam()
  }, [user?.orgId, loadTeam])

  useEffect(() => {
    if (!teamModalOpen || !user?.orgId) return
    loadTeam()
  }, [teamModalOpen, user?.orgId, loadTeam])

  const handleImportTeam = async () => {
    if (rosterEmployees.length === 0) return
    setImportLoading(true)
    setImportError('')
    setImportSuccess('')
    try {
      const res = await fetch('/api/org/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          skipInvites: true,
          employees: rosterEmployees.map(({ name, email, department, role }) => ({
            name,
            email,
            department: department || '',
            role: role || '',
          })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Could not import team.')
      }
      const parts = []
      if (data.added != null) parts.push(`Added ${data.added}`)
      if (data.skipped > 0) parts.push(`skipped ${data.skipped} duplicate${data.skipped === 1 ? '' : 's'}`)
      setImportSuccess(parts.length ? `${parts.join(', ')}.` : 'Import complete.')
      setRosterRemoveError('')
      setRosterEmployees([])
      setRosterFileName('')
      await loadTeam()
      await refresh()
    } catch (err) {
      setImportError(err.message || 'Import failed.')
    } finally {
      setImportLoading(false)
    }
  }

  const handleAddOne = async (e) => {
    e.preventDefault()
    setAddOneError('')
    setAddOneSuccess('')
    const fn = firstName.trim()
    const ln = lastName.trim()
    const em = email.trim()
    if (!fn || !ln) {
      setAddOneError('First and last name are required.')
      return
    }
    if (!validateEmail(em)) {
      setAddOneError('Enter a valid email address.')
      return
    }
    const name = `${fn} ${ln}`.trim()
    setAddOneLoading(true)
    try {
      const res = await fetch('/api/org/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          skipInvites: true,
          employees: [
            {
              name,
              email: em,
              department: department.trim(),
              role: role.trim(),
            },
          ],
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Could not add team member.')
      }
      if (data.added === 0 && data.skipped > 0) {
        setAddOneError('That email is already on your team.')
        return
      }
      setAddOneSuccess(`${name} added.`)
      setRosterRemoveError('')
      setFirstName('')
      setLastName('')
      setEmail('')
      setDepartment('')
      setRole('')
      await loadTeam()
      await refresh()
    } catch (err) {
      setAddOneError(err.message || 'Could not add team member.')
    } finally {
      setAddOneLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
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
          onTeam={() => setTeamModalOpen(true)}
          teamCount={teamList.length}
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
      <Modal
        isOpen={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        title="Team"
        maxWidth={720}
      >
              <p style={{ fontSize: 14, color: THEME.colors.textMuted, margin: '0 0 20px', lineHeight: 1.55 }}>
                People here can be assigned to initiatives. Adding someone saves them to your roster only — invitations are not sent from here. Add one at a time or use bulk import when you have a spreadsheet.
              </p>

              <Card padding={22} style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: THEME.colors.text, margin: '0 0 14px' }}>
                  Saved roster
                </h2>
                {rosterRemoveError && (
                  <p style={{ color: THEME.colors.error, fontSize: 13, margin: '0 0 12px' }}>{rosterRemoveError}</p>
                )}
                {teamLoading ? (
                  <p style={{ color: THEME.colors.textMuted, fontSize: 14, margin: 0 }}>Loading…</p>
                ) : teamList.length === 0 ? (
                  <p style={{ color: THEME.colors.textMuted, fontSize: 14, margin: 0, lineHeight: 1.55 }}>
                    No one added yet. Use the form below to add your first team member, or expand bulk import to load a file.
                  </p>
                ) : (
                  <div
                    style={{
                      overflow: 'auto',
                      maxHeight: 320,
                      border: `1px solid ${THEME.colors.border}`,
                      borderRadius: THEME.radius.sm,
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: THEME.colors.bg, textAlign: 'left' }}>
                          <th style={{ padding: 10, fontWeight: 600 }}>Name</th>
                          <th style={{ padding: 10, fontWeight: 600 }}>Email</th>
                          <th style={{ padding: 10, fontWeight: 600 }}>Department</th>
                          <th style={{ padding: 10, fontWeight: 600 }}>Role</th>
                          <th style={{ padding: 10, fontWeight: 600, textAlign: 'right', width: 100 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamList.map((row) => (
                          <tr key={row.email} style={{ borderTop: `1px solid ${THEME.colors.border}` }}>
                            <td style={{ padding: 10 }}>{row.name || '—'}</td>
                            <td style={{ padding: 10 }}>{row.email}</td>
                            <td style={{ padding: 10, color: THEME.colors.textMuted }}>{row.department || '—'}</td>
                            <td style={{ padding: 10, color: THEME.colors.textMuted }}>{row.role || '—'}</td>
                            <td style={{ padding: 8, textAlign: 'right', verticalAlign: 'middle' }}>
                              <button
                                type="button"
                                disabled={removingEmail != null}
                                onClick={() => handleRemoveMember(row)}
                                style={{
                                  padding: '6px 10px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  fontFamily: THEME.font,
                                  color: removingEmail === row.email ? THEME.colors.textMuted : THEME.colors.error,
                                  background: THEME.colors.errorBg,
                                  border: `1px solid ${THEME.colors.error}33`,
                                  borderRadius: THEME.radius.sm,
                                  cursor: removingEmail != null ? 'not-allowed' : 'pointer',
                                  opacity: removingEmail != null && removingEmail !== row.email ? 0.5 : 1,
                                }}
                              >
                                {removingEmail === row.email ? 'Removing…' : 'Remove'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              <Card padding={22} style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: THEME.colors.text, margin: '0 0 6px' }}>
                  Add a team member
                </h2>
                <p style={{ fontSize: 13, color: THEME.colors.textMuted, margin: '0 0 16px', lineHeight: 1.5 }}>
                  Quick add — one person at a time.
                </p>
                <form onSubmit={handleAddOne}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: 14,
                      marginBottom: 14,
                    }}
                  >
                    <Input label="First name" value={firstName} onChange={setFirstName} placeholder="Jane" />
                    <Input label="Last name" value={lastName} onChange={setLastName} placeholder="Doe" />
                    <Input
                      label="Work email"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      placeholder="jane@company.com"
                    />
                    <Input label="Department (optional)" value={department} onChange={setDepartment} placeholder="e.g. Engineering" />
                    <Input label="Role (optional)" value={role} onChange={setRole} placeholder="e.g. Analyst" />
                  </div>
                  {addOneError && (
                    <p style={{ color: THEME.colors.error, fontSize: 13, margin: '0 0 12px' }}>{addOneError}</p>
                  )}
                  {addOneSuccess && (
                    <p style={{ color: THEME.colors.success, fontSize: 13, margin: '0 0 12px' }}>{addOneSuccess}</p>
                  )}
                  <Button type="submit" loading={addOneLoading} disabled={addOneLoading}>
                    Add to team
                  </Button>
                </form>
              </Card>

              <div style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  aria-expanded={bulkOpen}
                  onClick={() => {
                    setBulkOpen((o) => !o)
                    if (!bulkOpen) {
                      setImportError('')
                      setImportSuccess('')
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 0',
                    border: 'none',
                    background: 'none',
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: THEME.font,
                    color: THEME.colors.leader.primary,
                    cursor: 'pointer',
                  }}
                >
                  <span aria-hidden style={{ fontSize: 12 }}>{bulkOpen ? '▼' : '▶'}</span>
                  Bulk import from CSV or Excel
                  <span style={{ fontWeight: 400, color: THEME.colors.textMuted }}> — optional</span>
                </button>
              </div>

              {bulkOpen && (
                <Card padding={22}>
                  <TeamRosterField
                    inputId="dashboard-roster-file"
                    employees={rosterEmployees}
                    onEmployeesChange={(rows) => {
                      setImportError('')
                      setImportSuccess('')
                      setRosterEmployees(rows)
                    }}
                    fileName={rosterFileName}
                    onFileNameChange={(name) => {
                      setImportError('')
                      setImportSuccess('')
                      setRosterFileName(name)
                    }}
                    externalError={importError}
                    sectionLabel="Bulk import"
                    description="Upload a spreadsheet when you need to add many people at once. Existing emails are skipped."
                  />
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Button
                      type="button"
                      loading={importLoading}
                      disabled={rosterEmployees.length === 0 || importLoading}
                      onClick={handleImportTeam}
                    >
                      Import from file
                    </Button>
                    {importSuccess && (
                      <p style={{ fontSize: 13, color: THEME.colors.success, margin: 0 }}>{importSuccess}</p>
                    )}
                  </div>
                </Card>
              )}
      </Modal>

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: THEME.colors.text, margin: 0 }}>
                  Your initiatives
                </h1>
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
