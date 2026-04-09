'use client'
import { THEME } from '../../lib/theme'

export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
  style: extraStyle = {},
  autoFocus = false,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 500, color: THEME.colors.textMuted, fontFamily: THEME.font }}>
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        style={{
          padding: '10px 14px',
          fontSize: 14,
          fontFamily: THEME.font,
          background: '#F5F5F2',
          border: `1px solid ${error ? THEME.colors.error : '#E8E8E4'}`,
          borderRadius: THEME.radius.md,
          outline: 'none',
          color: THEME.colors.text,
          transition: 'border-color 0.15s ease',
          opacity: disabled ? 0.6 : 1,
          ...extraStyle,
        }}
        onFocus={e => {
          if (!error) e.target.style.borderColor = THEME.colors.leader.primary
        }}
        onBlur={e => {
          if (!error) e.target.style.borderColor = '#E8E8E4'
        }}
      />
      {error && (
        <span style={{ fontSize: 12, color: THEME.colors.error, fontFamily: THEME.font }}>{error}</span>
      )}
    </div>
  )
}
