import { createBaseGraph, invokeMosenGraph } from './base.js'
import { createLeaderTools } from './leader-tools.js'
import { leaderSystemPrompt, leaderBriefPrompt } from '../mosen-prompts.js'
import { loadLeaderInitContext } from '../leader-store.js'
import { retrieveContext } from '../rag-retriever.js'

export async function buildLeaderGraph(initContext, userMessage) {
  const { initId, title, orgName, leaderName, briefComplete, summary, weekNumber, synthesis } = initContext

  const tools = createLeaderTools(initId)

  // Build the base system prompt based on where the leader is in the flow
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

  // Inject RAG-retrieved knowledge (falls back to full static knowledge if unavailable)
  const knowledgeContext = await retrieveContext(userMessage || title || '', 'leader')
  systemPrompt += `\n\n${knowledgeContext}`

  // Tool instructions
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

  return createBaseGraph({ tools, systemPrompt })
}

export async function invokeLeaderChat(initContext, userMessage, threadId) {
  const graph = await buildLeaderGraph(initContext, userMessage)
  return invokeMosenGraph(graph, userMessage, threadId)
}

export async function loadInitContext(initId, clerkUserId) {
  return loadLeaderInitContext(initId, clerkUserId)
}
