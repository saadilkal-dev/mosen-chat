'use client'
import { THEME } from '../../lib/theme'

export default function Avatar({ type = 'mosen', persona = 'leader', size = 32 }) {
  const colors = persona === 'leader' ? THEME.colors.leader : THEME.colors.employee

  if (type === 'mosen') {
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: colors.avatarBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" fill={colors.primary} />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="8" r="2" fill={colors.avatarBg} />
        </svg>
      </div>
    )
  }

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: '#F0F0EC',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" fill="#999" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#999" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  )
}
