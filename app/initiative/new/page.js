'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewInitiativePage() {
  const router = useRouter()
  const [selected, setSelected] = useState(null) // 'leader' or 'employee'
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleStart() {
    if (!title.trim() || !selected) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/initiative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), type: selected })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create initiative')
      }

      const { initId } = await res.json()
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
            What's your relationship to this change?
          </p>
        </div>

        {/* Role selection cards */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
          <button
            onClick={() => setSelected('leader')}
            style={{
              flex: 1, padding: '24px 20px', borderRadius: 16, textAlign: 'center', cursor: 'pointer',
              border: selected === 'leader' ? '2px solid #534AB7' : '1px solid #D8D5F5',
              background: selected === 'leader' ? '#F6F5FF' : '#fff',
              transition: 'all 0.2s', outline: 'none'
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>🧭</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#534AB7', marginBottom: 6 }}>
              I'm leading a change
            </div>
            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>
              Build a plan, communicate it, and respond to how people experience it
            </div>
          </button>

          <button
            onClick={() => setSelected('employee')}
            style={{
              flex: 1, padding: '24px 20px', borderRadius: 16, textAlign: 'center', cursor: 'pointer',
              border: selected === 'employee' ? '2px solid #1D9E75' : '1px solid #C5EBE0',
              background: selected === 'employee' ? '#F0FAF6' : '#fff',
              transition: 'all 0.2s', outline: 'none'
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>💬</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1D9E75', marginBottom: 6 }}>
              I'm receiving a change
            </div>
            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>
              Share how you're experiencing it — safely, honestly, and on your terms
            </div>
          </button>
        </div>

        {/* Title input — slides in after selection */}
        {selected && (
          <div style={{ animation: 'slideIn 0.3s ease' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1A1A18', marginBottom: 8 }}>
              Give this initiative a name
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

            {error && (
              <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#FFF3F0', color: '#C0392B', fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              onClick={handleStart}
              disabled={!title.trim() || loading}
              style={{
                width: '100%', marginTop: 16, padding: '12px 20px', fontSize: 15, fontWeight: 600,
                borderRadius: 12, border: 'none', cursor: title.trim() && !loading ? 'pointer' : 'not-allowed',
                background: selected === 'leader' ? '#534AB7' : '#1D9E75',
                color: '#fff', opacity: title.trim() && !loading ? 1 : 0.5,
                transition: 'all 0.2s'
              }}
            >
              {loading ? 'Creating...' : 'Start'}
            </button>
          </div>
        )}

        {/* Back link */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/dashboard" style={{ fontSize: 13, color: '#999', textDecoration: 'none' }}>
            ← Back to dashboard
          </a>
        </div>

        <style>{`
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  )
}
