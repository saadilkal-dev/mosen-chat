'use client'
import { useState } from 'react'

// Entry cards that replace the tab strip. Each card is a glance summary +
// click-to-open into the corresponding full-view panel.

const CARD_META = [
  {
    view: 'brief',
    label: 'Change Brief',
    description: 'Plain-language summary for the team',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M6 3h9l4 4v14H6V3Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M15 3v4h4" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 12h7M9 16h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    view: 'playbook',
    label: 'Playbook',
    description: 'Phased plan of experiments',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    view: 'outreach',
    label: 'Outreach',
    description: 'Messages for your team',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M3 6h18v12H3z" stroke="currentColor" strokeWidth="1.6" />
        <path d="m3 6 9 7 9-7" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    view: 'synthesis',
    label: 'Synthesis',
    description: 'Anonymised employee themes',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
]

function summariseStatus(view, data) {
  if (view === 'brief') {
    if (!data?.content) return { text: 'Not generated yet', tone: 'muted' }
    const approved = data.approved
    return approved
      ? { text: 'Approved & sent', tone: 'success' }
      : { text: 'Awaiting approval', tone: 'warning' }
  }
  if (view === 'playbook') {
    const arr = Array.isArray(data) ? data : []
    if (arr.length === 0) return { text: 'Not generated yet', tone: 'muted' }
    const latest = arr[arr.length - 1]
    const acts = (latest.phases || []).flatMap((p) => p.activities || [])
    const done = acts.filter((a) => a.completed).length
    return { text: `v${latest.version || 1} · ${done}/${acts.length} complete`, tone: 'info' }
  }
  if (view === 'outreach') {
    const arr = Array.isArray(data) ? data : []
    if (arr.length === 0) return { text: 'Nothing drafted yet', tone: 'muted' }
    const pending = arr.filter((m) => m.status !== 'sent').length
    const sent = arr.filter((m) => m.status === 'sent').length
    if (pending > 0) return { text: `${pending} awaiting approval`, tone: 'warning' }
    return { text: `${sent} sent`, tone: 'success' }
  }
  if (view === 'synthesis') {
    const arr = Array.isArray(data) ? data : (data ? [data] : [])
    if (arr.length === 0) return { text: 'No feedback yet', tone: 'muted' }
    const latest = arr[arr.length - 1]
    return { text: `${latest.themes?.length || 0} themes`, tone: 'info' }
  }
  return { text: '', tone: 'muted' }
}

const TONE_STYLES = {
  muted: { color: '#999', bg: '#F5F5F2', border: '#EBEBEA' },
  info: { color: '#534AB7', bg: '#F6F5FF', border: '#D8D5F5' },
  success: { color: '#1D9E75', bg: '#F0FAF6', border: '#C5EBE0' },
  warning: { color: '#F39C12', bg: '#FFFBF0', border: '#F5E6C8' },
}

export default function WorkspaceHome({ data, onNavigate }) {
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{ padding: '28px 28px 40px', maxWidth: 860, margin: '0 auto' }}>
      <div style={{ marginBottom: 22 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#8A8A86',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 6,
          }}
        >
          Workspace
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, color: '#1A1A18', marginBottom: 4 }}>
          Open anything to dig in
        </div>
        <div style={{ fontSize: 13, color: '#6E6E6A', lineHeight: 1.6 }}>
          Everything Mosen has drafted for this initiative lives here. Click a card to view, edit or download.
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 14,
        }}
      >
        {CARD_META.map((card) => {
          const status = summariseStatus(card.view, data?.[card.view])
          const tone = TONE_STYLES[status.tone]
          const isHovered = hovered === card.view

          return (
            <button
              key={card.view}
              type="button"
              onClick={() => onNavigate(card.view)}
              onMouseEnter={() => setHovered(card.view)}
              onMouseLeave={() => setHovered(null)}
              style={{
                textAlign: 'left',
                padding: '18px 18px 16px',
                background: '#fff',
                border: `1px solid ${isHovered ? '#C8C8C6' : '#E4E4E2'}`,
                borderRadius: 14,
                cursor: 'pointer',
                transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
                boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                transform: isHovered ? 'translateY(-1px)' : 'none',
                fontFamily: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                minHeight: 132,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: '#F7F7F5',
                    border: '1px solid #E4E4E2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1A1A18',
                  }}
                >
                  {card.icon}
                </div>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{
                    color: isHovered ? '#1A1A18' : '#8A8A86',
                    transition: 'color 0.15s, transform 0.15s',
                    transform: isHovered ? 'translateX(2px)' : 'none',
                  }}
                >
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A18', marginBottom: 3 }}>
                  {card.label}
                </div>
                <div style={{ fontSize: 12, color: '#6E6E6A', lineHeight: 1.5 }}>
                  {card.description}
                </div>
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignSelf: 'flex-start',
                  padding: '3px 9px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 500,
                  color: tone.color,
                  background: tone.bg,
                  border: `1px solid ${tone.border}`,
                }}
              >
                {status.text}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
