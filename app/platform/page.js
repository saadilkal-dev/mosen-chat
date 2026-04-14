'use client'

import { useCallback, useEffect, useState } from 'react'
import { THEME } from '@/lib/theme'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'

const P = THEME.colors.platform

function shortId(id) {
  if (!id || id.length <= 12) return id
  return `${id.slice(0, 8)}…`
}

export default function PlatformHomePage() {
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editOrg, setEditOrg] = useState(null)
  const [editName, setEditName] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const [rosterOrg, setRosterOrg] = useState(null)
  const [rosterRows, setRosterRows] = useState([])
  const [rosterLoading, setRosterLoading] = useState(false)
  const [rosterError, setRosterError] = useState('')
  const [rowSaving, setRowSaving] = useState(null)
  const [drafts, setDrafts] = useState({})

  const loadOrgs = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/platform/orgs', { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Could not load organisations')
      }
      setOrgs(Array.isArray(data.orgs) ? data.orgs : [])
    } catch (e) {
      setError(e.message || 'Failed to load')
      setOrgs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrgs()
  }, [loadOrgs])

  const openEdit = (o) => {
    setEditOrg(o)
    setEditName(o.name || '')
  }

  const saveEdit = async () => {
    if (!editOrg) return
    const name = editName.trim()
    if (!name) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/platform/orgs/${encodeURIComponent(editOrg.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Could not save')
      }
      setEditOrg(null)
      await loadOrgs()
    } catch (e) {
      setError(e.message || 'Save failed')
    } finally {
      setEditSaving(false)
    }
  }

  const openRoster = async (o) => {
    setRosterOrg({ id: o.id, name: o.name })
    setRosterRows([])
    setRosterError('')
    setDrafts({})
    setRosterLoading(true)
    try {
      const res = await fetch(`/api/platform/orgs/${encodeURIComponent(o.id)}/employees`, {
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Could not load roster')
      }
      const list = Array.isArray(data.employees) ? data.employees : []
      setRosterRows(list)
      const d = {}
      for (const r of list) {
        d[r.email] = {
          name: r.name || '',
          department: r.department || '',
          role: r.role || '',
        }
      }
      setDrafts(d)
    } catch (e) {
      setRosterError(e.message || 'Load failed')
    } finally {
      setRosterLoading(false)
    }
  }

  const saveRow = async (email) => {
    if (!rosterOrg) return
    const d = drafts[email]
    if (!d) return
    setRowSaving(email)
    setRosterError('')
    try {
      const res = await fetch(`/api/platform/orgs/${encodeURIComponent(rosterOrg.id)}/employees`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          name: d.name,
          department: d.department,
          role: d.role,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Could not save')
      }
      if (data.employee) {
        setRosterRows((prev) => prev.map((r) => (r.email === email ? { ...r, ...data.employee } : r)))
      }
    } catch (e) {
      setRosterError(e.message || 'Save failed')
    } finally {
      setRowSaving(null)
    }
  }

  return (
    <div style={{ padding: '28px 20px 48px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: THEME.colors.text, margin: '0 0 8px' }}>
            Organisations
          </h1>
          <p style={{ fontSize: 14, color: THEME.colors.textMuted, margin: 0, lineHeight: 1.55, maxWidth: 640 }}>
            Every client workspace you pre-provision appears here. Rename an organisation or open its roster to correct
            names and departments. Use <strong style={{ color: THEME.colors.text }}>Onboard client</strong> in the top
            bar to provision a new org and send Clerk invites.
          </p>
        </div>

        {error && (
          <p style={{ color: THEME.colors.error, fontSize: 14, marginBottom: 16 }}>{error}</p>
        )}

        <Card padding={0} style={{ overflow: 'hidden' }}>
          {loading ? (
            <p style={{ padding: 28, color: THEME.colors.textMuted, margin: 0 }}>Loading organisations…</p>
          ) : orgs.length === 0 ? (
            <p style={{ padding: 28, color: THEME.colors.textMuted, margin: 0, lineHeight: 1.55 }}>
              No organisations yet. Use <strong>Onboard client</strong> to create one.
            </p>
          ) : (
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: P.accentSoft, textAlign: 'left' }}>
                    <th style={{ padding: 12, fontWeight: 700, color: THEME.colors.text }}>Organisation</th>
                    <th style={{ padding: 12, fontWeight: 700, color: THEME.colors.text }}>ID</th>
                    <th style={{ padding: 12, fontWeight: 700, color: THEME.colors.text }}>Leader email</th>
                    <th style={{ padding: 12, fontWeight: 700, color: THEME.colors.text }}>Provision</th>
                    <th style={{ padding: 12, fontWeight: 700, color: THEME.colors.text }}>Team</th>
                    <th style={{ padding: 12, fontWeight: 700, color: THEME.colors.text }}>Initiatives</th>
                    <th style={{ padding: 12, fontWeight: 700, color: THEME.colors.text }}>Signed-in profiles</th>
                    <th style={{ padding: 12, fontWeight: 700, color: THEME.colors.text, textAlign: 'right' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map((o) => (
                    <tr key={o.id} style={{ borderTop: `1px solid ${THEME.colors.border}` }}>
                      <td style={{ padding: 12, fontWeight: 600, color: THEME.colors.text }}>{o.name}</td>
                      <td style={{ padding: 12, color: THEME.colors.textMuted, fontFamily: THEME.fontMono, fontSize: 12 }}>
                        {shortId(o.id)}
                      </td>
                      <td style={{ padding: 12, color: THEME.colors.text }}>{o.leaderEmail || '—'}</td>
                      <td style={{ padding: 12, color: THEME.colors.textMuted }}>
                        {o.provisionClaimedAt ? 'Claimed' : 'Pending'}
                      </td>
                      <td style={{ padding: 12 }}>{o.employeeCount}</td>
                      <td style={{ padding: 12 }}>{o.initiativeCount}</td>
                      <td style={{ padding: 12, color: THEME.colors.textMuted }}>
                        {(o.appUsers || []).length}
                      </td>
                      <td style={{ padding: 10, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => openEdit(o)}
                          style={{
                            marginRight: 8,
                            padding: '6px 10px',
                            fontSize: 12,
                            fontWeight: 600,
                            fontFamily: THEME.font,
                            color: P.accent,
                            background: P.accentSoft,
                            border: 'none',
                            borderRadius: THEME.radius.sm,
                            cursor: 'pointer',
                          }}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => openRoster(o)}
                          style={{
                            padding: '6px 10px',
                            fontSize: 12,
                            fontWeight: 600,
                            fontFamily: THEME.font,
                            color: THEME.colors.text,
                            background: THEME.colors.surface,
                            border: `1px solid ${THEME.colors.border}`,
                            borderRadius: THEME.radius.sm,
                            cursor: 'pointer',
                          }}
                        >
                          Roster
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Modal isOpen={!!editOrg} onClose={() => setEditOrg(null)} title="Rename organisation" maxWidth={440}>
        {editOrg && (
          <div>
            <p style={{ fontSize: 13, color: THEME.colors.textMuted, margin: '0 0 16px', lineHeight: 1.5 }}>
              Org ID: <code style={{ fontSize: 12 }}>{editOrg.id}</code>
            </p>
            <Input label="Organisation name" value={editName} onChange={setEditName} placeholder="Acme Corp" />
            <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button type="button" variant="secondary" onClick={() => setEditOrg(null)}>
                Cancel
              </Button>
              <Button type="button" loading={editSaving} onClick={saveEdit} accentColor={P.accent}>
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!rosterOrg}
        onClose={() => setRosterOrg(null)}
        title={rosterOrg ? `Roster — ${rosterOrg.name}` : 'Roster'}
        maxWidth={900}
      >
        {rosterError && (
          <p style={{ color: THEME.colors.error, fontSize: 13, margin: '0 0 12px' }}>{rosterError}</p>
        )}
        {rosterLoading ? (
          <p style={{ color: THEME.colors.textMuted, margin: 0 }}>Loading roster…</p>
        ) : rosterRows.length === 0 ? (
          <p style={{ color: THEME.colors.textMuted, margin: 0, lineHeight: 1.55 }}>
            No people on this roster yet.
          </p>
        ) : (
          <div style={{ overflow: 'auto', maxHeight: 420 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: THEME.colors.bg, textAlign: 'left' }}>
                  <th style={{ padding: 8, fontWeight: 600 }}>Email</th>
                  <th style={{ padding: 8, fontWeight: 600 }}>Name</th>
                  <th style={{ padding: 8, fontWeight: 600 }}>Department</th>
                  <th style={{ padding: 8, fontWeight: 600 }}>Role</th>
                  <th style={{ padding: 8, fontWeight: 600, textAlign: 'right', width: 100 }}>Save</th>
                </tr>
              </thead>
              <tbody>
                {rosterRows.map((r) => (
                  <tr key={r.email} style={{ borderTop: `1px solid ${THEME.colors.border}`, verticalAlign: 'top' }}>
                    <td style={{ padding: 8, color: THEME.colors.textMuted }}>{r.email}</td>
                    <td style={{ padding: 6 }}>
                      <input
                        value={drafts[r.email]?.name ?? ''}
                        onChange={(e) =>
                          setDrafts((d) => ({
                            ...d,
                            [r.email]: { ...d[r.email], name: e.target.value },
                          }))
                        }
                        style={{
                          width: '100%',
                          minWidth: 120,
                          padding: '6px 8px',
                          fontSize: 13,
                          fontFamily: THEME.font,
                          border: `1px solid ${THEME.colors.border}`,
                          borderRadius: THEME.radius.sm,
                        }}
                      />
                    </td>
                    <td style={{ padding: 6 }}>
                      <input
                        value={drafts[r.email]?.department ?? ''}
                        onChange={(e) =>
                          setDrafts((d) => ({
                            ...d,
                            [r.email]: { ...d[r.email], department: e.target.value },
                          }))
                        }
                        style={{
                          width: '100%',
                          minWidth: 100,
                          padding: '6px 8px',
                          fontSize: 13,
                          fontFamily: THEME.font,
                          border: `1px solid ${THEME.colors.border}`,
                          borderRadius: THEME.radius.sm,
                        }}
                      />
                    </td>
                    <td style={{ padding: 6 }}>
                      <input
                        value={drafts[r.email]?.role ?? ''}
                        onChange={(e) =>
                          setDrafts((d) => ({
                            ...d,
                            [r.email]: { ...d[r.email], role: e.target.value },
                          }))
                        }
                        style={{
                          width: '100%',
                          minWidth: 100,
                          padding: '6px 8px',
                          fontSize: 13,
                          fontFamily: THEME.font,
                          border: `1px solid ${THEME.colors.border}`,
                          borderRadius: THEME.radius.sm,
                        }}
                      />
                    </td>
                    <td style={{ padding: 8, textAlign: 'right' }}>
                      <Button
                        type="button"
                        size="sm"
                        loading={rowSaving === r.email}
                        onClick={() => saveRow(r.email)}
                        accentColor={P.accent}
                      >
                        Save
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  )
}
