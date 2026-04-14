'use client'

import { useCallback, useState } from 'react'
import * as XLSX from 'xlsx'
import { THEME } from '../../lib/theme'
import { employeesFromObjects, parseCSVText } from '../../lib/utils'

export const TEAM_ROSTER_TEMPLATE_PATH = '/team-roster-template.csv'

/**
 * Shared CSV/XLSX team roster picker (first name, last name, email).
 * Controlled: parent owns employees + fileName state.
 */
export default function TeamRosterField({
  inputId = 'roster-file',
  employees,
  onEmployeesChange,
  fileName,
  onFileNameChange,
  externalError = '',
  sectionLabel = 'Upload team roster',
  description = 'Use our CSV template or your own file with the same columns. CSV and Excel (.xlsx) are supported.',
}) {
  const [dragOver, setDragOver] = useState(false)
  const [parseError, setParseError] = useState('')

  const parseFile = useCallback(
    async (file) => {
      const lower = file.name.toLowerCase()
      setParseError('')
      onFileNameChange(file.name)
      if (lower.endsWith('.csv')) {
        const text = await file.text()
        const rows = employeesFromObjects(parseCSVText(text))
        if (rows.length === 0) {
          setParseError(
            'No valid rows found. Use the template: columns for first name, last name, and email (e.g. first_name, last_name, email_address).',
          )
        }
        onEmployeesChange(rows)
        return
      }
      if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        const rows = employeesFromObjects(json)
        if (rows.length === 0) {
          setParseError('No valid rows found. Include columns for first name, last name, and email.')
        }
        onEmployeesChange(rows)
        return
      }
      onFileNameChange('')
      setParseError('Please upload a .csv or .xlsx file.')
    },
    [onEmployeesChange, onFileNameChange],
  )

  const clearRoster = useCallback(() => {
    onEmployeesChange([])
    onFileNameChange('')
    setParseError('')
  }, [onEmployeesChange, onFileNameChange])

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      setDragOver(false)
      const f = e.dataTransfer.files?.[0]
      if (f) parseFile(f)
    },
    [parseFile],
  )

  const combinedError = externalError || parseError

  return (
    <div
      style={{
        border: `1px solid ${THEME.colors.border}`,
        borderRadius: THEME.radius.md,
        padding: 18,
        background: THEME.colors.surface,
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: THEME.colors.leader.primary,
          margin: '0 0 6px',
        }}
      >
        {sectionLabel}
      </p>
      <p style={{ fontSize: 13, color: THEME.colors.textMuted, margin: '0 0 14px', lineHeight: 1.5 }}>
        {description}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <a
          href={TEAM_ROSTER_TEMPLATE_PATH}
          download="mosen-team-roster-template.csv"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 600,
            color: THEME.colors.leader.primary,
            border: `1px solid ${THEME.colors.leader.border}`,
            borderRadius: THEME.radius.sm,
            background: THEME.colors.leader.light,
            textDecoration: 'none',
          }}
        >
          Download template (CSV)
        </a>
        <label
          htmlFor={inputId}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 600,
            color: '#fff',
            background: THEME.colors.leader.primary,
            borderRadius: THEME.radius.sm,
            cursor: 'pointer',
          }}
        >
          Choose file to upload
        </label>
        <input
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          style={{ display: 'none' }}
          id={inputId}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) parseFile(f)
            e.target.value = ''
          }}
        />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragOver ? THEME.colors.leader.primary : THEME.colors.border}`,
          borderRadius: THEME.radius.md,
          padding: '32px 20px',
          textAlign: 'center',
          background: dragOver ? THEME.colors.leader.light : '#F5F5F2',
          minHeight: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden style={{ opacity: 0.45 }}>
          <path
            d="M12 16V8m0 0l-3 3m3-3l3 3M4 16.8V7.2c0-1.12 0-1.68.218-2.108a2 2 0 0 1 .874-.874C5.32 4 5.88 4 7.2 4h9.6c1.12 0 1.68 0 2.108.218a2 2 0 0 1 .874.874C20 5.52 20 6.08 20 7.2v9.6c0 1.12 0 1.68-.218 2.108a2 2 0 0 1-.874.874C18.48 20 17.92 20 16.8 20H7.2c-1.12 0-1.68 0-2.108-.218a2 2 0 0 1-.874-.874C4 18.48 4 17.92 4 16.8Z"
            stroke={THEME.colors.leader.primary}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span style={{ fontSize: 14, fontWeight: 600, color: THEME.colors.text }}>
          {fileName ? fileName : 'Or drag and drop your file here'}
        </span>
        {!fileName && <span style={{ fontSize: 12, color: THEME.colors.textMuted }}>.csv or .xlsx</span>}
        {employees.length > 0 && (
          <span style={{ fontSize: 13, fontWeight: 600, color: THEME.colors.leader.primary }}>
            {employees.length} team member{employees.length === 1 ? '' : 's'} ready to import
          </span>
        )}
      </div>

      {employees.length > 0 && (
        <button
          type="button"
          onClick={clearRoster}
          style={{
            marginTop: 10,
            padding: 0,
            border: 'none',
            background: 'none',
            fontSize: 12,
            color: THEME.colors.textMuted,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Remove file and choose another
        </button>
      )}

      {combinedError && (
        <p style={{ color: THEME.colors.error, fontSize: 13, margin: '12px 0 0' }}>{combinedError}</p>
      )}

      {employees.length > 0 && (
        <div
          style={{
            marginTop: 14,
            overflow: 'auto',
            maxHeight: 240,
            border: `1px solid ${THEME.colors.border}`,
            borderRadius: THEME.radius.sm,
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: THEME.colors.bg, textAlign: 'left' }}>
                <th style={{ padding: 8 }}>First name</th>
                <th style={{ padding: 8 }}>Last name</th>
                <th style={{ padding: 8 }}>Email</th>
              </tr>
            </thead>
            <tbody>
              {employees.slice(0, 50).map((r, i) => (
                <tr key={`${r.email}-${i}`} style={{ borderTop: `1px solid ${THEME.colors.border}` }}>
                  <td style={{ padding: 8 }}>{r.firstName || '—'}</td>
                  <td style={{ padding: 8 }}>{r.lastName || '—'}</td>
                  <td style={{ padding: 8 }}>{r.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {employees.length > 50 && (
            <div style={{ padding: 8, fontSize: 11, color: THEME.colors.textMuted }}>
              Showing 50 of {employees.length} rows.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
