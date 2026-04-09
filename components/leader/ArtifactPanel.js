'use client'
import { useState, useEffect } from 'react'
import PlaybookCard from './PlaybookCard'
import SynthesisCard from './SynthesisCard'
import OutreachCard from './OutreachCard'

const TABS = ['Brief', 'Playbook', 'Outreach', 'Synthesis']

export default function ArtifactPanel({ initId, activeTab: controlledTab, onTabChange }) {
  const [internalTab, setInternalTab] = useState('Brief')
  const [data, setData] = useState({ brief: null, playbook: [], outreach: [], synthesis: [] })
  const [loading, setLoading] = useState(false)

  const activeTab = controlledTab || internalTab
  const setTab = (t) => { if (onTabChange) onTabChange(t); else setInternalTab(t) }

  useEffect(() => {
    if (!initId) return
    loadTabData(activeTab)
  }, [activeTab, initId])

  async function loadTabData(tab) {
    setLoading(true)
    try {
      const endpoint = tab.toLowerCase()
      const res = await fetch(`/api/initiative/${initId}/${endpoint}`)
      if (res.ok) {
        const json = await res.json()
        setData(prev => ({ ...prev, [tab.toLowerCase()]: json[Object.keys(json)[0]] || json }))
      }
    } catch (err) {
      console.error(`Failed to load ${tab}:`, err)
    } finally {
      setLoading(false)
    }
  }

  function renderEmptyState(tab) {
    const messages = {
      Brief: 'The employee brief will appear here once the change brief conversation is complete.',
      Playbook: 'The playbook will be generated after the change brief is finalized.',
      Outreach: 'Outreach suggestions will appear here as milestones are reached.',
      Synthesis: 'Employee synthesis will appear here once enough employees have shared feedback and consented.'
    }
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#999', fontSize: 14, lineHeight: 1.7 }}>
        {messages[tab]}
      </div>
    )
  }

  function renderContent() {
    if (loading) {
      return <div style={{ padding: 32, textAlign: 'center', color: '#999' }}>
        <div style={{ width: 24, height: 24, border: '2px solid #D8D5F5', borderTopColor: '#534AB7', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        Loading...
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    }

    switch (activeTab) {
      case 'Brief': {
        const brief = data.brief
        if (!brief?.content) return renderEmptyState('Brief')
        return (
          <div style={{ padding: 20 }}>
            <div style={{ background: '#F6F5FF', border: '1px solid #D8D5F5', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#534AB7', marginBottom: 12 }}>Employee Brief</div>
              <div style={{ fontSize: 14, color: '#1A1A18', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{brief.content}</div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                {brief.approved ? (
                  <span style={{ fontSize: 12, color: '#1D9E75', fontWeight: 500 }}>Approved and sent</span>
                ) : (
                  <button onClick={() => approveBrief()} style={{
                    padding: '8px 16px', fontSize: 13, fontWeight: 500, borderRadius: 8,
                    border: 'none', background: '#534AB7', color: '#fff', cursor: 'pointer'
                  }}>Approve & Send to Employees</button>
                )}
              </div>
            </div>
          </div>
        )
      }
      case 'Playbook':
        if (!data.playbook || (Array.isArray(data.playbook) && data.playbook.length === 0)) return renderEmptyState('Playbook')
        return <PlaybookCard versions={Array.isArray(data.playbook) ? data.playbook : [data.playbook]} />
      case 'Outreach':
        if (!data.outreach || data.outreach.length === 0) return renderEmptyState('Outreach')
        return <OutreachCard outreachList={data.outreach} initId={initId} onRefresh={() => loadTabData('Outreach')} />
      case 'Synthesis':
        if (!data.synthesis || data.synthesis.length === 0) return renderEmptyState('Synthesis')
        return <SynthesisCard synthesis={Array.isArray(data.synthesis) ? data.synthesis[data.synthesis.length - 1] : data.synthesis} initiativeId={initId} />
      default:
        return null
    }
  }

  async function approveBrief() {
    try {
      await fetch(`/api/initiative/${initId}/brief`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true })
      })
      loadTabData('Brief')
    } catch (err) {
      console.error('Failed to approve brief:', err)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FAFAF8' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #EBEBEA', padding: '0 16px', flexShrink: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setTab(tab)}
            style={{
              padding: '12px 16px', fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? '#534AB7' : '#999', background: 'none', border: 'none',
              borderBottom: activeTab === tab ? '2px solid #534AB7' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {renderContent()}
      </div>
    </div>
  )
}
