'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.75rem 1rem',
  border: '1px solid #d2d2d7', borderRadius: 10,
  fontSize: 15, outline: 'none', fontFamily: 'inherit',
  background: 'white', boxSizing: 'border-box'
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  marginBottom: '0.4rem', color: '#1d1d1f'
}

const hintStyle: React.CSSProperties = {
  fontSize: 12, color: '#6e6e73', marginTop: '0.3rem'
}

const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract', 'freelance']
const WORK_LOCATIONS = ['Remote', 'Hybrid', 'On-site']
const URGENCY_OPTIONS = ['Actively hiring', 'Hiring soon', 'Building pipeline']
const HIRING_FOR_OPTIONS = ['First AI hire', 'Growing AI team', 'Replacing existing role', 'Project-based']
const TIMEZONES = ['Any', 'UTC-8 to UTC-5 (Americas)', 'UTC-0 to UTC+2 (Europe/Africa)', 'UTC+5 to UTC+8 (Asia)', 'UTC+8 to UTC+12 (Asia-Pacific)']
const SKILLS = ['Claude API', 'Prompt engineering', 'Python', 'JavaScript', 'TypeScript', 'n8n', 'Make', 'Zapier', 'LangChain', 'RAG systems', 'Claude Code', 'Bolt / Lovable', 'Cursor', 'Automation', 'Content creation', 'Data analysis', 'Agent systems', 'Supabase', 'Next.js', 'React']

function Tag({ label, selected, onClick }: { label: string, selected: boolean, onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '0.4rem 0.9rem', borderRadius: 20, border: '1px solid', fontSize: 13,
      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
      background: selected ? '#0071e3' : 'white',
      borderColor: selected ? '#0071e3' : '#d2d2d7',
      color: selected ? 'white' : '#1d1d1f'
    }}>{label}</button>
  )
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>{children}</div>
    </div>
  )
}

