'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import SplitPanel from '../../../components/leader/SplitPanel'
import WorkspaceView from '../../../components/leader/WorkspaceView'
import ArtifactChatCard from '../../../components/leader/ArtifactChatCard'
import PlaybookDraftCard from '../../../components/leader/PlaybookDraftCard'

export default function InitiativePage() {
  const { id } = useParams()
  const [initiative, setInitiative] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState(null)
  const [collapsed, setCollapsed] = useState(false)
  const [activeView, setActiveView] = useState('home')
  const [focusedActivity, setFocusedActivity] = useState(null)
  const [documentOpen, setDocumentOpen] = useState(false)

  // Map an artifact type emitted by the chat tools to the workspace view that surfaces it.
  // playbook_draft is handled separately (renders PlaybookDraftCard), included here to pass the filter.
  const VIEW_FOR_TYPE = {
    playbook: 'playbook',
    playbook_draft: 'playbook',
    playbook_confirmed: 'playbook',
    brief: 'brief',
    outreach_suggestion: 'outreach',
    synthesis_card: 'synthesis',
    experiment_card: 'playbook',
    activity_artifact: 'playbook',
  }

  function handleArtifactCardClick(artifact) {
    const view = VIEW_FOR_TYPE[artifact.type]
    if (!view) return
    if (artifact.type === 'experiment_card' && typeof artifact.phaseIndex === 'number') {
      setFocusedActivity({ phaseIndex: artifact.phaseIndex, activityIndex: artifact.activityIndex })
    }
    setActiveView(view)
  }

  function handlePlaybookConfirmed() {
    setActiveView('playbook')
    loadInitiative()
  }

  function handleRequestChanges() {
    inputRef.current?.focus()
  }

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    loadInitiative()
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadInitiative() {
    try {
      const [initRes, chatRes] = await Promise.all([
        fetch(`/api/initiative/${id}`, { credentials: 'include' }),
        fetch(`/api/initiative/${id}/chat`, { credentials: 'include' }),
      ])

      if (!initRes.ok) throw new Error('Failed to load initiative')
      const initData = await initRes.json()
      setInitiative(initData.initiative)

      const chatData = chatRes.ok ? await chatRes.json().catch(() => ({})) : {}
      const saved = Array.isArray(chatData.messages) ? chatData.messages : []

      if (saved.length > 0) {
        setMessages(saved.map(m => {
          const parsedCards = Array.isArray(m.artifacts) && m.artifacts.length > 0
            ? m.artifacts.map(a => {
                try { return typeof a === 'string' ? JSON.parse(a) : a } catch { return null }
              }).filter(a => a && !a.error && VIEW_FOR_TYPE[a.type])
            : undefined
          return {
            from: m.from === 'leader' ? 'user' : 'mosen',
            text: m.text,
            cards: parsedCards?.length > 0 ? parsedCards : undefined,
          }
        }))
      } else {
        const briefComplete = initData.initiative?.briefComplete === 'true'
        setMessages([{
          from: 'mosen',
          text: briefComplete
            ? `Welcome back. Let's continue working on "${initData.initiative?.title || 'your initiative'}". What's on your mind?`
            : `Let's build a clear picture of this change together. I'll ask you a few questions — one at a time — to understand what's really happening, why, and who it affects. Ready to start?`
        }])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setPageLoading(false)
    }
  }

  async function handleSend() {
    if (!input.trim() || loading) return
    const msg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { from: 'user', text: msg }])
    setLoading(true)

    try {
      const res = await fetch(`/api/initiative/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Chat failed')
      }

      const data = await res.json()

      const parsedArtifacts = (data.artifacts || []).map(a => {
        try { return typeof a === 'string' ? JSON.parse(a) : a } catch { return null }
      }).filter(a => a && !a.error && VIEW_FOR_TYPE[a.type])

      setMessages(prev => [...prev, {
        from: 'mosen',
        text: data.response,
        cards: parsedArtifacts.length > 0 ? parsedArtifacts : undefined,
      }])
    } catch (err) {
      setMessages(prev => [...prev, { from: 'mosen', text: `Something went wrong: ${err.message}. Try again?` }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  // Markdown components for Mosen messages — minimal styling
  const mdComponents = {
    p: ({ children }) => <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>{children}</p>,
    strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    ul: ({ children }) => <ul style={{ margin: '4px 0 8px', paddingLeft: 20 }}>{children}</ul>,
    ol: ({ children }) => <ol style={{ margin: '4px 0 8px', paddingLeft: 20 }}>{children}</ol>,
    li: ({ children }) => <li style={{ marginBottom: 2, lineHeight: 1.6 }}>{children}</li>,
    h1: ({ children }) => <div style={{ fontSize: 16, fontWeight: 600, margin: '12px 0 6px' }}>{children}</div>,
    h2: ({ children }) => <div style={{ fontSize: 15, fontWeight: 600, margin: '10px 0 4px' }}>{children}</div>,
    h3: ({ children }) => <div style={{ fontSize: 14, fontWeight: 600, margin: '8px 0 4px' }}>{children}</div>,
    code: ({ children }) => <code style={{ background: '#F0EFF5', padding: '1px 5px', borderRadius: 4, fontSize: 13 }}>{children}</code>,
    blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid #D8D5F5', margin: '8px 0', paddingLeft: 12, color: '#666' }}>{children}</blockquote>,
  }

  if (pageLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', system-ui, sans-serif", background: '#FAFAF8' }}>
        <div style={{ textAlign: 'center', color: '#999' }}>
          <div style={{ width: 28, height: 28, border: '2px solid #D8D5F5', borderTopColor: '#534AB7', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Loading initiative...
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', system-ui, sans-serif", background: '#FAFAF8' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 16, color: '#C0392B', marginBottom: 12 }}>{error}</div>
          <a href="/dashboard" style={{ fontSize: 14, color: '#534AB7' }}>Back to dashboard</a>
        </div>
      </div>
    )
  }

  // ─── Chat Panel (Left) ───
  const chatPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FAFAF8' }}>
      {/* Messages — centered with max-width like Claude */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 24px 16px' }}>

          {/* Subtle Mosen label at top of chat */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '5px 14px', borderRadius: 20,
              background: '#fff', border: '1px solid #EBEBEA',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: 4,
                background: 'linear-gradient(135deg, #534AB7, #7B72D6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 800, color: '#fff',
              }}>M</div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#534AB7' }}>Mosen</span>
              <span style={{ fontSize: 11, color: '#C0BDE8' }}>·</span>
              <span style={{ fontSize: 11, color: '#9B94D0', fontWeight: 400 }}>Change Partner</span>
            </div>
          </div>

          {messages.filter(msg => msg.text?.trim()).map((msg, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 18
            }}>
              <div style={{ display: 'flex', gap: 10, maxWidth: '88%', flexDirection: msg.from === 'user' ? 'row-reverse' : 'row' }}>
                {/* Avatar */}
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: msg.from === 'user' ? '#EDECEA' : 'linear-gradient(135deg, #534AB7, #7B72D6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                  boxShadow: msg.from === 'mosen' ? '0 1px 4px rgba(83,74,183,0.25)' : 'none',
                  marginTop: 2,
                }}>
                  {msg.from === 'user' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="4" fill="#888" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#888" strokeWidth="2" />
                    </svg>
                  ) : (
                    <span style={{ color: '#fff' }}>M</span>
                  )}
                </div>
                {/* Bubble + cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{
                    padding: '11px 16px', borderRadius: 16, fontSize: 14, lineHeight: 1.75,
                    color: '#1A1A18',
                    background: msg.from === 'user' ? '#EDECEA' : '#fff',
                    border: msg.from === 'user' ? 'none' : '1px solid #EBEBEA',
                    borderTopRightRadius: msg.from === 'user' ? 4 : 16,
                    borderTopLeftRadius: msg.from === 'user' ? 16 : 4,
                    boxShadow: msg.from === 'mosen' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                  }}>
                    {msg.from === 'mosen'
                      ? <ReactMarkdown components={mdComponents}>{msg.text}</ReactMarkdown>
                      : <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>
                    }
                  </div>
                  {msg.from === 'mosen' && msg.cards?.length > 0 && msg.cards.map((card, ci) => (
                    card.type === 'playbook_draft'
                      ? <PlaybookDraftCard
                          key={ci}
                          draft={card}
                          initId={id}
                          onConfirmed={handlePlaybookConfirmed}
                          onRequestChanges={handleRequestChanges}
                        />
                      : <ArtifactChatCard
                          key={ci}
                          artifact={card}
                          onOpen={handleArtifactCardClick}
                        />
                  ))}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', marginTop: 2,
                background: 'linear-gradient(135deg, #534AB7, #7B72D6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0,
                boxShadow: '0 1px 4px rgba(83,74,183,0.25)',
              }}>
                M
              </div>
              <div style={{ padding: '12px 18px', borderRadius: 16, borderTopLeftRadius: 4, background: '#fff', border: '1px solid #EBEBEA', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#534AB7',
                      animation: `bounce 1.2s infinite ${i * 0.2}s`, opacity: 0.4
                    }} />
                  ))}
                </div>
                <style>{`@keyframes bounce { 0%, 80%, 100% { opacity: 0.4; transform: scale(1); } 40% { opacity: 1; transform: scale(1.2); } }`}</style>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input — centered with max-width */}
      <div style={{ padding: '12px 24px 20px', borderTop: '1px solid #EBEBEA', background: '#FAFAF8' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
              }}
              placeholder="Type your message..."
              rows={1}
              style={{
                flex: 1, resize: 'none', padding: '10px 14px', fontSize: 14, borderRadius: 12,
                border: '1px solid #E3E3DE', background: '#fff', outline: 'none',
                fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: 1.5,
                maxHeight: 120, overflow: 'auto'
              }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              style={{
                width: 40, height: 40, borderRadius: 10, border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                background: input.trim() ? '#534AB7' : '#EBEBEA', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'background 0.2s'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Top Bar */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', background: '#fff', borderBottom: '1px solid #EBEBEA',
        position: 'relative', zIndex: 10,
      }}>
        {/* Left: logo + divider + breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <a href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg, #534AB7 0%, #7B72D6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px',
              boxShadow: '0 1px 4px rgba(83,74,183,0.25)',
            }}>M</div>
          </a>
          <div style={{ width: 1, height: 20, background: '#EBEBEA', flexShrink: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <a href="/dashboard" style={{ fontSize: 12, color: '#B0B0AA', textDecoration: 'none', fontWeight: 400 }}>
              Dashboard
            </a>
            <span style={{ color: '#D8D8D3', fontSize: 13 }}>/</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A18', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {initiative?.title || 'Initiative'}
            </span>
          </div>
        </div>

        {/* Right: status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 600,
            letterSpacing: '0.01em',
            background: initiative?.status === 'active' ? '#F0FAF6' : '#F5F5F2',
            color: initiative?.status === 'active' ? '#1D9E75' : '#8E8E8A',
            border: `1px solid ${initiative?.status === 'active' ? '#C0E8D8' : '#E8E8E3'}`,
          }}>
            {initiative?.status === 'active' ? '● Active' : initiative?.status === 'draft' ? 'Draft' : (initiative?.status || 'Draft')}
          </span>
        </div>
      </div>

      {/* Split Panel — 60/40 default, shifts to 50/50 when artifact is open */}
      <SplitPanel
        leftContent={chatPanel}
        leftWidth={documentOpen ? 50 : 60}
        rightContent={
          <WorkspaceView
            initId={id}
            activeView={activeView}
            onNavigate={setActiveView}
            focusedActivity={focusedActivity}
            onActivityFocused={() => setFocusedActivity(null)}
            onDocumentOpenChange={setDocumentOpen}
          />
        }
        collapsed={collapsed}
        onToggle={setCollapsed}
      />
    </div>
  )
}
