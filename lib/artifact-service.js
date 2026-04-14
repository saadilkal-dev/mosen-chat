/**
 * Shared Artifact Generation Service
 *
 * Used by:
 *   - app/api/initiative/[id]/artifact/route.js  (on-demand, per-click)
 *   - app/api/initiative/[id]/playbook/confirm/route.js  (background pre-gen on confirm)
 *
 * Model: Sonnet for quality. Speed comes from background pre-generation on playbook confirm
 * (cache hit = ~50ms regardless of model). Switching to Haiku for artifacts would degrade
 * document quality — these are structured professional documents, not simple summaries.
 */

import { ChatAnthropic } from '@langchain/anthropic'
import { HumanMessage } from '@langchain/core/messages'
import { artifactGenerationPrompt } from './mosen-prompts.js'
import { getInitiativeRow, getGeneratedArtifact, saveGeneratedArtifact } from './leader-store.js'
import { MODEL_ID } from './graph/base.js'

const ARTIFACT_MODEL = MODEL_ID  // claude-sonnet-4-20250514 — quality matters for structured docs

function aiText(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content))
    return content.map((x) => (x && typeof x === 'object' && 'text' in x ? x.text : '')).join('')
  return String(content ?? '')
}

const VALID_KINDS = new Set([
  'heading', 'paragraph', 'callout', 'table',
  'checklist', 'timeline', 'chart', 'quote', 'divider',
])

/**
 * Pull structured JSON out of the model's response.
 * Falls back to wrapping raw text in a single-paragraph artifact so the UI never breaks.
 */
export function parseArtifactResponse(text, fallbackTitle) {
  if (typeof text !== 'string' || !text.trim()) {
    return { version: 1, title: fallbackTitle, sections: [] }
  }
  const match = text.match(/\{[\s\S]*\}/)
  if (match) {
    try {
      const parsed = JSON.parse(match[0])
      if (parsed && Array.isArray(parsed.sections)) {
        return {
          version: typeof parsed.version === 'number' ? parsed.version : 1,
          title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title : fallbackTitle,
          sections: parsed.sections.filter((s) => s && VALID_KINDS.has(s.kind)),
        }
      }
    } catch { /* fall through to fallback */ }
  }
  return {
    version: 1,
    title: fallbackTitle,
    sections: [{ kind: 'paragraph', text: text.trim() }],
  }
}

/**
 * Normalise a cache hit — content may be a JSONB object, a JSON string, or a
 * legacy plain-markdown string. Try each shape in order.
 */
export function normaliseCached(content, fallbackTitle) {
  if (content && typeof content === 'object' && Array.isArray(content.sections)) {
    return { artifact: content, format: 'rich' }
  }
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content)
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.sections)) {
        return { artifact: parsed, format: 'rich' }
      }
    } catch { /* not JSON — treat as legacy markdown */ }
    return { artifact: { version: 0, title: fallbackTitle, markdown: content }, format: 'markdown' }
  }
  return { artifact: { version: 1, title: fallbackTitle, sections: [] }, format: 'rich' }
}

/**
 * Build a deterministic cache key from artifact context.
 */
export function buildArtifactKey(phaseName, activityTitle, artifactName) {
  return [phaseName, activityTitle, artifactName]
    .filter(Boolean)
    .join('::')
    .toLowerCase()
    .replace(/[^a-z0-9:]+/g, '-')
}

/**
 * Generate (or return cached) a single artifact using Claude Haiku.
 * @returns {{ artifact, format, generatedAt, cached, artifactKey }}
 */
export async function generateAndCacheArtifact(initId, { artifactName, activityTitle, phaseName }) {
  if (!artifactName) throw new Error('artifactName is required')

  const init = await getInitiativeRow(initId)
  if (!init) throw new Error('Initiative not found')

  const artifactKey = buildArtifactKey(phaseName, activityTitle, artifactName)

  // Check cache first
  const cached = await getGeneratedArtifact(initId, artifactKey)
  if (cached) {
    const { artifact, format } = normaliseCached(cached.content, artifactName)
    return { artifact, format, generatedAt: cached.generated_at, cached: true, artifactKey }
  }

  // Generate via Claude Haiku (3-4× faster than Sonnet for structured docs)
  const prompt = artifactGenerationPrompt({
    artifact_name: artifactName,
    activity_title: activityTitle || '',
    phase_name: phaseName || '',
    initiative_title: init.title || 'Untitled',
    brief_summary: init.summary || '',
  })

  const model = new ChatAnthropic({
    model: ARTIFACT_MODEL,
    temperature: 0.5,
    maxTokens: 2048,
    maxRetries: 2,
  })
  const response = await model.invoke([new HumanMessage(prompt)])
  const text = aiText(response.content)
  const artifact = parseArtifactResponse(text, artifactName)

  // Cache the structured artifact object
  await saveGeneratedArtifact(initId, artifactKey, artifact)

  return { artifact, format: 'rich', generatedAt: new Date().toISOString(), cached: false, artifactKey }
}

/**
 * Pre-generate ALL artifacts for a playbook version in background.
 * Runs in batches of 3 to avoid hitting rate limits.
 * Fire-and-forget — callers should .catch(console.error).
 */
export async function backgroundGenerateAllArtifacts(initId, playbookVersion) {
  const all = (playbookVersion.phases || []).flatMap(phase =>
    (phase.activities || []).flatMap(activity =>
      (activity.artifacts || []).map(artifactName => ({
        artifactName,
        activityTitle: activity.title,
        phaseName: phase.name,
      }))
    )
  )

  if (all.length === 0) return

  console.info(`[ArtifactService] Background pre-generating ${all.length} artifact(s) for initiative ${initId}`)

  let generated = 0
  for (let i = 0; i < all.length; i += 3) {
    const results = await Promise.allSettled(
      all.slice(i, i + 3).map(a => generateAndCacheArtifact(initId, a))
    )
    generated += results.filter(r => r.status === 'fulfilled' && !r.value.cached).length
  }

  console.info(`[ArtifactService] Pre-generation complete: ${generated} new, ${all.length - generated} already cached`)
}
