'use client'

import { useState } from 'react'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.7rem 1rem',
  border: '1px solid #d2d2d7', borderRadius: 10,
  fontSize: 14, outline: 'none', fontFamily: 'inherit',
  background: 'white', boxSizing: 'border-box',
  resize: 'vertical' as const,
}

export default function FeedPostForm({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [whatBuilt, setWhatBuilt] = useState('')
  const [problemSolved, setProblemSolved] = useState('')
  const [toolsUsed, setToolsUsed] = useState('')
  const [timeTaken, setTimeTaken] = useState('')
  const [url, setUrl] = useState('')

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Title is required'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, what_built: whatBuilt, problem_solved: problemSolved, tools_used: toolsUsed, time_taken: timeTaken, url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setDone(true)
      setTitle(''); setWhatBuilt(''); setProblemSolved(''); setToolsUsed(''); setTimeTaken(''); setUrl('')
      if (onSuccess) onSuccess()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ background: '#e3f3e3', border: '1px solid #b3e0b3', borderRadius: 14, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: 16 }}>✓</span>
          <p style={{ fontSize: 14, color: '#1a7f37', fontWeight: 500 }}>Build posted to the feed.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/feed" style={{ fontSize: 13, padding: '0.4rem 0.875rem', background: '#1a7f37', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>
            View feed →
          </a>
          <button onClick={() => setDone(false)} style={{ fontSize: 13, padding: '0.4rem 0.875rem', background: 'white', color: '#1d1d1f', border: '1px solid #d2d2d7', borderRadius: 980, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
            Post another
          </button>
        </div>
      </div>
    )
  }

  if (!open) {
    return (
      <div
        onClick={() => setOpen(true)}
        style={{ background: 'white', border: '1px dashed #d2d2d7', borderRadius: 14, padding: '1.25rem 1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'border-color 0.2s' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = '#0071e3')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = '#d2d2d7')}
      >
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e8f1fd', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
          🚀
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.1rem' }}>Post a build</p>
          <p style={{ fontSize: 12, color: '#6e6e73' }}>What did you ship? Add it to the Build Feed.</p>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#0071e3', fontWeight: 500, flexShrink: 0 }}>+ Post</span>
      </div>
    )
  }

  return (
    <div style={{ background: 'white', border: '1px solid #0071e3', borderRadius: 14, padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>Post a build</p>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aeaeb2', fontSize: 18, padding: 0, lineHeight: 1 }}>×</button>
      </div>

      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 8, padding: '0.6rem 0.875rem', marginBottom: '1rem', fontSize: 13, color: '#c00' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.3rem' }}>
            What did you ship? *
          </label>
          <input
            type="text"
            placeholder="e.g. AI contract reviewer for legal teams"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.3rem' }}>
            What problem does it solve?
          </label>
          <textarea
            placeholder="e.g. Lawyers spend 3hrs reviewing NDAs manually. This cuts it to 10 mins."
            value={problemSolved}
            onChange={e => setProblemSolved(e.target.value)}
            rows={2}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.3rem' }}>
            Built with
          </label>
          <input
            type="text"
            placeholder="e.g. Claude API, Next.js, Supabase"
            value={toolsUsed}
            onChange={e => setToolsUsed(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.3rem' }}>
              Time to build
            </label>
            <input
              type="text"
              placeholder="e.g. 4 hours"
              value={timeTaken}
              onChange={e => setTimeTaken(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.3rem' }}>
              Link (optional)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.3rem' }}>
            Describe what you built <span style={{ fontWeight: 400, color: '#aeaeb2' }}>(optional)</span>
          </label>
          <textarea
            placeholder="More detail about the build, how it works, outcomes..."
            value={whatBuilt}
            onChange={e => setWhatBuilt(e.target.value)}
            rows={2}
            style={inputStyle}
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !title.trim()}
        style={{ width: '100%', marginTop: '1.25rem', padding: '0.8rem', background: loading || !title.trim() ? '#d2d2d7' : '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 14, fontWeight: 500, cursor: loading || !title.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
        {loading ? 'Posting...' : 'Post to Build Feed'}
      </button>
    </div>
  )
}
