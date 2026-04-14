import { StateGraph, MessagesAnnotation, END } from '@langchain/langgraph'
import { ChatAnthropic } from '@langchain/anthropic'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages'

export const MODEL_ID = 'claude-sonnet-4-20250514'
export const SUMMARISE_MODEL_ID = 'claude-haiku-4-5-20251001'

export function createBaseGraph({ tools, systemPrompt }) {
  const model = new ChatAnthropic({
    model: MODEL_ID,
    temperature: 0.7,
    maxTokens: 4096,
    maxRetries: 3,          // retry on 529/overload automatically
  }).bindTools(tools)

  const toolNode = new ToolNode(tools)

  function shouldContinue(state) {
    const lastMessage = state.messages[state.messages.length - 1]
    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
      return 'tools'
    }
    return END
  }

  async function agentNode(state) {
    const messages = [new SystemMessage(systemPrompt), ...state.messages]
    const response = await model.invoke(messages)
    return { messages: [response] }
  }

  const graph = new StateGraph(MessagesAnnotation)
    .addNode('agent', agentNode)
    .addNode('tools', toolNode)
    .addEdge('__start__', 'agent')
    .addConditionalEdges('agent', shouldContinue, {
      tools: 'tools',
      [END]: END,
    })
    .addEdge('tools', 'agent')

  return graph.compile()
}

export async function invokeMosenGraph(compiledGraph, userMessage, threadId, priorMessages = []) {
  const input = {
    messages: [...priorMessages, new HumanMessage(userMessage)],
  }

  const config = {
    configurable: { thread_id: threadId },
  }

  const result = await compiledGraph.invoke(input, config)

  // Walk backward to find the last AIMessage with actual text.
  // ToolMessage objects also have text content (tool return values) and must be skipped.
  let responseText = ''
  for (let i = result.messages.length - 1; i >= 0; i--) {
    const msg = result.messages[i]
    if (!(msg instanceof AIMessage)) continue
    const text = normalizeTextContent(msg.content)
    if (text.trim()) {
      responseText = text
      break
    }
  }

  const artifacts = []
  for (const msg of result.messages) {
    if (msg.additional_kwargs?.artifacts) {
      artifacts.push(...msg.additional_kwargs.artifacts)
      continue
    }
    // Collect ToolMessage return values that carry a typed artifact
    if (msg instanceof ToolMessage && typeof msg.content === 'string') {
      try {
        const parsed = JSON.parse(msg.content)
        if (parsed.type) artifacts.push(msg.content)
      } catch { /* not JSON, skip */ }
    }
  }
  artifacts.push(...collectToolJsonArtifacts(result.messages))

  return {
    response: responseText,
    artifacts,
    messages: result.messages,
  }
}

function normalizeTextContent(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((p) => {
        if (typeof p === 'string') return p
        if (p && typeof p === 'object' && 'text' in p) return p.text
        return ''
      })
      .join('')
  }
  return String(content ?? '')
}
