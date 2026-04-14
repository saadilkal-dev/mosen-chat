'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const RichArtifactRenderer = dynamic(() => import('./RichArtifactRenderer'), { ssr: false })

// Claude-style artifact viewer with dark header bar.
// Rendered inside WorkspaceView when openArtifact is set.

export default function ArtifactFullView({
  initId,
  artifactName,
  activityTitle,
  phaseName,
  onBack,
}) {
  const [state, setState] = useState({ artifact: null, format: 'rich', loading: true, error: null, cached: false })
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  async function load(force = false) {
    setState({ artifact: null, format: 'rich', loading: true, error: null, cached: false })
    try {
      const res = await fetch(`/api/initiative/${initId}/artifact${force ? '?regen=1' : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ artifactName, activityTitle: activityTitle || '', phaseName: phaseName || '' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to generate artifact')
      }
      const data = await res.json()
      setState({ artifact: data.artifact, format: data.format || 'rich', loading: false, error: null, cached: !!data.cached })
    } catch (err) {
      setState({ artifact: null, format: 'rich', loading: false, error: err.message, cached: false })
    }
  }

  useEffect(() => {
    if (!initId || !artifactName) return
    load()
  }, [initId, artifactName, activityTitle, phaseName])

  function handleCopy() {
    const text = serialiseToText(state.artifact)
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleDownload() {
    if (!state.artifact || downloading) return
    setDownloading(true)
    try {
      const key = [phaseName, activityTitle, artifactName]
        .filter(Boolean)
        .join('::')
        .toLowerCase()
        .replace(/[^a-z0-9:]+/g, '-')
      const res = await fetch(`/api/initiative/${initId}/artifact/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ artifactKey: key }),
      })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${artifactName || 'artifact'}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed:', err)
      alert('Download failed. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      {/* Dark header bar — Claude.ai style */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: '#1A1A18',
          borderBottom: '1px solid #333',
          flexShrink: 0,
          gap: 12,
        }}
      >
        {/* Left: back + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 6,
              background: 'transparent', border: 'none',
              color: '#8A8A86', cursor: 'pointer',
              flexShrink: 0, transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#8A8A86' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 14, fontWeight: 600, color: '#fff',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {state.artifact?.title || artifactName}
            </div>
            {(phaseName || activityTitle) && (
              <div style={{ fontSize: 11, color: '#6E6E6A', marginTop: 1 }}>
                {phaseName}{phaseName && activityTitle ? ' · ' : ''}{activityTitle}
              </div>
            )}
          </div>
        </div>

        {/* Right: action buttons */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <DarkButton onClick={handleCopy} disabled={!state.artifact}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginRight: 4 }}>
              <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" />
            </svg>
            {copied ? 'Copied' : 'Copy'}
          </DarkButton>
          <DarkButton onClick={handleDownload} disabled={!state.artifact || downloading}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginRight: 4 }}>
              <path d="M12 4v12m0 0l-5-5m5 5l5-5M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {downloading ? 'Preparing…' : 'Download'}
          </DarkButton>
          <DarkButton onClick={() => load(true)} disabled={state.loading}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginRight: 4 }}>
              <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Regenerate
          </DarkButton>
        </div>
      </div>

      {/* Content area — scrollable */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {state.loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 14 }}>
            <div
              style={{
                width: 30, height: 30,
                border: '3px solid #E4E4E2', borderTopColor: '#534AB7',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              }}
            />
            <div style={{ fontSize: 13, color: '#6E6E6A' }}>
              Generating <strong style={{ color: '#534AB7' }}>{artifactName}</strong>…
            </div>
            <div style={{ fontSize: 11, color: '#A0A09C' }}>This may take a few seconds.</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {state.error && (
          <div style={{ padding: '28px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#C0392B', marginBottom: 12 }}>{state.error}</div>
            <button
              onClick={() => load(true)}
              style={{
                padding: '8px 18px', fontSize: 13, borderRadius: 8,
                border: '1px solid #D8D5F5', background: '#F6F5FF',
                color: '#534AB7', cursor: 'pointer', fontWeight: 500,
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}
            >
              Try again
            </button>
          </div>
        )}

        {state.artifact && !state.loading && (
          <div style={{ padding: '20px 24px 40px' }}>
            <RichArtifactRenderer artifact={state.artifact} />
          </div>
        )}
      </div>
    </div>
  )
}

function DarkButton({ onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '6px 10px', fontSize: 11, fontWeight: 500,
        borderRadius: 6,
        border: '1px solid #444',
        background: disabled ? '#222' : '#2A2A28',
        color: disabled ? '#555' : '#ccc',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = '#3A3A38'; e.currentTarget.style.color = '#fff' } }}
      onMouseLeave={e => { if (!disabled) { e.currentTarget.style.background = '#2A2A28'; e.currentTarget.style.color = '#ccc' } }}
    >
      {children}
    </button>
  )
}

// Flatten an artifact (rich or legacy) into plaintext for clipboard.
function serialiseToText(artifact) {
  if (!artifact) return ''
  if (typeof artifact === 'string') return artifact
  if (typeof artifact.markdown === 'string') return artifact.markdown
  if (!Array.isArray(artifact.sections)) return artifact.title || ''

  const out = []
  if (artifact.title) out.push(artifact.title, '')

  for (const s of artifact.sections) {
    if (!s || typeof s !== 'object') continue
    switch (s.kind) {
      case 'heading':
        out.push('', '#'.repeat(Math.min(Math.max(s.level || 1, 1), 3)) + ' ' + (s.text || ''))
        break
      case 'paragraph':
        out.push(s.text || '')
        break
      case 'callout':
        out.push(`[${(s.variant || 'info').toUpperCase()}] ${s.title ? s.title + ': ' : ''}${s.text || ''}`)
        break
      case 'table': {
        if (Array.isArray(s.headers)) out.push(s.headers.join(' | '))
        if (Array.isArray(s.headers)) out.push(s.headers.map(() => '---').join(' | '))
        for (const row of s.rows || []) {
          if (Array.isArray(row)) out.push(row.join(' | '))
        }
        break
      }
      case 'checklist':
        if (s.title) out.push(s.title)
        for (const it of s.items || []) out.push(`- [${it.checked ? 'x' : ' '}] ${it.text || ''}`)
        break
      case 'timeline':
        if (s.title) out.push(s.title)
        for (const ev of s.events || []) out.push(`- ${ev.date || ''}: ${ev.label || ''} (${ev.status || 'upcoming'})`)
        break
      case 'chart':
        if (s.title) out.push(s.title)
        for (const d of s.data || []) out.push(`- ${d.label || ''}: ${d.value ?? ''}`)
        break
      case 'quote':
        out.push(`> ${s.text || ''}${s.attribution ? ` — ${s.attribution}` : ''}`)
        break
      case 'divider':
        out.push('---')
        break
    }
  }
  return out.join('\n')
}
