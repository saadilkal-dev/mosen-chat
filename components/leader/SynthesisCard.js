'use client'

const PILLAR_CONFIG = {
  Inclusion:     { color: '#3B82F6', bg: '#EFF6FF' },
  Empathy:       { color: '#1D9E75', bg: '#E6F7F0' },
  Vulnerability: { color: '#8B5CF6', bg: '#F3EFFB' },
  Trust:         { color: '#D4A843', bg: '#FFFBF0' },
  Empowerment:   { color: '#F97316', bg: '#FFF4ED' },
  Forgiveness:   { color: '#06B6D4', bg: '#ECFCFF' },
}

const SENTIMENT_CONFIG = {
  positive:  { color: '#1D9E75', bg: '#E6F7F0', label: 'Positive energy' },
  neutral:   { color: '#D4A843', bg: '#FFFBF0', label: 'Mixed signals' },
  concerned: { color: '#C0392B', bg: '#FFF3F0', label: 'Concern' },
  concern:   { color: '#C0392B', bg: '#FFF3F0', label: 'Concern' },
}

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ThemeNudge({ theme, index }) {
  const sentiment = theme.sentiment === 'concern' ? 'concern' : (theme.sentiment || 'neutral')
  const sentCfg = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.neutral
  const pillarCfg = PILLAR_CONFIG[theme.pillar] || { color: '#534AB7', bg: '#F6F5FF' }
  const count = theme.contributorCount || theme.count || 1

  // Build a human-readable signal line
  const voiceLabel = count === 1 ? 'Someone on your team' : `${count} people on your team`

  return (
    <div style={{
      padding: '20px 22px',
      borderRadius: 14,
      background: '#FFFFFF',
      border: '1px solid #EBEBEA',
      borderLeft: `4px solid ${sentCfg.color}`,
      marginBottom: 14,
    }}>
      {/* Signal headline */}
      <div style={{
        fontSize: 15,
        fontWeight: 600,
        color: '#1A1A18',
        lineHeight: 1.4,
        marginBottom: 10,
      }}>
        {voiceLabel} flagged: <span style={{ color: sentCfg.color }}>{theme.name}</span>
      </div>

      {/* The signal itself */}
      {theme.description && (
        <div style={{
          fontSize: 14,
          color: '#555',
          lineHeight: 1.75,
          marginBottom: 14,
          fontStyle: 'italic',
        }}>
          "{theme.description.length > 280
            ? theme.description.slice(0, 280).trimEnd() + '…'
            : theme.description}"
        </div>
      )}

      {/* Tags row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* Sentiment */}
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          padding: '3px 11px',
          borderRadius: 20,
          background: sentCfg.bg,
          color: sentCfg.color,
          border: `1px solid ${sentCfg.color}30`,
          letterSpacing: '0.02em',
        }}>
          {sentCfg.label}
        </span>

        {/* Pillar */}
        {theme.pillar && (
          <span style={{
            fontSize: 11,
            fontWeight: 500,
            padding: '3px 11px',
            borderRadius: 20,
            background: pillarCfg.bg,
            color: pillarCfg.color,
            border: `1px solid ${pillarCfg.color}30`,
          }}>
            {theme.pillar}
          </span>
        )}

        {/* Voice count */}
        {count > 0 && (
          <span style={{ fontSize: 11, color: '#AAA', marginLeft: 'auto' }}>
            {count} voice{count !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}

export default function SynthesisCard({ synthesis }) {
  if (!synthesis) return null

  const themes = synthesis.themes || []
  const createdAt = synthesis.createdAt

  // Build a short context line based on contributor count + response rate
  const totalContributors = synthesis.totalContributors || themes.reduce((s, t) => s + (t.contributorCount || t.count || 0), 0)
  const responseRate = synthesis.responseRate || 0

  return (
    <div style={{
      padding: '0 2px',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>

      {/* Header strip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Pulse indicator */}
          <span style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#1D9E75',
            boxShadow: '0 0 0 3px #E6F7F0',
          }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A18' }}>
            What your team is feeling
          </span>
        </div>
        {createdAt && (
          <span style={{ fontSize: 11, color: '#C0C0BA' }}>
            {timeAgo(createdAt)}
          </span>
        )}
      </div>

      {/* Context line */}
      {(totalContributors > 0 || responseRate > 0) && (
        <p style={{
          fontSize: 13,
          color: '#888',
          lineHeight: 1.6,
          margin: '0 0 18px',
        }}>
          {totalContributors > 0
            ? `${totalContributors} ${totalContributors === 1 ? 'person has' : 'people have'} shared something with Mosen`
            : ''}
          {responseRate > 0 ? ` — ${Math.round(responseRate * 100)}% of your assigned team` : ''}.{' '}
          These are honest signals, not survey scores.
        </p>
      )}

      {/* Theme nudge cards */}
      {themes.length > 0 ? (
        themes.map((theme, i) => (
          <ThemeNudge key={theme.name || i} theme={theme} index={i} />
        ))
      ) : (
        <div style={{
          padding: '20px',
          borderRadius: 12,
          background: '#FAFAF8',
          border: '1px solid #EBEBEA',
          textAlign: 'center',
          color: '#999',
          fontSize: 13,
        }}>
          No themes surfaced yet.
        </div>
      )}

      {/* Recommended action (if present) */}
      {synthesis.recommendedAction && (
        <div style={{
          marginTop: 6,
          padding: '16px 18px',
          borderRadius: 12,
          background: 'linear-gradient(135deg, #F6F5FF 0%, #EAE8FC 100%)',
          borderLeft: '3px solid #534AB7',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#534AB7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              One thing to try
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#1A1A18', lineHeight: 1.7, margin: 0 }}>
            {synthesis.recommendedAction}
          </p>
        </div>
      )}

      {/* Footer note */}
      <p style={{
        fontSize: 11,
        color: '#C0C0BA',
        margin: '16px 0 0',
        lineHeight: 1.5,
        textAlign: 'center',
      }}>
        Signals are anonymized. No names, no identifiers — just what people are carrying.
      </p>
    </div>
  )
}
