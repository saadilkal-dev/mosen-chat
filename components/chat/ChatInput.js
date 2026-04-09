'use client'
import { useRef, useCallback } from 'react'
import { THEME } from '../../lib/theme'

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
  accentColor = THEME.colors.leader.primary,
}) {
  const taRef = useRef(null)

  const handleKeyDown = useCallback(e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !disabled) onSend()
    }
  }, [value, disabled, onSend])

  const autoResize = useCallback(() => {
    const ta = taRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 150) + 'px'
    }
  }, [])

  return (
    <div style={{
      display: 'flex',
      gap: 10,
      alignItems: 'flex-end',
      padding: '12px 16px',
      borderTop: `1px solid ${THEME.colors.border}`,
      background: THEME.colors.surface,
    }}>
      <textarea
        ref={taRef}
        value={value}
        onChange={e => { onChange(e.target.value); autoResize() }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        style={{
          flex: 1,
          resize: 'none',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: 14,
          fontFamily: THEME.font,
          color: THEME.colors.text,
          lineHeight: 1.5,
          padding: '6px 0',
          maxHeight: 150,
        }}
      />
      <button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: value.trim() && !disabled ? accentColor : '#E8E8E4',
          border: 'none',
          cursor: value.trim() && !disabled ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.15s ease',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M5 12h14M12 5l7 7-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}
