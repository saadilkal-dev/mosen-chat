'use client'
import { useState } from 'react'
import { diffPhaseActivitiesByTitle } from '@/lib/playbook-helpers'

function phaseDescriptionBlock(phase) {
  const direct = typeof phase.description === 'string' && phase.description.trim()
  if (direct) return { text: direct.trim(), fallback: false }
  const acts = phase.activities || []
  const titles = acts.map((a) => a?.title).filter(Boolean)
  if (titles.length === 0) return null
  const max = 4
  const shown = titles.slice(0, max)
  const suffix = titles.length > max ? ' …' : ''
  return {
    text: `Experiments in this phase: ${shown.join(' · ')}${suffix}`,
    fallback: true,
  }
}

export default function PlaybookCard({ versions = [], activeVersion: controlledVersion, onVersionChange, initId, onRefresh }) {
  const [internalVersion, setInternalVersion] = useState(versions.length - 1)
  const activeIdx = controlledVersion !== undefined ? controlledVersion : internalVersion
  const current = versions[activeIdx] || versions[versions.length - 1]
  const prev = activeIdx > 0 ? versions[activeIdx - 1] : null
  const [expandedPhases, setExpandedPhases] = useState({})
  const [showDiff, setShowDiff] = useState(false)
  const [saving, setSaving] = useState({})

  if (!current) return null

  const togglePhase = (idx) => setExpandedPhases((prev) => ({ ...prev, [idx]: !prev[idx] }))

  const diff =
    prev && current?.phases && prev?.phases
      ? diffPhaseActivitiesByTitle(prev.phases, current.phases)
      : null

  async function toggleComplete(pi, ai, nextVal) {
    const key = `${pi}-${ai}`
    setSaving((s) => ({ ...s, [key]: true }))
    try {
      await fetch(`/api/initiative/${initId}/playbook`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phaseIndex: pi, activityIndex: ai, completed: nextVal }),
      })
      onRefresh?.()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving((s) => ({ ...s, [key]: false }))
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A18' }}>Playbook</span>
          {current.status === 'draft' && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: '#FFF3CD', color: '#B7770A', border: '1px solid #F5DC8B' }}>DRAFT</span>
          )}
          <select
            value={activeIdx}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              if (onVersionChange) onVersionChange(v)
              else setInternalVersion(v)
            }}
            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #EBEBEA', background: '#fff', color: '#534AB7', fontWeight: 500 }}
          >
            {versions.map((v, i) => (
              <option key={i} value={i}>
                v{v.version || i + 1}
              </option>
            ))}
          </select>
        </div>
        {current.changeNote && <span style={{ fontSize: 11, color: '#999', fontStyle: 'italic', maxWidth: 280 }}>{current.changeNote}</span>}
      </div>

      {diff && diff.added.length + diff.removed.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => setShowDiff(!showDiff)}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#534AB7',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {showDiff ? '▼' : '▶'} What changed vs previous version
          </button>
          {showDiff && (
            <div style={{ marginTop: 10, padding: 12, background: '#FAFAF8', borderRadius: 8, border: '1px solid #EBEBEA', fontSize: 12, lineHeight: 1.6 }}>
              {diff.added.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ color: '#1D9E75', fontWeight: 600 }}>Added experiments:</span> {diff.added.join(' · ')}
                </div>
              )}
              {diff.removed.length > 0 && (
                <div>
                  <span style={{ color: '#C0392B', fontWeight: 600 }}>Removed:</span> {diff.removed.join(' · ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!current.phases?.length && Array.isArray(current.recommendations) && (
        <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
          {current.summary && <p style={{ marginBottom: 10 }}>{current.summary}</p>}
          {current.recommendations.map((rec, i) => (
            <div key={i} style={{ marginBottom: 8, padding: 10, background: '#F6F5FF', borderRadius: 8 }}>
              <strong>{rec.theme || rec.pillar}</strong>: {rec.change}
            </div>
          ))}
        </div>
      )}

      {(current.phases || []).map((phase, i) => (
        <div key={i} style={{ marginBottom: 12, border: '1px solid #EBEBEA', borderRadius: 12, overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => togglePhase(i)}
            style={{
              width: '100%',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: expandedPhases[i] ? '#F6F5FF' : '#fff',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A18' }}>{phase.name}</span>
              {phase.duration && <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>{phase.duration}</span>}
            </div>
            <span style={{ fontSize: 12, color: '#999', transform: expandedPhases[i] ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
          </button>
          {(() => {
            const block = phaseDescriptionBlock(phase)
            if (!block) return null
            return (
              <div
                style={{
                  padding: '0 16px 10px',
                  fontSize: 12,
                  color: block.fallback ? '#A8A8A2' : '#5C5C58',
                  lineHeight: 1.5,
                  fontStyle: block.fallback ? 'italic' : 'normal',
                }}
              >
                {block.text}
              </div>
            )
          })()}
          {expandedPhases[i] && (
            <div style={{ padding: '0 16px 16px' }}>
              {(phase.activities || []).map((activity, j) => {
                const sk = `${i}-${j}`
                const busy = saving[sk]
                const done = activity.completed === true
                return (
                  <div key={j} style={{ padding: '10px 0', borderTop: j > 0 ? '1px solid #F5F5F2' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A18', marginBottom: 4 }}>
                          {j + 1}. {activity.title}
                        </div>
                        <div style={{ fontSize: 12, color: '#666', lineHeight: 1.6 }}>{activity.description}</div>
                        {activity.hypothesis && (
                          <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic', marginTop: 6 }}>{activity.hypothesis}</div>
                        )}
                        {activity.owner && <div style={{ fontSize: 11, color: '#534AB7', marginTop: 4 }}>Owner: {activity.owner}</div>}
                        {activity.artifacts?.length > 0 && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                            {activity.artifacts.map((a, k) => (
                              <span key={k} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#F6F5FF', color: '#534AB7', border: '1px solid #D8D5F5' }}>
                                {a}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {initId && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => toggleComplete(i, j, !done)}
                          style={{
                            flexShrink: 0,
                            fontSize: 11,
                            padding: '4px 10px',
                            borderRadius: 8,
                            border: done ? '1px solid #9EDBC8' : '1px solid #534AB7',
                            background: done ? '#F0FAF6' : '#534AB7',
                            color: done ? '#1D9E75' : '#fff',
                            cursor: busy ? 'wait' : 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          {done ? 'Done' : 'Mark done'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
