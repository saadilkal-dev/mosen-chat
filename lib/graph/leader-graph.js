import { createBaseGraph, invokeMosenGraph } from './base.js'
import { createLeaderTools } from './leader-tools.js'
import { leaderSystemPrompt, leaderBriefPrompt } from '../mosen-prompts.js'
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

  // Build a richer semantic query: user message + initiative context so short replies still get good RAG hits
  const ragQuery = [
    userMessage,
    title,
    initContext.summary,
  ].filter(Boolean).join(' ')

  // Inject RAG-retrieved knowledge BEFORE tool triggers so it's weighted higher
  const knowledgeContext = await retrieveContext(ragQuery, 'leader')
  systemPrompt += `\n\n${knowledgeContext}`

  systemPrompt += `\n\nAPPLYING CHANGE PRINCIPLES: When the leader speaks, identify the underlying pattern (fear vs. love, adaptive vs. technical, six pillars, psychological safety, intent vs. impact gap). Name it naturally like a wise colleague — never cite or list. Push back, reframe, suggest specific actions.`

  systemPrompt += `\n\nTOOL TRIGGERS — call without asking:
save_brief_answer → every substantive brief answer, save immediately then keep talking
present_options → only for predefined choices during brief (team size, timeline, change type); NEVER open-ended
generate_playbook → after all 5 brief areas covered + leader confirmed summary; ask timeline first; creates DRAFT; walk through assumptions conversationally (timeline, phase order, ownership, early wins), ask if they match reality, end with "say confirm when ready"; no numbered/lettered options
confirm_playbook → leader says "confirm"/"looks good"/"lock it in"; then immediately suggest_experiment for first activity
generate_employee_brief → only after confirm_playbook (never after draft alone)
create_personalized_outreach → when leader names people; use names as-is, skip emails
suggest_experiment → for recommending next actions; use exact phaseIndex/activityIndex
update_playbook_activity → minor tweaks (owner, wording, mark done); call immediately; never say "pivot"
version_playbook → structural changes (add/remove phases, reorder, scope shift); frame naturally; never say "pivot"
propose_outreach → proactively on: activity completed, phase transition, significant decision
read_synthesis → proactively when: sentiment asked about, synthesis undiscussed, or decision needs employee perspective
read_playbook_status → "what next?" / "where am I?" → call first, then suggest_experiment
log_pivot → leader describes concrete action taken from feedback`

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
