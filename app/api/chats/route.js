import { getSupabase } from '../../../lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) return Response.json({ chats: [] })
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('chats_by_user')
      .select('chats')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    const chats = data?.chats || []
    return Response.json({ chats: Array.isArray(chats) ? chats : [] })
  } catch (err) {
    console.error('chats GET error:', err.message)
    return Response.json({ chats: [] })
  }
}

export async function POST(req) {
  try {
    const { userId, chats } = await req.json()
    if (!userId) return Response.json({ ok: false }, { status: 400 })
    const slim = chats.map(({ apiHistory: _, ...rest }) => rest)
    const supabase = getSupabase()
    const now = new Date().toISOString()

    const { error } = await supabase.from('chats_by_user').upsert(
      {
        user_id: userId,
        chats: slim,
        updated_at: now,
      },
      { onConflict: 'user_id' },
    )

    if (error) throw error
    return Response.json({ ok: true })
  } catch (err) {
    console.error('chats POST error:', err.message)
    return Response.json({ ok: false, error: err.message }, { status: 500 })
  }
}
