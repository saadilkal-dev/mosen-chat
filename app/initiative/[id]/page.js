'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { employeeInitiativePrompt } from '@/lib/mosen-prompts'
import ReactMarkdown from 'react-markdown'
import ShareInitiativeModal from '@/components/leader/ShareInitiativeModal'
import SplitPanel from '@/components/leader/SplitPanel'
import WorkspaceView from '@/components/leader/WorkspaceView'
import ArtifactChatCard from '@/components/leader/ArtifactChatCard'
import PlaybookDraftCard from '@/components/leader/PlaybookDraftCard'

// ─── Colours ──────────────────────────────────────────────────────────────────
const LEADER_COLOR   = '#534AB7'
const LEADER_LIGHT   = '#F6F5FF'
const LEADER_BORDER  = '#D8D5F5'
const LEADER_DARK    = '#2D2560'
const EMPLOYEE_COLOR  = '#1D9E75'
const EMPLOYEE_LIGHT  = '#E6F7F0'
const EMPLOYEE_BORDER = '#C5EBE0'
const EMPLOYEE_DARK   = '#0A4D3A'

const mkId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

function extractBriefText(brief) {
  if (!brief) return ''
  if (typeof brief === 'string') return brief
  if (typeof brief === 'object') {
    if (typeof brief.content === 'string') return brief.content
    if (brief.content?.body) return String(brief.content.body)
  }
  return ''
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function LoadingView() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAF8', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, border: '3px solid #EBEBEA', borderTopColor: LEADER_COLOR, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: 14, color: '#999', margin: 0 }}>Loading initiative…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}

function ErrorView({ message }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAF8', padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: '#fff', border: '1px solid #FDDDD9', borderRadius: 16, padding: '40px 36px', maxWidth: 400, textAlign: 'center' }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#C0392B', margin: '0 0 8px' }}>Something went wrong</p>
        <p style={{ fontSize: 14, color: '#888', margin: 0 }}>{message || 'Initiative not found or you don\'t have access.'}</p>
        <a href="/dashboard" style={{ display: 'inline-block', marginTop: 16, fontSize: 14, color: LEADER_COLOR, textDecoration: 'none' }}>Back to dashboard</a>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LEADER VIEW — full workspace split-panel with artifact cards, markdown, share
// ─────────────────────────────────────────────────────────────────────────────
function LeaderView({ initiativeId, initiative, isPublic: initialIsPublic }) {
  const [messages, setMessages]           = useState([])
  const [input, setInput]                 = useState('')
  const [loading, setLoading]             = useState(false)
  const [shareOpen, setShareOpen]         = useState(false)
  const [isPublic, setIsPublic]           = useState(!!initialIsPublic)
  const [shareSuccess, setShareSuccess]   = useState('')
  const [activeView, setActiveView]       = useState('home')
  const [focusedActivity, setFocusedActivity] = useState(null)
  const [documentOpen, setDocumentOpen]   = useState(false)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

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
    loadChat()
  }

  function handleRequestChanges() {
    inputRef.current?.focus()
  }

  useEffect(() => {
    loadChat()
  }, [initiativeId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadChat() {
    try {
      const chatRes = await fetch(`/api/initiative/${initiativeId}/chat`, { credentials: 'include' })
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
            id: mkId(),
            from: m.from === 'leader' ? 'user' : 'mosen',
            text: m.text,
            cards: parsedCards?.length > 0 ? parsedCards : undefined,
          }
        }))
      } else {
        setMessages([{
          id: mkId(),
          from: 'mosen',
          text: `Let's build a clear picture of this change together. I'll ask you a few questions — one at a time — to understand what's really happening, why, and who it affects. Ready to start?`,
        }])
      }
    } catch {}
  }

  async function handleSend() {
    if (!input.trim() || loading) return
    const msg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { id: mkId(), from: 'user', text: msg }])
    setLoading(true)

    try {
      const res = await fetch(`/api/initiative/${initiativeId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: msg }),
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
        id: mkId(),
        from: 'mosen',
        text: data.response,
        cards: parsedArtifacts.length > 0 ? parsedArtifacts : undefined,
      }])
    } catch (err) {
      setMessages(prev => [...prev, { id: mkId(), from: 'mosen', text: `Something went wrong: ${err.message}. Try again?` }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

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

  // ─── Chat Panel (Left) ───
  const chatPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FAFAF8' }}>
      {/* Header with share button */}
      <div style={{ height: 56, background: '#fff', borderBottom: '1px solid #EBEBEA', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EAE8FC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" fill={LEADER_COLOR} />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={LEADER_COLOR} strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="8" r="2" fill="#EAE8FC" />
          </svg>
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A18', letterSpacing: '-0.3px' }}>mosen</span>
        <div style={{ width: 1, height: 16, background: '#EBEBEA' }} />
        <span style={{ fontSize: 13, color: '#888', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {initiative.title}
        </span>
        <button
          onClick={() => setShareOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 20, border: `1px solid ${isPublic ? EMPLOYEE_BORDER : LEADER_BORDER}`,
            background: isPublic ? EMPLOYEE_LIGHT : LEADER_LIGHT, cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
            color: isPublic ? EMPLOYEE_COLOR : LEADER_COLOR,
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
          title={isPublic ? 'Initiative is shared with your team' : 'Share with team'}
        >
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
            <circle cx="15" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="15" cy="16" r="2.5" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="5" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7.5 10H12.5M12.5 5.5L7.5 9M12.5 14.5L7.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {isPublic ? 'Shared' : 'Share'}
        </button>
      </div>

      {shareSuccess && (
        <div style={{ padding: '8px 20px', background: EMPLOYEE_LIGHT, borderBottom: `1px solid ${EMPLOYEE_BORDER}`, fontSize: 13, color: EMPLOYEE_DARK }}>
          {shareSuccess}
        </div>
      )}

      {/* Messages — centered with max-width */}
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
            <div key={msg.id || i} style={{
              display: 'flex', justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 18,
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
                          initId={initiativeId}
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
                      animation: `bounce 1.2s infinite ${i * 0.2}s`, opacity: 0.4,
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
              placeholder="Talk to Mosen about this change…"
              disabled={loading}
              rows={1}
              style={{
                flex: 1, resize: 'none', padding: '10px 14px', fontSize: 14, borderRadius: 12,
                border: '1px solid #E3E3DE', background: '#fff', outline: 'none',
                fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: 1.5,
                maxHeight: 120, overflow: 'auto',
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
                width: 40, height: 40, borderRadius: 10, border: 'none',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                background: input.trim() ? '#534AB7' : '#EBEBEA', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'background 0.2s',
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
    <>
      <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        {/* Top Bar */}
        <div style={{
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', background: '#fff', borderBottom: '1px solid #EBEBEA',
          position: 'relative', zIndex: 10,
        }}>
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
              initId={initiativeId}
              activeView={activeView}
              onNavigate={setActiveView}
              focusedActivity={focusedActivity}
              onActivityFocused={() => setFocusedActivity(null)}
              onDocumentOpenChange={setDocumentOpen}
            />
          }
        />
      </div>

      {shareOpen && (
        <ShareInitiativeModal
          initiativeId={initiativeId}
          initiativeTitle={initiative.title}
          currentIsPublic={isPublic}
          onClose={() => setShareOpen(false)}
          onPublish={(result) => {
            setIsPublic(result.initiative?.is_public ?? true)
            setShareSuccess(result.message || 'Initiative shared with your team.')
            setTimeout(() => setShareSuccess(''), 4000)
          }}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE VIEW — chat with Mosen about the change, brief shown on the side
// ─────────────────────────────────────────────────────────────────────────────
function EmployeeView({ initiativeId, initiative, brief }) {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const introMsg = `Hi there. I'm Mosen, your confidential thinking partner as the team navigates "${initiative.title}". I'm not connected to HR or management — anything you share stays with me unless you decide otherwise. What brought you here today?`
    setMessages([{ id: mkId(), role: 'assistant', content: introMsg, ts: Date.now() }])
  }, [initiative.title])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || chatLoading) return
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { id: mkId(), role: 'user', content: userMessage, ts: Date.now() }])
    setChatLoading(true)

    try {
      const briefText = extractBriefText(brief)
      const systemPrompt = employeeInitiativePrompt({
        employee_name: 'Employee',
        initiative_title: initiative.title,
        brief: briefText,
        playbook_summary: '',
        rag_context: null,
      })

      const chatHistory = messages.map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [...chatHistory, { role: 'user', content: userMessage }],
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || 'Chat failed')
      }

      const data = await res.json()
      const responseText = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n') || "I didn't catch that."
      setMessages(prev => [...prev, { id: mkId(), role: 'assistant', content: responseText, ts: Date.now() }])
    } catch (err) {
      setMessages(prev => [...prev, { id: mkId(), role: 'assistant', content: `Something went wrong: ${err.message}`, ts: Date.now() }])
    } finally {
      setChatLoading(false)
    }
  }, [input, messages, chatLoading, initiative, brief])

  const briefText = extractBriefText(brief)

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Left: Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#FAFAF8' }}>
        <div style={{ height: 56, background: '#fff', borderBottom: '1px solid #EBEBEA', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#DFF3EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" fill={EMPLOYEE_COLOR} />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={EMPLOYEE_COLOR} strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="8" r="2" fill="#DFF3EC" />
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A18', letterSpacing: '-0.3px' }}>mosen</span>
          <div style={{ width: 1, height: 16, background: '#EBEBEA' }} />
          <span style={{ fontSize: 13, color: '#888', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {initiative.title}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: EMPLOYEE_LIGHT, border: `1px solid ${EMPLOYEE_BORDER}`, borderRadius: 20, padding: '5px 11px' }}>
            <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
              <path d="M10 1.5L3 4.5V9C3 13.1 6 16.9 10 18C14 16.9 17 13.1 17 9V4.5L10 1.5Z" fill={EMPLOYEE_LIGHT} stroke={EMPLOYEE_COLOR} strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M7 10L9 12L13 8" stroke={EMPLOYEE_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 600, color: EMPLOYEE_COLOR }}>Confidential</span>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px 16px' }}>
          <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.map(msg => {
              const isMosen = msg.role === 'assistant'
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMosen ? 'flex-start' : 'flex-end' }}>
                  <div style={{
                    maxWidth: '72%', padding: '11px 15px', fontSize: 14, lineHeight: 1.72,
                    borderRadius: isMosen ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                    background: isMosen ? EMPLOYEE_LIGHT : '#fff',
                    border: `1px solid ${isMosen ? EMPLOYEE_BORDER : '#E4E4E0'}`,
                    color: isMosen ? EMPLOYEE_DARK : '#1A1A18',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {msg.content}
                  </div>
                </div>
              )
            })}
            {chatLoading && (
              <div style={{ display: 'flex' }}>
                <div style={{ padding: '10px 15px', borderRadius: '16px 16px 16px 4px', background: EMPLOYEE_LIGHT, border: `1px solid ${EMPLOYEE_BORDER}` }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: EMPLOYEE_COLOR, opacity: 0.5, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
            <style>{`@keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:1} }`}</style>
          </div>
        </div>

        {/* Input */}
        <div style={{ padding: '12px 20px 18px', background: '#fff', borderTop: '1px solid #EBEBEA' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', maxWidth: 680, margin: '0 auto' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Share what's on your mind…"
              rows={1}
              disabled={chatLoading}
              style={{
                flex: 1, resize: 'none', minHeight: 44, padding: '11px 14px',
                fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                border: '1px solid #E0E0DC', borderRadius: 14, outline: 'none',
                lineHeight: 1.55, background: '#FAFAF8', color: '#1A1A18',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={chatLoading || !input.trim()}
              style={{
                width: 44, height: 44, borderRadius: 12, border: 'none', flexShrink: 0,
                background: chatLoading || !input.trim() ? '#E8E8E8' : EMPLOYEE_COLOR,
                color: chatLoading || !input.trim() ? '#BBB' : '#fff',
                cursor: chatLoading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Right: Brief blade */}
      <div style={{ width: 380, borderLeft: '1px solid #EBEBEA', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #EBEBEA' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="1.5" width="11" height="15" rx="2" stroke={EMPLOYEE_COLOR} strokeWidth="1.5" />
              <path d="M6 6.5h8M6 9.5h8M6 12.5h5" stroke={EMPLOYEE_COLOR} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 700, color: EMPLOYEE_COLOR, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Change Initiative</span>
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#1A1A18', lineHeight: 1.35, letterSpacing: '-0.2px' }}>
            {initiative.title}
          </h2>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {briefText ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: EMPLOYEE_COLOR, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>
                Change Brief
              </div>
              <p style={{ fontSize: 14, color: '#444', lineHeight: 1.72, margin: 0, whiteSpace: 'pre-wrap' }}>
                {briefText}
              </p>
            </>
          ) : (
            <div style={{ background: '#F9F9F7', border: '1px dashed #DEDED6', borderRadius: 12, padding: '18px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#BBB', margin: 0 }}>Brief not yet available</p>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #EBEBEA', background: EMPLOYEE_LIGHT }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
              <path d="M10 1.5L3 4.5V9C3 13.1 6 16.9 10 18C14 16.9 17 13.1 17 9V4.5L10 1.5Z" fill={EMPLOYEE_LIGHT} stroke={EMPLOYEE_COLOR} strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M7 10L9 12L13 8" stroke={EMPLOYEE_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p style={{ fontSize: 12, color: EMPLOYEE_DARK, margin: 0, lineHeight: 1.45 }}>
              Your conversation is confidential. Nothing is shared without your consent.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT — detects owner vs employee and routes accordingly
// ─────────────────────────────────────────────────────────────────────────────
export default function InitiativePage({ params }) {
  const { user, loading: authLoading } = useAuth()
  const [pageData, setPageData]  = useState(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError]        = useState(null)

  const initiativeId = params.id

  useEffect(() => {
    if (authLoading) return

    const load = async () => {
      try {
        const res = await fetch(`/api/initiative/${initiativeId}`, { credentials: 'include' })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || `Error ${res.status}`)
        }
        const data = await res.json()
        setPageData(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setDataLoading(false)
      }
    }

    load()
  }, [initiativeId, authLoading])

  if (authLoading || dataLoading) return <LoadingView />
  if (error)                  return <ErrorView message={error} />
  if (!pageData)              return <ErrorView message="Initiative not found." />

  const { initiative, brief, isOwner } = pageData

  if (isOwner) {
    return (
      <LeaderView
        initiativeId={initiativeId}
        initiative={initiative}
        isPublic={initiative.isPublic}
      />
    )
  }

  return (
    <EmployeeView
      initiativeId={initiativeId}
      initiative={initiative}
      brief={brief}
    />
  )
}
