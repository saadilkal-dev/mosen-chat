'use client'
import { useState, useEffect, useRef } from 'react'

function ProgressRing({ pct, color = '#534AB7', size = 40, strokeWidth = 3 }) {
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.max(0, Math.min(1, pct / 100)) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EBEBEA" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={strokeWidth} strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.4s ease' }}
      />
    </svg>
  )
}

const STATUS_COLOR = {
  complete: '#1D9E75',
  'in-progress': '#534AB7',
  'not-started': '#C8C8C3',
}

const STATUS_LABEL = {
  complete: 'Complete',
  'in-progress': 'In Progress',
  'not-started': 'Not Started',
}

/** Primary: model-generated phase.description. Fallback: compact line from activity titles (older playbooks). */
function phaseDescriptionBlock(phase) {
  const direct = typeof phase.description === 'string' && phase.description.trim()
  if (direct) {
    return { text: phase.description.trim(), fallback: false }
  }
  const acts = phase.activities || []
  const titles = acts.map(a => a?.title).filter(Boolean)
  if (titles.length === 0) return null
  const max = 4
  const shown = titles.slice(0, max)
  const suffix = titles.length > max ? ' …' : ''
  return {
    text: `Experiments in this phase: ${shown.join(' · ')}${suffix}`,
    fallback: true,
  }
}


