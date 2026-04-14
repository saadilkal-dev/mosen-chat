'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../components/providers/AuthProvider'
import { THEME } from '../../lib/theme'

const T = THEME.colors

function MosenLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: T.employee.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" fill={T.employee.primary} />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={T.employee.primary} strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="8" r="2" fill={T.employee.avatarBg} />
        </svg>
      </div>
      <span style={{ fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: '-0.02em' }}>Mosen</span>
    </div>
  )
}

function StatusBadge({ status }) {
  const isActive = status === 'active'
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: THEME.radius.pill,
      background: isActive ? T.employee.light : T.bg,
      color: isActive ? T.employee.primary : T.textMuted,
      border: `1px solid ${isActive ? T.employee.border : T.border}`,
      textTransform: 'capitalize',
    }}>
      {status || 'active'}
    </span>
  )
}

function InitiativeCard({ initiative, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: THEME.radius.lg,
        padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, transition: 'box-shadow 0.15s, border-color 0.15s',
        boxShadow: hovered ? THEME.shadow.md : THEME.shadow.sm,
        borderColor: hovered ? T.employee.border : T.border,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <StatusBadge status={initiative.status} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: T.text, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {initiative.title}
        </div>
      </div>
      <button
        onClick={() => onClick(initiative)}
        style={{
          flexShrink: 0, padding: '9px 18px', borderRadius: THEME.radius.md,
          border: 'none', background: T.employee.primary, color: '#fff',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: THEME.font, letterSpacing: '-0.01em',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
      >
        Open Chat →
      </button>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2].map(i => (
        <div key={i} style={{
          height: 80, borderRadius: THEME.radius.lg, background: T.border,
          animation: 'shimmer 1.4s ease-in-out infinite',
        }} />
      ))}
    </div>
  )
}

export default function EmpPage() {
  const router = useRouter()
  const { user, loading: authLoading, logout } = useAuth()
  const [initiatives, setInitiatives] = useState([])
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState(null)

  // Auth guard — redirect to sign-in with return path
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/sign-in?redirect_url=/emp')
    }
  }, [authLoading, user, router])

  // Load initiatives
  useEffect(() => {
    if (!user) return
    setFetching(true)
    fetch('/api/emp/initiatives', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setInitiatives(Array.isArray(d.initiatives) ? d.initiatives : [])
      })
      .catch(e => setError(e.message))
      .finally(() => setFetching(false))
  }, [user])

  function openChat(initiative) {
    router.push(initiative.chatUrl)
  }

  if (authLoading || !user) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: THEME.font, color: T.textMuted, fontSize: 14 }}>
        Loading…
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: THEME.font }}>
      {/* Top bar */}
      <div style={{ borderBottom: `1px solid ${T.border}`, background: T.surface, padding: '0 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <MosenLogo />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 13, color: T.textMuted }}>{user.name || user.email}</span>
            <button
              onClick={logout}
              style={{ fontSize: 13, color: T.textMuted, background: 'none', border: `1px solid ${T.border}`, borderRadius: THEME.radius.sm, padding: '5px 12px', cursor: 'pointer', fontFamily: THEME.font }}
              onMouseEnter={e => { e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = '#bbb' }}
              onMouseLeave={e => { e.currentTarget.style.color = T.textMuted; e.currentTarget.style.borderColor = T.border }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text, letterSpacing: '-0.02em', margin: 0 }}>
            Your Initiatives
          </h1>
          <p style={{ fontSize: 14, color: T.textMuted, marginTop: 6, lineHeight: 1.5 }}>
            Changes happening at your organisation that Mosen is supporting you through.
          </p>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: THEME.radius.md, background: T.errorBg, color: T.error, fontSize: 13, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {fetching && <Skeleton />}

        {!fetching && initiatives.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {initiatives.map(initiative => (
              <InitiativeCard key={initiative.id} initiative={initiative} onClick={openChat} />
            ))}
          </div>
        )}

        {!fetching && initiatives.length === 0 && !error && (
          <div style={{
            textAlign: 'center', padding: '60px 24px', border: `1.5px dashed ${T.border}`,
            borderRadius: THEME.radius.xl, background: T.surface,
          }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: T.employee.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" fill={T.employee.primary} />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={T.employee.primary} strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="8" r="2" fill={T.employee.avatarBg} />
              </svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: '0 0 8px' }}>
              No initiatives yet
            </p>
            <p style={{ fontSize: 14, color: T.textMuted, lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
              When your leader launches a change initiative, you'll see it here. Check your email for an invite link.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { opacity: 1 } 50% { opacity: 0.4 } 100% { opacity: 1 }
        }
      `}</style>
    </div>
  )
}
