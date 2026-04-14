import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Rect,
  Line as SvgLine,
  Circle,
} from '@react-pdf/renderer'
import { pdfStyles as s, COLORS } from './styles.js'

// Renders a RichArtifactJSON (or legacy markdown) as a PDF Document.

function stripMd(text) {
  if (typeof text !== 'string') return ''
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
}

function Heading({ level = 1, text }) {
  const style = level === 1 ? s.h1 : level === 2 ? s.h2 : s.h3
  return <Text style={style}>{stripMd(text)}</Text>
}

function Paragraph({ text }) {
  return <Text style={s.paragraph}>{stripMd(text)}</Text>
}

function Callout({ variant = 'info', title, text }) {
  const tint =
    variant === 'warning'
      ? { bg: COLORS.warningLight, accent: COLORS.warning }
      : variant === 'success'
      ? { bg: COLORS.greenLight, accent: COLORS.green }
      : { bg: COLORS.purpleLight, accent: COLORS.purple }
  return (
    <View
      style={{
        padding: 10,
        borderRadius: 6,
        marginVertical: 8,
        borderLeft: `3 solid ${tint.accent}`,
        backgroundColor: tint.bg,
      }}
    >
      {title && (
        <Text
          style={{
            fontSize: 9,
            fontFamily: 'Helvetica-Bold',
            color: tint.accent,
            marginBottom: 3,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
          }}
        >
          {title}
        </Text>
      )}
      <Text>{stripMd(text)}</Text>
    </View>
  )
}

function Table({ headers = [], rows = [] }) {
  return (
    <View style={s.table}>
      <View style={s.tr}>
        {headers.map((h, i) => (
          <Text key={i} style={s.th}>
            {stripMd(String(h))}
          </Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={s.tr} wrap={false}>
          {Array.isArray(row) &&
            row.map((cell, ci) => (
              <Text key={ci} style={s.td}>
                {stripMd(String(cell ?? ''))}
              </Text>
            ))}
        </View>
      ))}
    </View>
  )
}

function Checklist({ title, items = [] }) {
  return (
    <View wrap={false} style={{ marginVertical: 8 }}>
      {title && <Text style={s.sectionTitle}>{stripMd(title)}</Text>}
      {items.map((it, i) => (
        <View key={i} style={s.checklistRow}>
          <View style={it.checked ? s.checkboxDone : s.checkbox} />
          <Text style={{ flex: 1, textDecoration: it.checked ? 'line-through' : 'none', color: it.checked ? COLORS.textMuted : COLORS.text }}>
            {stripMd(it.text || '')}
          </Text>
        </View>
      ))}
    </View>
  )
}

