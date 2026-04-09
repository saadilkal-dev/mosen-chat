'use client'
import { useState, useMemo } from 'react'

export default function InitiativeForm({ onSubmit, employees = [] }) {
  const [selected, setSelected] = useState(new Set())
  const [search, setSearch] = useState('')

  const departments = useMemo(() => {
    const depts = {}
    employees.forEach(emp => {
      const dept = emp.department || 'Other'
      if (!depts[dept]) depts[dept] = []
      depts[dept].push(emp)
    })
    return depts
  }, [employees])

  const filtered = useMemo(() => {
    if (!search) return departments
    const q = search.toLowerCase()
    const result = {}
    Object.entries(departments).forEach(([dept, emps]) => {
      const matching = emps.filter(e => e.name?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q))
      if (matching.length > 0) result[dept] = matching
    })
    return result
  }, [departments, search])

  const toggleEmployee = (email) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(email)) next.delete(email)
      else next.add(email)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(employees.map(e => e.email)))
  const selectDept = (dept) => {
    const deptEmails = departments[dept]?.map(e => e.email) || []
    setSelected(prev => { const next = new Set(prev); deptEmails.forEach(e => next.add(e)); return next })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search employees..."
          style={{ flex: 1, padding: '8px 12px', fontSize: 13, border: '1px solid #EBEBEA', borderRadius: 8, background: '#F5F5F2', outline: 'none', fontFamily: "'DM Sans', system-ui, sans-serif" }}
        />
        <button onClick={selectAll} style={{ padding: '8px 12px', fontSize: 12, borderRadius: 8, border: '1px solid #D8D5F5', background: '#F6F5FF', color: '#534AB7', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Select all ({employees.length})
        </button>
      </div>

      <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid #EBEBEA', borderRadius: 12 }}>
        {Object.entries(filtered).map(([dept, emps]) => (
          <div key={dept}>
            <div style={{ padding: '8px 12px', background: '#F5F5F2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #EBEBEA' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#666' }}>{dept}</span>
              <button onClick={() => selectDept(dept)} style={{ fontSize: 11, color: '#534AB7', background: 'none', border: 'none', cursor: 'pointer' }}>Select dept</button>
            </div>
            {emps.map(emp => (
              <label key={emp.email} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #F5F5F2' }}>
                <input type="checkbox" checked={selected.has(emp.email)} onChange={() => toggleEmployee(emp.email)} style={{ accentColor: '#534AB7' }} />
                <div>
                  <div style={{ fontSize: 13, color: '#1A1A18' }}>{emp.name || emp.email}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>{emp.email}{emp.role ? ` · ${emp.role}` : ''}</div>
                </div>
              </label>
            ))}
          </div>
        ))}
      </div>

      {selected.size > 0 && (
        <button
          onClick={() => onSubmit && onSubmit([...selected])}
          style={{ marginTop: 12, width: '100%', padding: '10px 16px', fontSize: 14, fontWeight: 500, borderRadius: 10, border: 'none', background: '#534AB7', color: '#fff', cursor: 'pointer' }}
        >
          Assign {selected.size} employee{selected.size !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}
