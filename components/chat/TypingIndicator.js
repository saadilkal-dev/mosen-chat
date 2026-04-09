'use client'
import { THEME } from '../../lib/theme'

export default function TypingIndicator({ persona = 'leader' }) {
  const color = persona === 'leader' ? THEME.colors.leader.primary : THEME.colors.employee.primary

  return (
    <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: color,
            animation: `blink 1.4s infinite ${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  )
}
