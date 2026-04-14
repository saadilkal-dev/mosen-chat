import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ingestDocument, listSources, deleteSource } from '../../../../lib/embedding-service'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// ---------------------------------------------------------------------------
// POST /api/knowledge/ingest
// Accepts multipart/form-data (PDF file) OR application/json ({ source, text })
// ---------------------------------------------------------------------------
export async function POST(req) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const contentType = req.headers.get('content-type') || ''
    let source, text, metadata = {}

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file')
      source = formData.get('source') || null
      const metaRaw = formData.get('metadata')
      if (metaRaw) metadata = JSON.parse(metaRaw)

      if (!file || typeof file === 'string') {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      const fileName = file.name || 'upload.pdf'
      if (!source) {
        source = `upload:${fileName.replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]/gi, '-').toLowerCase()}`
      }
      metadata = { ...metadata, fileName, fileType: file.type }

      const buffer = Buffer.from(await file.arrayBuffer())

      if (fileName.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        const pdfParse = (await import('pdf-parse')).default
        const parsed = await pdfParse(buffer)
        text = parsed.text
      } else {
        return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
      }
    } else {
      const body = await req.json()
      source = body.source
      text = body.text
      metadata = body.metadata || {}
    }

    if (!source) return NextResponse.json({ error: 'source is required' }, { status: 400 })
    if (!text || text.trim().length < 50) {
      return NextResponse.json({
        error: 'Extracted text is too short. The PDF may be image-based or password-protected.',
      }, { status: 400 })
    }

    const result = await ingestDocument(source.trim(), text, metadata)

    return NextResponse.json({
      success: true,
      source: result.source,
      chunks: result.chunks,
      textLength: text.length,
    })
  } catch (err) {
    console.error('Knowledge ingest error:', err)
    return NextResponse.json({ error: err.message || 'Ingestion failed' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// GET /api/knowledge/ingest — list all sources
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const sources = await listSources()
    return NextResponse.json({ sources })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/knowledge/ingest — remove a source by name
// ---------------------------------------------------------------------------
export async function DELETE(req) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { source } = await req.json()
    if (!source) return NextResponse.json({ error: 'source is required' }, { status: 400 })
    const result = await deleteSource(source)
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
