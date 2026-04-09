'use client'

const T = {
  green:       '#1D9E75',
  greenLight:  '#F0FAF6',
  greenDark:   '#0A4D3A',
  greenBorder: '#C5EBE0',
  text:        '#1A1A18',
  textSub:     '#444442',
  textMuted:   '#999997',
}

export default function BriefDisplay({ brief, initiativeTitle }) {
  // ── No brief yet ──────────────────────────────────────────────────────────
  if (!brief) {
    return (
      <div style={{
        background: '#F9F9F7',
        border: '1px dashed #DEDED6',
        borderRadius: 14,
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        {/* Document icon — muted */}
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
          <rect x="3" y="1.5" width="11" height="15" rx="2" stroke="#C8C8C0" strokeWidth="1.5" />
          <path d="M6 6.5h8M6 9.5h8M6 12.5h5" stroke="#C8C8C0" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#B0B0A8', margin: '0 0 2px' }}>
            Brief not ready yet
          </p>
          <p style={{ fontSize: 12.5, color: '#C8C8C0', margin: 0, lineHeight: 1.5 }}>
            The initiative brief is being prepared by the team leading this change.
          </p>
        </div>
      </div>
    )
  }

  // ── Brief available ───────────────────────────────────────────────────────
  const text = typeof brief.content === 'string' ? brief.content : (brief.content?.body || '')
  const paragraphs = text
    .split('\n')
    .map(p => p.trim())
    .filter(Boolean)

  return (
    <div style={{
      background: '#FFFFFF',
      border: `1px solid ${T.greenBorder}`,
      borderTop: `3px solid ${T.green}`,
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      {/* Card header bar */}
      <div style={{
        padding: '14px 20px 12px',
        borderBottom: `1px solid ${T.greenBorder}`,
        background: T.greenLight,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="3" y="1.5" width="11" height="15" rx="2" stroke={T.green} strokeWidth="1.5" />
          <path d="M6 6.5h8M6 9.5h8M6 12.5h5" stroke={T.green} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.green, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Initiative Brief
        </span>
      </div>

      {/* Card body */}
      <div style={{ padding: '18px 20px 20px' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: '0 0 14px', letterSpacing: '-0.2px', lineHeight: 1.35 }}>
          {initiativeTitle}
        </h2>
        {paragraphs.map((p, i) => (
          <p key={i} style={{
            fontSize: 13.5,
            color: T.textSub,
            lineHeight: 1.72,
            margin: i < paragraphs.length - 1 ? '0 0 10px' : 0,
          }}>
            {p}
          </p>
        ))}
      </div>
    </div>
  )
}
