import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import {
  getInitiativeRow,
  getGeneratedArtifact,
} from '../../../../../../lib/leader-store'
import { ArtifactDocument } from '../../../../../../lib/pdf/artifact-pdf.js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/initiative/[id]/artifact/download
// Body: { artifactKey }
// Returns a single-artifact PDF. Requires the artifact to be cached —
// if not cached, instructs the client to generate it first (keeps this
// endpoint fast and safe inside Hobby-tier 10s limits).
export async function POST(req, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = params
    const { artifactKey } = await req.json()
    if (!artifactKey) {
      return NextResponse.json({ error: 'artifactKey is required' }, { status: 400 })
    }

    const init = await getInitiativeRow(id)
    if (!init) return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    if (init.leader_clerk_id !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    const cached = await getGeneratedArtifact(id, artifactKey)
    if (!cached) {
      return NextResponse.json(
        { error: 'Artifact not generated yet. Open it in the workspace first, then try downloading.' },
        { status: 404 },
      )
    }

    // Re-infer display context from the key: "phase::activity::artifact"
    const parts = String(artifactKey).split('::')
    const contextLabel = parts.length >= 2 ? parts.slice(0, -1).filter(Boolean).join(' · ') : ''

    // Normalise cached content — may be a JSONB object, a JSON string, or legacy markdown
    const fallbackTitle = parts[parts.length - 1] || 'Artifact'
    let artifactPayload
    const c = cached.content
    if (c && typeof c === 'object' && Array.isArray(c.sections)) {
      artifactPayload = c
    } else if (typeof c === 'string') {
      try {
        const parsed = JSON.parse(c)
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.sections)) {
          artifactPayload = parsed
        }
      } catch { /* not JSON */ }
      if (!artifactPayload) artifactPayload = { title: fallbackTitle, markdown: c }
    } else {
      artifactPayload = { title: fallbackTitle, sections: [] }
    }

    const doc = React.createElement(ArtifactDocument, {
      artifact: artifactPayload,
      contextLabel: `${init.title || ''}${contextLabel ? ' — ' + contextLabel : ''}`,
    })
    const buffer = await renderToBuffer(doc)

    const filename = `${(artifactPayload.title || 'artifact').replace(/[^a-z0-9\-_ ]/gi, '').slice(0, 80) || 'artifact'}.pdf`

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('Artifact download error:', err)
    return NextResponse.json({ error: err.message || 'Download failed' }, { status: 500 })
  }
}
