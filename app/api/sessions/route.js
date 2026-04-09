import { getSupabase } from '../../../lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const browserId = searchParams.get('browserId')
  const persona = searchParams.get('persona')

  if (!browserId || !persona) return Response.json({ chats: [] })

  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('legacy_browser_chats')
      .select('chats')
      .eq('browser_id', browserId)
      .eq('persona', persona)
      .maybeSingle()

    if (error) throw error
    const chats = data?.chats || []
    return Response.json({ chats: Array.isArray(chats) ? chats : [] })
  } catch (err) {
    console.error('Sessions GET error:', err.message)
    return Response.json({ chats: [] })
  }
}

export async function POST(req) {
  try {
    const { browserId, persona, chats } = await req.json()
    if (!browserId || !persona) return Response.json({ ok: false }, { status: 400 })

    const slim = chats.map(({ apiHistory: _, ...rest }) => rest)
    const now = new Date().toISOString()
    const lastMsg = slim.flatMap(c => c.messages || []).filter(m => m.from === 'user').slice(-1)[0]
    const preview = {
      browserId,
      persona,
      chatCount: slim.length,
      messageCount: slim.flatMap(c => c.messages || []).length,
      lastActivity: Date.now(),
      lastPreview: lastMsg?.text?.slice(0, 80) || 'No messages yet',
    }

    const supabase = getSupabase()

    const { error: chatErr } = await supabase.from('legacy_browser_chats').upsert(
      {
        browser_id: browserId,
        persona,
        chats: slim,
        updated_at: now,
      },
      { onConflict: 'browser_id,persona' },
    )
    if (chatErr) throw chatErr

    const { error: prevErr } = await supabase.from('admin_session_previews').upsert(
      {
        persona,
        browser_id: browserId,
        chat_count: preview.chatCount,
        message_count: preview.messageCount,
        last_activity_ms: preview.lastActivity,
        last_preview: preview.lastPreview,
        updated_at: now,
      },
      { onConflict: 'persona,browser_id' },
    )
    if (prevErr) throw prevErr

    return Response.json({ ok: true })
  } catch (err) {
    console.error('Sessions POST error:', err.message)
    return Response.json({ ok: false, error: err.message }, { status: 500 })
  }
}
