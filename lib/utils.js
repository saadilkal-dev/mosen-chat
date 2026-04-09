export function mkId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function fmt(ts) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function fmtFull(ts) {
  return new Date(ts).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function parseCSVText(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim())
    const row = {}
    headers.forEach((h, i) => { row[h] = values[i] || '' })
    return {
      name: row.name || '',
      email: row.email || '',
      department: row.department || '',
      role: row.role || '',
    }
  }).filter(r => r.email)
}

/**
 * Normalizes spreadsheet / JSON rows (any key casing) into employee records.
 */
export function employeesFromObjects(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return []
  return rows
    .map(raw => {
      const o = {}
      for (const k of Object.keys(raw)) {
        const key = String(k).trim().toLowerCase()
        o[key] = raw[k]
      }
      const email = String(o.email || o['e-mail'] || '').trim().toLowerCase()
      return {
        name: String(o.name || o['full name'] || '').trim(),
        email,
        department: String(o.department || o.dept || '').trim(),
        role: String(o.role || o.title || '').trim(),
      }
    })
    .filter(r => r.email && validateEmail(r.email))
}
