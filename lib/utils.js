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
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim())
}

/**
 * RFC4180-style line parser: handles commas inside double quotes and "" escapes.
 */
function parseCSVLine(line, delim = ',') {
  const out = []
  let cur = ''
  let i = 0
  let inQuotes = false
  while (i < line.length) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      cur += c
      i++
      continue
    }
    if (c === '"') {
      inQuotes = true
      i++
      continue
    }
    if (c === delim) {
      out.push(cur)
      cur = ''
      i++
      continue
    }
    cur += c
    i++
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function pickFromRow(o, candidates) {
  const norm = (s) =>
    String(s)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
  const byNorm = {}
  for (const k of Object.keys(o)) {
    byNorm[norm(k)] = o[k]
  }
  for (const cand of candidates) {
    const v = byNorm[norm(cand)]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function pickEmail(o) {
  const direct = pickFromRow(o, [
    'email',
    'e-mail',
    'e mail',
    'email address',
    'work email',
    'company email',
    'business email',
  ])
  if (direct) return direct.toLowerCase()
  for (const k of Object.keys(o)) {
    const lk = k.toLowerCase().replace(/\s+/g, ' ')
    if (lk.includes('email') || lk === 'e mail') {
      const v = o[k]
      if (v != null && String(v).trim() !== '') return String(v).trim().toLowerCase()
    }
  }
  return ''
}

function pickName(o) {
  return pickFromRow(o, ['name', 'full name', 'employee name', 'display name', 'first name'])
}

function pickDepartment(o) {
  return pickFromRow(o, ['department', 'dept', 'team', 'division', 'org unit'])
}

function pickRole(o) {
  return pickFromRow(o, ['role', 'title', 'job title', 'position'])
}

/**
 * Parses CSV text into an array of row objects (keys = lowercased header names).
 * Strips UTF-8 BOM, normalizes newlines, auto-detects comma vs semicolon.
 */
export function parseCSVText(text) {
  if (text == null || String(text).trim() === '') return []
  let t = String(text)
  if (t.charCodeAt(0) === 0xfeff) {
    t = t.slice(1)
  }
  const lines = t
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) return []

  const first = lines[0]
  const commaCount = (first.match(/,/g) || []).length
  const semiCount = (first.match(/;/g) || []).length
  const delim = semiCount > commaCount ? ';' : ','

  const headers = parseCSVLine(first, delim).map((h) =>
    h
      .replace(/^\ufeff/, '')
      .trim()
      .toLowerCase(),
  )
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line, delim)
    const row = {}
    headers.forEach((h, i) => {
      row[h] = values[i] !== undefined ? values[i] : ''
    })
    return row
  })
}

/**
 * Normalizes spreadsheet / JSON rows (any key casing) into employee records.
 */
export function employeesFromObjects(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return []
  return rows
    .map((raw) => {
      const o = {}
      for (const k of Object.keys(raw)) {
        const key = String(k)
          .trim()
          .toLowerCase()
          .replace(/^\ufeff/, '')
        o[key] = raw[k]
      }
      const email = pickEmail(o)
      return {
        name: pickName(o),
        email,
        department: pickDepartment(o),
        role: pickRole(o),
      }
    })
    .filter((r) => r.email && validateEmail(r.email))
}
