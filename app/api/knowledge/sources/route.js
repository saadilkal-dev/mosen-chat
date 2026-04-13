import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { listSources, deleteSource } from '../../../../lib/embedding-service'

export const dynamic = 'force-dynamic'

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
