import { createBaseGraph, invokeMosenGraph } from './base.js'
import { createLeaderTools } from './leader-tools.js'
import { leaderSystemPrompt, leaderBriefPrompt } from '../mosen-prompts.js'
import { MOSEN_KNOWLEDGE, LEADER_CONTEXT } from '../mosen-knowledge.js'
import { loadLeaderInitContext } from '../leader-store.js'

export async function buildLeaderGraph(initContext, conversationSummary = '', userMessage = '') {
  const { initId, title, orgName, leaderName, briefComplete, summary, weekNumber, synthesis } = initContext

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
      completionStats: initContext.completionStats,
    })
  }

  // Proactive synthesis nudge — if data exists, tell the model to surface it
  if (initContext.hasSynthesis) {
    systemPrompt += `\n\nIMPORTANT: New employee synthesis data is available (${initContext.synthesisThemeCount} theme${initContext.synthesisThemeCount !== 1 ? 's' : ''}). If the leader hasn't discussed this yet, proactively surface it — call read_synthesis and share the findings. Do not wait to be asked.`
  }

  if (conversationSummary) {
    systemPrompt += `\n\nCONVERSATION HISTORY (summary of earlier messages — use this as context):\n${conversationSummary}`
  }

  // Inject RAG-retrieved knowledge (falls back to full static knowledge if unavailable)
  const knowledgeContext = await retrieveContext(userMessage || title || '', 'leader')
  systemPrompt += `\n\n${knowledgeContext}`

  systemPrompt += `\n\nTOOL TRIGGERS — act without asking permission:
- save_brief_answer: Every substantive answer to a brief question. Save it immediately, then continue the conversation.
- generate_playbook: When all five brief areas are substantially covered and the leader has confirmed the summary. BEFORE calling this tool, ask the leader about their expected timeline — "How much time do you have for this? Are we talking weeks or months?" Use their answer to inform the playbook structure, then call the tool. This creates a DRAFT. After the tool fires, your text response MUST:
  1. Walk through the key assumptions you made — timeline, how you ordered the phases, who you think should own what, what success looks like early on.
  2. For each assumption, explain your reasoning and ask whether it matches their reality. Be conversational — ask naturally, propose alternatives, follow up on their pushback. Do NOT use lettered options, multiple-choice, or numbered question formats.
  3. End with: "Once you're happy with the direction, say 'confirm' and I'll lock it in."
  This is a collaborative review, not a quiz. Have a real back-and-forth. DO NOT say the playbook is finalised. It is a draft pending their review.
- confirm_playbook: When the leader says the playbook looks good, is satisfied, or types "confirm" / "lock it in" / "finalize it".
- generate_employee_brief: After the playbook is confirmed (not just drafted). Run after confirm_playbook.
- create_personalized_outreach: When the leader names specific people by name. Don't ask for their emails — use names as provided and proceed.
- suggest_experiment: When recommending a specific next action from the playbook — use this instead of describing the activity in prose. Use the exact phaseIndex and activityIndex from the current playbook.
- propose_outreach: Be proactive. Suggest outreach when: (a) the leader mentions completing an activity or discusses finishing one, (b) a phase is transitioning, (c) any significant decision is made, (d) it has been a while since the last communication to employees. When you notice any of these, first explain in your text WHY now is a good moment to communicate with the team, then call propose_outreach. The leader should feel like you are watching the plan's progress and nudging them to keep employees informed.
- read_synthesis: Be proactive. Call this when: (a) the leader asks about employee sentiment, (b) synthesis data exists and the leader hasn't discussed it yet, (c) the leader is making a decision that would benefit from employee perspective, (d) outreach was sent and enough time has passed for responses. Surface synthesis data early — do not wait to be asked.
- version_playbook: When the leader accepts a change to the plan.
- log_pivot: When the leader describes a concrete action they took based on feedback.`

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
  const graph = await buildLeaderGraph(initContext, conversationSummary, userMessage)
  return invokeMosenGraph(graph, userMessage, threadId, priorMessages)
}

export async function loadInitContext(initId, clerkUserId) {
  return loadLeaderInitContext(initId, clerkUserId)
}
