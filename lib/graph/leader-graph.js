import { createBaseGraph, invokeMosenGraph } from './base.js'
import { createLeaderTools } from './leader-tools.js'
import { leaderSystemPrompt, leaderBriefPrompt } from '../mosen-prompts.js'
import { MOSEN_KNOWLEDGE, LEADER_CONTEXT } from '../mosen-knowledge.js'
import { loadLeaderInitContext } from '../leader-store.js'
import { retrieveContext } from '../rag-retriever.js'

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
      phaseCompletionDetail: initContext.phaseCompletionDetail,
      timelineAlert: initContext.timelineAlert,
    })
  }

  // Phase completion milestone — Mosen acknowledges and transitions
  if (initContext.phaseCompleted) {
    systemPrompt += `\n\nMILESTONE: Phase "${initContext.phaseCompleted.phaseName}" is fully complete. Acknowledge this milestone to the leader warmly — celebrate what was learned, not just that it's done. Then naturally transition to the next phase by calling suggest_experiment for the first activity in the next phase. If synthesis data exists, consider whether completed learnings warrant any adjustments to the upcoming phase.`
  }

  // Proactive synthesis nudge — if data exists, tell the model to surface it and act on it
  if (initContext.hasSynthesis) {
    systemPrompt += `\n\nIMPORTANT: Employee synthesis data is available (${initContext.synthesisThemeCount} theme${initContext.synthesisThemeCount !== 1 ? 's' : ''}). If the leader hasn't discussed this yet, proactively surface it — call read_synthesis. After discussing, if any theme suggests the plan should change, propose the update naturally. For minor tweaks (wording, owner changes), use update_playbook_activity immediately. For structural changes (adding/removing phases, major scope shift), frame it naturally — "That's a meaningful shift — let me update the plan" — then use version_playbook. Never use the word "pivot" with the leader.`
  }

  if (conversationSummary) {
    systemPrompt += `\n\nCONVERSATION HISTORY (summary of earlier messages — use this as context):\n${conversationSummary}`
  }

  // Inject RAG-retrieved knowledge (falls back to full static knowledge if unavailable)
  const knowledgeContext = await retrieveContext(userMessage || title || '', 'leader')
  systemPrompt += `\n\n${knowledgeContext}`

  systemPrompt += `\n\nTOOL TRIGGERS — act without asking permission:
- save_brief_answer: Every substantive answer to a brief question. Save it immediately, then continue the conversation.
- present_options: During brief collection, when a question has clear predefined answers — team size ranges (1-10, 10-50, 50+), timeline windows (a few weeks, 1-3 months, longer), change type (structural, process, cultural, technology). NEVER for open-ended questions.
- generate_playbook: When all five brief areas are substantially covered and the leader has confirmed the summary. BEFORE calling this tool, ask the leader about their expected timeline — "How much time do you have for this? Are we talking weeks or months?" Use their answer to inform the playbook structure, then call the tool. This creates a DRAFT. After the tool fires, your text response MUST:
  1. Walk through the key assumptions you made — timeline, how you ordered the phases, who you think should own what, what success looks like early on.
  2. For each assumption, explain your reasoning and ask whether it matches their reality. Be conversational — ask naturally, propose alternatives, follow up on their pushback. Do NOT use lettered options, multiple-choice, or numbered question formats.
  3. End with: "Once you're happy with the direction, say 'confirm' and I'll lock it in."
  This is a collaborative review, not a quiz. Have a real back-and-forth. DO NOT say the playbook is finalised. It is a draft pending their review.
- confirm_playbook: When the leader says the playbook looks good, is satisfied, or types "confirm" / "lock it in" / "finalize it". After this succeeds, immediately call suggest_experiment for the first incomplete activity so the leader knows exactly what to do this week.
- generate_employee_brief: After the playbook is confirmed (not just drafted). Run after confirm_playbook.
- create_personalized_outreach: When the leader names specific people by name. Don't ask for their emails — use names as provided and proceed.
- suggest_experiment: When recommending a specific next action from the playbook — use this instead of describing the activity in prose. Use the exact phaseIndex and activityIndex from the current playbook.
- update_playbook_activity: For minor tweaks the leader mentions in conversation — "Sarah should own that", "reword that activity", "let's mark that done". Call it immediately without asking permission. Do NOT use the word "pivot".
- version_playbook: For structural changes — adding/removing phases, reordering, major scope shift. Frame naturally: "That's a meaningful shift to the plan — let me update it to reflect this." Then call the tool. Do NOT use the word "pivot".
- propose_outreach: Be proactive. Suggest outreach when: (a) the leader mentions completing an activity, (b) a phase is transitioning, (c) any significant decision is made. Explain why now is a good moment, then call the tool.
- read_synthesis: Be proactive. Call when: (a) leader asks about employee sentiment, (b) synthesis exists and hasn't been discussed, (c) leader is making a decision that would benefit from employee perspective. Surface it early — do not wait to be asked.
- read_playbook_status: When the leader asks "what should I do next?" or "where am I?" — call this first to get exact indices, then call suggest_experiment.
- log_pivot: When the leader describes a concrete action they took based on feedback.`

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
