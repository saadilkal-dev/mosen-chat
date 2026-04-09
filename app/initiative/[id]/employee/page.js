'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import BriefDisplay from '@/components/employee/BriefDisplay'
import ConsentCard from '@/components/employee/ConsentCard'
import ClosedLoopCard from '@/components/employee/ClosedLoopCard'

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  green:       '#1D9E75',
  greenLight:  '#F0FAF6',
  greenDark:   '#0A4D3A',
  greenBorder: '#C5EBE0',
  greenAvatar: '#DFF3EC',
  bg:          '#FAFAF8',
  surface:     '#FFFFFF',
  border:      '#EBEBEA',
  borderInput: '#E0E0DC',
  text:        '#1A1A18',
  textMuted:   '#888886',
  textFaint:   '#BCBCB6',
  error:       '#C0392B',
  errorBg:     '#FFF3F0',
  errorBorder: '#FDDDD9',
}

function mkId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// ─── Format timestamp ─────────────────────────────────────────────────────────
function fmtTime(ts) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// ─── Shimmer skeleton ─────────────────────────────────────────────────────────
function Bone({ w, h, r = 8, style = {} }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r, flexShrink: 0,
      background: 'linear-gradient(90deg, #EEEEE8 0%, #E4E4DE 50%, #EEEEE8 100%)',
      backgroundSize: '400% 100%',
      animation: 'shimmer 1.6s ease-in-out infinite',
      ...style,
    }} />
  )
}

function LoadingScreen() {
  return (
    <div className="chat-page" style={{ display: 'flex', flexDirection: 'column', background: T.bg }}>
      {/* header */}
      <div style={{ height: 56, background: T.surface, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0 }}>
        <Bone w={28} h={28} r="50%" />
        <Bone w={52} h={14} />
        <div style={{ flex: 1 }} />
        <Bone w={94} h={26} r={20} />
      </div>
      {/* strip */}
      <div style={{ height: 35, background: T.greenLight, borderBottom: `1px solid ${T.greenBorder}` }} />
      {/* messages */}
      <div style={{ flex: 1, padding: '28px 20px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Bone w="100%" h={110} r={12} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <Bone w={32} h={32} r="50%" />
            <Bone w={260} h={64} r="4px 16px 16px 16px" />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexDirection: 'row-reverse' }}>
            <Bone w={32} h={32} r="50%" />
            <Bone w={190} h={48} r="16px 4px 16px 16px" />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <Bone w={32} h={32} r="50%" />
            <Bone w={310} h={80} r="4px 16px 16px 16px" />
          </div>
        </div>
      </div>
      {/* input */}
      <div style={{ background: T.surface, borderTop: `1px solid ${T.border}`, padding: '12px 20px 18px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', flex: 1, display: 'flex', gap: 10 }}>
          <Bone w="100%" h={46} r={14} style={{ flex: 1 }} />
          <Bone w={44} h={44} r={12} />
        </div>
      </div>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  )
}

// ─── Error screen ─────────────────────────────────────────────────────────────
function ErrorScreen() {
  return (
    <div className="chat-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, padding: 24 }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: '44px 40px', maxWidth: 380, textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.07)' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: T.errorBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke={T.error} strokeWidth="1.75" />
            <path d="M12 8v5" stroke={T.error} strokeWidth="1.75" strokeLinecap="round" />
            <circle cx="12" cy="16.5" r="0.75" fill={T.error} />
          </svg>
        </div>
        <p style={{ fontSize: 17, fontWeight: 700, color: T.text, margin: '0 0 10px', letterSpacing: '-0.2px' }}>
          This link is invalid or expired
        </p>
        <p style={{ fontSize: 14, color: T.textMuted, lineHeight: 1.65, margin: 0 }}>
          Ask the person who shared it with you to send a fresh invite.
        </p>
      </div>
    </div>
  )
}

