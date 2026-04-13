'use client'

import { useMemo, useState } from 'react'
import { THEME } from '@/lib/theme'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import TeamRosterField from '@/components/org/TeamRosterField'

const json = { 'Content-Type': 'application/json' }
const L = THEME.colors.leader

function buildProvisionBody(orgName, leaderEmail, employees) {
  return {
    leaderEmail: leaderEmail.trim().toLowerCase(),
    orgName: orgName.trim(),
    employees: employees.map(({ name, email, department, role }) => ({
      name: name || '',
      email,
      department: department || '',
      role: role || '',
    })),
  }
}

/** Leader + roster emails, lowercased, de-duplicated, valid-looking emails only. */
function mergedInviteEmails(leaderEmail, employees) {
  const leader = leaderEmail.trim().toLowerCase()
  const set = new Set()
  if (leader.includes('@')) set.add(leader)
  for (const row of employees) {
    const e = String(row.email || '')
      .trim()
      .toLowerCase()
    if (e.includes('@')) set.add(e)
  }
  return [...set]
}

export default function PlatformOnboardPage() {
  const [orgName, setOrgName] = useState('')
  const [leaderEmail, setLeaderEmail] = useState('')
  const [employees, setEmployees] = useState([])
  const [rosterFileName, setRosterFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canInviteLeader = orgName.trim() && leaderEmail.trim()
  const canInviteEntireTeam = canInviteLeader && employees.length > 0

  const helpEntireTeam = useMemo(() => {
    if (!canInviteLeader) {
      return 'Enter organisation name and leader email first.'
    }
    if (employees.length === 0) {
      return 'Upload a roster so we can invite the leader and everyone on the list in one go (or use Invite leader only).'
    }
    return null
  }, [canInviteLeader, employees.length])

  async function inviteLeaderClerk() {
    setError('')
    if (!orgName.trim() || !leaderEmail.trim()) {
      setError('Organisation name and leader email are required.')
      return
    }
    setLoading(true)
    try {
      const body = buildProvisionBody(orgName, leaderEmail, employees)
      const prov = await fetch('/api/platform/provision-leader', {
        method: 'POST',
        headers: json,
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const provData = await prov.json().catch(() => ({}))
      if (!prov.ok) {
        throw new Error(provData.error || prov.statusText)
      }

      const inv = await fetch('/api/platform/invite-leader', {
        method: 'POST',
        headers: json,
        credentials: 'include',
        body: JSON.stringify({ leaderEmail: leaderEmail.trim().toLowerCase() }),
      })
      const invData = await inv.json().catch(() => ({}))
      if (!inv.ok) {
        throw new Error(invData.error || inv.statusText)
      }
    } catch (e) {
      setError(e.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  /**
   * One action: save org + roster, then Clerk-invite the leader and every roster email (deduped).
   * If provision already exists (409), still attempt bulk invites so a prior “leader only” run can be completed.
   */
  async function inviteEntireTeamClerk() {
    setError('')
    if (!orgName.trim() || !leaderEmail.trim()) {
      setError('Organisation name and leader email are required.')
      return
    }
    if (employees.length === 0) {
      setError('Upload a roster with at least one row, or use Invite leader (Clerk) to email only the leader.')
      return
    }

    const emails = mergedInviteEmails(leaderEmail, employees)
    if (emails.length === 0) {
      setError('No valid email addresses found.')
      return
    }

    setLoading(true)
    try {
      const body = buildProvisionBody(orgName, leaderEmail, employees)
      const prov = await fetch('/api/platform/provision-leader', {
        method: 'POST',
        headers: json,
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const provData = await prov.json().catch(() => ({}))
      if (!prov.ok && prov.status !== 409) {
        throw new Error(provData.error || prov.statusText)
      }

      const res = await fetch('/api/platform/invite-employees', {
        method: 'POST',
        headers: json,
        credentials: 'include',
        body: JSON.stringify({ emails }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || res.statusText)
      }
    } catch (e) {
      setError(e.message || 'Invite failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '28px 20px 48px', fontFamily: THEME.font }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <Card padding={24}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: THEME.colors.text }}>
            Client onboarding
          </h1>
          <p style={{ fontSize: 14, color: THEME.colors.textMuted, marginBottom: 24, lineHeight: 1.55 }}>
            Use <strong>Invite leader</strong> to save the workspace and email only the leader. Use{' '}
            <strong>Invite entire team</strong> to save and email the leader plus everyone on the roster in one step.
            Sign in with an email in <code style={{ fontSize: 12 }}>PLATFORM_ADMIN_EMAILS</code>.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: L.primary,
                  margin: '0 0 10px',
                }}
              >
                Organisation & leader
              </p>
              <Input label="Organisation name" value={orgName} onChange={setOrgName} placeholder="e.g. Acme Corp" />
              <div style={{ marginTop: 14 }}>
                <Input
                  label="Leader email"
                  value={leaderEmail}
                  onChange={setLeaderEmail}
                  placeholder="leader@company.com"
                />
              </div>
            </div>

            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: L.primary,
                  margin: '0 0 10px',
                }}
              >
                Team roster
              </p>
              <TeamRosterField
                inputId="platform-roster-file"
                employees={employees}
                onEmployeesChange={setEmployees}
                fileName={rosterFileName}
                onFileNameChange={setRosterFileName}
                sectionLabel="Upload"
                description="Required for Invite entire team. Same columns as leader self-serve onboarding. Data is saved when you run either button below."
              />
            </div>

            {error && <p style={{ color: THEME.colors.error, fontSize: 13, margin: 0 }}>{error}</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
              <Button
                type="button"
                fullWidth
                loading={loading}
                disabled={!canInviteLeader}
                accentColor={L.primary}
                onClick={inviteLeaderClerk}
              >
                Invite leader (Clerk)
              </Button>
              <p style={{ fontSize: 12, color: THEME.colors.textMuted, margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
                Saves the org (and roster if you uploaded one), then emails <strong>only the leader</strong> a Clerk
                invitation.
              </p>

              <Button
                type="button"
                fullWidth
                variant="secondary"
                loading={loading}
                disabled={!canInviteEntireTeam}
                onClick={inviteEntireTeamClerk}
              >
                Invite entire team (Clerk)
              </Button>
              <p style={{ fontSize: 12, color: THEME.colors.textMuted, margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
                Saves the org and roster, then sends one Clerk invitation to the <strong>leader plus every email on the roster</strong>{' '}
                (duplicates removed). No separate step required.
              </p>
              {helpEntireTeam && (
                <p style={{ fontSize: 12, color: THEME.colors.textMuted, margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
                  {helpEntireTeam}
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
