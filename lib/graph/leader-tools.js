import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { ChatAnthropic } from '@langchain/anthropic'
import { HumanMessage } from '@langchain/core/messages'
import { mkId } from '../utils.js'
import {
  playbookPrompt,
  briefGenerationPrompt,
  outreachPrompt,
  pivotPrompt,
} from '../mosen-prompts.js'
import {
  saveBriefAnswerField,
  getInitiativeRow,
  patchInitiative,
  getPlaybookVersions,
  setPlaybookVersions,
  getOutreachMessages,
  setOutreachMessages,
  countAssignedEmployees,
  getAssignedEmails,
  upsertEmployeeBriefFromLeader,
  appendPivotEntry,
} from '../leader-store.js'
import { getSynthesisReports } from '../initiative-store.js'
import { MODEL_ID } from './base.js'

function aiText(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.map((x) => (x && typeof x === 'object' && 'text' in x ? x.text : '')).join('')
  }
  return String(content ?? '')
}

export function createSaveBriefAnswer(initId) {
  return tool(
    async ({ field, value }) => {
      const validFields = ['what_changing', 'why_changing', 'who_affected', 'success_90d', 'uncertainty', 'summary']
      if (!validFields.includes(field)) {
        return `Invalid field "${field}". Valid fields: ${validFields.join(', ')}`
      }
      await saveBriefAnswerField(initId, field, value)
      return `Saved "${field}" to initiative brief. ${field === 'summary' ? 'Brief is now complete.' : 'Continue with remaining questions.'}`
    },
    {
      name: 'save_brief_answer',
      description:
        'Save an answer from the change brief conversation. Call this each time the leader provides a substantive answer to one of the brief questions (what is changing, why, who is affected, success criteria, uncertainties). Fields: what_changing, why_changing, who_affected, success_90d, uncertainty, summary.',
      schema: z.object({
        field: z
          .string()
          .describe(
            'The brief field to save: what_changing, why_changing, who_affected, success_90d, uncertainty, or summary',
          ),
        value: z.string().describe('The extracted answer from the leader conversation'),
      }),
    },
  )
}

export function createGeneratePlaybook(initId) {
  return tool(
    async ({ brief_summary }) => {
      const init = await getInitiativeRow(initId)
      const employeeCount = await countAssignedEmployees(initId)
      const prompt = playbookPrompt({
        brief_summary: brief_summary || init?.summary || '',
        employee_count: employeeCount,
        initiative_title: init?.title || 'Untitled',
      })

      const model = new ChatAnthropic({ model: MODEL_ID, temperature: 0.5, maxTokens: 2048 })
      const response = await model.invoke([new HumanMessage(prompt)])
      const text = aiText(response.content)

      let playbook
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        playbook = jsonMatch ? JSON.parse(jsonMatch[0]) : { phases: [] }
      } catch {
        playbook = { phases: [], raw: text }
      }

      const version = {
        version: 1,
        ...playbook,
        createdAt: Date.now(),
        changeNote: 'Initial playbook generated from change brief',
      }

      await setPlaybookVersions(initId, [version])
      await patchInitiative(initId, { status: 'active', playbook_generated: true })

      return JSON.stringify({
        type: 'playbook',
        data: version,
        message: 'Playbook generated successfully. The leader can view it in the Playbook tab.',
      })
    },
    {
      name: 'generate_playbook',
      description:
        'Generate a structured change playbook from the completed change brief. Call this after the brief conversation is complete and the leader has confirmed the summary. Returns a phased plan with activities and artifacts.',
      schema: z.object({
        brief_summary: z.string().describe('Summary of the completed change brief'),
      }),
    },
  )
}