function Timeline({ title, events = [] }) {
  return (
    <View style={{ marginVertical: 8 }}>
      {title && <Text style={s.sectionTitle}>{stripMd(title)}</Text>}
      {events.map((ev, i) => {
        const tint =
          ev.status === 'done' ? COLORS.green : ev.status === 'in-progress' ? COLORS.warning : COLORS.textFaint
        return (
          <View key={i} style={s.timelineRow} wrap={false}>
            <Text style={s.timelineDate}>{stripMd(ev.date || '')}</Text>
            <View style={{ flex: 1 }}>
              <Text>{stripMd(ev.label || '')}</Text>
              <Text style={{ fontSize: 8, color: tint, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {ev.status || 'upcoming'}
              </Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

// Simple bar chart rendered via @react-pdf/renderer SVG primitives.
// Pie/line data render as a simple labeled list (PDF-friendly fallback).
function Chart({ chartType = 'bar', title, data = [] }) {
  const clean = (data || []).filter((d) => d && typeof d.value === 'number' && typeof d.label === 'string')
  if (clean.length === 0) return null

  if (chartType === 'bar') {
    const w = 460
    const h = 140
    const padL = 30
    const padR = 10
    const padT = 10
    const padB = 28
    const max = Math.max(...clean.map((d) => d.value), 1)
    const innerW = w - padL - padR
    const innerH = h - padT - padB
    const barW = (innerW / clean.length) * 0.7
    const gap = (innerW / clean.length) * 0.3

    return (
      <View style={s.chartContainer} wrap={false}>
        {title && <Text style={s.sectionTitle}>{stripMd(title)}</Text>}
        <Svg width={w} height={h}>
          <SvgLine x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke={COLORS.border} strokeWidth={1} />
          {clean.map((d, i) => {
            const barH = (d.value / max) * innerH
            const x = padL + i * (barW + gap) + gap / 2
            const y = h - padB - barH
            return (
              <React.Fragment key={i}>
                <Rect x={x} y={y} width={barW} height={barH} fill={COLORS.purple} />
                <Text
                  x={x + barW / 2}
                  y={h - padB + 10}
                  style={{ fontSize: 8, fill: COLORS.textMuted, textAnchor: 'middle' }}
                >
                  {stripMd(d.label).slice(0, 10)}
                </Text>
                <Text
                  x={x + barW / 2}
                  y={y - 3}
                  style={{ fontSize: 8, fill: COLORS.text, textAnchor: 'middle' }}
                >
                  {String(d.value)}
                </Text>
              </React.Fragment>
            )
          })}
        </Svg>
      </View>
    )
  }

  // Non-bar charts: labelled list (keeps PDF simple + reliable)
  return (
    <View style={s.chartContainer} wrap={false}>
      {title && <Text style={s.sectionTitle}>{stripMd(title)}</Text>}
      {clean.map((d, i) => (
        <View key={i} style={{ flexDirection: 'row', marginBottom: 3 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: COLORS.purple,
              marginRight: 6,
              marginTop: 2,
            }}
          />
          <Text style={{ flex: 1 }}>{stripMd(d.label)}</Text>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{String(d.value)}</Text>
        </View>
      ))}
    </View>
  )
}

function Quote({ text, attribution }) {
  return (
    <View style={s.quote} wrap={false}>
      <Text>"{stripMd(text)}"</Text>
      {attribution && (
        <Text style={{ marginTop: 4, fontSize: 9, color: COLORS.textMuted, fontStyle: 'normal' }}>
          — {stripMd(attribution)}
        </Text>
      )}
    </View>
  )
}

function Section({ section }) {
  if (!section || typeof section !== 'object') return null
  switch (section.kind) {
    case 'heading':
      return <Heading level={section.level} text={section.text} />
    case 'paragraph':
      return <Paragraph text={section.text} />
    case 'callout':
      return <Callout variant={section.variant} title={section.title} text={section.text} />
    case 'table':
      return <Table headers={section.headers} rows={section.rows} />
    case 'checklist':
      return <Checklist title={section.title} items={section.items} />
    case 'timeline':
      return <Timeline title={section.title} events={section.events} />
    case 'chart':
      return <Chart chartType={section.chartType} title={section.title} data={section.data} />
    case 'quote':
      return <Quote text={section.text} attribution={section.attribution} />
    case 'divider':
      return <View style={s.divider} />
    default:
      return null
  }
}

function legacyMarkdownToSections(md) {
  // Crude markdown-to-section parser used only for legacy cached artifacts.
  if (typeof md !== 'string' || !md.trim()) return []
  const lines = md.split('\n')
  const out = []
  let para = []
  const flushPara = () => {
    if (para.length) {
      out.push({ kind: 'paragraph', text: para.join(' ') })
      para = []
    }
  }
  for (const line of lines) {
    if (/^### /.test(line)) {
      flushPara()
      out.push({ kind: 'heading', level: 3, text: line.slice(4) })
    } else if (/^## /.test(line)) {
      flushPara()
      out.push({ kind: 'heading', level: 2, text: line.slice(3) })
    } else if (/^# /.test(line)) {
      flushPara()
      out.push({ kind: 'heading', level: 1, text: line.slice(2) })
    } else if (/^---+$/.test(line)) {
      flushPara()
      out.push({ kind: 'divider' })
    } else if (line.trim() === '') {
      flushPara()
    } else {
      para.push(line.trim())
    }
  }
  flushPara()
  return out
}

export function ArtifactDocument({ artifact, contextLabel }) {
  let sections = []
  let title = 'Artifact'

  if (artifact && typeof artifact === 'object' && Array.isArray(artifact.sections)) {
    sections = artifact.sections
    title = artifact.title || title
  } else if (artifact && typeof artifact.markdown === 'string') {
    sections = legacyMarkdownToSections(artifact.markdown)
    title = artifact.title || title
  } else if (typeof artifact === 'string') {
    sections = legacyMarkdownToSections(artifact)
  }

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.docTitle}>{stripMd(title)}</Text>
        {contextLabel && <Text style={s.docSubtitle}>{stripMd(contextLabel)}</Text>}
        {sections.map((section, i) => (
          <Section key={i} section={section} />
        ))}
        <Text
          style={s.footer}
          render={({ pageNumber, totalPages }) => `Mosen · Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}
