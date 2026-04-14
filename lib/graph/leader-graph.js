import { createBaseGraph, invokeMosenGraph } from './base.js'
import { createLeaderTools } from './leader-tools.js'
import { leaderSystemPrompt, leaderBriefPrompt } from '../mosen-prompts.js'
import { MOSEN_KNOWLEDGE, LEADER_CONTEXT } from '../mosen-knowledge.js'
import { loadLeaderInitContext } from '../leader-store.js'

export function buildLeaderGraph(initContext, conversationSummary = '', userMessage = '') {
  const {
    initId,
    title,
    orgName,
    leaderName,
    briefComplete,
    summary,
    weekNumber,
    synthesis,
    phaseCompletionDetail,
    completionStats,
    timelineAlert,
    unreadSynthesisNudge,
    phaseMilestoneNudge,
    hasSynthesis,
    synthesisThemeCount,
  } = initContext

  const tools = createLeaderTools(initId)

  let systemPrompt
  if (!briefComplete) {
    systemPrompt = leaderBriefPrompt({
      initiative_title: title,
      org_name: orgName,
      leader_name: leaderName,
    })
  } else {
    systemPrompt = leaderSystemPrompt({
      initiative_title: title,
      brief_summary: summary,
      week_number: weekNumber || 1,
      synthesis: synthesis || 'No employee conversations yet',
      phase_completion_detail: phaseCompletionDetail || '',
      completion_stats: completionStats || null,
      timeline_alert: timelineAlert || '',
      unread_synthesis_nudge: unreadSynthesisNudge || '',
      phase_milestone_nudge: phaseMilestoneNudge || '',
    })
  }

  if (briefComplete && hasSynthesis) {
    systemPrompt += `\n\nIMPORTANT: Employee synthesis data exists (${synthesisThemeCount || 0} theme(s)). If the leader has not discussed it recently, proactively surface it — call read_synthesis.`
  }

  if (conversationSummary) {
    systemPrompt += `\n\nCONVERSATION HISTORY (summary of earlier messages):\n${conversationSummary}`
  }

  systemPrompt += `\n\n${MOSEN_KNOWLEDGE}\n\n${LEADER_CONTEXT}`

  systemPrompt += `\n\nAVAILABLE TOOLS — use without asking permission:
- save_brief_answer: Persist brief answers as you go.
- generate_playbook: After the brief is complete. Produces a DRAFT — walk through assumptions, then confirm_playbook when the leader locks it in.
- confirm_playbook: When the leader confirms the draft — sets active and surfaces first experiment. Immediately call suggest_experiment for the first incomplete activity (phaseIndex 0, activityIndex 0) if they need a clickable card.
- suggest_experiment: When recommending a concrete next step — include phaseIndex and activityIndex from the playbook.
- read_playbook_status: When you need exact completion state or indices.
- generate_employee_brief: After the playbook is confirmed.
- propose_outreach: When a milestone, phase transition, or important update warrants team communication.
- read_synthesis: When discussing employee signals (clears "new synthesis" reminder).
- version_playbook: When incorporating synthesis-driven plan changes.
- log_pivot: When logging a concrete closed-loop change.

TOOL TRIGGERS:
- After confirm_playbook returns success, call suggest_experiment for the first incomplete activity so the leader sees what to do first.
- When the leader asks what to do next or "where am I?", call read_playbook_status first, then suggest_experiment.`

  const graph = createBaseGraph({ tools, systemPrompt })

  return graph
}

export async function invokeLeaderChat(initContext, userMessage, threadId, priorMessages = [], conversationSummary = '') {
  const graph = buildLeaderGraph(initContext, conversationSummary, userMessage)
  return invokeMosenGraph(graph, userMessage, threadId, priorMessages)
}

export async function loadInitContext(initId, clerkUserId) {
  return loadLeaderInitContext(initId, clerkUserId)
}
