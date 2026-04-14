/**
 * Shared playbook utilities: phase safety merges, timeline heuristics,
 * employee focus, version diffs, and completion summaries for leader context.
 */

/** @param {unknown} phases */
export function isNonEmptyPhases(phases) {
  return Array.isArray(phases) && phases.length > 0
}

/**
 * If the model returned recommendations-only or empty phases, keep prior phases
 * and fold recommendations into changeSummary when possible.
 * @param {Record<string, unknown>} updated - parsed JSON from model
 * @param {Record<string, unknown>} currentVersion - previous playbook version
 */
export function mergePlaybookVersionSafe(updated, currentVersion) {
  const prevPhases = currentVersion?.phases
  const nextPhases = updated?.phases

  if (isNonEmptyPhases(nextPhases)) {
    return { ...updated, phases: nextPhases }
  }

  const recs = updated?.recommendations
  const summary =
    (typeof updated?.summary === 'string' && updated.summary.trim()) ||
    (typeof updated?.changeSummary === 'string' && updated.changeSummary.trim()) ||
    ''

  let changeSummary = summary
  if (Array.isArray(recs) && recs.length > 0) {
    const recText = recs
      .map((r) => {
        if (!r || typeof r !== 'object') return ''
        const ch = r.change || r.theme || ''
        return typeof ch === 'string' ? ch : ''
      })
      .filter(Boolean)
      .join(' · ')
    if (recText) {
      changeSummary = changeSummary ? `${changeSummary}\n\nRecommended adjustments: ${recText}` : `Recommended adjustments: ${recText}`
    }
  }

  return {
    ...updated,
    phases: isNonEmptyPhases(prevPhases) ? prevPhases : [],
    changeSummary: changeSummary || (updated?.changeSummary ?? ''),
  }
}

/**
 * Heuristic: parse "Week 1-2", "Weeks 3–4", "Wk 1-2" into { startWeek, endWeek }.
 * @param {string} [duration]
 * @returns {{ startWeek: number, endWeek: number } | null}
 */
export function parsePhaseWeekRange(duration) {
  if (!duration || typeof duration !== 'string') return null
  const d = duration.replace(/–/g, '-').toLowerCase()
  const m = d.match(/weeks?\s*(\d+)\s*[-–]\s*(\d+)/i) || d.match(/wk\.?\s*(\d+)\s*[-–]\s*(\d+)/i)
  if (m) {
    const a = parseInt(m[1], 10)
    const b = parseInt(m[2], 10)
    if (!Number.isNaN(a) && !Number.isNaN(b)) return { startWeek: Math.min(a, b), endWeek: Math.max(a, b) }
  }
  const single = d.match(/week\s*(\d+)/i)
  if (single) {
    const w = parseInt(single[1], 10)
    if (!Number.isNaN(w)) return { startWeek: w, endWeek: w }
  }
  return null
}

/**
 * @param {number} weekNumber - 1-based week since initiative start
 * @param {Array<{ name?: string, duration?: string, activities?: Array<{ completed?: boolean }> }>} phases
 * @returns {string | null}
 */
export function buildTimelineAlertLine(weekNumber, phases) {
  if (!Array.isArray(phases) || phases.length === 0) return null
  const lines = []
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i]
    const range = parsePhaseWeekRange(phase?.duration)
    if (!range) continue
    const acts = phase.activities || []
    const total = acts.length
    const done = acts.filter((a) => a?.completed === true).length
    if (total === 0) continue
    const pct = Math.round((done / total) * 100)
    if (weekNumber > range.endWeek && pct < 100) {
      lines.push(
        `Timeline note: "${phase.name || `Phase ${i + 1}`}" was framed for weeks ${range.startWeek}–${range.endWeek}, but it is only ~${pct}% complete as of week ${weekNumber}. Worth checking in — not as failure, but as reality.`,
      )
    }
  }
  return lines.length ? lines.join('\n') : null
}

/**
 * Per-phase completion lines for leader system prompt.
 * @param {Array<{ name?: string, activities?: Array<{ completed?: boolean, title?: string }> }>} phases
 */
export function buildPhaseCompletionLines(phases) {
  if (!Array.isArray(phases) || phases.length === 0) return ''
  return phases
    .map((phase, i) => {
      const acts = phase.activities || []
      const total = acts.length
      const done = acts.filter((a) => a?.completed === true).length
      const name = phase.name || `Phase ${i + 1}`
      return `${name}: ${done}/${total} experiments done`
    })
    .join('; ')
}

/**
 * First phase with at least one incomplete activity; else last phase.
 * @returns {{ phaseIndex: number, phase: object } | null}
 */
export function findFocusPhase(phases) {
  if (!Array.isArray(phases) || phases.length === 0) return null
  for (let pi = 0; pi < phases.length; pi++) {
    const acts = phases[pi].activities || []
    const hasIncomplete = acts.some((a) => a?.completed !== true)
    if (hasIncomplete || pi === phases.length - 1) return { phaseIndex: pi, phase: phases[pi] }
  }
  return { phaseIndex: 0, phase: phases[0] }
}

/**
 * Build internal context for employee prompt (no strategy leakage — current focus only).
 */
export function buildEmployeeCurrentActivityString(phases) {
  const focus = findFocusPhase(phases)
  if (!focus) return null
  const { phase, phaseIndex } = focus
  const acts = phase.activities || []
  const lines = acts.map((a, i) => `${i + 1}. ${a.title || 'Activity'}${a.completed ? ' (done)' : ''}`)
  const dur = phase.duration ? ` (${phase.duration})` : ''
  return `Phase ${phaseIndex + 1}: ${phase.name || 'Current phase'}${dur}\n${lines.join('\n')}`
}

/**
 * @param {Array} prevPhases
 * @param {Array} nextPhases
 * @returns {{ added: string[], removed: string[], unchanged: number }}
 */
export function diffPhaseActivitiesByTitle(prevPhases, nextPhases) {
  const prevTitles = new Set()
  for (const p of prevPhases || []) {
    for (const a of p.activities || []) {
      if (a?.title) prevTitles.add(String(a.title).trim())
    }
  }
  const nextTitles = new Set()
  for (const p of nextPhases || []) {
    for (const a of p.activities || []) {
      if (a?.title) nextTitles.add(String(a.title).trim())
    }
  }
  const added = [...nextTitles].filter((t) => !prevTitles.has(t))
  const removed = [...prevTitles].filter((t) => !nextTitles.has(t))
  return { added, removed, unchanged: [...prevTitles].filter((t) => nextTitles.has(t)).length }
}

/**
 * First incomplete activity indices or 0,0
 */
export function findFirstIncompleteActivityIndex(phases) {
  if (!Array.isArray(phases)) return { phaseIndex: 0, activityIndex: 0 }
  for (let pi = 0; pi < phases.length; pi++) {
    const acts = phases[pi]?.activities || []
    for (let ai = 0; ai < acts.length; ai++) {
      if (acts[ai]?.completed !== true) return { phaseIndex: pi, activityIndex: ai }
    }
  }
  return { phaseIndex: 0, activityIndex: 0 }
}
