'use client'
import { THEME } from '../../lib/theme'

export default function Card({
  children,
  padding = 16,
  hover = false,
  onClick,
  style: extraStyle = {},
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: THEME.colors.surface,
        border: `1px solid ${THEME.colors.border}`,
        borderRadius: THEME.radius.lg,
        padding,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        ...extraStyle,
      }}
      onMouseEnter={e => {
        if (hover || onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = THEME.shadow.md
        }
      }}
      onMouseLeave={e => {
        if (hover || onClick) {
          e.currentTarget.style.transform = ''
          e.currentTarget.style.boxShadow = ''
        }
      }}
    >
      {children}
    </div>
  )
}