// ─── Avatars ──────────────────────────────────────────────────────────────────
function MosenAvatar() {
  return (
    <div aria-hidden="true" style={{ width: 32, height: 32, borderRadius: '50%', background: T.greenAvatar, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" fill={T.green} />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={T.green} strokeWidth="2.1" strokeLinecap="round" />
        <circle cx="12" cy="8" r="2" fill={T.greenAvatar} />
      </svg>
    </div>
  )
}

function UserAvatar({ letter }) {
  return (
    <div aria-hidden="true" style={{ width: 32, height: 32, borderRadius: '50%', background: '#EFEFEC', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#999' }}>
      {letter || 'Y'}
    </div>
  )
}

// placeholder avatar for spacing when avatar is suppressed in group
function AvatarSpacer() {
  return <div style={{ width: 32, flexShrink: 0 }} />
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function EmployeePage({ params, searchParams }) {
  const initId = params.id
  const token  = searchParams.token

  const [phase, setPhase]                 = useState('loading')
  const [employeeName, setEmployeeName]   = useState('')
  const [initiativeTitle, setInitiativeTitle] = useState('')
  const [messages, setMessages]           = useState([])
  const [input, setInput]                 = useState('')
  const [sending, setSending]             = useState(false)
  const [inputFocused, setInputFocused]   = useState(false)
  const [consentStates, setConsentStates] = useState({})

  const scrollRef    = useRef(null)
  const textareaRef  = useRef(null)
  const triggeredRef = useRef(false)

  // ── scroll to bottom ──────────────────────────────────────────────────────
  const scrollBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    })
  }, [])
  useEffect(scrollBottom, [messages, sending, scrollBottom])

  // ── init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setPhase('error'); return }
    async function init() {
      try {
        const [briefRes, clRes, histRes] = await Promise.all([
          fetch(`/api/initiative/${initId}/employee/brief?token=${encodeURIComponent(token)}`),
          fetch(`/api/initiative/${initId}/employee/closed-loop?token=${encodeURIComponent(token)}`),
          fetch(`/api/initiative/${initId}/employee/chat?token=${encodeURIComponent(token)}`),
        ])
        if (!briefRes.ok) { setPhase('error'); return }
        const briefData = await briefRes.json()
        setEmployeeName(briefData.employeeName || '')
        setInitiativeTitle(briefData.initiativeTitle || '')

        const initial = []
        initial.push({ id: 'brief-card', type: 'brief', data: briefData.brief, initiativeTitle: briefData.initiativeTitle || '', ts: 0 })

        if (clRes.ok) {
          const clData = await clRes.json()
          for (const cl of (clData.messages || [])) {
            initial.push({ id: cl.id || mkId(), type: 'closed_loop', data: cl, ts: cl.createdAt || Date.now() })
          }
        }

        let hasHistory = false
        if (histRes.ok) {
          const histData = await histRes.json()
          for (const m of (histData.messages || [])) {
            initial.push({ id: mkId(), from: m.from, text: m.text, ts: m.ts || Date.now(), artifacts: m.artifacts || [] })
          }
          hasHistory = (histData.messages || []).length > 0
        }

        setMessages(initial)
        setPhase('ready')

        if (!hasHistory && !triggeredRef.current) {
          triggeredRef.current = true
          triggerFirstMessage()
        }
      } catch (err) {
        console.error('init error:', err)
        setPhase('error')
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initId, token])

  // ── trigger first message ─────────────────────────────────────────────────
  async function triggerFirstMessage() {
    setSending(true)
    try {
      const res = await fetch(`/api/initiative/${initId}/employee/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '[SESSION_START] The employee just opened Mosen for the first time. Follow your first contact instructions — introduce yourself simply, warm tone, 3–4 sentences max, one question at the end.',
          token,
          isSystemTrigger: true,
        }),
      })
      const data = await res.json()
      if (data.response) {
        setMessages(prev => [...prev, { id: mkId(), from: 'mosen', text: data.response, ts: Date.now(), artifacts: data.artifacts || [] }])
      }
    } catch (err) {
      console.error('trigger error:', err)
    } finally {
      setSending(false)
    }
  }

  // ── send message ──────────────────────────────────────────────────────────
  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setMessages(prev => [...prev, { id: mkId(), from: 'employee', text, ts: Date.now(), artifacts: [] }])
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setSending(true)
    try {
      const res = await fetch(`/api/initiative/${initId}/employee/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, token }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { id: mkId(), from: 'mosen', text: data.response, ts: Date.now(), artifacts: data.artifacts || [], error: !data.response }])
    } catch {
      setMessages(prev => [...prev, { id: mkId(), from: 'mosen', text: 'Something went wrong — please try again.', ts: Date.now(), artifacts: [], error: true }])
    } finally {
      setSending(false)
    }
  }

  // ── consent decision ──────────────────────────────────────────────────────
  async function handleConsent(consentId, decision) {
    setConsentStates(prev => ({ ...prev, [consentId]: decision }))
    try {
      await fetch(`/api/initiative/${initId}/employee/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, consentId, decision }),
      })
    } catch {
      setConsentStates(prev => { const c = { ...prev }; delete c[consentId]; return c })
    }
  }

  // ── textarea ──────────────────────────────────────────────────────────────
  function handleInputChange(e) {
    setInput(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // ── guards ────────────────────────────────────────────────────────────────
  if (phase === 'loading') return <LoadingScreen />
  if (phase === 'error')   return <ErrorScreen />

  const letter    = employeeName ? employeeName[0].toUpperCase() : 'Y'
  const canSend   = input.trim().length > 0 && !sending

  // ── message grouping: tag each message with isLastInGroup ─────────────────
  // Only chat messages participate in grouping (not system cards)
  const annotated = messages.map((msg, i) => {
    if (msg.type) return { ...msg, isLastInGroup: true, isFirstInGroup: true }
    const next = messages.slice(i + 1).find(m => !m.type)
    const prev = messages.slice(0, i).reverse().find(m => !m.type)
    const isLastInGroup  = !next || next.from !== msg.from
    const isFirstInGroup = !prev || prev.from !== msg.from
    return { ...msg, isLastInGroup, isFirstInGroup }
  })

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="chat-page" style={{ display: 'flex', flexDirection: 'column', background: T.bg }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{ height: 56, background: T.surface, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div aria-hidden="true" style={{ width: 28, height: 28, borderRadius: '50%', background: T.greenAvatar, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" fill={T.green} />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={T.green} strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="12" cy="8" r="2" fill={T.greenAvatar} />
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.text, letterSpacing: '-0.3px' }}>mosen</span>
        </div>

        {initiativeTitle && (
          <>
            <div aria-hidden="true" style={{ width: 1, height: 16, background: T.border, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: T.textMuted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
              {initiativeTitle}
            </span>
          </>
        )}

        <div role="status" aria-label="Confidential conversation" style={{ display: 'flex', alignItems: 'center', gap: 5, background: T.greenLight, border: `1px solid ${T.greenBorder}`, borderRadius: 20, padding: '5px 11px', flexShrink: 0 }}>
          <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 1.5L3 4.5V9C3 13.1 6 16.9 10 18C14 16.9 17 13.1 17 9V4.5L10 1.5Z" fill={T.greenLight} stroke={T.green} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M7 10L9 12L13 8" stroke={T.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.green, letterSpacing: '0.1px' }}>Confidential</span>
        </div>
      </header>

      {/* ── Data ownership strip ─────────────────────────────────────────────── */}
      <div role="note" style={{ background: T.greenLight, borderBottom: `1px solid ${T.greenBorder}`, padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
        <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
          <path d="M10 1.5L3 4.5V9C3 13.1 6 16.9 10 18C14 16.9 17 13.1 17 9V4.5L10 1.5Z" fill={T.greenLight} stroke={T.green} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M7 10L9 12L13 8" stroke={T.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p style={{ fontSize: 12, color: T.greenDark, margin: 0, lineHeight: 1.45 }}>
          Your data belongs to you. Nothing from this conversation will be shared without your explicit, informed consent.
        </p>
      </div>

      {/* ── Messages ─────────────────────────────────────────────────────────── */}
      <main ref={scrollRef} id="messages" aria-label="Conversation" style={{ flex: 1, overflowY: 'auto', padding: '28px 20px 16px', scrollBehavior: 'smooth' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>

          {annotated.map((msg, idx) => {

            // ── Brief card ─────────────────────────────────────────────────
            if (msg.type === 'brief') {
              return (
                <div key={msg.id} style={{ marginBottom: 24, animation: 'msgIn 0.25s ease-out' }}>
                  <BriefDisplay brief={msg.data} initiativeTitle={msg.initiativeTitle} />
                </div>
              )
            }

            // ── Closed-loop card (from server on load) ─────────────────────
            if (msg.type === 'closed_loop') {
              return (
                <div key={msg.id} style={{ marginBottom: 24, animation: 'msgIn 0.25s ease-out' }}>
                  <ClosedLoopCard message={msg.data.message} changeDescription={msg.data.changeDescription} createdAt={msg.data.createdAt} />
                </div>
              )
            }

            // ── Chat message ───────────────────────────────────────────────
            const isMosen   = msg.from === 'mosen'
            const isError   = !!msg.error
            const showAvatar  = msg.isLastInGroup
            const gapBottom   = msg.isLastInGroup ? 20 : 4

            return (
              <div key={msg.id} style={{ marginBottom: gapBottom, animation: 'msgIn 0.25s ease-out' }}>
                {/* Bubble row */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexDirection: isMosen ? 'row' : 'row-reverse' }}>
                  {/* Avatar slot — always reserve space to keep bubbles aligned */}
                  {showAvatar
                    ? (isMosen ? <MosenAvatar /> : <UserAvatar letter={letter} />)
                    : <AvatarSpacer />
                  }

                  {msg.text && (
                    <div
                      role="article"
                      aria-label={`${isMosen ? 'Mosen' : 'You'}: ${msg.text}`}
                      style={{
                        maxWidth: '72%',
                        padding: '11px 15px',
                        fontSize: 14,
                        lineHeight: 1.72,
                        color: isError ? T.error : isMosen ? T.greenDark : T.text,
                        background: isError ? T.errorBg : isMosen ? T.greenLight : T.surface,
                        border: `1px solid ${isError ? T.errorBorder : isMosen ? T.greenBorder : '#E4E4E0'}`,
                        borderRadius: isMosen
                          ? (msg.isFirstInGroup ? '16px 16px 16px 4px' : '4px 16px 16px 4px')
                          : (msg.isFirstInGroup ? '16px 16px 4px 16px' : '16px 4px 4px 16px'),
                        boxShadow: isMosen ? 'none' : '0 1px 3px rgba(0,0,0,0.07)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {msg.text}
                    </div>
                  )}
                </div>

                {/* Timestamp — show below the last message in each group */}
                {msg.isLastInGroup && msg.ts > 0 && (
                  <p style={{
                    fontSize: 11,
                    color: T.textFaint,
                    margin: '5px 0 0',
                    paddingLeft: isMosen ? 42 : 0,
                    paddingRight: isMosen ? 0 : 42,
                    textAlign: isMosen ? 'left' : 'right',
                    letterSpacing: '0.1px',
                  }}>
                    {fmtTime(msg.ts)}
                  </p>
                )}

                {/* Inline artifact cards */}
                {(msg.artifacts || []).map((artifact, j) => {
                  const indent = { marginTop: 10, marginLeft: isMosen ? 42 : 0, marginRight: isMosen ? 0 : 42 }
                  if (artifact.type === 'consent_card') return (
                    <div key={j} style={indent}>
                      <ConsentCard
                        consentId={artifact.data.consentId}
                        theme={artifact.data.theme}
                        proposedText={artifact.data.proposedText}
                        status={consentStates[artifact.data.consentId]}
                        onDecision={handleConsent}
                      />
                    </div>
                  )
                  if (artifact.type === 'closed_loop') return (
                    <div key={j} style={indent}>
                      <ClosedLoopCard message={artifact.data.message} changeDescription={artifact.data.changeDescription} createdAt={artifact.data.createdAt} />
                    </div>
                  )
                  return null
                })}
              </div>
            )
          })}

          {/* Typing indicator */}
          {sending && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 16, animation: 'msgIn 0.2s ease-out' }}>
              <MosenAvatar />
              <div aria-label="Mosen is typing" role="status" style={{ padding: '13px 17px', background: T.greenLight, border: `1px solid ${T.greenBorder}`, borderRadius: '16px 16px 16px 4px', display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map(j => (
                  <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, opacity: 0.55, animation: `typingDot 1.4s ease-in-out ${j * 0.16}s infinite` }} />
                ))}
              </div>
            </div>
          )}

          <div aria-hidden="true" style={{ height: 8 }} />
        </div>
      </main>

      {/* ── Input ────────────────────────────────────────────────────────────── */}
      <footer style={{ background: T.surface, borderTop: `1px solid ${T.border}`, padding: '12px 20px 20px', flexShrink: 0 }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          {/* Textarea wrapper — focus ring lives here */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              background: inputFocused ? T.surface : '#F5F5F2',
              border: `1.5px solid ${inputFocused ? T.green : T.borderInput}`,
              borderRadius: 14,
              overflow: 'hidden',
              transition: 'border-color 0.15s ease, background 0.15s ease',
              boxShadow: inputFocused ? `0 0 0 3px ${T.greenLight}` : 'none',
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Share what's on your mind…"
              disabled={sending}
              rows={1}
              aria-label="Message"
              aria-describedby="send-hint"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: T.text, fontSize: 14, padding: '12px 15px',
                resize: 'none', minHeight: 46, maxHeight: 160,
                lineHeight: 1.6, fontFamily: 'inherit',
                cursor: 'text',
              }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={send}
            disabled={!canSend}
            aria-label="Send message"
            style={{
              width: 46, height: 46, borderRadius: 13, border: 'none', flexShrink: 0,
              background: canSend ? T.green : '#E4E4E0',
              cursor: canSend ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease',
              boxShadow: canSend ? '0 2px 8px rgba(29,158,117,0.3)' : 'none',
            }}
            onMouseEnter={e => { if (canSend) { e.currentTarget.style.transform = 'scale(1.07)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(29,158,117,0.4)' } }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = canSend ? '0 2px 8px rgba(29,158,117,0.3)' : 'none' }}
            onMouseDown={e => { if (canSend) e.currentTarget.style.transform = 'scale(0.96)' }}
            onMouseUp={e => { if (canSend) e.currentTarget.style.transform = 'scale(1.07)' }}
          >
            {/* Paper plane */}
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M22 2L11 13" stroke={canSend ? '#fff' : '#BABAB4'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={canSend ? '#fff' : '#BABAB4'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Hint — appears only when focused */}
        <p id="send-hint" style={{ maxWidth: 680, margin: '6px auto 0', fontSize: 11, color: inputFocused ? T.textFaint : 'transparent', textAlign: 'right', transition: 'color 0.15s ease', userSelect: 'none' }}>
          Enter to send · Shift+Enter for new line
        </p>
      </footer>

      {/* ── Global styles ─────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes shimmer    { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes msgIn      { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes typingDot  { 0%,60%,100%{transform:translateY(0);opacity:0.4} 30%{transform:translateY(-5px);opacity:1} }
        button:focus-visible  { outline:2.5px solid ${T.green}; outline-offset:2px; }
        a:focus-visible       { outline:2.5px solid ${T.green}; outline-offset:2px; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  )
}
