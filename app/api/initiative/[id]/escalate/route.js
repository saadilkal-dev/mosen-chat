import { auth } from '@clerk/nextjs/server'
import { getSupabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

export async function POST(req, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const { question, context, is_anonymized } = await req.json()

    if (!question || !question.trim()) {
      return Response.json({ error: 'Question is required' }, { status: 400 })
    }

    const sb = getSupabase()

    // Get user email
    const { data: userProfile, error: profileError } = await sb
      .from('app_user_profiles')
      .select('email')
      .eq('clerk_id', userId)
      .single()

    if (profileError || !userProfile?.email) {
      return Response.json({ error: 'User profile not found' }, { status: 404 })
    }

    const employeeEmail = userProfile.email

    // Verify initiative exists
    const { data: initiative, error: initError } = await sb
      .from('initiatives')
      .select('id, title, published_by')
      .eq('id', id)
      .single()

    if (initError || !initiative) {
      return Response.json({ error: 'Initiative not found' }, { status: 404 })
    }

    // Create escalation record
    const { data: escalation, error: escError } = await sb
      .from('escalation_requests')
      .insert({
        initiative_id: id,
        employee_email: employeeEmail,
        question,
        context: context || null,
        is_anonymized: is_anonymized !== false,
        status: 'open',
      })
      .select()
      .single()

    if (escError) {
      console.error('[escalate] insert failed:', escError)
      return Response.json({ error: 'Failed to create escalation' }, { status: 500 })
    }

    // Get leader info to send email
    const { data: leader, error: leaderError } = await sb
      .from('app_user_profiles')
      .select('email, full_name')
      .eq('clerk_id', initiative.published_by)
      .single()

    if (!leaderError && leader?.email) {
      const emailBody = `
A new question has been raised by an employee about the initiative "${initiative.title}".

${is_anonymized !== false ? '(Employee has requested anonymity)' : `From: ${employeeEmail}`}

QUESTION:
${question}

${context ? `CONTEXT:\n${context}\n` : ''}

You can respond to this escalation in the Mosen admin panel. The employee will be notified of your response.
      `.trim()

      await sendEmail({
        to: leader.email,
        subject: `New employee question: ${initiative.title}`,
        html: `<p>${emailBody.replace(/\n/g, '<br />')}</p>`,
      }).catch(err => {
        console.error('[escalate] email send failed:', err.message)
      })
    }

    return Response.json({
      success: true,
      escalation,
      message: 'Your question has been sent to the leader.',
    })
  } catch (err) {
    console.error('[escalate] error:', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
