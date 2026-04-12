'use client'
import { useState, useEffect, useRef } from 'react'

export default function ArtifactModal({ open, onClose, artifactName, activityTitle, phaseName, initId }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const contentRef = useRef(null)

  useEffect(() => {
    if (open && artifactName && initId) {
      generateArtifact()
    }
    if (!open) {
      setContent(null)
      setError(null)
      setCopied(false)
    }
  }, [open, artifactName])

  async function generateArtifact() {
    setLoading(true)
    setError(null)
    setContent(null)

    try {
      const res = await fetch(`/api/initiative/${initId}/artifact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          artifactName: artifactName,
          activityTitle: activityTitle || '',
          phaseName: phaseName || '',
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to generate artifact')
      }

      const data = await res.json()
      setContent(data.content)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (!content) return
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function renderMarkdown(text) {
    if (!text) return null
    const lines = text.split('\n')
    const elements = []
    let i = 0

    while (i < lines.length) {
      const line = lines[i]

      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={i} style={{ fontSize: 15, fontWeight: 600, color: '#1A1A18', margin: '20px 0 8px' }}>
            {line.slice(4)}
          </h3>
        )
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={i} style={{ fontSize: 17, fontWeight: 700, color: '#1A1A18', margin: '24px 0 10px' }}>
            {line.slice(3)}
          </h2>
        )
      } else if (line.startsWith('# ')) {
        elements.push(
          <h1 key={i} style={{ fontSize: 20, fontWeight: 700, color: '#1A1A18', margin: '24px 0 12px' }}>
            {line.slice(2)}
          </h1>
        )
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, paddingLeft: 4 }}>
            <span style={{ color: '#534AB7', fontWeight: 700, flexShrink: 0 }}>•</span>
            <span style={{ fontSize: 13, color: '#444', lineHeight: 1.6 }}>{renderInline(line.slice(2))}</span>
          </div>
        )
      } else if (/^\d+\.\s/.test(line)) {
        const num = line.match(/^(\d+)\.\s/)[1]
        elements.push(
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, paddingLeft: 4 }}>
            <span style={{ color: '#534AB7', fontWeight: 600, flexShrink: 0, fontSize: 13 }}>{num}.</span>
            <span style={{ fontSize: 13, color: '#444', lineHeight: 1.6 }}>{renderInline(line.replace(/^\d+\.\s/, ''))}</span>
          </div>
        )
      } else if (line.startsWith('```')) {
        const codeLines = []
        i++
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i])
          i++
        }
        elements.push(
          <pre key={`code-${i}`} style={{
            background: '#F5F5F2', padding: '12px 16px', borderRadius: 8,
            fontSize: 12, lineHeight: 1.6, overflow: 'auto', margin: '12px 0',
            fontFamily: "'DM Mono', monospace", color: '#1A1A18'
          }}>
            {codeLines.join('\n')}
          </pre>
        )
      } else if (line.startsWith('---') || line.startsWith('***')) {
        elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid #EBEBEA', margin: '16px 0' }} />)
      } else if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={i} style={{
            borderLeft: '3px solid #D8D5F5', padding: '8px 14px', margin: '12px 0',
            background: '#F6F5FF', borderRadius: '0 8px 8px 0', fontSize: 13, color: '#555', lineHeight: 1.6
          }}>
            {renderInline(line.slice(2))}
          </blockquote>
        )
      } else if (line.trim() === '') {
        elements.push(<div key={i} style={{ height: 8 }} />)
      } else {
        elements.push(
          <p key={i} style={{ fontSize: 13, color: '#444', lineHeight: 1.7, margin: '4px 0' }}>
            {renderInline(line)}
          </p>
        )
      }
      i++
    }
    return elements
  }

  function renderInline(text) {
    // Handle bold and italic inline
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g)
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} style={{ fontWeight: 600, color: '#1A1A18' }}>{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
        return <em key={idx}>{part.slice(1, -1)}</em>
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={idx} style={{ background: '#F5F5F2', padding: '1px 5px', borderRadius: 4, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{part.slice(1, -1)}</code>
      }
      return part
    })
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 1000, animation: 'fadeIn 0.2s ease'
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90vw', maxWidth: 680, maxHeight: '85vh',
        background: '#fff', borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        zIndex: 1001, display: 'flex', flexDirection: 'column',
        animation: 'modalIn 0.25s ease',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #EBEBEA',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {artifactName}
            </div>
            {(activityTitle || phaseName) && (
              <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                {phaseName}{phaseName && activityTitle ? ' → ' : ''}{activityTitle}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {content && (
              <button
                onClick={handleCopy}
                style={{
                  padding: '6px 12px', fontSize: 12, borderRadius: 8,
                  border: '1px solid #EBEBEA', background: copied ? '#F0FAF6' : '#fff',
                  color: copied ? '#1D9E75' : '#666', cursor: 'pointer',
                  fontWeight: 500, transition: 'all 0.2s',
                  fontFamily: "'DM Sans', system-ui, sans-serif"
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: '1px solid #EBEBEA', background: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#999', fontSize: 18, lineHeight: 1
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div ref={contentRef} style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 16 }}>
              <div style={{
                width: 32, height: 32, border: '3px solid #D8D5F5', borderTopColor: '#534AB7',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite'
              }} />
              <div style={{ fontSize: 13, color: '#999', textAlign: 'center' }}>
                Generating <strong style={{ color: '#534AB7' }}>{artifactName}</strong>...
              </div>
              <div style={{ fontSize: 11, color: '#bbb' }}>This may take a few seconds</div>
            </div>
          )}

          {error && (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: '#C0392B', marginBottom: 12 }}>{error}</div>
              <button
                onClick={generateArtifact}
                style={{
                  padding: '8px 20px', fontSize: 13, borderRadius: 8,
                  border: '1px solid #D8D5F5', background: '#F6F5FF',
                  color: '#534AB7', cursor: 'pointer', fontWeight: 500,
                  fontFamily: "'DM Sans', system-ui, sans-serif"
                }}
              >
                Try Again
              </button>
            </div>
          )}

          {content && !loading && (
            <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              {renderMarkdown(content)}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn { from { opacity: 0; transform: translate(-50%, -48%); } to { opacity: 1; transform: translate(-50%, -50%); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
