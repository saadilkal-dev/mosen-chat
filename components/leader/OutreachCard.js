'use client'
import { useState } from 'react'

export default function OutreachCard({ outreachList = [], initId, onRefresh }) {
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')

  async function handleApprove(messageId) {
    try {
      await fetch(`/api/initiative/${initId}/outreach`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, approved: true })
      })
      if (onRefresh) onRefresh()
    } catch (err) { console.error('Approve failed:', err) }
  }

  async function handleSaveEdit(messageId) {
    try {
      await fetch(`/api/initiative/${initId}/outreach`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, editedText: editText })
      })
      setEditingId(null)
      if (onRefresh) onRefresh()
    } catch (err) { console.error('Edit failed:', err) }
  }

  const totalMessages = outreachList.length
  const sentCount = outreachList.filter(m => m.status === 'approved').length
  const pendingCount = totalMessages - sentCount

  return (
    <div style={{ padding: 20 }}>
      {totalMessages > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          <div style={{ padding: '8px 14px', borderRadius: 10, background: '#fff', border: '1px solid #EBEBEA', fontSize: 12 }}>
            <span style={{ fontWeight: 600, color: '#534AB7' }}>{totalMessages}</span>
            <span style={{ color: '#999', marginLeft: 4 }}>total</span>
          </div>
          <div style={{ padding: '8px 14px', borderRadius: 10, background: '#F0FAF6', border: '1px solid #C5EBE0', fontSize: 12 }}>
            <span style={{ fontWeight: 600, color: '#1D9E75' }}>{sentCount}</span>
            <span style={{ color: '#1D9E75', marginLeft: 4 }}>sent</span>
          </div>
          {pendingCount > 0 && (
            <div style={{ padding: '8px 14px', borderRadius: 10, background: '#FFFBF0', border: '1px solid #F5E6C8', fontSize: 12 }}>
              <span style={{ fontWeight: 600, color: '#F97316' }}>{pendingCount}</span>
              <span style={{ color: '#F97316', marginLeft: 4 }}>pending</span>
            </div>
          )}
        </div>
      )}
      {outreachList.map((msg) => (
        <div key={msg.id} style={{ marginBottom: 16, padding: 16, border: '1px solid #EBEBEA', borderRadius: 12, background: '#fff' }}>
          {msg.status === 'approved' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 12, color: '#1D9E75', fontWeight: 500 }}>
              <span>Sent</span>
              {msg.sentAt && <span style={{ color: '#999', fontWeight: 400 }}>{new Date(msg.sentAt).toLocaleDateString()}</span>}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F97316', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 12, color: '#F97316', fontWeight: 500 }}>Pending approval</span>
              <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
            </div>
          )}

          {editingId === msg.id ? (
            <div>
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                style={{ width: '100%', minHeight: 100, padding: 12, fontSize: 13, border: '1px solid #D8D5F5', borderRadius: 8, fontFamily: "'DM Sans', system-ui, sans-serif", resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => handleSaveEdit(msg.id)} style={{ padding: '6px 14px', fontSize: 12, borderRadius: 6, border: 'none', background: '#534AB7', color: '#fff', cursor: 'pointer' }}>Save</button>
                <button onClick={() => setEditingId(null)} style={{ padding: '6px 14px', fontSize: 12, borderRadius: 6, border: '1px solid #EBEBEA', background: '#fff', color: '#666', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: '#1A1A18', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 10 }}>{msg.draft}</div>
              {msg.rationale && <div style={{ fontSize: 12, color: '#999', fontStyle: 'italic', marginBottom: 12 }}>{msg.rationale}</div>}
              {msg.status !== 'approved' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleApprove(msg.id)} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 500, borderRadius: 6, border: 'none', background: '#1D9E75', color: '#fff', cursor: 'pointer' }}>Approve & Send</button>
                  <button onClick={() => { setEditingId(msg.id); setEditText(msg.draft) }} style={{ padding: '6px 14px', fontSize: 12, borderRadius: 6, border: '1px solid #EBEBEA', background: '#fff', color: '#666', cursor: 'pointer' }}>Edit</button>
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  )
}
