import React from 'react'
import { Document, Page, Text, View } from '@react-pdf/renderer'
import { pdfStyles as s, COLORS } from './styles.js'

// Playbook-structure PDF: phases → activities → hypotheses → completion state.
// Does NOT bundle activity artifact contents — those are downloaded per-artifact.

function StatusBadge({ completed }) {
  return (
    <Text
      style={{
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: completed ? COLORS.green : COLORS.textMuted,
        backgroundColor: completed ? COLORS.greenLight : COLORS.bg,
        alignSelf: 'flex-start',
      }}
    >
      {completed ? 'Done' : 'Open'}
    </Text>
  )
}

export function PlaybookDocument({ initiativeTitle, version }) {
  const phases = Array.isArray(version?.phases) ? version.phases : []
  const allActivities = phases.flatMap((p) => p.activities || [])
  const done = allActivities.filter((a) => a.completed).length
  const createdAt = version?.createdAt ? new Date(version.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.mutedLabel}>Change plan</Text>
        <Text style={s.docTitle}>{initiativeTitle || 'Untitled initiative'}</Text>
        <Text style={s.docSubtitle}>
          Playbook v{version?.version || 1}
          {createdAt ? ` · ${createdAt}` : ''}
          {allActivities.length > 0 ? ` · ${done}/${allActivities.length} experiments complete` : ''}
        </Text>

        {version?.changeSummary && (
          <View style={s.callout}>
            <Text style={s.calloutTitle}>What changed</Text>
            <Text>{version.changeSummary}</Text>
          </View>
        )}

        {phases.map((phase, pi) => (
          <View key={pi} style={{ marginTop: 14 }} wrap={false}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <Text style={s.h2}>
                {pi + 1}. {phase.name || 'Untitled phase'}
              </Text>
              {phase.duration && <Text style={{ fontSize: 9, color: COLORS.textFaint }}>{phase.duration}</Text>}
            </View>
            {(phase.activities || []).map((a, ai) => (
              <View
                key={ai}
                style={{
                  marginBottom: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderLeft: `2 solid ${a.completed ? COLORS.green : COLORS.border}`,
                  backgroundColor: a.completed ? COLORS.greenLight : '#fff',
                }}
                wrap={false}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11, flex: 1, marginRight: 10 }}>
                    {ai + 1}. {a.title || 'Untitled activity'}
                  </Text>
                  <StatusBadge completed={a.completed} />
                </View>
                {a.description && <Text style={{ marginBottom: 3 }}>{a.description}</Text>}
                {a.hypothesis && (
                  <Text style={{ fontSize: 9.5, color: COLORS.textMuted, fontStyle: 'italic' }}>{a.hypothesis}</Text>
                )}
                {a.owner && (
                  <Text style={{ fontSize: 9, color: COLORS.purple, marginTop: 3 }}>Owner: {a.owner}</Text>
                )}
                {Array.isArray(a.artifacts) && a.artifacts.length > 0 && (
                  <Text style={{ fontSize: 9, color: COLORS.textFaint, marginTop: 3 }}>
                    Artifacts: {a.artifacts.join(' · ')}
                  </Text>
                )}
              </View>
            ))}
          </View>
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
