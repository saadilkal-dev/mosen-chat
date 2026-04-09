'use client'
import { useState } from 'react'
import { THEME } from '../../lib/theme'

export default function OutreachCard({ outreachList = [], initId, onRefresh }) {
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  function toggleExpand(id) {
    setExpandedId((cur) => (cur === id ? null : id))
  }

  async function handleApprove(messageId) {
    try {
      await fetch(`/api/initiative/${initId}/outreach`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, approved: true }),
      })
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Approve failed:', err)
    }
  }

  async function handleSaveEdit(messageId) {
    try {
      await fetch(`/api/initiative/${initId}/outreach`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, editedText: editText }),
      })
      setEditingId(null)
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Edit failed:', err)
    }
  }

  const cardBase = {
    marginBottom: 12,
    border: `1px solid ${THEME.colors.border}`,
    borderRadius: THEME.radius.md,
    background: THEME.colors.surface,
    overflow: 'hidden',
    boxShadow: THEME.shadow.sm,
  }

  return (
    <div style={{ padding: 20 }}>
      {outreachList.map((msg, index) => {
        const rowKey = msg.id != null ? String(msg.id) : `outreach-${index}`
        const isOpen = expandedId === msg.id || editingId === msg.id
        const title = msg.milestone || 'Outreach message'

        function headerActivate() {
          if (editingId === msg.id) return
          toggleExpand(msg.id)
        }

        return (
          <div key={rowKey} style={cardBase}>
            {/* div+role=button: line-clamp inside <button> is unreliable in WebKit */}
            <div
              role="button"
              tabIndex={editingId === msg.id ? -1 : 0}
              onClick={headerActivate}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  headerActivate()
                }
              }}
              aria-expanded={isOpen}
              style={{
                width: '100%',
                display: 'block',
                textAlign: 'left',
                padding: '14px 16px',
                border: 'none',
                background: isOpen ? THEME.colors.leader.lighter : THEME.colors.surface,
                cursor: editingId === msg.id ? 'default' : 'pointer',
                fontFamily: THEME.font,
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {msg.status === 'approved' ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 6,
                        fontSize: 12,
                        color: THEME.colors.employee.primary,
                        fontWeight: 600,
                      }}
                    >
                      <span>Sent</span>
                      {msg.sentAt && (
                        <span style={{ color: THEME.colors.textMuted, fontWeight: 400 }}>
                          {new Date(msg.sentAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: THEME.colors.warning,
                          animation: 'pulse 2s infinite',
                        }}
                      />
                      <span style={{ fontSize: 12, color: THEME.colors.warning, fontWeight: 600 }}>Pending approval</span>
                      <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: THEME.colors.text,
                      marginBottom: 4,
                      lineHeight: 1.35,
                    }}
                  >
                    {title}
                  </div>

                  {!isOpen && (
                    <div
                      style={{
                        fontSize: 13,
                        color: THEME.colors.textMuted,
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                        maxHeight: '4.65em',
                      }}
                    >
                      {msg.draft?.trim() ? msg.draft : 'No body yet'}
                    </div>
                  )}
                </div>

                <span
                  style={{
                    flexShrink: 0,
                    fontSize: 12,
                    color: THEME.colors.textMuted,
                    marginTop: 2,
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease',
                  }}
                  aria-hidden
                >
                  ▼
                </span>
              </div>
            </div>

            {isOpen && (
              <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${THEME.colors.border}` }}>
                {editingId === msg.id ? (
                  <div style={{ paddingTop: 14 }}>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: 100,
                        padding: 12,
                        fontSize: 13,
                        border: `1px solid ${THEME.colors.leader.border}`,
                        borderRadius: THEME.radius.sm,
                        fontFamily: THEME.font,
                        resize: 'vertical',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(msg.id)}
                        style={{
                          padding: '6px 14px',
                          fontSize: 12,
                          borderRadius: THEME.radius.sm,
                          border: 'none',
                          background: THEME.colors.leader.primary,
                          color: '#fff',
                          cursor: 'pointer',
                          fontFamily: THEME.font,
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        style={{
                          padding: '6px 14px',
                          fontSize: 12,
                          borderRadius: THEME.radius.sm,
                          border: `1px solid ${THEME.colors.border}`,
                          background: THEME.colors.surface,
                          color: THEME.colors.textMuted,
                          cursor: 'pointer',
                          fontFamily: THEME.font,
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ paddingTop: 14 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: THEME.colors.text,
                        lineHeight: 1.7,
                        whiteSpace: 'pre-wrap',
                        marginBottom: 10,
                      }}
                    >
                      {msg.draft}
                    </div>
                    {msg.rationale && (
                      <div
                        style={{
                          fontSize: 12,
                          color: THEME.colors.textMuted,
                          fontStyle: 'italic',
                          marginBottom: 12,
                          lineHeight: 1.5,
                        }}
                      >
                        {msg.rationale}
                      </div>
                    )}
                    {msg.status !== 'approved' && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleApprove(msg.id)
                          }}
                          style={{
                            padding: '6px 14px',
                            fontSize: 12,
                            fontWeight: 500,
                            borderRadius: THEME.radius.sm,
                            border: 'none',
                            background: THEME.colors.employee.primary,
                            color: '#fff',
                            cursor: 'pointer',
                            fontFamily: THEME.font,
                          }}
                        >
                          Approve & Send
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingId(msg.id)
                            setEditText(msg.draft)
                          }}
                          style={{
                            padding: '6px 14px',
                            fontSize: 12,
                            borderRadius: THEME.radius.sm,
                            border: `1px solid ${THEME.colors.border}`,
                            background: THEME.colors.surface,
                            color: THEME.colors.textMuted,
                            cursor: 'pointer',
                            fontFamily: THEME.font,
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
