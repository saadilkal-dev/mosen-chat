'use client'
import { THEME } from '../../lib/theme'

export default function Badge({ children, color = THEME.colors.leader.primary, variant = 'solid' }) {
  const isSolid = variant === 'solid'

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 10px',
      fontSize: 11,
      fontWeight: 600,
      fontFamily: THEME.font,
      borderRadius: THEME.radius.pill,
      background: isSolid ? `${color}18` : 'transparent',
      color: color,
      border: isSolid ? 'none' : `1px solid ${color}40`,
      letterSpacing: '0.02em',
      textTransform: 'capitalize',
    }}>
      {children}
    </span>
  )
}
