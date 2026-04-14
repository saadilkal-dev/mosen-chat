import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getInitiativeRow } from '../../../../../lib/leader-store'
import {
  generateAndCacheArtifact,
  normaliseCached,
  buildArtifactKey,
} from '../../../../../lib/artifact-service'
import { getGeneratedArtifact } from '../../../../../lib/leader-store'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

    // Check cache before generating (avoids re-auth overhead in shared helper)
    const artifactKey = buildArtifactKey(phaseName, activityTitle, artifactName)
    const cached = await getGeneratedArtifact(id, artifactKey)
    if (cached) {
      const { artifact, format } = normaliseCached(cached.content, artifactName)
      return NextResponse.json({
        artifact,
        format,
        generatedAt: cached.generated_at,
        cached: true,
      })
    }

    // Generate (Haiku, ~1s vs 3-5s with Sonnet)
    const result = await generateAndCacheArtifact(id, { artifactName, activityTitle, phaseName })

    return NextResponse.json({
      artifact: result.artifact,
      format: result.format,
      generatedAt: result.generatedAt,
      cached: false,
    })
  } catch (err) {
    console.error('Artifact generation error:', err)
    return NextResponse.json({ error: err.message || 'Failed to generate artifact' }, { status: 500 })
  }
}