export default function PostJobForm({ employerEmail, jobId, initialData }: {
  employerEmail: string
  jobId?: string
  initialData?: any
}) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  // Core fields
  const [companyName, setCompanyName] = useState(initialData?.company_name || '')
  const [roleTitle, setRoleTitle] = useState(initialData?.role_title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [requirements, setRequirements] = useState(initialData?.requirements || '')
  const [salaryRange, setSalaryRange] = useState(initialData?.salary_range || '')
  const [location, setLocation] = useState(initialData?.location || 'Remote')
  const [employmentType, setEmploymentType] = useState(initialData?.employment_type || 'full-time')
  const [selectedSkills, setSelectedSkills] = useState<string[]>(initialData?.skills || [])

  // Enhanced fields
  const [dayRate, setDayRate] = useState(initialData?.day_rate || '')
  const [timezone, setTimezone] = useState(initialData?.timezone || 'Any')
  const [urgency, setUrgency] = useState(initialData?.urgency || 'Actively hiring')
  const [hiringFor, setHiringFor] = useState(initialData?.hiring_for || '')
  const [anonymous, setAnonymous] = useState(initialData?.anonymous || false)

  const toggle = (val: string) => {
    setSelectedSkills(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val])
  }

  const handleSubmit = async () => {
    if (!companyName || !roleTitle || !description) {
      setError('Company name, role title and description are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const payload = {
        company_name: companyName,
        role_title: roleTitle,
        description,
        requirements,
        salary_range: salaryRange,
        location,
        employment_type: employmentType,
        skills: selectedSkills,
        day_rate: dayRate,
        timezone,
        urgency,
        hiring_for: hiringFor,
        anonymous,
      }

      if (jobId) {
        const { error: updateError } = await supabase
          .from('jobs').update(payload).eq('id', jobId).eq('employer_email', employerEmail)
        if (updateError) throw updateError
      } else {
        const expires = new Date()
        expires.setDate(expires.getDate() + 30)
        const { error: insertError } = await supabase
          .from('jobs').insert([{ employer_email: employerEmail, ...payload, status: 'active', expires_at: expires.toISOString() }])
        if (insertError) throw insertError
      }
      setDone(true)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 480, padding: '2rem', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, background: '#e3f3e3', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: 28, color: '#1a7f37', fontWeight: 700 }}>✓</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: '#1d1d1f' }}>
            {jobId ? 'Job updated.' : 'Job posted.'}
          </h1>
          <p style={{ color: '#6e6e73', fontSize: 15, marginBottom: '2rem', lineHeight: 1.6 }}>
            {jobId ? 'Your listing has been updated.' : 'Your listing is live for 30 days. Verified ShipStacked builders can now find and apply.'}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/employer" style={{ padding: '0.75rem 1.5rem', background: '#0071e3', color: 'white', borderRadius: 20, fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>View on dashboard →</a>
            <Link href="/jobs" style={{ padding: '0.75rem 1.5rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 20, fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>See public jobs board</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: '#1d1d1f' }}>
          {jobId ? 'Edit job' : 'Post a job'}
        </h1>
        <p style={{ color: '#6e6e73', fontSize: 15, marginBottom: '3rem' }}>
          {jobId ? 'Update your job listing.' : 'Your listing goes live immediately and runs for 30 days.'}
        </p>

        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: 14, color: '#c00' }}>
            {error}
          </div>
        )}

        <Section title="The role">
          <div>
            <label style={labelStyle}>Role title *</label>
            <input type="text" placeholder="AI Automation Engineer" value={roleTitle} onChange={e => setRoleTitle(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Company name *</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input type="text" placeholder="Acme Corp" value={companyName} onChange={e => setCompanyName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 13, color: '#6e6e73', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} style={{ width: 15, height: 15 }} />
                Post anonymously
              </label>
            </div>
            <p style={hintStyle}>Check to hide company name from builders until you message them.</p>
          </div>
          <div>
            <label style={labelStyle}>Employment type</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {EMPLOYMENT_TYPES.map(t => <Tag key={t} label={t} selected={employmentType === t} onClick={() => setEmploymentType(t)} />)}
            </div>
          </div>
          <div>
            <label style={labelStyle}>What is this hire for?</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {HIRING_FOR_OPTIONS.map(t => <Tag key={t} label={t} selected={hiringFor === t} onClick={() => setHiringFor(t)} />)}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Hiring urgency</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {URGENCY_OPTIONS.map(t => <Tag key={t} label={t} selected={urgency === t} onClick={() => setUrgency(t)} />)}
            </div>
          </div>
        </Section>

        <Section title="Description">
          <div>
            <label style={labelStyle}>Job description *</label>
            <textarea placeholder="Describe the role, what you're building, and what success looks like..." value={description} onChange={e => setDescription(e.target.value)} rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div>
            <label style={labelStyle}>Requirements</label>
            <textarea placeholder="What experience, skills or track record are you looking for?" value={requirements} onChange={e => setRequirements(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </Section>

        <Section title="Compensation and logistics">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Salary range</label>
              <input type="text" placeholder="e.g. $80k–$120k" value={salaryRange} onChange={e => setSalaryRange(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Day rate</label>
              <input type="text" placeholder="e.g. $500–$800/day" value={dayRate} onChange={e => setDayRate(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Location</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {WORK_LOCATIONS.map(t => <Tag key={t} label={t} selected={location === t} onClick={() => setLocation(t)} />)}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Timezone preference</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </Section>

        <Section title="Skills needed">
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button type="button" onClick={() => setSelectedSkills([...SKILLS])}
                style={{ fontSize: 12, padding: '0.3rem 0.75rem', background: selectedSkills.length === SKILLS.length ? '#e8f1fd' : '#f5f5f7', color: selectedSkills.length === SKILLS.length ? '#0071e3' : '#6e6e73', border: '1px solid', borderColor: selectedSkills.length === SKILLS.length ? '#b8d9f8' : '#e0e0e5', borderRadius: 980, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                {selectedSkills.length === SKILLS.length ? '✓ All selected' : 'Select all'}
              </button>
              {selectedSkills.length > 0 && (
                <button type="button" onClick={() => setSelectedSkills([])}
                  style={{ fontSize: 12, padding: '0.3rem 0.75rem', background: '#f5f5f7', color: '#6e6e73', border: '1px solid #e0e0e5', borderRadius: 980, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                  Clear ({selectedSkills.length})
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SKILLS.map(s => <Tag key={s} label={s} selected={selectedSkills.includes(s)} onClick={() => toggle(s)} />)}
            </div>
          </div>
        </Section>

        <button type="button" onClick={handleSubmit} disabled={loading}
          style={{ width: '100%', padding: '0.9rem', background: loading ? '#d2d2d7' : '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 15, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {loading ? 'Saving...' : jobId ? 'Save changes' : 'Post job'}
        </button>
      </div>
    </div>
  )
}
