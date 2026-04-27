'use client'

import { useState } from 'react'
import Link from 'next/link'

type Summary = {
  dryRun: boolean
  totalRows: number
  validRows: number
  invalidRows: number
  duplicates: number
  noXHandle: number
  inserted: number
  errors: { row: number, reason: string }[]
  sample?: Record<string, unknown>[]
}

// Minimal RFC-flexible CSV parser
function parseCSV(text: string): Record<string, string | null>[] {
  const lines: string[][] = []
  let line: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const next = text[i + 1]
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++ }
      else if (c === '"') inQuotes = false
      else field += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { line.push(field); field = '' }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && next === '\n') i++
        line.push(field)
        if (line.length > 1 || line[0] !== '') lines.push(line)
        line = []; field = ''
      } else field += c
    }
  }
  if (field || line.length > 0) { line.push(field); if (line.length > 1 || line[0] !== '') lines.push(line) }
  if (lines.length === 0) return []
  const headers = lines[0].map(h => h.trim())
  return lines.slice(1).map(row => {
    const obj: Record<string, string | null> = {}
    headers.forEach((h, idx) => {
      const v = (row[idx] ?? '').trim()
      obj[h] = v === '' ? null : v
    })
    return obj
  })
}

export default function ImportClient() {
  const [csvText, setCsvText] = useState('')
  const [source, setSource] = useState('shipstacked-launch')
  const [parsed, setParsed] = useState<Record<string, string | null>[]>([])
  const [parseError, setParseError] = useState('')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setParseError('')
    try {
      const text = await f.text()
      setCsvText(text)
      setParsed(parseCSV(text))
      setSummary(null)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Parse failed')
    }
  }

  const handlePasteParse = () => {
    setParseError('')
    try {
      setParsed(parseCSV(csvText))
      setSummary(null)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Parse failed')
    }
  }

  const runImport = async (dryRun: boolean) => {
    setLoading(true)
    setSummary(null)
    setParseError('')
    try {
      const res = await fetch('/api/admin/candidates/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun, source: source.trim(), rows: parsed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setParseError(data.error || 'Import failed')
        setLoading(false)
        return
      }
      setSummary(data)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, sans-serif', padding: '2rem 1.5rem 5rem' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/admin/candidates" style={{ fontSize: 13, color: '#6e6e73', textDecoration: 'none' }}>← Outreach</Link>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginTop: '0.5rem', marginBottom: '0.4rem' }}>
            Import candidates
          </h1>
          <p style={{ fontSize: 14, color: '#6e6e73' }}>
            Upload OX&apos;s CSV. Every row must have a github_username and an X handle. Run dry-run first.
          </p>
        </div>

        {/* Source */}
        <div style={card}>
          <label style={label}>Source tag</label>
          <input
            type="text"
            value={source}
            onChange={e => setSource(e.target.value)}
            placeholder="e.g. shipstacked-launch, wave-7-expanded"
            style={input}
          />
        </div>

        {/* CSV input */}
        <div style={card}>
          <p style={label}>Upload CSV</p>
          <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ marginBottom: '1.5rem', fontSize: 14 }} />

          <p style={label}>OR paste CSV directly</p>
          <textarea
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
            placeholder="github_username,full_name,x_handle,..."
            rows={6}
            style={{ ...input, fontFamily: 'SF Mono, monospace', fontSize: 12, resize: 'vertical' }}
          />
          <button type="button" onClick={handlePasteParse} style={{ ...btnSecondary, marginTop: '0.75rem' }}>
            Parse pasted CSV
          </button>

          {parseError && (
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 8, color: '#c00', fontSize: 13 }}>
              {parseError}
            </div>
          )}
        </div>

        {/* Parsed preview */}
        {parsed.length > 0 && (
          <div style={card}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.5rem' }}>
              Parsed: {parsed.length} rows
            </p>

            <details style={{ marginBottom: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, color: '#6e6e73' }}>
                Preview first 3 rows
              </summary>
              <pre style={{ background: '#f5f5f7', padding: '1rem', borderRadius: 8, fontSize: 11, overflow: 'auto', marginTop: '0.5rem', fontFamily: 'SF Mono, monospace' }}>
                {JSON.stringify(parsed.slice(0, 3), null, 2)}
              </pre>
            </details>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => runImport(true)} disabled={loading} style={btnSecondary}>
                {loading ? 'Running…' : 'Dry run'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Insert ${parsed.length} rows? This is irreversible.`)) runImport(false)
                }}
                disabled={loading}
                style={btnPrimary}
              >
                {loading ? 'Importing…' : 'Real import'}
              </button>
            </div>
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div style={card}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.75rem' }}>
              {summary.dryRun ? 'Dry run result' : 'Import complete'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
              {[
                { label: 'Total', val: summary.totalRows, color: '#1d1d1f' },
                { label: 'Valid', val: summary.validRows, color: '#1a7f37' },
                { label: 'Invalid', val: summary.invalidRows, color: '#c00' },
                { label: 'No X handle', val: summary.noXHandle, color: '#bf7e00' },
                { label: 'Duplicates', val: summary.duplicates, color: '#bf7e00' },
                { label: summary.dryRun ? 'Would insert' : 'Inserted', val: summary.dryRun ? summary.validRows : summary.inserted, color: '#0071e3' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background: '#f5f5f7', padding: '0.7rem', borderRadius: 8 }}>
                  <p style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.15rem' }}>{label}</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color }}>{val}</p>
                </div>
              ))}
            </div>

            {summary.errors.length > 0 && (
              <details style={{ marginTop: '1rem' }}>
                <summary style={{ cursor: 'pointer', fontSize: 12, color: '#c00', fontWeight: 600 }}>
                  {summary.errors.length} errors — click to inspect
                </summary>
                <div style={{ background: '#fff0f0', padding: '1rem', borderRadius: 8, marginTop: '0.5rem', maxHeight: 240, overflow: 'auto' }}>
                  {summary.errors.slice(0, 50).map((e, i) => (
                    <p key={i} style={{ fontSize: 12, color: '#c00', marginBottom: '0.25rem', fontFamily: 'SF Mono, monospace' }}>
                      Row {e.row}: {e.reason}
                    </p>
                  ))}
                </div>
              </details>
            )}

            {summary.dryRun && summary.sample && summary.sample.length > 0 && (
              <details style={{ marginTop: '1rem' }}>
                <summary style={{ cursor: 'pointer', fontSize: 12, color: '#6e6e73' }}>
                  Sample rows that would be inserted
                </summary>
                <pre style={{ background: '#f5f5f7', padding: '1rem', borderRadius: 8, fontSize: 11, overflow: 'auto', marginTop: '0.5rem', fontFamily: 'SF Mono, monospace' }}>
                  {JSON.stringify(summary.sample, null, 2)}
                </pre>
              </details>
            )}

            {!summary.dryRun && summary.inserted > 0 && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0f9f0', border: '1px solid #c6e6c6', borderRadius: 10 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1a7f37', marginBottom: '0.5rem' }}>
                  Imported {summary.inserted} candidates.
                </p>
                <Link href="/admin/candidates" style={{ ...btnPrimary, display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
                  Start outreach session →
                </Link>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

const card: React.CSSProperties = {
  background: 'white',
  border: '1px solid #e0e0e5',
  borderRadius: 14,
  padding: '1.5rem',
  marginBottom: '1rem',
}

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  marginBottom: '0.4rem',
  color: '#1d1d1f',
  letterSpacing: '0.02em',
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.9rem',
  border: '1px solid #d2d2d7',
  borderRadius: 10,
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
  background: 'white',
  boxSizing: 'border-box',
}

const btnPrimary: React.CSSProperties = {
  padding: '0.65rem 1.4rem',
  background: '#0071e3',
  color: 'white',
  border: 'none',
  borderRadius: 980,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const btnSecondary: React.CSSProperties = {
  padding: '0.65rem 1.4rem',
  background: 'white',
  color: '#1d1d1f',
  border: '1px solid #d2d2d7',
  borderRadius: 980,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
}
