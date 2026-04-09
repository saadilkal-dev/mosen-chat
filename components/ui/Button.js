'use client'
import { THEME } from '../../lib/theme'
import Spinner from './Spinner'

const variants = {
  primary: {
    background: THEME.colors.leader.primary,
    color: '#FFFFFF',
    border: 'none',
  },
  secondary: {
    background: THEME.colors.surface,
    color: THEME.colors.text,
    border: `1px solid ${THEME.colors.border}`,
  },
  ghost: {
    background: 'transparent',
    color: THEME.colors.textMuted,
    border: 'none',
  },
  danger: {
    background: THEME.colors.error,
    color: '#FFFFFF',
    border: 'none',
  },
}

const sizes = {
  sm: { padding: '6px 12px', fontSize: 12, height: 30 },
  md: { padding: '8px 18px', fontSize: 13, height: 36 },
  lg: { padding: '12px 24px', fontSize: 14, height: 44 },
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  fullWidth = false,
  loading = false,
  style: extraStyle = {},
  accentColor,
  type = 'button',
}) {
  const v = variants[variant] || variants.primary
  const s = sizes[size] || sizes.md

  const bg = accentColor && variant === 'primary' ? accentColor : v.background

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      style={{
        ...s,
        ...v,
        background: bg,
        fontFamily: THEME.font,
        fontWeight: 500,
        borderRadius: THEME.radius.md,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        width: fullWidth ? '100%' : 'auto',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'all 0.15s ease',
        ...extraStyle,
      }}
    >
      {loading ? <Spinner size={14} color={variant === 'primary' ? '#fff' : THEME.colors.textMuted} /> : children}
    </button>
  )
}
