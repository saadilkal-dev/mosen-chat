'use client'
import { THEME } from '../../lib/theme'
import Avatar from '../ui/Avatar'

export default function ChatBubble({ message, persona = 'leader' }) {
  const isUser = message.from === 'user'
  const isError = message.from === 'error'
  const colors = persona === 'leader' ? THEME.colors.leader : THEME.colors.employee

  return (
    <div style={{
      display: 'flex',
      gap: 10,
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      padding: '4px 0',
    }}>
      {!isUser && !isError && <Avatar type="mosen" persona={persona} size={30} />}
      {isUser && <Avatar type="user" persona={persona} size={30} />}

      <div style={{
        maxWidth: '75%',
        padding: '10px 16px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isError
          ? THEME.colors.errorBg
          : isUser
            ? THEME.colors.surface
            : colors.light,
        border: isError
          ? `1px solid ${THEME.colors.error}30`
          : isUser
            ? `1px solid ${THEME.colors.border}`
            : `1px solid ${colors.border}`,
        color: isError ? THEME.colors.error : THEME.colors.text,
        fontSize: 14,
        lineHeight: 1.65,
        fontFamily: THEME.font,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {message.text}
      </div>
    </div>
  )
}
