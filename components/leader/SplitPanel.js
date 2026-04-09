'use client'
import { useState } from 'react'

export default function SplitPanel({ leftContent, rightContent, leftWidth = 60, collapsed: controlledCollapsed, onToggle }) {
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed

  const toggle = () => {
    if (onToggle) onToggle(!isCollapsed)
    else setInternalCollapsed(!isCollapsed)
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ width: isCollapsed ? '100%' : `${leftWidth}%`, height: '100%', overflow: 'auto', transition: 'width 0.3s ease', padding: 0 }}>
        {leftContent}
      </div>

      {!isCollapsed && (
        <>
          <div style={{ width: 1, background: '#EBEBEA', position: 'relative', flexShrink: 0 }}>
            <button
              onClick={toggle}
              style={{
                position: 'absolute', top: '50%', left: -14, transform: 'translateY(-50%)',
                width: 28, height: 28, borderRadius: '50%', border: '1px solid #EBEBEA',
                background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 12, color: '#999', zIndex: 10,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
              }}
            >
              ›
            </button>
          </div>
          <div style={{ width: `${100 - leftWidth}%`, height: '100%', overflow: 'auto', transition: 'width 0.3s ease' }}>
            {rightContent}
          </div>
        </>
      )}

      {isCollapsed && (
        <button
          onClick={toggle}
          style={{
            position: 'fixed', right: 16, top: '50%', transform: 'translateY(-50%)',
            width: 32, height: 32, borderRadius: '50%', border: '1px solid #D8D5F5',
            background: '#F6F5FF', cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 14, color: '#534AB7', zIndex: 20,
            boxShadow: '0 2px 8px rgba(83,74,183,0.15)'
          }}
        >
          ‹
        </button>
      )}
    </div>
  )
}
