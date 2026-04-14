'use client'
import { useState } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

const PILLAR_COLORS = {
  Inclusion: '#3B82F6',
  Empathy: '#1D9E75',
  Vulnerability: '#8B5CF6',
  Trust: '#D4A843',
  Empowerment: '#F97316',
  Forgiveness: '#06B6D4',
}
const PILLAR_COLOR_LIST = Object.values(PILLAR_COLORS)

const SENTIMENT_CONFIG = {
  positive: { color: '#1D9E75', bg: '#F0FAF6', label: 'Positive' },
  neutral: { color: '#D4A843', bg: '#FFFBF0', label: 'Neutral' },
  concerned: { color: '#C0392B', bg: '#FFF3F0', label: 'Concerned' },
  concern: { color: '#C0392B', bg: '#FFF3F0', label: 'Concerned' },
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      flex: 1, minWidth: 100, padding: '14px 16px', borderRadius: 12,
      background: '#fff', border: '1px solid #EBEBEA',
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || '#1A1A18', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 2, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#C0C0BA', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function SentimentDot({ sentiment }) {
  const cfg = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.neutral
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: cfg.color, flexShrink: 0,
    }} />
  )
}

function ChartToggle({ options, value, onChange }) {
  return (
    <div style={{ display: 'inline-flex', borderRadius: 6, border: '1px solid #EBEBEA', overflow: 'hidden' }}>
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          title={opt.label}
          style={{
            padding: '3px 8px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
            border: 'none', borderRight: '1px solid #EBEBEA',
            background: value === opt.key ? '#534AB7' : '#fff',
            color: value === opt.key ? '#fff' : '#999',
            transition: 'all 0.15s',
          }}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  )
}

const PILLAR_CHART_OPTS = [
  { key: 'radar', label: 'Radar', icon: '◎' },
  { key: 'bar', label: 'Bar', icon: '▥' },
  { key: 'pie', label: 'Pie', icon: '◕' },
]

const THEME_CHART_OPTS = [
  { key: 'bar', label: 'Bar', icon: '▥' },
  { key: 'pie', label: 'Pie', icon: '◕' },
]

const SENTIMENT_CHART_OPTS = [
  { key: 'donut', label: 'Donut', icon: '◕' },
  { key: 'bar', label: 'Bar', icon: '▥' },
]

