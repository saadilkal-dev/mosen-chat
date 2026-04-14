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
  clearUnreadSynthesisFlag,
} from '../leader-store.js'
import { getSynthesisReports } from '../initiative-store.js'
import { MODEL_ID } from './base.js'
import {
  mergePlaybookVersionSafe,
  findFirstIncompleteActivityIndex,
} from '../playbook-helpers.js'
import { backgroundGenerateAllArtifacts } from '../artifact-service.js'

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
    async ({ brief_summary, timeline_estimate }) => {
      const init = await getInitiativeRow(initId)
      const employeeCount = await countAssignedEmployees(initId)
      const prompt = playbookPrompt({
        brief_summary: brief_summary || init?.summary || '',
        employee_count: employeeCount,
        initiative_title: init?.title || 'Untitled',
        timeline_estimate: timeline_estimate || '',
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
        status: 'draft',
        createdAt: Date.now(),
        changeNote: 'Initial playbook generated from change brief',
      }

      await setPlaybookVersions(initId, [version])
      await patchInitiative(initId, { playbook_generated: true })

      return JSON.stringify({
        type: 'playbook_draft',
        version: version.version,
        phases: (playbook.phases || []).map((p) => ({ name: p.name, activityCount: (p.activities || []).length })),
        totalActivities: (playbook.phases || []).reduce((s, p) => s + (p.activities || []).length, 0),
        message:
          'Draft playbook created. Walk through assumptions with the leader, then call confirm_playbook when they want to lock it in.',
      })
    },
    {
      name: 'generate_playbook',
      description:
        'Generate a structured change playbook from the completed change brief. Call after the brief is complete. Creates a DRAFT — the leader must confirm before it is final. Ask for timeline first if unknown.',
      schema: z.object({
        brief_summary: z.string().describe('Summary of the completed change brief'),
        timeline_estimate: z.string().optional().describe('Expected duration, e.g. "6 weeks"'),
      }),
    },
  )
}

export function createConfirmPlaybook(initId) {
  return tool(
    async () => {
      const versions = await getPlaybookVersions(initId)
      if (!versions.length) {
        return JSON.stringify({ error: 'No draft to confirm. Generate a playbook first.' })
      }
      const latest = versions[versions.length - 1]
      if (latest.status === 'active') {
        return JSON.stringify({
          type: 'playbook_confirmed',
          confirmed: true,
          alreadyActive: true,
          message: 'The playbook is already confirmed and active.',
        })
      }
      latest.status = 'active'
      await setPlaybookVersions(initId, versions)
      await patchInitiative(initId, { playbook_generated: true, status: 'active' })

      const phases = latest.phases || []
      const { phaseIndex, activityIndex } = findFirstIncompleteActivityIndex(phases)
      const phase = phases[phaseIndex]
      const activity = phase?.activities?.[activityIndex]

      backgroundGenerateAllArtifacts(initId, latest).catch((err) =>
        console.warn('[confirm_playbook] background artifacts:', err?.message),
      )

      return JSON.stringify({
        type: 'playbook_confirmed',
        confirmed: true,
        version: latest.version,
        suggestFirstExperiment: true,
        experiment_card: activity
          ? {
              type: 'experiment_card',
              phaseIndex,
              activityIndex,
              phaseName: phase.name,
              activityTitle: activity.title,
              description: activity.description,
              hypothesis: activity.hypothesis || null,
              completed: activity.completed || false,
            }
          : null,
        message:
          'Playbook confirmed. Point the leader to the first experiment below and the Playbook tab. If helpful, call suggest_experiment with the same indices so the card appears again.',
      })
    },
    {
      name: 'confirm_playbook',
      description:
        'Confirm and finalize the draft playbook when the leader is satisfied. Then call suggest_experiment for the first incomplete activity so they know what to do first.',
      schema: z.object({}),
    },
  )
}

