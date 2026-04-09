import { getSupabase } from '../../../lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = getSupabase()
    const { data: rows, error } = await supabase
      .from('admin_session_previews')
      .select('*')
      .order('last_activity_ms', { ascending: false })

    if (error) throw error
    if (!rows?.length) {
      return Response.json({ leader: [], employee: [], total: 0 })
    }

    const valid = rows.map(row => ({
      persona: row.persona,
      browserId: row.browser_id,
      chatCount: row.chat_count,
      messageCount: row.message_count,
      lastActivity: row.last_activity_ms,
      lastPreview: row.last_preview,
    }))

    const leader = valid.filter(s => s.persona === 'leader')
    const employee = valid.filter(s => s.persona === 'employee')

    return Response.json({ leader, employee, total: valid.length })
  } catch (err) {
    console.error('Admin GET error:', err.message)
    return Response.json({ leader: [], employee: [], total: 0 })
  }
}
