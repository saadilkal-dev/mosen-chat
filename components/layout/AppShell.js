'use client'
import { useState } from 'react'
import { THEME } from '../../lib/theme'

export default function AppShell({ sidebar, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: THEME.font, background: THEME.colors.bg }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            display: 'none',
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 40,
          }}
          className="mobile-overlay"
        />
      )}

      {/* Sidebar */}
      <div
        style={{
          width: 256,
          flexShrink: 0,
          borderRight: `1px solid ${THEME.colors.border}`,
          background: THEME.colors.surface,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'transform 0.2s ease',
          zIndex: 50,
        }}
        className={sidebarOpen ? '' : 'sidebar-collapsed'}
      >
        {sidebar}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            display: 'none',
            position: 'fixed',
            top: 12,
            left: 12,
            zIndex: 60,
            background: THEME.colors.surface,
            border: `1px solid ${THEME.colors.border}`,
            borderRadius: THEME.radius.sm,
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: 18,
          }}
          className="mobile-menu-btn"
        >
          {sidebarOpen ? '\u2715' : '\u2630'}
        </button>
        {children}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-overlay { display: block !important; }
          .mobile-menu-btn { display: block !important; }
          .sidebar-collapsed { transform: translateX(-100%); position: fixed; left: 0; top: 0; bottom: 0; }
        }
      `}</style>
    </div>
  )
}