export function createGenerateEmployeeBrief(initId) {
  return tool(
    async ({ leader_conversation_summary }) => {
      const init = await getInitiativeRow(initId)

      const prompt = briefGenerationPrompt({ leader_conversation_summary })

      const model = new ChatAnthropic({ model: MODEL_ID, temperature: 0.5, maxTokens: 1024 })
      const response = await model.invoke([new HumanMessage(prompt)])
      const body = aiText(response.content)

      const brief = {
        content: body,
        approved: false,
        createdAt: Date.now(),
        initiativeTitle: init?.title || 'Untitled',
      }

      await upsertEmployeeBriefFromLeader(initId, brief)

      return JSON.stringify({
        type: 'brief',
        data: brief,
        message:
          'Employee brief generated. The leader should review it in the Brief tab and approve it before it is sent to employees.',
      })
    },
    {
      name: 'generate_employee_brief',
      description:
        'Generate a plain-language employee-facing brief from the leader conversation. Call this after the playbook is generated. The brief explains the change to employees in honest, accessible language.',
      schema: z.object({
        leader_conversation_summary: z.string().describe('Summary of the leader change brief conversation'),
      }),
    },
  )
}

export function createProposeOutreach(initId) {
  return tool(
    async ({ context, milestone }) => {
      const init = await getInitiativeRow(initId)
      const employees = await getAssignedEmails(initId)

      const prompt = outreachPrompt({
        brief_summary: init?.summary || context || '',
        employee_names: employees || [],
        initiative_title: init?.title || 'Untitled',
      })

      const model = new ChatAnthropic({ model: MODEL_ID, temperature: 0.6, maxTokens: 1024 })
      const response = await model.invoke([new HumanMessage(prompt)])
      const text = aiText(response.content)

      let outreach
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        outreach = jsonMatch ? JSON.parse(jsonMatch[0]) : { draft: text, rationale: milestone }
      } catch {
        outreach = { draft: text, rationale: milestone }
      }

      const outreachMsg = {
        id: mkId(),
        ...outreach,
        status: 'pending',
        createdAt: Date.now(),
        milestone,
      }

      const messages = await getOutreachMessages(initId)
      messages.push(outreachMsg)
      await setOutreachMessages(initId, messages)

      return JSON.stringify({
        type: 'outreach_suggestion',
        data: outreachMsg,
        message:
          'Outreach message drafted. The leader can review, edit, and approve it in the Outreach tab before it is sent.',
      })
    },
    {
      name: 'propose_outreach',
      description:
        'Propose an outreach message for the leader to send to employees. Call this when a milestone is detected (e.g., playbook shared, new phase starting, significant update). The leader must approve before any message is sent.',
      schema: z.object({
        context: z.string().describe('Current context or reason for the outreach'),
        milestone: z.string().describe('The milestone or event triggering this outreach'),
      }),
    },
  )
}

export function createReadSynthesis(initId) {
  return tool(
    async () => {
      const reports = await getSynthesisReports(initId)
      if (!reports || reports.length === 0) {
        return JSON.stringify({
          type: 'synthesis_card',
          data: null,
          message:
            'No employee synthesis available yet. Employees need to have conversations and consent to sharing feedback before themes can be surfaced.',
        })
      }

      const latest = reports[reports.length - 1]

      const safe = { ...latest }
      if (safe?.themes) {
        safe.themes = safe.themes.map((t) => ({
          name: t.name,
          description: t.description,
          sentiment: t.sentiment,
          contributorCount: t.contributorCount ?? t.count,
          percentage: t.percentage,
          pillar: t.pillar,
        }))
      }

      return JSON.stringify({
        type: 'synthesis_card',
        data: safe,
        message:
          'Here is the latest anonymized synthesis from employee conversations. These are patterns — no individual attribution is included.',
      })
    },
    {
      name: 'read_synthesis',
      description:
        'Read the latest anonymized synthesis of employee feedback. Call this when the leader asks about what employees are saying or feeling. Returns aggregated themes mapped to culture pillars. NEVER surfaces individual attribution.',
      schema: z.object({}),
    },
  )
}

