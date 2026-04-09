import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { ChatAnthropic } from '@langchain/anthropic'
import { HumanMessage } from '@langchain/core/messages'
import {
  appendClosedLoopMessage,
  appendEmployeeResponse,
  appendSynthesisReport,
  countGrantedConsentsForTheme,
  getAssignedEmployeeCount,
  listGrantedConsentsForTheme,
  upsertConsentRequest,
} from '../initiative-store.js'
import { MIN_SYNTHESIS_THRESHOLD, CONSENT_STATUS, CULTURE_PILLARS } from '../constants.js'
import { SUMMARISE_MODEL_ID } from './base.js'

export function createEmployeeTools({ initId, empEmail }) {
  const record_employee_response = tool(
    async ({ theme, sentiment, detail, pillar }) => {
      const record = { theme, sentiment, detail, pillar, createdAt: Date.now() }
      await appendEmployeeResponse(initId, empEmail, record)
      return `Honest signal recorded: "${theme}" (${pillar})`
    },
    {
      name: 'record_employee_response',
      description:
        'Record an honest signal the employee has shared. Call when meaningful insight surfaces in conversation — concern, confusion, hope, resistance, or experience.',
      schema: z.object({
        theme: z.string().describe('Short theme label, e.g. "timeline feels unrealistic"'),
        sentiment: z.enum(['positive', 'neutral', 'concern', 'resistance']),
        detail: z.string().describe('One sentence anonymized detail — no names, no identifiers'),
        pillar: z.enum(CULTURE_PILLARS).describe('Most relevant culture pillar'),
      }),
    },
  )

  const request_consent = tool(
    async ({ consentId, theme, proposedText }) => {
      await upsertConsentRequest(initId, empEmail, consentId, {
        theme,
        proposedText,
        status: CONSENT_STATUS.PENDING,
        createdAt: Date.now(),
      })
      return JSON.stringify({
        type: 'consent_card',
        data: { consentId, theme, proposedText },
      })
    },
    {
      name: 'request_consent',
      description:
        'Ask the employee if a specific insight can be shared anonymously. Call only after sufficient conversation depth — never immediately. Shows exact wording to employee before any sharing.',
      schema: z.object({
        consentId: z.string().describe('Unique ID for this consent request, e.g. mkId()'),
        theme: z.string().describe('The theme being proposed for sharing'),
        proposedText: z
          .string()
          .describe(
            'The exact anonymized text that would be shared. Must be written as if reported from multiple people — no first-person language.',
          ),
      }),
    },
  )

  const check_synthesis_threshold = tool(
    async ({ theme }) => {
      const count = await countGrantedConsentsForTheme(initId, theme)
      const threshold_met = count >= MIN_SYNTHESIS_THRESHOLD
      return JSON.stringify({ threshold_met, count, theme })
    },
    {
      name: 'check_synthesis_threshold',
      description:
        'Check whether enough employees have consented to surface a theme as a pattern. Only call after a consent decision is made.',
      schema: z.object({
        theme: z.string().describe('The theme to check the consent count for'),
      }),
    },
  )

  const generate_synthesis = tool(
    async ({ theme }) => {
      const contributions = await listGrantedConsentsForTheme(initId, theme)

      if (contributions.length < MIN_SYNTHESIS_THRESHOLD) {
        return 'Threshold not met — synthesis not generated.'
      }

      const pillarMapping = {}
      CULTURE_PILLARS.forEach((p) => {
        pillarMapping[p] = 0
      })

      const haiku = new ChatAnthropic({
        model: SUMMARISE_MODEL_ID,
        maxTokens: 512,
      })
      const pillarResponse = await haiku.invoke([
        new HumanMessage(
          `Given these anonymized employee insights about "${theme}", map each to the most relevant culture pillar from: ${CULTURE_PILLARS.join(', ')}. Return JSON: { "pillar": "PillarName", "score": 0-10 }\n\nInsights:\n${contributions.map((c) => `- ${c.proposedText}`).join('\n')}`,
        ),
      ])

      const text =
        typeof pillarResponse.content === 'string'
          ? pillarResponse.content
          : Array.isArray(pillarResponse.content)
            ? pillarResponse.content.map((b) => (b?.text != null ? b.text : '')).join('')
            : ''

      try {
        const parsed = JSON.parse(text)
        if (parsed.pillar && pillarMapping[parsed.pillar] !== undefined) {
          pillarMapping[parsed.pillar] = parsed.score || 7
        }
      } catch {
        // ignore parse errors — pillar mapping stays zeroed
      }

      const totalAssigned = await getAssignedEmployeeCount(initId)
      const responseRate = totalAssigned > 0 ? contributions.length / totalAssigned : 0

      const synthesisEntry = {
        id: `syn_${Date.now().toString(36)}`,
        themes: [
          {
            name: theme,
            description: contributions.map((c) => c.proposedText).join(' '),
            sentiment: 'concern',
            count: contributions.length,
            pillar: Object.entries(pillarMapping).sort((a, b) => b[1] - a[1])[0][0],
          },
        ],
        pillarMapping,
        totalContributors: contributions.length,
        responseRate,
        createdAt: Date.now(),
      }

      await appendSynthesisReport(initId, synthesisEntry)

      return JSON.stringify(synthesisEntry)
    },
    {
      name: 'generate_synthesis',
      description:
        'Generate an anonymized synthesis report from consented employee responses. Only call when check_synthesis_threshold confirms threshold is met (≥3 contributors).',
      schema: z.object({
        theme: z.string().describe('The theme to synthesize'),
      }),
    },
  )

  const deliver_closed_loop = tool(
    async ({ changeDescription, closedLoopMessage, pivotId }) => {
      if (!changeDescription || changeDescription.trim().length < 20) {
        return 'Rejected: changeDescription is too vague. Must describe a specific, concrete change.'
      }
      const hollow = ['your feedback was heard', 'thank you for your input', 'we appreciate']
      if (hollow.some((h) => changeDescription.toLowerCase().includes(h))) {
        return 'Rejected: changeDescription is hollow. Describe what actually changed.'
      }

      const record = {
        id: `cl_${Date.now().toString(36)}`,
        changeDescription,
        message: closedLoopMessage,
        pivotId,
        createdAt: Date.now(),
      }

      await appendClosedLoopMessage(initId, empEmail, record)

      return JSON.stringify({
        type: 'closed_loop',
        data: record,
      })
    },
    {
      name: 'deliver_closed_loop',
      description:
        'Deliver a closed loop message to the employee telling them what changed as a result of what they shared. Requires a specific, non-hollow changeDescription.',
      schema: z.object({
        changeDescription: z
          .string()
          .describe('Specific description of what actually changed — never vague or generic'),
        closedLoopMessage: z
          .string()
          .describe("Warm, specific message to the employee about their contribution's impact"),
        pivotId: z.string().describe('ID of the pivot that triggered this closed loop'),
      }),
    },
  )

  const show_data_ownership = tool(
    async () => {
      return JSON.stringify({
        type: 'data_ownership_banner',
        data: {
          message:
            'Your data belongs to you. Nothing from this conversation will be shared without your explicit, informed consent. You can say no at any time.',
        },
      })
    },
    {
      name: 'show_data_ownership',
      description:
        'Show the data ownership banner to the employee. Always call at the start of first contact.',
      schema: z.object({}),
    },
  )

  return [
    record_employee_response,
    request_consent,
    check_synthesis_threshold,
    generate_synthesis,
    deliver_closed_loop,
    show_data_ownership,
  ]
}
