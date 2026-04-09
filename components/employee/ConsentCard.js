'use client'

const T = {
  green:       '#1D9E75',
  greenLight:  '#F0FAF6',
  greenDark:   '#0A4D3A',
  greenBorder: '#C5EBE0',
  text:        '#1A1A18',
  textSub:     '#555553',
  textMuted:   '#888886',
}

export default function ConsentCard({ consentId, theme, proposedText, status, onDecision }) {

  // ── Granted ───────────────────────────────────────────────────────────────
  if (status === 'granted') {
    return (
      <div role="status" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: T.greenLight,
        border: `1px solid ${T.greenBorder}`,
        borderRadius: 12,
        padding: '12px 16px',
      }}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
          <circle cx="10" cy="10" r="9.5" fill={T.green} />
          <path d="M6.5 10L8.5 12L13.5 7.5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p style={{ fontSize: 13.5, color: T.greenDark, margin: 0, lineHeight: 1.45 }}>
          You allowed this to be shared anonymously.
        </p>
      </div>
    )
  }

  // ── Denied ────────────────────────────────────────────────────────────────
  if (status === 'denied') {
    return (
      <p style={{ fontSize: 13, color: '#B0B0A8', margin: 0, fontStyle: 'italic', paddingLeft: 2 }}>
        You declined. This will not be shared.
      </p>
    )
  }

  // ── Pending ───────────────────────────────────────────────────────────────
  return (
    <div
      role="dialog"
      aria-label="Consent request from Mosen"
      style={{
        background: '#FFFFFF',
        border: `1.5px solid ${T.greenBorder}`,
        borderRadius: 16,
        padding: '20px 20px 18px',
        boxShadow: '0 4px 24px rgba(29,158,117,0.1), 0 1px 4px rgba(0,0,0,0.06)',
        maxWidth: 460,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: T.greenLight, border: `1px solid ${T.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 1.5L3 4.5V9C3 13.1 6 16.9 10 18C14 16.9 17 13.1 17 9V4.5L10 1.5Z" fill={T.greenLight} stroke={T.green} strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 13.5, fontWeight: 700, color: T.text, margin: '0 0 2px', lineHeight: 1.35 }}>
            Mosen would like to share something anonymously
          </p>
          <p style={{ fontSize: 12.5, color: T.textMuted, margin: 0 }}>
            Here's the exact wording that would be shared:
          </p>
        </div>
      </div>

      {/* Proposed text — exact wording */}
      <div style={{
        borderLeft: `3px solid ${T.green}`,
        background: T.greenLight,
        borderRadius: '0 10px 10px 0',
        padding: '13px 15px 13px 16px',
        marginBottom: 16,
      }}>
        <p style={{
          fontSize: 14,
          color: T.greenDark,
          lineHeight: 1.7,
          margin: 0,
          fontStyle: 'italic',
          letterSpacing: '-0.01em',
        }}>
          &ldquo;{proposedText}&rdquo;
        </p>
      </div>

      {/* Threshold notice */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        background: '#FAFAF8',
        border: '1px solid #EBEBEA',
        borderRadius: 9,
        padding: '10px 12px',
        marginBottom: 18,
      }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="8" cy="8" r="7" stroke="#AAAAAA" strokeWidth="1.5" />
          <path d="M8 7v4" stroke="#AAAAAA" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="5.5" r="0.75" fill="#AAAAAA" />
        </svg>
        <p style={{ fontSize: 12.5, color: T.textMuted, margin: 0, lineHeight: 1.55 }}>
          This will only surface as a pattern once{' '}
          <strong style={{ color: T.textSub, fontWeight: 600 }}>at least 3 people</strong>{' '}
          share similar feedback. No individual attribution. Silence means no — you must actively allow this.
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => onDecision(consentId, 'granted')}
          aria-label="Allow this to be shared anonymously"
          style={{
            height: 44,
            flex: 1,
            background: T.green,
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 11,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background 0.15s ease, transform 0.1s ease',
            letterSpacing: '-0.01em',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#189060' }}
          onMouseLeave={e => { e.currentTarget.style.background = T.green }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
          onMouseUp={e => { e.currentTarget.style.transform = '' }}
        >
          Allow
        </button>
        <button
          onClick={() => onDecision(consentId, 'denied')}
          aria-label="Decline — this will not be shared"
          style={{
            height: 44,
            flex: 1,
            background: 'transparent',
            color: T.textMuted,
            border: '1.5px solid #DEDED6',
            borderRadius: 11,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'border-color 0.15s ease, color 0.15s ease, background 0.15s ease',
            letterSpacing: '-0.01em',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#B8B8B0'; e.currentTarget.style.color = '#444'; e.currentTarget.style.background = '#F5F5F2' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#DEDED6'; e.currentTarget.style.color = T.textMuted; e.currentTarget.style.background = 'transparent' }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
          onMouseUp={e => { e.currentTarget.style.transform = '' }}
        >
          Decline
        </button>
      </div>
    </div>
  )
}
