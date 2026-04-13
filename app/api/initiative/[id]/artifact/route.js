import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ChatAnthropic } from '@langchain/anthropic'
import { HumanMessage } from '@langchain/core/messages'
import {
  getInitiativeRow,
  getPlaybookVersions,
  getGeneratedArtifact,
  saveGeneratedArtifact,
} from '../../../../../lib/leader-store'
import { artifactGenerationPrompt } from '../../../../../lib/mosen-prompts'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function aiText(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content))
    return content.map((x) => (x && typeof x === 'object' && 'text' in x ? x.text : '')).join('')
  return String(content ?? '')
}

// POST /api/initiative/[id]/artifact — Generate or retrieve a cached artifact
export async function POST(req, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = params
    const { artifactName, activityTitle, phaseName } = await req.json()

    if (!artifactName) {
      return NextResponse.json({ error: 'artifactName is required' }, { status: 400 })
    }

    const init = await getInitiativeRow(id)
    if (!init) return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    if (init.leader_clerk_id !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    // Build a unique cache key from the artifact context
    const artifactKey = [phaseName, activityTitle, artifactName]
      .filter(Boolean)
      .join('::')
      .toLowerCase()
      .replace(/[^a-z0-9:]+/g, '-')

    // Check if already generated
    const cached = await getGeneratedArtifact(id, artifactKey)
    if (cached) {
      return NextResponse.json({
        content: cached.content,
        generatedAt: cached.generated_at,
        cached: true,
      })
    }

    // Generate via Claude
    const prompt = artifactGenerationPrompt({
      artifact_name: artifactName,
      activity_title: activityTitle || '',
      phase_name: phaseName || '',
      initiative_title: init.title || 'Untitled',
      brief_summary: init.summary || '',
    })

    const model = new ChatAnthropic({
      model: 'claude-sonnet-4-20250514',
      temperature: 0.5,
      maxTokens: 2048,
    })
    const response = await model.invoke([new HumanMessage(prompt)])
    const content = aiText(response.content)

    // Cache it
    await saveGeneratedArtifact(id, artifactKey, content)

    return NextResponse.json({
      content,
      generatedAt: new Date().toISOString(),
      cached: false,
    })
  } catch (err) {
    console.error('Artifact generation error:', err)
    return NextResponse.json({ error: err.message || 'Failed to generate artifact' }, { status: 500 })
  }
}
