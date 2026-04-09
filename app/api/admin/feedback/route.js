import { getSupabase } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = getSupabase()
    const { data: rows, error } = await supabase
      .from('feedback_submissions')
      .select('*')
      .order('submitted_at_ms', { ascending: false })

    if (error) throw error

    const feedback = (rows || []).map(row => ({
      browserId: row.browser_id,
      persona: row.persona,
      chatId: row.chat_id,
      responses: row.responses,
      submittedAt: row.submitted_at_ms,
    }))

    return Response.json({ feedback, total: feedback.length })
  } catch (err) {
    console.error('Admin feedback GET error:', err.message)
    return Response.json({ feedback: [], total: 0 })
  }
}
