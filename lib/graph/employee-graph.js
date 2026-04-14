import { createBaseGraph, invokeMosenGraph } from './base.js'
import { createEmployeeTools } from './employee-tools.js'
import { employeeSystemPrompt } from '../mosen-prompts.js'
import { MOSEN_KNOWLEDGE } from '../mosen-knowledge.js'

/**
 * empContext: {
 *   initId: string,
 *   empEmail: string,
 *   employee_name: string,
 *   initiative_title: string,
 *   week_number?: number,
 *   last_contact_date?: string,
 *   change_brief?: string,
 *   current_activity?: string,
 *   isFirstMessage?: boolean,
 * }
 */
export function buildEmployeeGraph(empContext, conversationSummary = '') {
  const tools = createEmployeeTools({
    initId: empContext.initId,
    empEmail: empContext.empEmail,
  })

  let systemPrompt =
    employeeSystemPrompt({
      employee_name: empContext.employee_name,
      initiative_title: empContext.initiative_title,
      week_number: empContext.week_number || 1,
      last_contact_date: empContext.last_contact_date || null,
      change_brief: empContext.change_brief || null,
      current_activity: empContext.current_activity || null,
      isFirstMessage: empContext.isFirstMessage ?? true,
    }) +
    '\n\nKNOWLEDGE BASE:\n' +
    MOSEN_KNOWLEDGE

  if (conversationSummary) {
    systemPrompt += `\n\nCONVERSATION SUMMARY (earlier messages not shown below — use this for context):\n${conversationSummary}`
  }

  return createBaseGraph({ tools, systemPrompt })
}

/**
 * Returns { response: string, artifacts: Array }
 * artifacts come from tool outputs with type fields (consent_card, data_ownership_banner, closed_loop)
 */
export async function invokeEmployeeChat(empContext, userMessage, threadId, priorMessages = [], conversationSummary = '') {
  const graph = buildEmployeeGraph(empContext, conversationSummary)
  return invokeMosenGraph(graph, userMessage, threadId, priorMessages)
}
