'use client'

const PILLAR_COLORS = {
  Inclusion: '#3B82F6', Empathy: '#1D9E75', Vulnerability: '#8B5CF6',
  Trust: '#D4A843', Empowerment: '#F97316', Forgiveness: '#06B6D4'
}

export default function SynthesisCard({ synthesis, initiativeId }) {
  if (!synthesis) return null

  const themes = synthesis.themes || []
  const pillarMapping = synthesis.pillarMapping || {}
  const pillars = Object.entries(pillarMapping).filter(([_, v]) => v > 0)

  return (
    <div style={{ padding: 20 }}>
      {/* Response rate */}
      {synthesis.totalContributors !== undefined && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>
            {synthesis.totalContributors} employee{synthesis.totalContributors !== 1 ? 's' : ''} contributed
            {synthesis.responseRate ? ` (${Math.round(synthesis.responseRate * 100)}% response rate)` : ''}
          </div>
          <div style={{ height: 6, borderRadius: 3, background: '#EBEBEA', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(synthesis.responseRate || 0) * 100}%`, background: '#534AB7', borderRadius: 3, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      )}

      {/* Theme cards */}
      {themes.map((theme, i) => (
        <div key={i} style={{ marginBottom: 12, padding: 16, border: '1px solid #EBEBEA', borderRadius: 12, background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A18' }}>{theme.name}</span>
            {theme.percentage && <span style={{ fontSize: 12, color: '#999' }}>{theme.percentage}%</span>}
          </div>
          <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 8 }}>{theme.description}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {theme.pillar && (
              <span style={{
                fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 500,
                background: `${PILLAR_COLORS[theme.pillar] || '#534AB7'}15`,
                color: PILLAR_COLORS[theme.pillar] || '#534AB7'
              }}>
                {theme.pillar}
              </span>
            )}
            {theme.sentiment && (
              <span style={{ fontSize: 11, color: theme.sentiment === 'concerned' ? '#C0392B' : theme.sentiment === 'positive' ? '#1D9E75' : '#999' }}>
                {theme.sentiment}
              </span>
            )}
          </div>
        </div>
      ))}

      {/* Pillar strength bars (simple alternative to radar chart) */}
      {pillars.length > 0 && (
        <div style={{ marginTop: 20, padding: 16, border: '1px solid #EBEBEA', borderRadius: 12, background: '#FAFAF8' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A18', marginBottom: 12 }}>Culture Pillar Signals</div>
          {pillars.map(([pillar, score]) => (
            <div key={pillar} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: PILLAR_COLORS[pillar] || '#534AB7', fontWeight: 500 }}>{pillar}</span>
                <span style={{ color: '#999' }}>{score}/100</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: '#EBEBEA' }}>
                <div style={{ height: '100%', width: `${score}%`, background: PILLAR_COLORS[pillar] || '#534AB7', borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recommended action */}
      {synthesis.recommendedAction && (
        <div style={{ marginTop: 16, padding: 16, background: '#F6F5FF', borderRadius: 12, borderLeft: '3px solid #534AB7' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#534AB7', marginBottom: 6 }}>Recommended Next Step</div>
          <div style={{ fontSize: 13, color: '#1A1A18', lineHeight: 1.6 }}>{synthesis.recommendedAction}</div>
        </div>
      )}
    </div>
  )
}
