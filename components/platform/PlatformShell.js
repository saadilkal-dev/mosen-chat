'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { THEME } from '@/lib/theme'

const P = THEME.colors.platform

const nav = [
  { href: '/platform', label: 'Organisations' },
  { href: '/platform/onboard', label: 'Onboard client' },
]

export default function PlatformShell({ children, onSignOut, showLeaderDashboard }) {
  const pathname = usePathname()
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: THEME.colors.bg,
        fontFamily: THEME.font,
      }}
    >
      <header
        style={{
          background: P.headerBg,
          color: P.headerText,
          borderBottom: `1px solid ${P.border}`,
          padding: '0 20px',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            minHeight: 56,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Mosen · Platform
            </span>
            <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {nav.map((item) => {
                const active =
                  item.href === '/platform'
                    ? pathname === '/platform'
                    : pathname === item.href || pathname?.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      padding: '8px 14px',
                      borderRadius: THEME.radius.sm,
                      fontSize: 14,
                      fontWeight: 600,
                      textDecoration: 'none',
                      color: active ? P.headerText : P.headerMuted,
                      background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                    }}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {showLeaderDashboard ? (
              <Link href="/dashboard" style={{ fontSize: 13, color: P.headerMuted, textDecoration: 'none' }}>
                Leader dashboard
              </Link>
            ) : null}
            {typeof onSignOut === 'function' && (
              <button
                type="button"
                onClick={onSignOut}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontFamily: THEME.font,
                  fontWeight: 600,
                  color: P.headerMuted,
                  background: 'transparent',
                  border: `1px solid ${P.border}`,
                  borderRadius: THEME.radius.sm,
                  cursor: 'pointer',
                }}
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  )
}
