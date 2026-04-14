'use client'
import { useState } from 'react'

// Claude-Code-style monochrome artifact card rendered inline in chat.
// One card component for every artifact type — unified preview affordance.

const TYPE_META = {
  playbook: {
    label: 'Playbook',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  brief: {
    label: 'Change Brief',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M6 3h9l4 4v14H6V3Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M15 3v4h4" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 12h7M9 16h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  outreach_suggestion: {
    label: 'Outreach',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M3 6h18v12H3z" stroke="currentColor" strokeWidth="1.6" />
        <path d="m3 6 9 7 9-7" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
  synthesis_card: {
    label: 'Synthesis',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  experiment_card: {
    label: 'Experiment',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M9 3h6M10 3v6l-5 9a3 3 0 0 0 2.6 4.5h8.8A3 3 0 0 0 19 18l-5-9V3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
  activity_artifact: {
    label: 'Artifact',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M6 3h12v18H6z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
}

function extractTitleAndSnippet(artifact) {
  const type = artifact.type

  if (type === 'playbook') {
    const d = artifact.data || {}
    const phases = d.phases || []
    const activityCount = phases.reduce((acc, p) => acc + (p.activities?.length || 0), 0)
    return {
      title: `Playbook v${d.version || 1}`,
      snippet: `${phases.length} phase${phases.length === 1 ? '' : 's'} · ${activityCount} experiment${activityCount === 1 ? '' : 's'}`,
    }
  }

  if (type === 'brief') {
    const d = artifact.data || {}
    const content = typeof d.content === 'string' ? d.content : (d.content?.body || '')
    const words = content.split(/\s+/).filter(Boolean).length
    const firstLine = content.split('\n').find((l) => l.trim()) || ''
    return {
      title: d.initiativeTitle ? `${d.initiativeTitle} — Employee Brief` : 'Change Brief',
      snippet: words > 0 ? `${words} words · ${firstLine.slice(0, 80)}${firstLine.length > 80 ? '…' : ''}` : 'Employee-facing summary',
    }
  }

  if (type === 'outreach_suggestion') {
    const d = artifact.data
    if (Array.isArray(d)) {
      return {
        title: `${d.length} outreach message${d.length === 1 ? '' : 's'}`,
        snippet: d[0]?.recipient ? `To ${d.map((m) => m.recipient).slice(0, 3).join(', ')}${d.length > 3 ? '…' : ''}` : 'Personalised drafts',
      }
    }
    const one = d || {}
    const draft = typeof one.draft === 'string' ? one.draft : ''
    return {
      title: one.milestone || 'Outreach draft',
      snippet: draft.replace(/\s+/g, ' ').slice(0, 100) + (draft.length > 100 ? '…' : ''),
    }
  }

  if (type === 'synthesis_card') {
    const d = artifact.data
    if (!d) {
      return { title: 'Synthesis', snippet: 'No employee conversations yet' }
    }
    const themeCount = d.themes?.length || 0
    const strongest = d.themes?.[0]?.name
    return {
      title: 'Employee synthesis',
      snippet: `${themeCount} theme${themeCount === 1 ? '' : 's'}${strongest ? ` · Strongest: ${strongest}` : ''}`,
    }
  }

  if (type === 'experiment_card') {
    const phase = artifact.phaseName || 'Phase'
    const title = artifact.activityTitle || 'Experiment'
    const desc = artifact.description || artifact.hypothesis || ''
    return {
      title,
      snippet: `${phase} · ${desc.replace(/\s+/g, ' ').slice(0, 80)}${desc.length > 80 ? '…' : ''}`,
    }
  }

  if (type === 'activity_artifact') {
    return {
      title: artifact.title || 'Artifact',
      snippet: artifact.snippet || 'Generated document',
    }
  }

  return { title: 'Artifact', snippet: '' }
}

export default function ArtifactChatCard({ artifact, onOpen }) {
  const [hovered, setHovered] = useState(false)
  if (!artifact || artifact.error) return null
  const meta = TYPE_META[artifact.type]
  if (!meta) return null

  const { title, snippet } = extractTitleAndSnippet(artifact)
  const isCompleted = artifact.type === 'experiment_card' && artifact.completed

  return (
    <button
      type="button"
      onClick={() => onOpen?.(artifact)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 0,
        width: '100%',
        maxWidth: 360,
        padding: 0,
        background: '#fff',
        border: `1px solid ${hovered ? '#C8C8C6' : '#E4E4E2'}`,
        borderRadius: 10,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: hovered ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
        overflow: 'hidden',
      }}
    >
      {/* Left icon rail */}
      <div
        style={{
          width: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F7F7F5',
          borderRight: '1px solid #E4E4E2',
          color: '#5C5C58',
          flexShrink: 0,
        }}
      >
        {meta.icon}
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '10px 12px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#8A8A86',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {meta.label}
          </span>
          {isCompleted && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#1D9E75',
                background: '#E6F7F0',
                padding: '1px 6px',
                borderRadius: 4,
                letterSpacing: '0.04em',
              }}
            >
              DONE
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#1A1A18',
            lineHeight: 1.35,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#6E6E6A',
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {snippet}
        </div>
      </div>

      {/* Right arrow */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingRight: 12,
          color: hovered ? '#1A1A18' : '#8A8A86',
          transition: 'color 0.15s, transform 0.15s',
          transform: hovered ? 'translateX(2px)' : 'none',
          flexShrink: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </button>
  )
}
