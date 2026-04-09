import { createBaseGraph, invokeMosenGraph } from './base.js'
import { createLeaderTools } from './leader-tools.js'
import { leaderSystemPrompt, leaderBriefPrompt } from '../mosen-prompts.js'
import { MOSEN_KNOWLEDGE, LEADER_CONTEXT } from '../mosen-knowledge.js'
import { redis } from '../redis.js'

/**
 * Build a LangGraph agent for leader conversations.
 *
 * @param {Object} initContext - Initiative context
 * @param {string} initContext.initId - Initiative ID
 * @param {string} initContext.title - Initiative title
 * @param {string} initContext.orgName - Organization name
 * @param {string} initContext.leaderName - Leader's name
 * @param {boolean} initContext.briefComplete - Whether change brief is complete
 * @param {string} initContext.summary - Brief summary (if complete)
 * @param {number} initContext.weekNumber - Week number since initiative start
 * @param {string} initContext.synthesis - Latest synthesis summary (if any)
 */
export function buildLeaderGraph(initContext) {
  const { initId, title, orgName, leaderName, briefComplete, summary, weekNumber, synthesis } = initContext

  // Bind all tools to this initiative
  const tools = createLeaderTools(initId)

  // Choose system prompt based on state
  let systemPrompt
  if (!briefComplete) {
    // Still in change brief phase
    systemPrompt = leaderBriefPrompt({
      initiative_title: title,
      org_name: orgName,
      leader_name: leaderName
    })
  } else {
    // Ongoing leader coaching
    systemPrompt = leaderSystemPrompt({
      initiative_title: title,
      brief_summary: summary,
      week_number: weekNumber || 1,
      synthesis: synthesis || 'No employee conversations yet'
    })
  }

  // Append knowledge base
  systemPrompt += `\n\n${MOSEN_KNOWLEDGE}\n\n${LEADER_CONTEXT}`

  // Add tool usage guidance
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

/**
 * Invoke the leader chat agent.
 *
 * @param {Object} initContext - Initiative context (same as buildLeaderGraph)
 * @param {string} userMessage - The leader's message
 * @param {string} threadId - Thread ID for conversation persistence
 * @returns {Promise<{response: string, artifacts?: Array}>}
 */
export async function invokeLeaderChat(initContext, userMessage, threadId) {
  const graph = buildLeaderGraph(initContext)
  const result = await invokeMosenGraph(graph, userMessage, threadId)
  return result
}

/**
 * Load initiative context from Redis for graph construction.
 *
 * @param {string} initId - Initiative ID
 * @param {string} userId - Authenticated user ID
 * @returns {Promise<Object>} Initiative context for buildLeaderGraph
 */
export async function loadInitContext(initId, userId) {
  const init = await redis.hgetall(`initiative:${initId}`)
  if (!init) {
    throw new Error('Initiative not found')
  }

  if (init.leaderId !== userId) {
    throw new Error('Not authorized to access this initiative')
  }

  // Get user info for leader name
  const user = await redis.hgetall(`user:${userId}`)

  // Get org info
  const org = init.orgId ? await redis.hgetall(`org:${init.orgId}`) : null

  // Get latest synthesis summary
  let synthesisText = null
  const synthesisRaw = await redis.get(`initiative:${initId}:synthesis`)
  if (synthesisRaw) {
    const reports = JSON.parse(synthesisRaw)
    const latest = Array.isArray(reports) ? reports[reports.length - 1] : reports
    if (latest?.themes) {
      synthesisText = latest.themes
        .map(t => `${t.name} (${t.pillar}): ${t.description}`)
        .join('; ')
    }
  }

  // Calculate week number
  const createdAt = init.createdAt ? parseInt(init.createdAt) : Date.now()
  const weekNumber = Math.max(1, Math.ceil((Date.now() - createdAt) / (7 * 24 * 60 * 60 * 1000)))

  return {
    initId,
    title: init.title || 'Untitled Initiative',
    orgName: org?.name || '',
    leaderName: user?.name || '',
    briefComplete: init.briefComplete === 'true',
    summary: init.summary || '',
    weekNumber,
    synthesis: synthesisText
  }
}