export function createVersionPlaybook(initId) {
  return tool(
    async ({ changes, change_note }) => {
      const init = await getInitiativeRow(initId)
      const versions = await getPlaybookVersions(initId)

      if (!versions.length) {
        return 'No existing playbook to version. Generate a playbook first.'
      }

      const currentVersion = versions[versions.length - 1]
      const newVersionNumber = currentVersion.version + 1

      const synthesisReports = await getSynthesisReports(initId)
      const latestSynthesis =
        synthesisReports?.length > 0 ? synthesisReports[synthesisReports.length - 1] : null

      const prompt = pivotPrompt({
        synthesis_data: latestSynthesis,
        current_playbook: currentVersion,
        initiative_title: init?.title || 'Untitled',
      })

      const model = new ChatAnthropic({ model: MODEL_ID, temperature: 0.5, maxTokens: 2048 })
      const response = await model.invoke([new HumanMessage(`${prompt}\n\nSpecific changes requested: ${changes}`)])
      const text = aiText(response.content)

      let updatedPlaybook
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        updatedPlaybook = jsonMatch ? JSON.parse(jsonMatch[0]) : null
      } catch {
        updatedPlaybook = null
      }

      const hasValidPhases =
        updatedPlaybook &&
        Array.isArray(updatedPlaybook.phases) &&
        updatedPlaybook.phases.length > 0

      const newVersion = {
        version: newVersionNumber,
        phases: hasValidPhases ? updatedPlaybook.phases : currentVersion.phases,
        changeSummary: updatedPlaybook?.changeSummary || updatedPlaybook?.summary || '',
        createdAt: Date.now(),
        changeNote: change_note || `Updated based on employee synthesis (v${newVersionNumber})`,
        previousVersion: currentVersion.version,
      }

      versions.push(newVersion)
      await setPlaybookVersions(initId, versions)

      return JSON.stringify({
        type: 'playbook',
        data: newVersion,
        message: `Playbook updated to version ${newVersionNumber}. Changes: ${change_note}`,
      })
    },
    {
      name: 'version_playbook',
      description:
        'Create a new version of the playbook when the leader accepts a pivot based on employee synthesis. Generates an updated plan incorporating the changes.',
      schema: z.object({
        changes: z.string().describe('Description of what changes to make to the playbook'),
        change_note: z.string().describe('Brief note explaining why this version was created'),
      }),
    },
  )
}

export function createLogPivot(initId) {
  return tool(
    async ({ change_description, synthesis_id }) => {
      if (!change_description || change_description.trim().length < 10) {
        return 'Cannot log a pivot without a specific change description. What exactly changed? A pivot must describe a concrete action, not just "feedback was heard".'
      }

      const hollowPhrases = [
        'feedback was heard',
        'we listened',
        'changes were made',
        'we are working on it',
        'noted',
        'acknowledged',
      ]
      const lowerDesc = change_description.toLowerCase()
      if (hollowPhrases.some((p) => lowerDesc.includes(p))) {
        return `That description is too vague. A pivot must name a specific change — what exactly is different now? For example: "Added a peer support structure to the first month" or "Extended the timeline by two weeks to allow team input on the new process."`
      }

      const pivotId = mkId()
      const pivot = {
        id: pivotId,
        changeDescription: change_description,
        synthesisId: synthesis_id || null,
        createdAt: Date.now(),
      }

      await appendPivotEntry(initId, pivot)

      return JSON.stringify({
        type: 'pivot_logged',
        data: pivot,
        message: `Pivot logged: "${change_description}". This will be shared with contributing employees as a closed-loop message so they know their feedback led to a real change.`,
      })
    },
    {
      name: 'log_pivot',
      description:
        'Log a specific action the leader has taken based on employee synthesis. This triggers the closed-loop process — employees who contributed to the relevant synthesis themes will be notified that their feedback led to a real change. The change description MUST be specific and concrete — vague or hollow descriptions will be rejected.',
      schema: z.object({
        change_description: z
          .string()
          .describe('Specific description of what the leader changed. Must be concrete and actionable, not hollow.'),
        synthesis_id: z.string().optional().describe('ID of the synthesis report that prompted this pivot'),
      }),
    },
  )
}

export function createLeaderTools(initId) {
  return [
    createSaveBriefAnswer(initId),
    createGeneratePlaybook(initId),
    createGenerateEmployeeBrief(initId),
    createProposeOutreach(initId),
    createReadSynthesis(initId),
    createVersionPlaybook(initId),
    createLogPivot(initId),
  ]
}
