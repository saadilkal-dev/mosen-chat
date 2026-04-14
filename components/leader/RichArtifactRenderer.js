'use client'
import { useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

// Renders a structured artifact JSON: { version, title, sections: [...] }.
// Also handles the legacy-markdown fallback shape: { markdown: '...' }.

const COLORS = ['#534AB7', '#8A7EE0', '#1D9E75', '#F39C12', '#3498DB', '#E67E22', '#9B59B6', '#2ECC71']

function renderInline(text) {
  if (typeof text !== 'string') return text
  const parts = text.split(/(\*\*.*?\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((part, idx) => {
    if (!part) return null
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={idx} style={{ fontWeight: 600, color: '#1A1A18' }}>
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 3 && !part.startsWith('**')) {
      return <em key={idx}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={idx}
          style={{
            background: '#F5F5F2',
            padding: '1px 5px',
            borderRadius: 4,
            fontSize: '0.92em',
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return <span key={idx}>{part}</span>
  })
}

function Heading({ level = 1, text }) {
  const size = level === 1 ? 22 : level === 2 ? 17 : 14
  const weight = level === 1 ? 700 : 600
  const margin = level === 1 ? '24px 0 12px' : level === 2 ? '20px 0 8px' : '16px 0 6px'
  const Tag = `h${Math.min(Math.max(level, 1), 3)}`
  return (
    <Tag style={{ fontSize: size, fontWeight: weight, color: '#1A1A18', margin, lineHeight: 1.3 }}>
      {renderInline(text)}
    </Tag>
  )
}

function Paragraph({ text }) {
  return (
    <p style={{ fontSize: 14, color: '#3A3A36', lineHeight: 1.7, margin: '8px 0' }}>
      {renderInline(text)}
    </p>
  )
}

const CALLOUT_STYLES = {
  info: { bg: '#F6F5FF', border: '#D8D5F5', accent: '#534AB7' },
  warning: { bg: '#FFFBF0', border: '#F5E6C8', accent: '#D68910' },
  success: { bg: '#F0FAF6', border: '#C5EBE0', accent: '#1D9E75' },
}

function Callout({ variant = 'info', title, text }) {
  const s = CALLOUT_STYLES[variant] || CALLOUT_STYLES.info
  return (
    <div
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderLeft: `3px solid ${s.accent}`,
        borderRadius: 10,
        padding: '12px 16px',
        margin: '14px 0',
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: s.accent,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 4,
          }}
        >
          {title}
        </div>
      )}
      <div style={{ fontSize: 13.5, color: '#3A3A36', lineHeight: 1.65 }}>{renderInline(text)}</div>
    </div>
  )
}

function Table({ headers = [], rows = [] }) {
  return (
    <div style={{ margin: '16px 0', overflowX: 'auto', border: '1px solid #EBEBEA', borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#F7F7F5' }}>
            {headers.map((h, i) => (
              <th
                key={i}
                style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#6E6E6A',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: '1px solid #EBEBEA',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: ri === rows.length - 1 ? 'none' : '1px solid #F0F0EE' }}>
              {Array.isArray(row)
                ? row.map((cell, ci) => (
                    <td key={ci} style={{ padding: '10px 14px', color: '#3A3A36', lineHeight: 1.55, verticalAlign: 'top' }}>
                      {renderInline(String(cell ?? ''))}
                    </td>
                  ))
                : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Checklist({ title, items = [] }) {
  const [localItems, setLocalItems] = useState(items)
  function toggle(idx) {
    setLocalItems((prev) => prev.map((it, i) => (i === idx ? { ...it, checked: !it.checked } : it)))
  }
  return (
    <div style={{ margin: '14px 0', padding: '12px 14px', border: '1px solid #EBEBEA', borderRadius: 10, background: '#fff' }}>
      {title && (
        <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A18', marginBottom: 10 }}>{title}</div>
      )}
      {localItems.map((item, i) => (
        <label
          key={i}
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            padding: '6px 0',
            cursor: 'pointer',
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          <span
            onClick={() => toggle(i)}
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              border: `1.5px solid ${item.checked ? '#1D9E75' : '#D0D0CB'}`,
              background: item.checked ? '#F0FAF6' : '#fff',
              flexShrink: 0,
              marginTop: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            {item.checked && (
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L5 9L10 3" stroke="#1D9E75" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span
            style={{
              color: item.checked ? '#999' : '#3A3A36',
              textDecoration: item.checked ? 'line-through' : 'none',
            }}
          >
            {renderInline(item.text || '')}
          </span>
        </label>
      ))}
    </div>
  )
}

const STATUS_STYLES = {
  done: { color: '#1D9E75', bg: '#F0FAF6', label: 'Done' },
  'in-progress': { color: '#D68910', bg: '#FFFBF0', label: 'In progress' },
  upcoming: { color: '#6E6E6A', bg: '#F5F5F2', label: 'Upcoming' },
}

function Timeline({ title, events = [] }) {
  return (
    <div style={{ margin: '14px 0' }}>
      {title && <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A18', marginBottom: 10 }}>{title}</div>}
      <div style={{ position: 'relative', paddingLeft: 20 }}>
        <div
          style={{
            position: 'absolute',
            left: 5,
            top: 8,
            bottom: 8,
            width: 2,
            background: '#EBEBEA',
          }}
        />
        {events.map((ev, i) => {
          const s = STATUS_STYLES[ev.status] || STATUS_STYLES.upcoming
          return (
            <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 14, position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: -19,
                  top: 5,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: s.color,
                  border: '2px solid #fff',
                  boxShadow: '0 0 0 1px #EBEBEA',
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#6E6E6A', fontWeight: 500, marginBottom: 2 }}>{ev.date}</div>
                <div style={{ fontSize: 13, color: '#1A1A18', lineHeight: 1.5, marginBottom: 4 }}>
                  {renderInline(ev.label || '')}
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    color: s.color,
                    background: s.bg,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {s.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ChartSection({ chartType = 'bar', title, data = [] }) {
  const clean = (data || []).filter((d) => d && typeof d.label === 'string' && typeof d.value === 'number')
  if (clean.length === 0) return null

  return (
    <div style={{ margin: '16px 0', padding: '14px 16px', border: '1px solid #EBEBEA', borderRadius: 10, background: '#fff' }}>
      {title && <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A18', marginBottom: 10 }}>{title}</div>}
      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={clean} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="#F0F0EE" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6E6E6A' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6E6E6A' }} />
              <Tooltip cursor={{ stroke: '#D8D5F5' }} />
              <Line type="monotone" dataKey="value" stroke="#534AB7" strokeWidth={2} dot={{ fill: '#534AB7', r: 3 }} />
            </LineChart>
          ) : chartType === 'pie' ? (
            <PieChart>
              <Pie data={clean} dataKey="value" nameKey="label" innerRadius={40} outerRadius={80} paddingAngle={2}>
                {clean.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : (
            <BarChart data={clean} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="#F0F0EE" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6E6E6A' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6E6E6A' }} />
              <Tooltip cursor={{ fill: '#F6F5FF' }} />
              <Bar dataKey="value" fill="#534AB7" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function Quote({ text, attribution }) {
  return (
    <blockquote
      style={{
        margin: '18px 0',
        padding: '12px 18px',
        borderLeft: '3px solid #D8D5F5',
        background: '#F6F5FF',
        borderRadius: '0 10px 10px 0',
        fontSize: 14,
        color: '#3A3A36',
        fontStyle: 'italic',
        lineHeight: 1.6,
      }}
    >
      <div>“{text}”</div>
      {attribution && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#6E6E6A', fontStyle: 'normal' }}>— {attribution}</div>
      )}
    </blockquote>
  )
}

function Divider() {
  return <hr style={{ border: 'none', borderTop: '1px solid #EBEBEA', margin: '20px 0' }} />
}

// Legacy-markdown fallback (from the original ArtifactModal renderMarkdown helper,
// preserved so pre-schema cached artifacts still render correctly).
function LegacyMarkdown({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  const elements = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('### ')) {
      elements.push(<Heading key={i} level={3} text={line.slice(4)} />)
    } else if (line.startsWith('## ')) {
      elements.push(<Heading key={i} level={2} text={line.slice(3)} />)
    } else if (line.startsWith('# ')) {
      elements.push(<Heading key={i} level={1} text={line.slice(2)} />)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} style={{ display: 'flex', gap: 8, margin: '4px 0', paddingLeft: 4 }}>
          <span style={{ color: '#534AB7', fontWeight: 700, flexShrink: 0 }}>•</span>
          <span style={{ fontSize: 14, color: '#3A3A36', lineHeight: 1.65 }}>{renderInline(line.slice(2))}</span>
        </div>,
      )
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\.\s/)[1]
      elements.push(
        <div key={i} style={{ display: 'flex', gap: 8, margin: '4px 0', paddingLeft: 4 }}>
          <span style={{ color: '#534AB7', fontWeight: 600, flexShrink: 0, fontSize: 14 }}>{num}.</span>
          <span style={{ fontSize: 14, color: '#3A3A36', lineHeight: 1.65 }}>
            {renderInline(line.replace(/^\d+\.\s/, ''))}
          </span>
        </div>,
      )
    } else if (line.startsWith('```')) {
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre
          key={`c${i}`}
          style={{
            background: '#F5F5F2',
            padding: '12px 16px',
            borderRadius: 8,
            fontSize: 12,
            lineHeight: 1.6,
            overflow: 'auto',
            margin: '12px 0',
            fontFamily: "'DM Mono', monospace",
            color: '#1A1A18',
          }}
        >
          {codeLines.join('\n')}
        </pre>,
      )
    } else if (line.startsWith('---') || line.startsWith('***')) {
      elements.push(<Divider key={i} />)
    } else if (line.startsWith('> ')) {
      elements.push(<Quote key={i} text={line.slice(2)} />)
    } else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: 8 }} />)
    } else {
      elements.push(<Paragraph key={i} text={line} />)
    }
    i++
  }
  return <>{elements}</>
}

export default function RichArtifactRenderer({ artifact }) {
  // Handle legacy content stored as a raw markdown string
  if (typeof artifact === 'string') return <LegacyMarkdown text={artifact} />
  if (artifact && typeof artifact.markdown === 'string') return <LegacyMarkdown text={artifact.markdown} />

  const sections = artifact?.sections
  if (!Array.isArray(sections) || sections.length === 0) {
    return (
      <div style={{ padding: 24, fontSize: 13, color: '#999' }}>
        This artifact has no content yet.
      </div>
    )
  }

  return (
    <div>
      {sections.map((s, i) => {
        if (!s || typeof s !== 'object') return null
        switch (s.kind) {
          case 'heading':
            return <Heading key={i} level={s.level} text={s.text} />
          case 'paragraph':
            return <Paragraph key={i} text={s.text} />
          case 'callout':
            return <Callout key={i} variant={s.variant} title={s.title} text={s.text} />
          case 'table':
            return <Table key={i} headers={s.headers} rows={s.rows} />
          case 'checklist':
            return <Checklist key={i} title={s.title} items={s.items} />
          case 'timeline':
            return <Timeline key={i} title={s.title} events={s.events} />
          case 'chart':
            return <ChartSection key={i} chartType={s.chartType} title={s.title} data={s.data} />
          case 'quote':
            return <Quote key={i} text={s.text} attribution={s.attribution} />
          case 'divider':
            return <Divider key={i} />
          default:
            return null
        }
      })}
    </div>
  )
}
