'use client'
import { useState } from 'react'

/**
 * PlaybookDraftCard
 *
 * Renders an in-chat compact card when Mosen generates a draft playbook.
 * Leader can confirm to finalize, or click "Request Changes" to keep chatting.
 *
 * Props:
 *   draft       — { type: 'playbook_draft', version, phases: [{name, activityCount}], totalActivities }
 *   initId      — initiative id (for the confirm API call)
 *   onConfirmed — called after successful confirm (switches view to playbook tab)
 *   onRequestChanges — called when leader wants to tweak (focuses chat input)
 */
export default function PlaybookDraftCard({ draft, initId, onConfirmed, onRequestChanges }) {
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState(null)

  const phases = Array.isArray(draft?.phases) ? draft.phases : []
  const totalActivities = draft?.totalActivities ?? phases.reduce((s, p) => s + (p.activityCount || 0), 0)

  async function handleConfirm() {
    if (confirming || confirmed) return
    setConfirming(true)
    setError(null)
    try {
      const res = await fetch(`/api/initiative/${initId}/playbook/confirm`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Confirm failed')
      }
      setConfirmed(true)
      onConfirmed?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setConfirming(false)
    }
  }

  function handleRequestChanges() {
    onRequestChanges?.()
  }

  return (
    <div style={{
      border: '1.5px solid #9B94E8',
      borderRadius: 12,
      background: 'linear-gradient(135deg, #F8F7FF 0%, #EEE9FB 100%)',
      padding: '14px 16px',
      minWidth: 260,
      maxWidth: 420,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: '#534AB7', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <rect x="9" y="3" width="6" height="4" rx="1" stroke="#fff" strokeWidth="2" />
            <path d="M9 12h6M9 16h4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A18' }}>
            Draft Playbook
          </div>
          <div style={{ fontSize: 11, color: '#7B6FBF' }}>
            {phases.length} phase{phases.length !== 1 ? 's' : ''} · {totalActivities} activit{totalActivities !== 1 ? 'ies' : 'y'}
          </div>
        </div>
        <div style={{
          marginLeft: 'auto', fontSize: 10, fontWeight: 600, padding: '2px 8px',
          borderRadius: 20, background: '#FFF3CD', color: '#B7770A', border: '1px solid #F5DC8B',
          letterSpacing: 0.3,
        }}>
          DRAFT
        </div>
      </div>

      {/* Phase list */}
      {phases.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {phases.map((phase, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '5px 0',
              borderBottom: i < phases.length - 1 ? '1px solid #DDD9F5' : 'none',
            }}>
              <div style={{ fontSize: 12, color: '#3D3679', fontWeight: 500 }}>
                <span style={{ color: '#9B94E8', marginRight: 6, fontSize: 11 }}>
                  {i + 1}.
                </span>
                {phase.name}
              </div>
              <div style={{ fontSize: 11, color: '#9B94E8', flexShrink: 0, marginLeft: 8 }}>
                {phase.activityCount} act.
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div style={{ fontSize: 12, color: '#C0392B', marginBottom: 8, padding: '6px 8px', background: '#FEF0EE', borderRadius: 6 }}>
          {error}
        </div>
      )}

      {/* Action buttons */}
      {confirmed ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, color: '#1D9E75', fontWeight: 500,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#1D9E75" strokeWidth="2" />
            <path d="M8 12l3 3 5-5" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Playbook confirmed — check the Playbook tab
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            style={{
              flex: 1, padding: '7px 12px', borderRadius: 8, border: 'none',
              background: confirming ? '#A8A2DC' : '#534AB7',
              color: '#fff', fontSize: 12, fontWeight: 600,
              cursor: confirming ? 'wait' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {confirming ? 'Confirming…' : 'Confirm Playbook'}
          </button>
          <button
            onClick={handleRequestChanges}
            style={{
              flex: 1, padding: '7px 12px', borderRadius: 8,
              border: '1.5px solid #9B94E8', background: 'transparent',
              color: '#534AB7', fontSize: 12, fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Request Changes
          </button>
        </div>
      )}
    </div>
  )
}
