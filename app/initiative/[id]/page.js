'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import SplitPanel from '../../../components/leader/SplitPanel'
import ArtifactPanel from '../../../components/leader/ArtifactPanel'

export default function InitiativePage() {
  const { id } = useParams()
  const [initiative, setInitiative] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState(null)
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('Brief')
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
        setMessages(saved.map(m => ({
          from: m.from === 'leader' ? 'user' : 'mosen',
          text: m.text,
        })))
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
      setMessages(prev => [...prev, { from: 'mosen', text: data.response }])

      // If artifacts returned, switch to relevant tab
      if (data.artifacts && data.artifacts.length > 0) {
        const types = data.artifacts.map(a => {
          try { return JSON.parse(a).type || a.type } catch { return a.type }
        }).filter(Boolean)

        if (types.includes('playbook')) setActiveTab('Playbook')
        else if (types.includes('brief')) setActiveTab('Brief')
        else if (types.includes('outreach_suggestion')) setActiveTab('Outreach')
        else if (types.includes('synthesis_card')) setActiveTab('Synthesis')
      }
    } catch (err) {
      setMessages(prev => [...prev, { from: 'mosen', text: `Something went wrong: ${err.message}. Try again?` }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: 16
          }}>
            <div style={{ display: 'flex', gap: 10, maxWidth: '85%', flexDirection: msg.from === 'user' ? 'row-reverse' : 'row' }}>
              {/* Avatar */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: msg.from === 'user' ? '#F5F5F2' : '#EAE8FC',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14
              }}>
                {msg.from === 'user' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" fill="#999" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#999" strokeWidth="2" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" fill="#534AB7" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#534AB7" strokeWidth="2" />
                  </svg>
                )}
              </div>
              {/* Bubble */}
              <div style={{
                padding: '10px 16px', borderRadius: 16, fontSize: 14, lineHeight: 1.7,
                color: '#1A1A18', whiteSpace: 'pre-wrap',
                background: msg.from === 'user' ? '#F5F5F2' : '#F6F5FF',
                borderTopRightRadius: msg.from === 'user' ? 4 : 16,
                borderTopLeftRadius: msg.from === 'user' ? 16 : 4,
              }}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EAE8FC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" fill="#534AB7" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#534AB7" strokeWidth="2" /></svg>
            </div>
            <div style={{ padding: '12px 18px', borderRadius: 16, borderTopLeftRadius: 4, background: '#F6F5FF' }}>
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

      {/* Input */}
      <div style={{ padding: '12px 24px 20px', borderTop: '1px solid #EBEBEA', background: '#fff' }}>
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
              border: '1px solid #EBEBEA', background: '#F5F5F2', outline: 'none',
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
  )

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Top Bar */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', background: '#fff', borderBottom: '1px solid #EBEBEA'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <a href="/dashboard" style={{ fontSize: 13, color: '#999', textDecoration: 'none' }}>Dashboard</a>
          <span style={{ fontSize: 13, color: '#EBEBEA' }}>/</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A18' }}>{initiative?.title || 'Initiative'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500,
            background: initiative?.status === 'active' ? '#F0FAF6' : '#F5F5F2',
            color: initiative?.status === 'active' ? '#1D9E75' : '#999',
            border: `1px solid ${initiative?.status === 'active' ? '#C5EBE0' : '#EBEBEA'}`
          }}>
            {initiative?.status || 'draft'}
          </span>
        </div>
      </div>

      {/* Split Panel */}
      <SplitPanel
        leftContent={chatPanel}
        rightContent={<ArtifactPanel initId={id} activeTab={activeTab} onTabChange={setActiveTab} />}
        collapsed={collapsed}
        onToggle={setCollapsed}
      />
    </div>
  )
}
