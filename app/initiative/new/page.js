'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewInitiativePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleStart() {
    if (!title.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/initiative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: title.trim(), type: 'leader' }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = [data.error, data.detail].filter(Boolean).join(' — ') || `Request failed (${res.status})`
        throw new Error(msg)
      }

      const { initId } = data
      if (!initId) throw new Error('Server did not return an initiative id.')
      router.push(`/initiative/${initId}`)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#FAFAF8', fontFamily: "'DM Sans', system-ui, sans-serif", padding: 24
    }}>
      <div style={{ maxWidth: 520, width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EAE8FC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" fill="#534AB7" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="8" r="2" fill="#EAE8FC" />
              </svg>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#1A1A18', letterSpacing: '-0.02em' }}>New Initiative</span>
          </div>
          <p style={{ fontSize: 14, color: '#999', lineHeight: 1.6 }}>
            Give this change a name to get started
          </p>
        </div>

        {/* Title input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1A1A18', marginBottom: 8 }}>
            Initiative name
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g., Office relocation, New team structure, Product pivot"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            style={{
              width: '100%', padding: '12px 16px', fontSize: 15, borderRadius: 12,
              border: '1px solid #EBEBEA', background: '#F5F5F2', outline: 'none',
              fontFamily: "'DM Sans', system-ui, sans-serif",
              boxSizing: 'border-box'
            }}
          />
        </div>

        {error && (
          <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: '#FFF3F0', color: '#C0392B', fontSize: 13 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={!title.trim() || loading}
          style={{
            width: '100%', padding: '12px 20px', fontSize: 15, fontWeight: 600,
            borderRadius: 12, border: 'none', cursor: title.trim() && !loading ? 'pointer' : 'not-allowed',
            background: '#534AB7', color: '#fff',
            opacity: title.trim() && !loading ? 1 : 0.5,
            transition: 'all 0.2s'
          }}
        >
          {loading ? 'Creating…' : 'Start'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/dashboard" style={{ fontSize: 13, color: '#999', textDecoration: 'none' }}>
            ← Back to dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
