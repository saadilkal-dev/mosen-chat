'use client'
import { THEME } from '../../lib/theme'

export default function TopBar({ title, breadcrumbs = [], actions }) {
  return (
    <div style={{
      height: 52,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      borderBottom: `1px solid ${THEME.colors.border}`,
      background: THEME.colors.surface,
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {breadcrumbs.map((crumb, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <span style={{ color: THEME.colors.textLight, fontSize: 12 }}>/</span>}
            {crumb.href ? (
              <a
                href={crumb.href}
                style={{
                  fontSize: 13,
                  color: THEME.colors.textMuted,
                  textDecoration: 'none',
                  fontFamily: THEME.font,
                }}
              >
                {crumb.label}
              </a>
            ) : (
              <span style={{ fontSize: 13, color: THEME.colors.text, fontWeight: 500, fontFamily: THEME.font }}>
                {crumb.label}
              </span>
            )}
          </span>
        ))}
        {!breadcrumbs.length && title && (
          <span style={{ fontSize: 15, fontWeight: 600, color: THEME.colors.text, fontFamily: THEME.font }}>
            {title}
          </span>
        )}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{actions}</div>}
    </div>
  )
}
