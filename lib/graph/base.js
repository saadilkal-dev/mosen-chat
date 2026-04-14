import { StateGraph, MessagesAnnotation, END, MemorySaver } from '@langchain/langgraph'
import { ChatAnthropic } from '@langchain/anthropic'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { SystemMessage, HumanMessage } from '@langchain/core/messages'

export const MODEL_ID = 'claude-sonnet-4-20250514'
export const SUMMARISE_MODEL_ID = 'claude-haiku-4-5-20251001'

/** Shared checkpointer so `thread_id` survives across turns within a warm runtime (Dev2/Dev3 graphs reuse this). */
const mosenGraphCheckpointer = new MemorySaver()

export function createBaseGraph({ tools, systemPrompt }) {
  const model = new ChatAnthropic({
    model: MODEL_ID,
    temperature: 0.7,
    maxTokens: 4096,
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

  return graph.compile({ checkpointer: mosenGraphCheckpointer })
}

function collectToolJsonArtifacts(messages) {
  const out = []
  for (const msg of messages) {
    const t = msg.getType?.() || msg._getType?.()
    if (t !== 'tool') continue
    const raw = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content ?? '')
    try {
      const p = JSON.parse(raw)
      if (p && typeof p === 'object' && p.type && !p.error) {
        out.push(JSON.stringify(p))
      }
    } catch {
      /* ignore */
    }
  }
  return out
}

export async function invokeMosenGraph(compiledGraph, userMessage, threadId, priorMessages = []) {
  const input = {
    messages: [...priorMessages, new HumanMessage(userMessage)],
  }

  const config = {
    configurable: { thread_id: threadId },
  }

  const result = await compiledGraph.invoke(input, config)
  const lastMessage = result.messages[result.messages.length - 1]

  const artifacts = []
  for (const msg of result.messages) {
    if (msg.additional_kwargs?.artifacts) {
      artifacts.push(...msg.additional_kwargs.artifacts)
    }
  }
  artifacts.push(...collectToolJsonArtifacts(result.messages))

  return {
    response: normalizeTextContent(lastMessage.content),
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
