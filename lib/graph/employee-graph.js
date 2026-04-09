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
 * }
 */
export function buildEmployeeGraph(empContext) {
  const tools = createEmployeeTools({
    initId: empContext.initId,
    empEmail: empContext.empEmail,
  })

  const systemPrompt =
    employeeSystemPrompt({
      employee_name: empContext.employee_name,
      initiative_title: empContext.initiative_title,
      week_number: empContext.week_number || 1,
      last_contact_date: empContext.last_contact_date || null,
      change_brief: empContext.change_brief || null,
      current_activity: empContext.current_activity || null,
    }) +
    '\n\nKNOWLEDGE BASE:\n' +
    MOSEN_KNOWLEDGE

  return createBaseGraph({ tools, systemPrompt })
}

/**
 * Returns { response: string, artifacts: Array }
 * artifacts come from tool outputs with type fields (consent_card, data_ownership_banner, closed_loop)
 */
export async function invokeEmployeeChat(empContext, userMessage, threadId) {
  const graph = buildEmployeeGraph(empContext)
  return invokeMosenGraph(graph, userMessage, threadId)
}
