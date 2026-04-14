'use client'
import { useState, useEffect, useRef } from 'react'
import WorkspaceHome from './WorkspaceHome'
import PlaybookCard from './PlaybookCard'
import SynthesisCard from './SynthesisCard'
import OutreachCard from './OutreachCard'
import ArtifactFullView from './ArtifactFullView'
// ChangeCanvas removed — playbook always renders in list mode

// Router shell that replaces the 4-tab ArtifactPanel.
// Manages `activeView`: 'home' | 'brief' | 'playbook' | 'outreach' | 'synthesis'.
// Controlled via `activeView` + `onNavigate` props from the page.

const VIEW_TITLES = {
  brief: 'Change Brief',
  playbook: 'Playbook',
  outreach: 'Outreach',
  synthesis: 'Synthesis',
}

export default function WorkspaceView({
  initId,
  activeView = 'home',
  onNavigate,
  focusedActivity,
  onActivityFocused,
  onDocumentOpenChange,
}) {
  const [data, setData] = useState({ brief: null, playbook: [], outreach: [], synthesis: [] })
  const [loading, setLoading] = useState(false)
  const [openArtifact, setOpenArtifact] = useState(null) // { artifactName, activityTitle, phaseName }
  const loadedForView = useRef(new Set())

  // Signal parent when a document/artifact is opened/closed (for split ratio)
  useEffect(() => {
    onDocumentOpenChange?.(!!openArtifact)
  }, [openArtifact])

  // On mount, pre-fetch all four so the home cards show status immediately.
  useEffect(() => {
    if (!initId) return
    let cancelled = false
    ;['brief', 'playbook', 'outreach', 'synthesis'].forEach(async (view) => {
      try {
        const res = await fetch(`/api/initiative/${initId}/${view}`, { credentials: 'include' })
        if (!res.ok || cancelled) return
        const json = await res.json()
        const val = json[Object.keys(json)[0]] ?? json
        if (!cancelled) setData((prev) => ({ ...prev, [view]: val }))
      } catch {
        /* silent */
      }
    })
    return () => { cancelled = true }
  }, [initId])

  // Whenever a view is opened, re-fetch it (freshness).
  useEffect(() => {
    if (!initId || activeView === 'home') return
    loadView(activeView)
  }, [activeView, initId])

  async function loadView(view) {
    if (!['brief', 'playbook', 'outreach', 'synthesis'].includes(view)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/initiative/${initId}/${view}`, { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        const val = json[Object.keys(json)[0]] ?? json
        setData((prev) => ({ ...prev, [view]: val }))
        loadedForView.current.add(view)
      }
    } catch (err) {
      console.error(`Failed to load ${view}:`, err)
    } finally {
      setLoading(false)
    }
  }

  async function approveBrief() {
    try {
      await fetch(`/api/initiative/${initId}/brief`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true }),
      })
      loadView('brief')
    } catch (err) {
      console.error('Failed to approve brief:', err)
    }
  }

  function renderActive() {
    if (openArtifact) {
      return (
        <ArtifactFullView
          initId={initId}
          artifactName={openArtifact.artifactName}
          activityTitle={openArtifact.activityTitle}
          phaseName={openArtifact.phaseName}
          onBack={() => setOpenArtifact(null)}
        />
      )
    }
    if (activeView === 'home') {
      return <WorkspaceHome data={data} onNavigate={onNavigate} />
    }

    if (loading && !loadedForView.current.has(activeView)) {
      return (
        <div style={{ padding: 48, textAlign: 'center', color: '#999' }}>
          <div
            style={{
              width: 24,
              height: 24,
              border: '2px solid #E4E4E2',
              borderTopColor: '#534AB7',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          Loading…
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )
    }

    if (activeView === 'brief') {
      const brief = data.brief
      if (!brief?.content) return renderEmpty('The employee brief will appear here once the change brief conversation is complete.')
      const words = (brief.content || '').split(/\s+/).filter(Boolean).length
      const readMins = Math.max(1, Math.round(words / 200))
      return (
        <div style={{ padding: '24px 28px 40px' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            <StatChip label="words" value={words} />
            <StatChip label="read" value={`${readMins} min`} />
            <div
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 500,
                background: brief.approved ? '#F0FAF6' : '#FFFBF0',
                color: brief.approved ? '#1D9E75' : '#F39C12',
                border: `1px solid ${brief.approved ? '#C5EBE0' : '#F5E6C8'}`,
              }}
            >
              {brief.approved ? 'Approved & Sent' : 'Pending Approval'}
            </div>
          </div>
          <div style={{ background: '#F6F5FF', border: '1px solid #D8D5F5', borderRadius: 12, padding: 22 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#534AB7', marginBottom: 12 }}>Change Brief</div>
            <div style={{ fontSize: 14, color: '#1A1A18', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {brief.content}
            </div>
            {!brief.approved && (
              <div style={{ marginTop: 18 }}>
                <button
                  onClick={approveBrief}
                  style={{
                    padding: '9px 18px',
                    fontSize: 13,
                    fontWeight: 500,
                    borderRadius: 8,
                    border: 'none',
                    background: '#534AB7',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Approve & Send to Employees
                </button>
              </div>
            )}
          </div>
        </div>
      )
    }

    if (activeView === 'playbook') {
      const versions = Array.isArray(data.playbook) ? data.playbook : (data.playbook ? [data.playbook] : [])
      if (versions.length === 0) return renderEmpty('The playbook will be generated after the change brief is finalized.')
      return (
        <div style={{ padding: '8px 4px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '4px 20px 8px' }}>
            <PlaybookDownloadButton initId={initId} />
          </div>
          <PlaybookCard
            versions={versions}
            initId={initId}
            focusedActivity={focusedActivity}
            onActivityFocused={onActivityFocused}
            onArtifactOpen={(ctx) => setOpenArtifact(ctx)}
          />
        </div>
      )
    }

    if (activeView === 'outreach') {
      const outreach = Array.isArray(data.outreach) ? data.outreach : []
      if (outreach.length === 0) return renderEmpty('Outreach suggestions will appear here as milestones are reached.')
      return (
        <div style={{ padding: '8px 4px 40px' }}>
          <OutreachCard outreachList={outreach} initId={initId} onRefresh={() => loadView('outreach')} />
        </div>
      )
    }

    if (activeView === 'synthesis') {
      const syn = Array.isArray(data.synthesis) ? data.synthesis[data.synthesis.length - 1] : data.synthesis
      if (!syn) return renderEmpty('Employee synthesis will appear here once enough employees have shared feedback and consented.')
      return (
        <div style={{ padding: '8px 4px 40px' }}>
          <SynthesisCard synthesis={syn} initiativeId={initId} />
        </div>
      )
    }

    return null
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FAFAF8' }}>
      {activeView !== 'home' && !openArtifact && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderBottom: '1px solid #EBEBEA',
            background: '#fff',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => onNavigate('home')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              marginLeft: -10,
              fontSize: 13,
              fontWeight: 500,
              color: '#6E6E6A',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 6,
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F5F5F2' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Workspace
          </button>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A18' }}>
            {VIEW_TITLES[activeView]}
          </div>
          <div style={{ width: 90 }} />
        </div>
      )}
      <div style={{ flex: 1, overflow: 'auto' }}>{renderActive()}</div>
    </div>
  )
}

function StatChip({ label, value }) {
  return (
    <div
      style={{
        padding: '8px 14px',
        borderRadius: 10,
        background: '#fff',
        border: '1px solid #EBEBEA',
        fontSize: 12,
      }}
    >
      <span style={{ fontWeight: 600, color: '#534AB7' }}>{value}</span>
      <span style={{ color: '#999', marginLeft: 4 }}>{label}</span>
    </div>
  )
}

function PlaybookDownloadButton({ initId }) {
  const [downloading, setDownloading] = useState(false)

  async function handle() {
    if (downloading) return
    setDownloading(true)
    try {
      const res = await fetch(`/api/initiative/${initId}/playbook?format=pdf`, { credentials: 'include' })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'playbook.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert('Download failed. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <button
      onClick={handle}
      disabled={downloading}
      style={{
        padding: '7px 13px',
        fontSize: 12,
        fontWeight: 500,
        borderRadius: 8,
        border: '1px solid #E4E4E2',
        background: downloading ? '#F7F7F5' : '#fff',
        color: downloading ? '#A0A09C' : '#3A3A36',
        cursor: downloading ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M12 4v12m0 0l-5-5m5 5l5-5M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {downloading ? 'Preparing…' : 'Download playbook'}
    </button>
  )
}

function renderEmpty(text) {
  return (
    <div style={{ padding: '48px 32px', textAlign: 'center', color: '#999', fontSize: 14, lineHeight: 1.7 }}>
      {text}
    </div>
  )
}
