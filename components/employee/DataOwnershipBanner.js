'use client'
// Standalone version — for use outside the employee chat page.
// The employee chat page embeds its own inline strip instead.
import { useState } from 'react'

const G = '#1D9E75'
const GL = '#F0FAF6'
const GD = '#0A4D3A'
const GB = '#C5EBE0'

export default function DataOwnershipBanner({ dismissible = false }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div style={{
      background: GL,
      border: `1px solid ${GB}`,
      borderRadius: 10,
      padding: '11px 14px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
    }}>
      <svg width="15" height="15" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
        <path
          d="M10 1.5L3 4.5V9C3 13.1 6 16.9 10 18C14 16.9 17 13.1 17 9V4.5L10 1.5Z"
          fill={GL}
          stroke={G}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M7 10L9 12L13 8" stroke={G} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <p style={{ fontSize: 12.5, color: GD, margin: 0, lineHeight: 1.55, flex: 1 }}>
        Your data belongs to you. Nothing from this conversation will be shared without your
        explicit, informed consent. You can say no at any time.
      </p>

      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#AAA', fontSize: 17, lineHeight: 1, padding: 0, flexShrink: 0 }}
        >
          ×
        </button>
      )}
    </div>
  )
}