export function createSuggestExperiment(initId) {
  return tool(
    async ({ phaseIndex, activityIndex, reason }) => {
      const versions = await getPlaybookVersions(initId)
      if (!versions.length) {
        return JSON.stringify({ type: 'experiment_card', error: 'No playbook loaded.' })
      }
      const latest = versions[versions.length - 1]
      const phase = latest.phases?.[phaseIndex]
      const activity = phase?.activities?.[activityIndex]
      if (!phase || !activity) {
        return JSON.stringify({
          type: 'experiment_card',
          error: `Phase ${phaseIndex} or activity ${activityIndex} not found.`,
        })
      }
      return JSON.stringify({
        type: 'experiment_card',
        phaseIndex,
        activityIndex,
        phaseName: phase.name,
        activityTitle: activity.title,
        description: activity.description,
        hypothesis: activity.hypothesis || null,
        completed: activity.completed || false,
        reason: reason || '',
      })
    },
    {
      name: 'suggest_experiment',
      description:
        'Surface a specific playbook activity as the next experiment. Use phaseIndex and activityIndex from the current playbook.',
      schema: z.object({
        phaseIndex: z.number().describe('Zero-based phase index'),
        activityIndex: z.number().describe('Zero-based activity index within the phase'),
        reason: z.string().describe('One sentence: why this experiment makes sense now'),
      }),
    },
  )
}

export function createReadPlaybookStatus(initId) {
  return tool(
    async () => {
      const versions = await getPlaybookVersions(initId)
      if (!versions.length) {
        return JSON.stringify({ ok: false, message: 'No playbook yet.' })
      }
      const latest = versions[versions.length - 1]
      const phases = latest.phases || []
      const lines = phases.map((p, pi) => {
        const acts = p.activities || []
        const done = acts.filter((a) => a?.completed === true).length
        const items = acts.map(
          (a, ai) => `  - [${a?.completed ? 'x' : ' '}] (${pi},${ai}) ${a?.title || 'Activity'}`,
        )
        return `${p.name || `Phase ${pi + 1}`} (${done}/${acts.length} done)\n${items.join('\n')}`
      })
      return JSON.stringify({
        ok: true,
        version: latest.version,
        status: latest.status || 'unknown',
        summary: lines.join('\n\n'),
      })
    },
    {
      name: 'read_playbook_status',
      description:
        'Read current playbook completion state with phase/activity indices. Use to recommend the next experiment or celebrate progress.',
      schema: z.object({}),
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
        'Generate a plain-language employee-facing brief from the leader conversation. Call after the playbook is confirmed.',
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
        'Propose an outreach message for the leader to send to employees. Call when a milestone or phase transition warrants communication.',
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

      await clearUnreadSynthesisFlag(initId)

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
        'Read the latest anonymized synthesis of employee feedback. Clears the "new synthesis" reminder for the leader.',
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

      const prompt = pivotPrompt({
        synthesis_history: synthesisReports || [],
        current_playbook: currentVersion,
        initiative_title: init?.title || 'Untitled',
      })

      const model = new ChatAnthropic({ model: MODEL_ID, temperature: 0.5, maxTokens: 4096 })
      const response = await model.invoke([new HumanMessage(`${prompt}\n\nSpecific changes requested: ${changes}`)])
      const text = aiText(response.content)

      let parsed
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
      } catch {
        parsed = {}
      }

      const merged = mergePlaybookVersionSafe(parsed, currentVersion)
      const summaryText =
        typeof merged.changeSummary === 'string' && merged.changeSummary.trim()
          ? merged.changeSummary.trim()
          : change_note || `Updated based on employee synthesis (v${newVersionNumber})`

      const newVersion = {
        ...merged,
        version: newVersionNumber,
        createdAt: Date.now(),
        changeNote: summaryText,
        changeSummary: merged.changeSummary,
        previousVersion: currentVersion.version,
        status: currentVersion.status === 'active' ? 'active' : merged.status || 'draft',
      }

      versions.push(newVersion)
      await setPlaybookVersions(initId, versions)

      return JSON.stringify({
        type: 'playbook',
        data: newVersion,
        message: `Playbook updated to version ${newVersionNumber}.`,
      })
    },
    {
      name: 'version_playbook',
      description:
        'Create a new version of the playbook when the leader accepts changes based on synthesis. Uses full synthesis history.',
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
        'Log a specific action the leader has taken based on employee synthesis. The change description MUST be concrete.',
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
    createConfirmPlaybook(initId),
    createSuggestExperiment(initId),
    createReadPlaybookStatus(initId),
    createGenerateEmployeeBrief(initId),
    createProposeOutreach(initId),
    createReadSynthesis(initId),
    createVersionPlaybook(initId),
    createLogPivot(initId),
  ]
}
