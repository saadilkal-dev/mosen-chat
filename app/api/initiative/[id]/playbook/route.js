import { NextResponse } from 'next/server'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { requireAuth } from '@/lib/auth'
import { getInitiativeRow, getPlaybookVersions, markActivityComplete } from '@/lib/leader-store'
import { createGeneratePlaybook } from '@/lib/graph/leader-tools'
import { PlaybookDocument } from '@/lib/pdf/playbook-pdf.js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req, { params }) {
  try {
    await requireAuth()
    const { id } = params
    const init = await getInitiativeRow(id)
    if (!init) return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })

    const versions = await getPlaybookVersions(id)

    const url = new URL(req.url)
    if (url.searchParams.get('format') === 'pdf') {
      if (!versions.length) {
        return NextResponse.json({ error: 'No playbook to download yet.' }, { status: 404 })
      }
      const latest = versions[versions.length - 1]
      const doc = React.createElement(PlaybookDocument, {
        initiativeTitle: init.title || 'Untitled initiative',
        version: latest,
      })
      const buffer = await renderToBuffer(doc)
      const safeTitle = (init.title || 'playbook').replace(/[^a-z0-9\-_ ]/gi, '').slice(0, 80) || 'playbook'
      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${safeTitle} — Playbook v${latest.version || 1}.pdf"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    return NextResponse.json({ versions })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('Playbook GET error:', err)
    return NextResponse.json({ error: 'Failed to load playbook' }, { status: 500 })
  }
}

export async function PUT(req, { params }) {
  try {
    const { userId } = await requireAuth()
    const { id } = params
    const { phaseIndex, activityIndex, completed } = await req.json()

    if (typeof phaseIndex !== 'number' || typeof activityIndex !== 'number' || typeof completed !== 'boolean') {
      return NextResponse.json({ error: 'phaseIndex, activityIndex, and completed are required' }, { status: 400 })
    }

    const init = await getInitiativeRow(id)
    if (!init) return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    if (init.leader_clerk_id !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    await markActivityComplete(id, phaseIndex, activityIndex, completed)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: err.message || 'Failed to update activity' }, { status: 500 })
  }
}

export async function POST(req, { params }) {
  try {
    const { userId } = await requireAuth()
    const { id } = params
    const { brief_summary } = await req.json()

    const init = await getInitiativeRow(id)
    if (!init) return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    if (init.leader_clerk_id !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    const tool = createGeneratePlaybook(id)
    const result = await tool.invoke({ brief_summary: brief_summary || init.summary || '' })
    const parsed = typeof result === 'string' ? JSON.parse(result) : result

    return NextResponse.json({ ok: true, result: parsed })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Failed to generate playbook' }, { status: 500 })
  }
}
