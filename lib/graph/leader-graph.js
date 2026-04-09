import { createBaseGraph, invokeMosenGraph } from './base.js'
import { createLeaderTools } from './leader-tools.js'
import { leaderSystemPrompt, leaderBriefPrompt } from '../mosen-prompts.js'
import { MOSEN_KNOWLEDGE, LEADER_CONTEXT } from '../mosen-knowledge.js'
import { loadLeaderInitContext } from '../leader-store.js'

export function buildLeaderGraph(initContext) {
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
    })
  }

  systemPrompt += `\n\n${MOSEN_KNOWLEDGE}\n\n${LEADER_CONTEXT}`

  systemPrompt += `\n\nAVAILABLE TOOLS:
You have tools to help manage this initiative. Use them naturally during the conversation:
- save_brief_answer: When the leader answers a brief question, save it immediately.
- generate_playbook: When the change brief is complete and confirmed, generate the playbook.
- generate_employee_brief: After the playbook, generate an employee-facing brief.
- propose_outreach: When a milestone or good moment arises, draft an outreach message.
- read_synthesis: When the leader asks about employee feedback, read the synthesis.
- version_playbook: When the leader accepts a pivot, update the playbook.
- log_pivot: When the leader describes a specific action they took based on feedback, log it.

Use tools proactively when the conversation naturally calls for them. Do not ask permission to use tools — just use them when appropriate.`

  const graph = createBaseGraph({ tools, systemPrompt })

  return graph
}

export async function invokeLeaderChat(initContext, userMessage, threadId) {
  const graph = buildLeaderGraph(initContext)
  return invokeMosenGraph(graph, userMessage, threadId)
}

export async function loadInitContext(initId, clerkUserId) {
  return loadLeaderInitContext(initId, clerkUserId)
}
