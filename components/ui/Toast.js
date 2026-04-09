'use client'
import { useEffect } from 'react'
import { THEME } from '../../lib/theme'

const typeStyles = {
  success: { bg: THEME.colors.successBg, color: THEME.colors.success, border: THEME.colors.success },
  error: { bg: THEME.colors.errorBg, color: THEME.colors.error, border: THEME.colors.error },
  info: { bg: THEME.colors.leader.light, color: THEME.colors.leader.primary, border: THEME.colors.leader.primary },
}

export default function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const s = typeStyles[type] || typeStyles.info

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}30`,
      borderRadius: THEME.radius.md,
      padding: '12px 20px',
      fontSize: 13,
      fontFamily: THEME.font,
      fontWeight: 500,
      boxShadow: THEME.shadow.md,
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      animation: 'slideUp 0.2s ease',
    }}>
      {message}
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: s.color,
          cursor: 'pointer',
          fontSize: 16,
          padding: 0,
          lineHeight: 1,
          opacity: 0.6,
        }}
      >
        x
      </button>
    </div>
  )
}
