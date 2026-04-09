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

export async function invokeMosenGraph(compiledGraph, userMessage, threadId) {
  const input = {
    messages: [new HumanMessage(userMessage)],
  }

  const config = {
    configurable: { thread_id: threadId },
  }

  const result = await compiledGraph.invoke(input, config)
  const lastMessage = result.messages[result.messages.length - 1]

  // Extract any tool artifacts from the conversation
  const artifacts = []
  for (const msg of result.messages) {
    if (msg.additional_kwargs?.artifacts) {
      artifacts.push(...msg.additional_kwargs.artifacts)
    }
  }

  return {
    response: lastMessage.content,
    artifacts,
    messages: result.messages,
  }
}
