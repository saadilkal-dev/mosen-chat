'use client'

export default function ClosedLoopCard({ message, changeDescription, createdAt }) {
  // Hard rule: never render if changeDescription is empty or hollow
  if (!changeDescription || changeDescription.trim().length === 0) return null

  const date = createdAt
    ? new Date(createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div
      role="article"
      aria-label="Closed loop: something changed because of your feedback"
      style={{
        background: '#FFFCF2',
        border: '1px solid #EDD48A',
        borderLeft: '3px solid #C89A20',
        borderRadius: 16,
        padding: '20px',
        maxWidth: 460,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
        {/* Star icon */}
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FFF3CC', border: '1px solid #EDD48A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M10 2L12.09 7.26L18 8.27L14 12.14L14.99 18L10 15.27L5 18L5.99 12.14L2 8.27L7.91 7.26L10 2Z"
              fill="#C89A20"
              fillOpacity="0.25"
              stroke="#C89A20"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#5C3D00', margin: '0 0 2px', lineHeight: 1.35, letterSpacing: '-0.15px' }}>
            Something changed because of what you shared
          </p>
          {date && (
            <p style={{ fontSize: 12, color: '#C0A040', margin: 0 }}>{date}</p>
          )}
        </div>
      </div>

      {/* What changed */}
      <div style={{
        background: '#FFF3CC',
        border: '1px solid #EDD48A',
        borderRadius: 10,
        padding: '13px 15px',
        marginBottom: message ? 14 : 0,
      }}>
        <p style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#8B6800',
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          margin: '0 0 7px',
        }}>
          What changed
        </p>
        <p style={{ fontSize: 14, color: '#1A1A18', lineHeight: 1.68, margin: 0, letterSpacing: '-0.01em' }}>
          {changeDescription}
        </p>
      </div>

      {/* Mosen's message */}
      {message && (
        <p style={{
          fontSize: 13.5,
          color: '#5C3D00',
          lineHeight: 1.7,
          margin: 0,
          letterSpacing: '-0.01em',
        }}>
          {message}
        </p>
      )}
    </div>
  )
}
