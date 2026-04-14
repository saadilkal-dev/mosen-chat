'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

export default function PlaybookApprovalCard({ draft, initId, onConfirmed, onRequestChanges }) {
  const [activeSection, setActiveSection] = useState('phase-0')
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const contentRef = useRef(null)
  const sectionRefs = useRef({})

  const phases = draft?.phases || []
  const totalActivities = draft?.totalActivities || phases.reduce((sum, p) => sum + (p.activities?.length || 0), 0)

  // Track active section on scroll
  useEffect(() => {
    const container = contentRef.current
    if (!container) return

    const onScroll = () => {
      const containerTop = container.scrollTop
      let current = 'phase-0'
      for (const [key, el] of Object.entries(sectionRefs.current)) {
        if (!el) continue
        if (el.offsetTop - 24 <= containerTop) current = key
      }
      setActiveSection(current)
    }

    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = useCallback((key) => {
    const el = sectionRefs.current[key]
    const container = contentRef.current
    if (!el || !container) return
    container.scrollTo({ top: el.offsetTop - 16, behavior: 'smooth' })
    setActiveSection(key)
  }, [])

  async function handleApprove() {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/initiative/${initId}/playbook/confirm`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to confirm playbook')
      }
      setConfirmed(true)
      onConfirmed?.()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  // Confirmed state — minimal inline confirmation
  if (confirmed) {
    return (
      <div style={{
        border: '1px solid #C0E8D8',
        borderRadius: 12,
        background: '#F0FAF6',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        fontSize: 14,
        color: '#1D9E75',
        fontWeight: 500,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#1D9E75" />
          <path d="M7 12l3.5 3.5L17 8.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Plan approved — check the Playbook tab to track your progress.
      </div>
    )
  }

  return (
    <div style={{
      border: '1px solid #D8D5F5',
      borderRadius: 12,
      background: '#FAFAF8',
      overflow: 'hidden',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      fontSize: 13,
      width: '100%',
      maxWidth: 600,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #EBEBEA',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="#534AB7" strokeWidth="2" />
            <path d="M7 8h10M7 12h10M7 16h6" stroke="#534AB7" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span style={{ fontWeight: 600, fontSize: 13, color: '#1A1A18' }}>Draft Plan</span>
          <span style={{ color: '#B0B0AA', fontSize: 12 }}>·</span>
          <span style={{ color: '#8E8E8A', fontSize: 12 }}>{phases.length} phases · {totalActivities} activities</span>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
          padding: '3px 8px', borderRadius: 20,
          background: '#FFF8E6', color: '#C4870A',
          border: '1px solid #F5D78E',
          textTransform: 'uppercase',
        }}>
          DRAFT
        </span>
      </div>

      {/* Two-pane body */}
      <div style={{ display: 'flex', height: 420, overflow: 'hidden' }}>

        {/* Left TOC */}
        <div style={{
          width: 172,
          flexShrink: 0,
          background: '#F6F5FF',
          borderRight: '1px solid #EBEBEA',
          overflowY: 'auto',
          padding: '12px 0',
        }}>
          <div style={{
            padding: '2px 14px 8px',
            fontSize: 11,
            fontWeight: 600,
            color: '#B0B0AA',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            Phases
          </div>

          {phases.map((phase, pi) => {
            const phaseKey = `phase-${pi}`
            const isPhaseActive = activeSection === phaseKey
            return (
              <div key={pi}>
                {/* Phase entry */}
                <button
                  onClick={() => scrollTo(phaseKey)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '5px 14px',
                    background: isPhaseActive ? '#EDE9FF' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: isPhaseActive ? 600 : 500,
                    color: isPhaseActive ? '#534AB7' : '#3A3A38',
                    lineHeight: 1.4,
                    borderLeft: isPhaseActive ? '2px solid #534AB7' : '2px solid transparent',
                    transition: 'all 0.1s',
                  }}
                >
                  {phase.name}
                </button>

                {/* Activity entries — indented */}
                {(phase.activities || []).map((act, ai) => {
                  const actKey = `act-${pi}-${ai}`
                  const isActActive = activeSection === actKey
                  return (
                    <button
                      key={ai}
                      onClick={() => scrollTo(actKey)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '3px 14px 3px 24px',
                        background: isActActive ? '#EDE9FF' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: isActActive ? 500 : 400,
                        color: isActActive ? '#534AB7' : '#8E8E8A',
                        lineHeight: 1.4,
                        borderLeft: isActActive ? '2px solid #534AB7' : '2px solid transparent',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {act.title}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Right content */}
        <div ref={contentRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {phases.map((phase, pi) => (
            <div key={pi}>
              {/* Phase section */}
              <div
                ref={el => { sectionRefs.current[`phase-${pi}`] = el }}
                style={{ marginBottom: 4 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: '#1A1A18',
                  }}>
                    {phase.name}
                  </span>
                  {phase.duration && (
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 20,
                      background: '#F0EFF5', color: '#8E8E8A', fontWeight: 500,
                    }}>
                      {phase.duration}
                    </span>
                  )}
                </div>
                {phase.description && (
                  <p style={{
                    fontSize: 12, lineHeight: 1.65, color: '#5A5A57',
                    margin: '0 0 12px', fontWeight: 400,
                  }}>
                    {phase.description}
                  </p>
                )}
              </div>

              {/* Activities */}
              {(phase.activities || []).length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  {(phase.activities || []).map((act, ai) => (
                    <div
                      key={ai}
                      ref={el => { sectionRefs.current[`act-${pi}-${ai}`] = el }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: '#fff',
                        border: '1px solid #EBEBEA',
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A18', marginBottom: 4 }}>
                        {act.title}
                      </div>
                      {act.description && (
                        <div style={{ fontSize: 11, color: '#5A5A57', lineHeight: 1.55, marginBottom: 5 }}>
                          {act.description}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {act.owner && (
                          <span style={{ fontSize: 10, color: '#8E8E8A' }}>
                            Owner: <span style={{ color: '#5A5A57', fontWeight: 500 }}>{act.owner}</span>
                          </span>
                        )}
                        {act.hypothesis && (
                          <span style={{
                            fontSize: 10, color: '#8E8E8A',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            maxWidth: '100%',
                          }}>
                            {act.hypothesis.length > 80 ? act.hypothesis.slice(0, 80) + '…' : act.hypothesis}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Divider between phases */}
              {pi < phases.length - 1 && (
                <div style={{ borderTop: '1px solid #EBEBEA', marginBottom: 20 }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid #EBEBEA',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#FAFAF8',
      }}>
        <button
          onClick={handleApprove}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: loading ? '#9B94E8' : '#534AB7',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            transition: 'background 0.15s',
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff', borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
              Approving…
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Approve plan
            </>
          )}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {error && <span style={{ fontSize: 11, color: '#C0392B' }}>{error}</span>}
          <button
            onClick={onRequestChanges}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              color: '#8E8E8A',
              padding: '4px 0',
              fontFamily: "'DM Sans', system-ui, sans-serif",
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
            }}
          >
            Tell Mosen what to change instead
          </button>
        </div>
      </div>
    </div>
  )
}
