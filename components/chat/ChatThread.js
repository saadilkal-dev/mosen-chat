'use client'
import { useEffect, useRef } from 'react'
import { THEME } from '../../lib/theme'
import ChatBubble from './ChatBubble'
import TypingIndicator from './TypingIndicator'
import Avatar from '../ui/Avatar'

export default function ChatThread({
  messages = [],
  persona = 'leader',
  loading = false,
  inlineCards = null,
}) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  return (
    <div style={{
      flex: 1,
      overflow: 'auto',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {messages.map((msg, i) => (
        <div key={msg.id || i}>
          <ChatBubble message={msg} persona={persona} />
          {/* Render inline cards after specific messages */}
          {inlineCards && inlineCards[msg.id]}
        </div>
      ))}
      {loading && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '4px 0' }}>
          <Avatar type="mosen" persona={persona} size={30} />
          <div style={{
            padding: '12px 16px',
            borderRadius: '16px 16px 16px 4px',
            background: persona === 'leader' ? THEME.colors.leader.light : THEME.colors.employee.light,
            border: `1px solid ${persona === 'leader' ? THEME.colors.leader.border : THEME.colors.employee.border}`,
          }}>
            <TypingIndicator persona={persona} />
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  )
}
