import { requireAuth } from '../../../../lib/auth'
import { mkId, validateEmail } from '../../../../lib/utils'
import { INVITE_TTL } from '../../../../lib/constants'
import { getSupabase } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req) {
  try {
    const { user } = await requireAuth()
    if (!user.orgId) {
      return Response.json({ error: 'You must create an organisation first' }, { status: 400 })
    }

    const { employees, skipInvites } = await req.json()
    if (!Array.isArray(employees) || employees.length === 0) {
      return Response.json({ error: 'At least one employee is required' }, { status: 400 })
    }

    const deferInvites = !!skipInvites
    const orgId = user.orgId
    const supabase = getSupabase()
    const results = []
    const errors = []
    let skipped = 0

    const { data: existingRows } = await supabase
      .from('org_employees')
      .select('email')
      .eq('org_id', orgId)
    const existingEmails = new Set((existingRows || []).map(r => r.email.toLowerCase()))

    const expiresAt = new Date(Date.now() + INVITE_TTL * 1000).toISOString()

    for (const emp of employees) {
      if (!emp.email || !validateEmail(emp.email)) {
        errors.push(`Invalid email: ${emp.email || 'empty'}`)
        continue
      }

      const email = emp.email.toLowerCase()
      if (existingEmails.has(email)) {
        skipped++
        continue
      }

      const token = deferInvites ? null : mkId()
      const employee = {
        name: emp.name || '',
        email,
        department: emp.department || '',
        role: emp.role || '',
        token,
        addedAt: Date.now(),
      }

      if (!deferInvites) {
        const { error: invErr } = await supabase.from('invites').insert({
          token,
          org_id: orgId,
          emp_email: email,
          emp_name: employee.name,
          expires_at: expiresAt,
        })
        if (invErr) {
          errors.push(invErr.message)
          continue
        }
      }

      const { error: empErr } = await supabase.from('org_employees').insert({
        org_id: orgId,
        email,
        name: employee.name,
        department: employee.department,
        role: employee.role,
        invite_token: token,
      })
      if (empErr) {
        errors.push(empErr.message)
        if (!deferInvites && token) {
          await supabase.from('invites').delete().eq('token', token)
        }
        continue
      }

      existingEmails.add(email)
      results.push(employee)
    }

    const { count } = await supabase
      .from('org_employees')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)

    return Response.json({
      ok: true,
      added: results.length,
      skipped,
      total: count ?? results.length,
      errors: errors.length > 0 ? errors : undefined,
    }, { status: 201 })
  } catch (err) {
    if (err instanceof Response) return err
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req) {
  try {
    const { user } = await requireAuth()
    if (!user.orgId) {
      return Response.json({ employees: [] })
    }

    const supabase = getSupabase()
    const { data: rows, error } = await supabase
      .from('org_employees')
      .select('name, email, department, role, added_at')
      .eq('org_id', user.orgId)
      .order('added_at', { ascending: true })

    if (error) throw error

    const employees = (rows || []).map(r => ({
      name: r.name,
      email: r.email,
      department: r.department,
      role: r.role,
      addedAt: r.added_at ? new Date(r.added_at).getTime() : undefined,
    }))

    return Response.json({ employees })
  } catch (err) {
    if (err instanceof Response) return err
    return Response.json({ error: err.message }, { status: 500 })
  }
}
