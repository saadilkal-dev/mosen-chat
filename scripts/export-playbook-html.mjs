/**
 * Export initiative playbook(s) from Supabase to a standalone HTML file.
 * Usage: node scripts/export-playbook-html.mjs <initiative_id> [output.html]
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnvLocal() {
  const candidates = [path.join(process.cwd(), '.env.local'), path.join(__dirname, '..', '.env.local')]
  const envPath = candidates.find((p) => fs.existsSync(p))
  if (!envPath) return
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

function esc(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderPlaybookHtml({ title, initiativeId, version, idx }) {
  const phases = version.phases || []
  const hasPhases = phases.length > 0
  const recs = version.recommendations

  let body = ''

  if (version.changeSummary) {
    body += `<div class="change-summary">${esc(version.changeSummary)}</div>`
  }

  if (hasPhases) {
    for (const phase of phases) {
      body += `<section class="phase"><h2>${esc(phase.name)}${phase.duration ? ` <span class="dur">${esc(phase.duration)}</span>` : ''}</h2>`
      if (phase.description && String(phase.description).trim()) {
        body += `<p class="phase-desc">${esc(String(phase.description).trim())}</p>`
      }
      const activities = phase.activities || []
      for (let j = 0; j < activities.length; j++) {
        const activity = activities[j]
        const done = activity.completed === true
        body += `<div class="activity ${done ? 'done' : ''}">`
        body += `<div class="act-title">${j + 1}. ${esc(activity.title)}</div>`
        if (activity.description) body += `<div class="act-desc">${esc(activity.description)}</div>`
        if (activity.hypothesis) body += `<div class="hypothesis">${esc(activity.hypothesis)}</div>`
        if (activity.owner) body += `<div class="owner">Owner: ${esc(activity.owner)}</div>`
        if (activity.artifacts?.length) {
          body += `<div class="artifacts">${activity.artifacts.map((a) => `<span class="pill">${esc(a)}</span>`).join(' ')}</div>`
        }
        body += `</div>`
      }
      body += `</section>`
    }
  } else if (Array.isArray(recs) && recs.length) {
    if (version.summary) body += `<p class="summary">${esc(version.summary)}</p>`
    body += `<h2>Recommended changes</h2>`
    for (const rec of recs) {
      body += `<div class="rec">`
      body += `<div class="rec-title">${esc(rec.theme || rec.pillar || 'Recommendation')}</div>`
      if (rec.change) body += `<div>${esc(rec.change)}</div>`
      if (rec.rationale) body += `<div class="rationale">${esc(rec.rationale)}</div>`
      body += `</div>`
    }
  } else {
    body += `<p class="empty">No structured phases or recommendations in this version.</p>`
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)} — Playbook</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'DM Sans', system-ui, sans-serif; margin: 0; padding: 32px 24px 48px; background: #FAFAF8; color: #1A1A18; line-height: 1.6; }
    .wrap { max-width: 800px; margin: 0 auto; }
    h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 8px; color: #2D2560; }
    .meta { font-size: 0.85rem; color: #999; margin-bottom: 24px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 8px; background: #F6F5FF; border: 1px solid #D8D5F5; color: #534AB7; font-size: 0.75rem; font-weight: 600; margin-right: 8px; }
    .change-summary { font-size: 0.9rem; color: #555; padding: 12px 14px; background: #F6F5FF; border: 1px solid #D8D5F5; border-radius: 8px; margin-bottom: 24px; }
    .phase { margin-bottom: 28px; border: 1px solid #EBEBEA; border-radius: 12px; overflow: hidden; background: #fff; }
    .phase-desc { margin: 0; padding: 0 16px 12px; font-size: 0.9rem; color: #555; line-height: 1.55; border-bottom: 1px solid #F0F0EC; }
    .phase h2 { margin: 0; padding: 14px 16px; background: #F6F5FF; font-size: 1rem; font-weight: 600; border-bottom: 1px solid #EBEBEA; }
    .dur { font-weight: 400; color: #999; font-size: 0.85rem; }
    .activity { padding: 14px 16px; border-top: 1px solid #F5F5F2; }
    .activity:first-of-type { border-top: none; }
    .activity.done .act-title { text-decoration: line-through; color: #999; }
    .act-title { font-weight: 500; font-size: 0.95rem; margin-bottom: 6px; }
    .act-desc { font-size: 0.85rem; color: #444; }
    .hypothesis { font-size: 0.8rem; color: #888; font-style: italic; margin-top: 6px; }
    .owner { font-size: 0.8rem; color: #534AB7; margin-top: 6px; }
    .artifacts { margin-top: 8px; }
    .pill { display: inline-block; font-size: 0.72rem; padding: 3px 10px; margin: 2px 4px 2px 0; border-radius: 12px; background: #F6F5FF; border: 1px solid #D8D5F5; color: #534AB7; }
    .summary { font-size: 0.95rem; color: #555; margin-bottom: 16px; }
    .rec { margin-bottom: 12px; padding: 12px 14px; background: #F6F5FF; border-radius: 10px; border: 1px solid #D8D5F5; }
    .rec-title { font-weight: 600; margin-bottom: 6px; }
    .rationale { font-size: 0.8rem; color: #888; margin-top: 6px; }
    .empty { color: #999; }
    footer { margin-top: 40px; font-size: 0.75rem; color: #bbb; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${esc(title)}</h1>
    <div class="meta">
      <span class="badge">Playbook v${esc(version.version ?? idx + 1)}</span>
      Initiative <code>${esc(initiativeId)}</code>
      ${version.createdAt ? ` · ${esc(new Date(version.createdAt).toLocaleString())}` : ''}
      ${version.changeNote ? ` · ${esc(version.changeNote)}` : ''}
    </div>
    ${body}
    <footer>Exported from Mosen · playbook version index ${idx}</footer>
  </div>
</body>
</html>`
}

async function main() {
  loadEnvLocal()
  const initiativeId = process.argv[2]
  const outArg = process.argv[3]
  if (!initiativeId) {
    console.error('Usage: node scripts/export-playbook-html.mjs <initiative_id> [output.html]')
    process.exit(1)
  }

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '')
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment / .env.local')
    process.exit(1)
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  const { data: init, error: e1 } = await supabase.from('initiatives').select('title').eq('id', initiativeId).maybeSingle()
  if (e1) throw e1
  const title = init?.title || 'Initiative'

  const { data: row, error: e2 } = await supabase.from('initiative_playbooks').select('versions').eq('initiative_id', initiativeId).maybeSingle()
  if (e2) throw e2

  let versions = row?.versions
  if (typeof versions === 'string') {
    try {
      versions = JSON.parse(versions)
    } catch {
      versions = []
    }
  }
  if (!Array.isArray(versions) || versions.length === 0) {
    console.error('No playbook versions found for this initiative.')
    process.exit(1)
  }

  const idx = versions.length - 1
  const current = versions[idx]
  const html = renderPlaybookHtml({ title, initiativeId, version: current, idx })

  const outPath = outArg
    ? path.resolve(process.cwd(), outArg)
    : path.join(process.cwd(), 'exports', `playbook-${initiativeId}.html`)

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, html, 'utf8')
  console.log('Wrote', outPath)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
