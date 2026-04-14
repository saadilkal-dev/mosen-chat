/**
 * Background artifact pre-generation after playbook confirm — uses enriched context
 * (brief, synthesis, chat snippet, completion) so documents are grounded in reality.
 */
import { ChatAnthropic } from '@langchain/anthropic'
import { HumanMessage } from '@langchain/core/messages'
import { artifactGenerationPrompt } from './mosen-prompts.js'
import { MODEL_ID } from './graph/base.js'
import { getSynthesisReports } from './initiative-store.js'
import {
  getInitiativeRow,
  getPlaybookVersions,
  getLeaderChatSnippet,
} from './leader-store.js'
import { buildPhaseCompletionLines } from './playbook-helpers.js'

function aiText(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.map((x) => (x && typeof x === 'object' && 'text' in x ? x.text : '')).join('')
  }
  return String(content ?? '')
}

export async function buildArtifactPromptContext(initiativeId) {
  const init = await getInitiativeRow(initiativeId)
  const reports = await getSynthesisReports(initiativeId)
  const synthesisSummary =
    reports?.length > 0
      ? reports
          .slice(-3)
          .flatMap((r) => (r.themes || []).map((t) => `${t.name}: ${t.description}`))
          .join('\n')
      : ''
  const conversationSummary = await getLeaderChatSnippet(initiativeId, 1500)
  const versions = await getPlaybookVersions(initiativeId)
  const latest = versions[versions.length - 1]
  const phases = latest?.phases || []
  const completionSummary = buildPhaseCompletionLines(phases)
  return {
    brief_summary: init?.summary || '',
    synthesis_summary: synthesisSummary,
    conversation_summary: conversationSummary,
    completion_summary: completionSummary,
  }
}

/**
 * Fire-and-forget: generate JSON artifact bodies for each named artifact on activities (first pass only).
 * Stores nothing persistently yet — validates pipeline and warms model path for future storage.
 */
export async function backgroundGenerateAllArtifacts(initiativeId, playbookVersion) {
  const ctx = await buildArtifactPromptContext(initiativeId)
  const phases = playbookVersion?.phases || []
  const model = new ChatAnthropic({ model: MODEL_ID, temperature: 0.4, maxTokens: 2048 })

  for (let pi = 0; pi < phases.length; pi++) {
    const phase = phases[pi]
    const activities = phase.activities || []
    for (let ai = 0; ai < activities.length; ai++) {
      const activity = activities[ai]
      const artifacts = activity.artifacts
      if (!Array.isArray(artifacts) || artifacts.length === 0) continue
      const artName = artifacts[0]
      if (typeof artName !== 'string' || !artName.trim()) continue

      const prompt = artifactGenerationPrompt({
        artifact_name: artName,
        activity_title: activity.title || 'Activity',
        phase_name: phase.name || `Phase ${pi + 1}`,
        initiative_title: (await getInitiativeRow(initiativeId))?.title || 'Initiative',
        brief_summary: ctx.brief_summary,
        synthesis_summary: ctx.synthesis_summary,
        conversation_summary: ctx.conversation_summary,
        completion_summary: ctx.completion_summary,
      })

      await model.invoke([new HumanMessage(prompt)]).then((res) => aiText(res.content))
      // Only first artifact per playbook confirm to limit cost; remove break to generate all
      return
    }
  }
}
