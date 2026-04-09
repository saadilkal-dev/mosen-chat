/**
 * base.js — local dev stub (no LangGraph needed)
 * Implements createBaseGraph + invokeMosenGraph using Anthropic tool-use directly.
 * Dev1 will replace this with a proper LangGraph implementation.
 */
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

// Per-thread message history (in-memory for dev; LangGraph handles this in prod)
const threadHistories = new Map()

/**
 * Convert a Zod schema's shape into Anthropic's input_schema format.
 * Handles: z.string, z.enum, z.number, z.optional wrappers.
 */
function zodShapeToInputSchema(schema) {
  // Empty schema (z.object({})) → no properties
  const shape = schema?.shape ?? {}
  const properties = {}
  const required = []

  for (const [key, field] of Object.entries(shape)) {
    const def = field._def
    let prop = {}

    const typeName = def.typeName

    if (typeName === 'ZodEnum') {
      prop = { type: 'string', enum: def.values }
    } else if (typeName === 'ZodString') {
      prop = { type: 'string' }
    } else if (typeName === 'ZodNumber') {
      prop = { type: 'number' }
    } else if (typeName === 'ZodOptional') {
      const inner = def.innerType?._def
      if (inner?.typeName === 'ZodEnum') prop = { type: 'string', enum: inner.values }
      else if (inner?.typeName === 'ZodNumber') prop = { type: 'number' }
      else prop = { type: 'string' }
    } else {
      prop = { type: 'string' }
    }

    if (field.description) prop.description = field.description
    properties[key] = prop
    if (typeName !== 'ZodOptional') required.push(key)
  }

  return { type: 'object', properties, ...(required.length ? { required } : {}) }
}

/**
 * createBaseGraph — stores tools + systemPrompt in a plain object.
 * Compatible with LangGraph's createBaseGraph signature.
 */
export function createBaseGraph({ tools, systemPrompt }) {
  return { tools, systemPrompt }
}

/**
 * invokeMosenGraph — runs one turn of the agentic loop.
 * Returns { response: string, artifacts: Array }
 */
export async function invokeMosenGraph(graph, userMessage, threadId) {
  const { tools, systemPrompt } = graph

  // Build Anthropic tool definitions from LangChain tool objects
  const anthropicTools = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: zodShapeToInputSchema(t.schema),
  }))

  // Load or init per-thread history
  if (!threadHistories.has(threadId)) threadHistories.set(threadId, [])
  const history = threadHistories.get(threadId)

  history.push({ role: 'user', content: userMessage })

  const artifacts = []

  // Agentic loop — keep going until end_turn or max iterations
  let iterations = 0
  while (iterations < 10) {
    iterations++

    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      tools: anthropicTools,
      messages: history,
    })

    // Add assistant turn to history
    history.push({ role: 'assistant', content: resp.content })

    if (resp.stop_reason === 'end_turn') {
      const textBlock = resp.content.find((b) => b.type === 'text')
      return { response: textBlock?.text ?? '', artifacts }
    }

    if (resp.stop_reason === 'tool_use') {
      const toolResults = []

      for (const block of resp.content) {
        if (block.type !== 'tool_use') continue

        const tool = tools.find((t) => t.name === block.name)
        let result = `Tool "${block.name}" not found`

        if (tool) {
          try {
            result = await tool.invoke(block.input)
          } catch (err) {
            result = `Error calling ${block.name}: ${err.message}`
          }
        }

        // Detect artifact payloads (type + data shape)
        if (typeof result === 'string') {
          try {
            const parsed = JSON.parse(result)
            if (parsed?.type) artifacts.push(parsed)
          } catch {
            // not JSON — that's fine
          }
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        })
      }

      history.push({ role: 'user', content: toolResults })
    }
  }

  // Fallback if loop limit hit
  return { response: 'Something went wrong — max iterations reached.', artifacts }
}
