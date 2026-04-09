'use client'
import { useEffect, useCallback } from 'react'
import { THEME } from '../../lib/theme'

export default function Modal({ isOpen, onClose, title, children, maxWidth = 480 }) {
  const handleEsc = useCallback(e => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      return () => document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, handleEsc])

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: THEME.colors.surface,
          borderRadius: THEME.radius.xl,
          padding: 28,
          maxWidth,
          width: '100%',
          maxHeight: '85vh',
          overflow: 'auto',
          boxShadow: THEME.shadow.lg,
        }}
      >
        {title && (
          <div style={{
            fontSize: 18,
            fontWeight: 600,
            color: THEME.colors.text,
            fontFamily: THEME.font,
            marginBottom: 20,
          }}>
            {title}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
