'use client'
import { useState } from 'react'

export default function PlaybookCard({ versions = [], activeVersion: controlledVersion, onVersionChange, onRequestRevision }) {
  const [internalVersion, setInternalVersion] = useState(versions.length - 1)
  const activeIdx = controlledVersion !== undefined ? controlledVersion : internalVersion
  const current = versions[activeIdx] || versions[versions.length - 1]
  const [expandedPhases, setExpandedPhases] = useState({})

  if (!current) return null

  const togglePhase = (idx) => setExpandedPhases(prev => ({ ...prev, [idx]: !prev[idx] }))

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A18' }}>Playbook</span>
          <select
            value={activeIdx}
            onChange={e => { const v = parseInt(e.target.value); if (onVersionChange) onVersionChange(v); else setInternalVersion(v) }}
            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #EBEBEA', background: '#fff', color: '#534AB7', fontWeight: 500 }}
          >
            {versions.map((v, i) => <option key={i} value={i}>v{v.version || i + 1}</option>)}
          </select>
        </div>
        {current.changeNote && (
          <span style={{ fontSize: 11, color: '#999', fontStyle: 'italic' }}>{current.changeNote}</span>
        )}
      </div>

      {(current.phases || []).map((phase, i) => (
        <div key={i} style={{ marginBottom: 12, border: '1px solid #EBEBEA', borderRadius: 12, overflow: 'hidden' }}>
          <button
            onClick={() => togglePhase(i)}
            style={{
              width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: expandedPhases[i] ? '#F6F5FF' : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left'
            }}
          >
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A18' }}>{phase.name}</span>
              {phase.duration && <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>{phase.duration}</span>}
            </div>
            <span style={{ fontSize: 12, color: '#999', transform: expandedPhases[i] ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
          </button>
          {expandedPhases[i] && (
            <div style={{ padding: '0 16px 16px' }}>
              {(phase.activities || []).map((activity, j) => (
                <div key={j} style={{ padding: '10px 0', borderTop: j > 0 ? '1px solid #F5F5F2' : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A18', marginBottom: 4 }}>{j + 1}. {activity.title}</div>
                  <div style={{ fontSize: 12, color: '#666', lineHeight: 1.6 }}>{activity.description}</div>
                  {activity.owner && <div style={{ fontSize: 11, color: '#534AB7', marginTop: 4 }}>Owner: {activity.owner}</div>}
                  {activity.artifacts?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      {activity.artifacts.map((a, k) => (
                        <span key={k} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#F6F5FF', color: '#534AB7', border: '1px solid #D8D5F5' }}>{a}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