function PillarRadar({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid stroke="#EBEBEA" />
        <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 10, fill: '#666' }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar dataKey="score" stroke="#534AB7" fill="#534AB7" fillOpacity={0.2} strokeWidth={2} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #EBEBEA' }} formatter={(val) => [`${val}/100`, 'Score']} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

function PillarBar({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="#F5F5F2" />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="pillar" tick={{ fontSize: 11, fill: '#666' }} width={100} axisLine={false} tickLine={false} />
        <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={14}>
          {data.map((d, i) => <Cell key={i} fill={PILLAR_COLORS[d.pillar] || PILLAR_COLOR_LIST[i % PILLAR_COLOR_LIST.length]} />)}
        </Bar>
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #EBEBEA' }} formatter={(val) => [`${val}/100`, 'Score']} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function PillarPie({ data }) {
  const filtered = data.filter(d => d.score > 0)
  return (
    <>
      <ResponsiveContainer width="100%" height={170}>
        <PieChart>
          <Pie data={filtered} dataKey="score" nameKey="pillar" innerRadius="40%" outerRadius="80%" paddingAngle={2} stroke="none">
            {filtered.map((d, i) => <Cell key={i} fill={PILLAR_COLORS[d.pillar] || PILLAR_COLOR_LIST[i % PILLAR_COLOR_LIST.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #EBEBEA' }} formatter={(val, name) => [`${val}/100`, name]} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
        {filtered.map(d => (
          <div key={d.pillar} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: PILLAR_COLORS[d.pillar], display: 'inline-block' }} />
            <span style={{ color: '#666' }}>{d.pillar}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function SentimentDonut({ data }) {
  return (
    <>
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie data={data} innerRadius="55%" outerRadius="85%" dataKey="value" paddingAngle={3} stroke="none">
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #EBEBEA' }} formatter={(val, name) => [`${val} theme${val !== 1 ? 's' : ''}`, name]} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {data.map(d => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
            <span style={{ color: '#666' }}>{d.name}</span>
            <span style={{ color: '#999', fontWeight: 600 }}>{d.value}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function SentimentBar({ data }) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke="#F5F5F2" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#666' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={28}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #EBEBEA' }} formatter={(val) => [`${val} theme${val !== 1 ? 's' : ''}`, '']} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function ThemeBar({ data }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="#F5F5F2" />
        <XAxis type="number" tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#666' }} width={130} axisLine={false} tickLine={false} />
        <Bar dataKey="contributors" radius={[0, 6, 6, 0]} barSize={16}>
          {data.map((_, i) => <Cell key={i} fill={PILLAR_COLOR_LIST[i % PILLAR_COLOR_LIST.length]} />)}
        </Bar>
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #EBEBEA' }} formatter={(val) => [`${val} contributor${val !== 1 ? 's' : ''}`, '']} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function ThemePie({ data }) {
  return (
    <>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="contributors" nameKey="name" innerRadius="35%" outerRadius="75%" paddingAngle={2} stroke="none">
            {data.map((_, i) => <Cell key={i} fill={PILLAR_COLOR_LIST[i % PILLAR_COLOR_LIST.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #EBEBEA' }} formatter={(val, name) => [`${val} contributor${val !== 1 ? 's' : ''}`, name]} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
        {data.map((d, i) => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: PILLAR_COLOR_LIST[i % PILLAR_COLOR_LIST.length], display: 'inline-block' }} />
            <span style={{ color: '#666' }}>{d.name}</span>
          </div>
        ))}
      </div>
    </>
  )
}

export default function SynthesisCard({ synthesis }) {
  const [expandedTheme, setExpandedTheme] = useState(null)
  const [pillarChart, setPillarChart] = useState('radar')
  const [themeChart, setThemeChart] = useState('bar')
  const [sentimentChart, setSentimentChart] = useState('donut')

  if (!synthesis) return null

  const themes = synthesis.themes || []
  const pillarMapping = synthesis.pillarMapping || {}
  const pillars = Object.entries(pillarMapping).filter(([_, v]) => v > 0)
  const totalContributors = synthesis.totalContributors || themes.reduce((s, t) => s + (t.contributorCount || t.count || 0), 0)
  const responseRate = synthesis.responseRate || 0

  const sentimentCounts = { positive: 0, neutral: 0, concerned: 0 }
  themes.forEach(t => {
    const s = t.sentiment === 'concern' ? 'concerned' : (t.sentiment || 'neutral')
    sentimentCounts[s] = (sentimentCounts[s] || 0) + 1
  })
  const sentimentData = Object.entries(sentimentCounts)
    .filter(([_, v]) => v > 0)
    .map(([key, value]) => ({
      name: SENTIMENT_CONFIG[key]?.label || key,
      value,
      color: SENTIMENT_CONFIG[key]?.color || '#999',
    }))

  const radarData = Object.entries(PILLAR_COLORS).map(([pillar]) => ({
    pillar,
    score: pillarMapping[pillar] || 0,
    fullMark: 100,
  }))
  const hasRadarData = radarData.some(d => d.score > 0)

  const topPillar = pillars.length > 0
    ? pillars.reduce((a, b) => (a[1] >= b[1] ? a : b))
    : null

  const barData = themes
    .filter(t => (t.contributorCount || t.count || t.percentage))
    .map(t => ({
      name: t.name.length > 18 ? t.name.slice(0, 18) + '…' : t.name,
      contributors: t.contributorCount || t.count || 0,
      percentage: t.percentage || 0,
    }))

  return (
    <div style={{ padding: 20, fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── Stat Cards Row ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="Contributors" value={totalContributors} accent="#534AB7" />
        <StatCard
          label="Response Rate"
          value={responseRate > 0 ? `${Math.round(responseRate * 100)}%` : '—'}
          accent={responseRate >= 0.5 ? '#1D9E75' : responseRate > 0 ? '#F97316' : '#999'}
        />
        <StatCard label="Themes Found" value={themes.length} accent="#8B5CF6" />
        {topPillar && (
          <StatCard label="Strongest Signal" value={topPillar[0]} sub={`${topPillar[1]}/100`} accent={PILLAR_COLORS[topPillar[0]] || '#534AB7'} />
        )}
      </div>

      {/* ── Charts Row ── */}
      {(hasRadarData || sentimentData.length > 0) && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>

          {/* Pillar chart */}
          {hasRadarData && (
            <div style={{
              flex: '1 1 280px', minHeight: 260, padding: 16,
              background: '#fff', border: '1px solid #EBEBEA', borderRadius: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A18' }}>Culture Pillars</span>
                <ChartToggle options={PILLAR_CHART_OPTS} value={pillarChart} onChange={setPillarChart} />
              </div>
              {pillarChart === 'radar' && <PillarRadar data={radarData} />}
              {pillarChart === 'bar' && <PillarBar data={radarData} />}
              {pillarChart === 'pie' && <PillarPie data={radarData} />}
            </div>
          )}

          {/* Sentiment chart */}
          {sentimentData.length > 0 && (
            <div style={{
              flex: '0 1 220px', minHeight: 260, padding: 16,
              background: '#fff', border: '1px solid #EBEBEA', borderRadius: 12,
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A18' }}>Sentiment</span>
                <ChartToggle options={SENTIMENT_CHART_OPTS} value={sentimentChart} onChange={setSentimentChart} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {sentimentChart === 'donut' && <SentimentDonut data={sentimentData} />}
                {sentimentChart === 'bar' && <SentimentBar data={sentimentData} />}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Contributors by Theme ── */}
      {barData.length > 1 && (
        <div style={{
          marginBottom: 24, padding: 16,
          background: '#fff', border: '1px solid #EBEBEA', borderRadius: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A18' }}>Contributors by Theme</span>
            <ChartToggle options={THEME_CHART_OPTS} value={themeChart} onChange={setThemeChart} />
          </div>
          {themeChart === 'bar' && <ThemeBar data={barData} />}
          {themeChart === 'pie' && <ThemePie data={barData} />}
        </div>
      )}

      {/* ── Theme Detail Cards ── */}
      <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A18', marginBottom: 10 }}>
        Themes ({themes.length})
      </div>
      {themes.map((theme, i) => {
        const isExpanded = expandedTheme === i
        const cfg = SENTIMENT_CONFIG[theme.sentiment === 'concern' ? 'concerned' : theme.sentiment] || SENTIMENT_CONFIG.neutral
        return (
          <div
            key={i}
            onClick={() => setExpandedTheme(isExpanded ? null : i)}
            style={{
              marginBottom: 10, padding: '14px 16px', border: '1px solid #EBEBEA', borderRadius: 12,
              background: '#fff', cursor: 'pointer', transition: 'all 0.15s',
              borderLeft: `3px solid ${PILLAR_COLORS[theme.pillar] || '#534AB7'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                <SentimentDot sentiment={theme.sentiment} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A18', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {theme.name}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {(theme.contributorCount || theme.count) > 0 && (
                  <span style={{ fontSize: 11, color: '#999', fontWeight: 500 }}>
                    {theme.contributorCount || theme.count} voice{(theme.contributorCount || theme.count) !== 1 ? 's' : ''}
                  </span>
                )}
                {theme.percentage > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                    background: cfg.bg, color: cfg.color,
                  }}>
                    {theme.percentage}%
                  </span>
                )}
                <span style={{
                  fontSize: 12, color: '#999',
                  transform: isExpanded ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.2s',
                }}>›</span>
              </div>
            </div>

            {isExpanded && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F5F5F2' }}>
                <div style={{ fontSize: 13, color: '#666', lineHeight: 1.7, marginBottom: 10 }}>
                  {theme.description}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {theme.pillar && (
                    <span style={{
                      fontSize: 11, padding: '3px 12px', borderRadius: 20, fontWeight: 500,
                      background: `${PILLAR_COLORS[theme.pillar] || '#534AB7'}12`,
                      color: PILLAR_COLORS[theme.pillar] || '#534AB7',
                      border: `1px solid ${PILLAR_COLORS[theme.pillar] || '#534AB7'}30`,
                    }}>
                      {theme.pillar}
                    </span>
                  )}
                  <span style={{
                    fontSize: 11, padding: '3px 12px', borderRadius: 20, fontWeight: 500,
                    background: cfg.bg, color: cfg.color,
                    border: `1px solid ${cfg.color}30`,
                  }}>
                    {cfg.label}
                  </span>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* ── Pillar Strength List (fallback if no radar data) ── */}
      {!hasRadarData && pillars.length > 0 && (
        <div style={{ marginTop: 20, padding: 16, border: '1px solid #EBEBEA', borderRadius: 12, background: '#FAFAF8' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A18', marginBottom: 12 }}>Culture Pillar Signals</div>
          {pillars.map(([pillar, score]) => (
            <div key={pillar} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: PILLAR_COLORS[pillar] || '#534AB7', fontWeight: 500 }}>{pillar}</span>
                <span style={{ color: '#999' }}>{score}/100</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: '#EBEBEA' }}>
                <div style={{ height: '100%', width: `${score}%`, background: PILLAR_COLORS[pillar] || '#534AB7', borderRadius: 3, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Recommended Action ── */}
      {synthesis.recommendedAction && (
        <div style={{
          marginTop: 20, padding: 16, borderRadius: 12,
          background: 'linear-gradient(135deg, #F6F5FF 0%, #EAE8FC 100%)',
          borderLeft: '3px solid #534AB7',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#534AB7' }}>Recommended Next Step</span>
          </div>
          <div style={{ fontSize: 13, color: '#1A1A18', lineHeight: 1.7 }}>{synthesis.recommendedAction}</div>
        </div>
      )}

      {/* ── Timestamp ── */}
      {synthesis.createdAt && (
        <div style={{ marginTop: 16, fontSize: 11, color: '#C0C0BA', textAlign: 'right' }}>
          Generated {new Date(synthesis.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  )
}
