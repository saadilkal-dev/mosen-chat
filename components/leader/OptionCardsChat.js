'use client'
import { useState } from 'react'

export default function OptionCardsChat({ options, onSelect, disabled }) {
  const [selected, setSelected] = useState(null)

  function handleSelect(opt) {
    if (disabled || selected !== null) return
    setSelected(opt.id)
    onSelect?.(opt.value)
  }

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    }}>
      {options.map(opt => {
        const isSelected = selected === opt.id
        const isDimmed = selected !== null && !isSelected

        return (
          <button
            key={opt.id}
            onClick={() => handleSelect(opt)}
            disabled={disabled || selected !== null}
            style={{
              padding: '7px 16px',
              borderRadius: 20,
              border: `1.5px solid ${isSelected ? '#534AB7' : '#D8D5F5'}`,
              background: isSelected ? '#534AB7' : '#fff',
              color: isSelected ? '#fff' : '#534AB7',
              fontSize: 13,
              fontWeight: isSelected ? 600 : 500,
              cursor: disabled || selected !== null ? 'default' : 'pointer',
              fontFamily: "'DM Sans', system-ui, sans-serif",
              opacity: isDimmed ? 0.35 : 1,
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            {isSelected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
