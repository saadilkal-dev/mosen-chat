import { getSupabase } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req) {
  try {
    const { browserId, persona, chatId, responses } = await req.json()
    if (!browserId || !persona || !responses) {
      return Response.json({ ok: false }, { status: 400 })
    }

    const feedbackId = `${persona}:${browserId}:${Date.now()}`
    const supabase = getSupabase()

    const { error } = await supabase.from('feedback_submissions').insert({
      id: feedbackId,
      browser_id: browserId,
      persona,
      chat_id: chatId || null,
      responses,
      submitted_at_ms: Date.now(),
    })

    if (error) throw error

    return Response.json({ ok: true })
  } catch (err) {
    console.error('Feedback save error:', err.message)
    return Response.json({ ok: false, error: err.message }, { status: 500 })
  }
}
