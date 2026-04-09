import { getSupabase } from '../../../../lib/supabase'

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
    console.error('Admin chats GET error:', err.message)
    return Response.json({ chats: [] })
  }
}
