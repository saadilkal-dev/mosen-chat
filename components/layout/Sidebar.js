'use client'
import { THEME } from '../../lib/theme'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'
import { fmt } from '../../lib/utils'

export default function Sidebar({
  user,
  orgName,
  initiatives = [],
  activeId,
  onSelect,
  onNew,
  onLogout,
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '16px 12px',
      gap: 8,
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 8px',
        marginBottom: 4,
      }}>
        <Avatar type="mosen" persona="leader" size={28} />
        <span style={{ fontSize: 17, fontWeight: 700, color: THEME.colors.text, letterSpacing: '-0.02em' }}>
          Mosen
        </span>
      </div>

      {/* User + Org */}
      {user && (
        <div style={{ padding: '6px 8px', borderBottom: `1px solid ${THEME.colors.border}`, marginBottom: 4, paddingBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: THEME.colors.text }}>{user.name}</div>
          {orgName && (
            <div style={{ fontSize: 11, color: THEME.colors.textMuted, marginTop: 2 }}>{orgName}</div>
          )}
        </div>
      )}

      {/* New Initiative button */}
      <button
        onClick={onNew}
        style={{
          padding: '10px 14px',
          background: THEME.colors.leader.light,
          color: THEME.colors.leader.primary,
          border: `1px solid ${THEME.colors.leader.border}`,
          borderRadius: THEME.radius.md,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: THEME.font,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          textAlign: 'left',
        }}
      >
        + New Initiative
      </button>

      {/* Initiative list */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 }}>
        {initiatives.length === 0 && (
          <div style={{ padding: '16px 8px', fontSize: 12, color: THEME.colors.textMuted, textAlign: 'center' }}>
            No initiatives yet
          </div>
        )}
        {initiatives.map(init => (
          <button
            key={init.id}
            onClick={() => onSelect(init.id)}
            style={{
              padding: '10px 12px',
              background: activeId === init.id ? THEME.colors.leader.light : 'transparent',
              border: 'none',
              borderRadius: THEME.radius.sm,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: THEME.font,
              transition: 'background 0.1s ease',
            }}
          >
            <div style={{
              fontSize: 13,
              fontWeight: activeId === init.id ? 600 : 400,
              color: THEME.colors.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {init.title || 'Untitled Initiative'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <Badge color={
                init.status === 'active' ? THEME.colors.success :
                init.status === 'draft' ? THEME.colors.textMuted :
                THEME.colors.warning
              }>
                {init.status}
              </Badge>
              {init.lastActivity && (
                <span style={{ fontSize: 10, color: THEME.colors.textLight }}>{fmt(init.lastActivity)}</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Logout */}
      {onLogout && (
        <button
          onClick={onLogout}
          style={{
            padding: '8px 12px',
            background: 'transparent',
            border: `1px solid ${THEME.colors.border}`,
            borderRadius: THEME.radius.sm,
            fontSize: 12,
            color: THEME.colors.textMuted,
            fontFamily: THEME.font,
            cursor: 'pointer',
            marginTop: 8,
          }}
        >
          Log out
        </button>
      )}
    </div>
  )
}