export default function PlaybookCard({
  versions = [],
  activeVersion: controlledVersion,
  onVersionChange,
  initId,
  focusedActivity,
  onActivityFocused,
  onArtifactOpen,
}) {
  const [internalVersion, setInternalVersion] = useState(versions.length - 1)
  const activeIdx = controlledVersion !== undefined ? controlledVersion : internalVersion
  const current = versions[activeIdx] || versions[versions.length - 1]
  const [completionOverrides, setCompletionOverrides] = useState({})
  const [selectedActivity, setSelectedActivity] = useState(null) // { pi, ai }
  const phaseRefs = useRef({})
  const activityChipRefs = useRef({})

  if (!current) return null

  const phases = current.phases || []
  const allActivities = phases.flatMap((p, pi) => (p.activities || []).map((a, ai) => ({ ...a, pi, ai })))
  const totalActivities = allActivities.length
  const completedCount = allActivities.filter(a => {
    const key = `${a.pi}-${a.ai}`
    return completionOverrides.hasOwnProperty(key) ? completionOverrides[key] : a.completed === true
  }).length

  function getCompleted(pi, ai, activity) {
    const key = `${pi}-${ai}`
    return completionOverrides.hasOwnProperty(key) ? completionOverrides[key] : activity.completed === true
  }

  function phaseStats(pi) {
    const acts = phases[pi]?.activities || []
    const done = acts.filter((a, ai) => getCompleted(pi, ai, a)).length
    return { total: acts.length, done }
  }

  function phaseStatus(pi) {
    const { total, done } = phaseStats(pi)
    if (done === total && total > 0) return 'complete'
    if (done > 0) return 'in-progress'
    return 'not-started'
  }

  useEffect(() => {
    if (!focusedActivity) return
    const { phaseIndex: pi, activityIndex: ai } = focusedActivity
    setSelectedActivity({ pi, ai })
    const timer = setTimeout(() => {
      const el = activityChipRefs.current[`${pi}-${ai}`]
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      onActivityFocused?.()
    }, 80)
    return () => clearTimeout(timer)
  }, [focusedActivity])

  async function toggleComplete(e, pi, ai, currentlyCompleted) {
    e.stopPropagation()
    const key = `${pi}-${ai}`
    const newValue = !currentlyCompleted
    setCompletionOverrides(prev => ({ ...prev, [key]: newValue }))
    try {
      await fetch(`/api/initiative/${initId}/playbook`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phaseIndex: pi, activityIndex: ai, completed: newValue }),
      })
    } catch {
      setCompletionOverrides(prev => ({ ...prev, [key]: currentlyCompleted }))
    }
  }

  const overallPct = totalActivities > 0 ? Math.round((completedCount / totalActivities) * 100) : 0

  return (
    <div style={{ padding: '4px 20px 28px', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A18' }}>Playbook</span>
          {versions.length > 1 && (
            <select
              value={activeIdx}
              onChange={e => {
                const v = parseInt(e.target.value)
                if (onVersionChange) onVersionChange(v); else setInternalVersion(v)
              }}
              style={{ fontSize: 11, padding: '2px 6px', borderRadius: 6, border: '1px solid #EBEBEA', background: '#fff', color: '#534AB7', fontWeight: 500 }}
            >
              {versions.map((v, i) => <option key={i} value={i}>v{v.version || i + 1}</option>)}
            </select>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ProgressRing pct={overallPct} color={overallPct === 100 ? '#1D9E75' : '#534AB7'} size={28} strokeWidth={2.5} />
          <span style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>{completedCount}/{totalActivities} done</span>
        </div>
      </div>

      {/* ── Phase roadmap timeline ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 28, position: 'relative' }}>
        {/* Background track */}
        <div style={{
          position: 'absolute', top: 10, left: '8%', right: '8%', height: 2,
          background: '#EBEBEA', zIndex: 0,
        }} />
        {phases.map((phase, i) => {
          const status = phaseStatus(i)
          const color = STATUS_COLOR[status]
          return (
            <div
              key={i}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', position: 'relative', zIndex: 1 }}
              onClick={() => phaseRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              {/* Node */}
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: status === 'complete' ? color : '#fff',
                border: `2px solid ${status === 'not-started' ? '#D8D8D3' : color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 7, flexShrink: 0,
                boxShadow: status === 'in-progress' ? `0 0 0 4px ${color}28` : 'none',
                transition: 'all 0.2s',
              }}>
                {status === 'complete' && (
                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {status === 'in-progress' && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                )}
              </div>
              {/* Label */}
              <span style={{
                fontSize: 10, fontWeight: 500, textAlign: 'center', lineHeight: 1.3,
                color: status === 'not-started' ? '#ADADAA' : color,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                overflow: 'hidden', maxWidth: 64,
              }}>
                {phase.name}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Change note ── */}
      {current.changeNote && current.version > 1 && (
        <div style={{ fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 18, padding: '8px 12px', background: '#F6F5FF', borderRadius: 8, border: '1px solid #EAE8FC' }}>
          {current.changeNote}
        </div>
      )}

      {/* ── Phase cards ── */}
      {phases.map((phase, pi) => {
        const status = phaseStatus(pi)
        const { total, done } = phaseStats(pi)
        const pct = total > 0 ? (done / total) * 100 : 0
        const color = STATUS_COLOR[status]

        return (
          <div
            key={pi}
            ref={el => { phaseRefs.current[pi] = el }}
            style={{ marginBottom: 16, borderRadius: 16, border: '1px solid #EBEBEA', background: '#fff', overflow: 'hidden' }}
          >
            {/* Phase header */}
            <div style={{ padding: '16px 18px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1, paddingRight: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: color, textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}>
                    {STATUS_LABEL[status]}
                  </span>
                  {phase.duration && (
                    <span style={{ fontSize: 10, color: '#C0C0BB', fontWeight: 400 }}>• {phase.duration}</span>
                  )}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A18', lineHeight: 1.3 }}>
                  {phase.name}
                </div>
                {(() => {
                  const block = phaseDescriptionBlock(phase)
                  if (!block) return null
                  return (
                    <div
                      style={{
                        fontSize: 12,
                        color: block.fallback ? '#A8A8A2' : '#5C5C58',
                        lineHeight: 1.55,
                        marginTop: 6,
                        fontStyle: block.fallback ? 'italic' : 'normal',
                      }}
                    >
                      {block.text}
                    </div>
                  )
                })()}
              </div>
              {/* Progress ring */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                <ProgressRing pct={pct} color={color} size={42} strokeWidth={3} />
                <span style={{ fontSize: 10, color: '#ADADAA', fontWeight: 500 }}>{done}/{total}</span>
              </div>
            </div>

            {/* Activity chips */}
            <div style={{ padding: '2px 14px 14px', display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {(phase.activities || []).map((activity, ai) => {
                const key = `${pi}-${ai}`
                const isCompleted = getCompleted(pi, ai, activity)
                const isSelected = selectedActivity?.pi === pi && selectedActivity?.ai === ai

                return (
                  <div
                    key={ai}
                    ref={el => { activityChipRefs.current[key] = el }}
                    onClick={() => setSelectedActivity(isSelected ? null : { pi, ai })}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '5px 11px 5px 10px', borderRadius: 20,
                      cursor: 'pointer', fontSize: 12, fontWeight: 500,
                      border: isSelected
                        ? '1.5px solid #534AB7'
                        : isCompleted
                          ? '1px solid #9EDBC8'
                          : '1px solid #E0E0DB',
                      background: isSelected
                        ? '#EAE8FC'
                        : isCompleted
                          ? '#F0FAF6'
                          : '#FAFAF8',
                      color: isSelected ? '#3D35A0' : isCompleted ? '#1D9E75' : '#4A4A48',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.borderColor = isCompleted ? '#6DC9AE' : '#BDB8F0'
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.borderColor = isCompleted ? '#9EDBC8' : '#E0E0DB'
                    }}
                  >
                    {isCompleted ? (
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M2 6L5 9L10 3" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <div style={{
                        width: 9, height: 9, borderRadius: '50%',
                        border: `1.5px solid ${isSelected ? '#534AB7' : '#C8C8C3'}`,
                        flexShrink: 0,
                      }} />
                    )}
                    <span style={{
                      maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {activity.title}
                    </span>
                    {activity.artifacts?.length > 0 && (
                      <span style={{ fontSize: 10, color: isSelected ? '#9B94E8' : '#C0C0BB', flexShrink: 0 }}>
                        {activity.artifacts.length}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ── Activity detail panel (shown when chip selected) ── */}
            {selectedActivity?.pi === pi && (() => {
              const ai = selectedActivity.ai
              const activity = phase.activities?.[ai]
              if (!activity) return null
              const isCompleted = getCompleted(pi, ai, activity)
              return (
                <div style={{
                  margin: '0 14px 16px',
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: '#F6F5FF',
                  border: '1.5px solid #DCD8F7',
                }}>
                  {/* Detail header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A18', flex: 1, lineHeight: 1.4 }}>
                      {activity.title}
                    </span>
                    <button
                      onClick={e => toggleComplete(e, pi, ai, isCompleted)}
                      style={{
                        fontSize: 11, padding: '4px 12px', borderRadius: 8, cursor: 'pointer', flexShrink: 0,
                        border: isCompleted ? '1px solid #9EDBC8' : '1px solid #534AB7',
                        background: isCompleted ? '#F0FAF6' : '#534AB7',
                        color: isCompleted ? '#1D9E75' : '#fff',
                        fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif",
                        transition: 'all 0.15s',
                      }}
                    >
                      {isCompleted ? '✓ Done' : 'Mark done'}
                    </button>
                  </div>

                  {activity.description && (
                    <div style={{ fontSize: 12, color: '#555', lineHeight: 1.65, marginBottom: 8 }}>
                      {activity.description}
                    </div>
                  )}

                  {activity.hypothesis && (
                    <div style={{
                      fontSize: 11, color: '#888', fontStyle: 'italic', lineHeight: 1.55,
                      paddingTop: 8, marginBottom: 8,
                      borderTop: '1px solid #E4E1F7',
                    }}>
                      {activity.hypothesis}
                    </div>
                  )}

                  {activity.owner && (
                    <div style={{ fontSize: 11, color: '#534AB7', fontWeight: 500, marginTop: 4 }}>
                      Owner: {activity.owner}
                    </div>
                  )}

                  {activity.artifacts?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                      {activity.artifacts.map((a, k) => (
                        <button
                          key={k}
                          onClick={e => {
                            e.stopPropagation()
                            onArtifactOpen?.({ artifactName: a, activityTitle: activity.title, phaseName: phase.name })
                          }}
                          style={{
                            fontSize: 11, padding: '4px 11px', borderRadius: 12,
                            background: '#fff', color: '#534AB7',
                            border: '1px solid #D4D0F5', cursor: 'pointer', fontWeight: 500,
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontFamily: "'DM Sans', system-ui, sans-serif",
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#EAE8FC'; e.currentTarget.style.borderColor = '#534AB7' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#D4D0F5' }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                            <path d="M6 3h12v18H6z" stroke="currentColor" strokeWidth="2" />
                            <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                          {a}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )
      })}

      {/* Fallback: recommendations */}
      {!phases.length && Array.isArray(current.recommendations) && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A18', marginBottom: 10 }}>Recommended Changes</div>
          {current.summary && <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 14 }}>{current.summary}</div>}
          {current.recommendations.map((rec, i) => (
            <div key={i} style={{ marginBottom: 10, padding: '10px 14px', background: '#F6F5FF', borderRadius: 10, border: '1px solid #D8D5F5' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A18', marginBottom: 4 }}>{rec.theme || rec.pillar}</div>
              <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{rec.change}</div>
              {rec.rationale && <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{rec.rationale}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
