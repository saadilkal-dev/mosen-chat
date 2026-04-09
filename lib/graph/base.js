import { ChatAnthropic } from '@langchain/anthropic'
import { StateGraph, MessagesAnnotation } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages'

export const MODEL_ID = 'claude-sonnet-4-20250514'
export const SUMMARISE_MODEL_ID = 'claude-haiku-4-5-20251001'

export function createBaseGraph({ tools, systemPrompt }) {
  const model = new ChatAnthropic({
    model: MODEL_ID,
    temperature: 0.7,
    maxTokens: 1024,
  }).bindTools(tools)

  const toolNode = new ToolNode(tools)

  function shouldContinue(state) {
    const lastMessage = state.messages[state.messages.length - 1]
    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
      return 'tools'
    }
    return '__end__'
  }

  async function callModel(state) {
    const messages = [new SystemMessage(systemPrompt), ...state.messages]
    const response = await model.invoke(messages)
    return { messages: [response] }
  }

  const graph = new StateGraph(MessagesAnnotation)
    .addNode('agent', callModel)
    .addNode('tools', toolNode)
    .addEdge('__start__', 'agent')
    .addConditionalEdges('agent', shouldContinue, { tools: 'tools', __end__: '__end__' })
    .addEdge('tools', 'agent')

  return graph
}

export async function invokeMosenGraph(graph, userMessage, threadId) {
  const compiled = graph.compile()

  const result = await compiled.invoke({
    messages: [new HumanMessage(userMessage)]
  }, {
    configurable: { thread_id: threadId }
  })

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
    artifacts: artifacts.length > 0 ? artifacts : undefined
  }
}
