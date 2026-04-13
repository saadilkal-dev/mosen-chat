import { createBaseGraph, invokeMosenGraph } from './base.js'
import { createEmployeeTools } from './employee-tools.js'
import { employeeSystemPrompt } from '../mosen-prompts.js'
import { retrieveContext } from '../rag-retriever.js'

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
 * }
 */
export async function buildEmployeeGraph(empContext, userMessage) {
  const tools = createEmployeeTools({
    initId: empContext.initId,
    empEmail: empContext.empEmail,
  })

  // Build base system prompt
  const basePrompt = employeeSystemPrompt({
    employee_name: empContext.employee_name,
    initiative_title: empContext.initiative_title,
    week_number: empContext.week_number || 1,
    last_contact_date: empContext.last_contact_date || null,
    change_brief: empContext.change_brief || null,
    current_activity: empContext.current_activity || null,
  })

  // Inject RAG-retrieved knowledge (falls back to full static knowledge if unavailable)
  const knowledgeContext = await retrieveContext(
    userMessage || empContext.initiative_title || '',
    'employee'
  )

  const systemPrompt = `${basePrompt}\n\n${knowledgeContext}`

  return createBaseGraph({ tools, systemPrompt })
}

/**
 * Returns { response: string, artifacts: Array }
 * artifacts come from tool outputs with type fields (consent_card, data_ownership_banner, closed_loop)
 */
export async function invokeEmployeeChat(empContext, userMessage, threadId) {
  const graph = await buildEmployeeGraph(empContext, userMessage)
  return invokeMosenGraph(graph, userMessage, threadId)
}
