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
  display: 'block', fontSize: 13, fontWeight: 500,
  marginBottom: '0.4rem', color: '#1d1d1f'
}

const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract', 'freelance']
const SKILLS = ['Claude API', 'Prompt engineering', 'Python', 'JavaScript', 'TypeScript', 'n8n', 'Make', 'Zapier', 'LangChain', 'RAG systems', 'Claude Code', 'Automation', 'Content creation', 'Data analysis', 'Agent systems']

function Tag({ label, selected, onClick }: { label: string, selected: boolean, onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '0.4rem 0.9rem', borderRadius: 20, border: '1px solid', fontSize: 13,
      cursor: 'pointer', fontFamily: 'inherit',
      background: selected ? '#0071e3' : 'white',
      borderColor: selected ? '#0071e3' : '#d2d2d7',
      color: selected ? 'white' : '#1d1d1f'
    }}>{label}</button>
  )
}

export default function PostJobForm({ employerEmail, jobId, initialData }: {
  employerEmail: string
  jobId?: string
  initialData?: {
    company_name: string
    role_title: string
    description: string
    requirements: string
    salary_range: string
    location: string
    employment_type: string
    skills: string[]
  }
}) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const [companyName, setCompanyName] = useState(initialData?.company_name || '')
  const [roleTitle, setRoleTitle] = useState(initialData?.role_title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [requirements, setRequirements] = useState(initialData?.requirements || '')
  const [salaryRange, setSalaryRange] = useState(initialData?.salary_range || '')
  const [location, setLocation] = useState(initialData?.location || 'Remote')
  const [employmentType, setEmploymentType] = useState(initialData?.employment_type || 'full-time')
  const [selectedSkills, setSelectedSkills] = useState<string[]>(initialData?.skills || [])

  const toggle = (val: string) => {
    setSelectedSkills(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val])
  }

  const handleSubmit = async () => {
    if (!companyName || !roleTitle || !description) {
      setError('Please fill in all required fields.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()

      if (jobId) {
        // Edit existing job
        const { error: updateError } = await supabase
          .from('jobs')
          .update({
            company_name: companyName,
            role_title: roleTitle,
            description,
            requirements,
            salary_range: salaryRange,
            location,
            employment_type: employmentType,
            skills: selectedSkills,
          })
          .eq('id', jobId)
          .eq('employer_email', employerEmail)

        if (updateError) throw updateError
      } else {
        // Create new job
        const expires = new Date()
        expires.setDate(expires.getDate() + 30)

        const { error: insertError } = await supabase
          .from('jobs')
          .insert([{
            employer_email: employerEmail,
            company_name: companyName,
            role_title: roleTitle,
            description,
            requirements,
            salary_range: salaryRange,
            location,
            employment_type: employmentType,
            skills: selectedSkills,
            status: 'active',
            expires_at: expires.toISOString()
          }])

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
            {jobId ? 'Your listing has been updated.' : 'Your listing is live for 30 days. Verified ShipStacked builders can now find and apply for your role.'}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/employer" style={{ padding: '0.75rem 1.5rem', background: '#0071e3', color: 'white', borderRadius: 20, fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>
              Back to dashboard
            </a>
            <Link href="/jobs" style={{ padding: '0.75rem 1.5rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 20, fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>
              View jobs board
            </Link>
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
          <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: 14, color: '#c00' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Company name *</label>
          <input type="text" placeholder="Acme Corp" value={companyName} onChange={e => setCompanyName(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Role title *</label>
          <input type="text" placeholder="AI Engineer" value={roleTitle} onChange={e => setRoleTitle(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Your email</label>
          <input type="email" value={employerEmail} disabled style={{ ...inputStyle, background: '#f5f5f7', color: '#6e6e73' }} />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Job description *</label>
          <textarea placeholder="Describe the role, responsibilities, and what you are building..." value={description} onChange={e => setDescription(e.target.value)} rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Requirements</label>
          <textarea placeholder="What experience or skills are you looking for?" value={requirements} onChange={e => setRequirements(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Salary range</label>
          <input type="text" placeholder="e.g. $80k–$120k or $50–$100/hr" value={salaryRange} onChange={e => setSalaryRange(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Location</label>
          <input type="text" placeholder="Remote" value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Employment type</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EMPLOYMENT_TYPES.map(t => (
              <Tag key={t} label={t} selected={employmentType === t} onClick={() => setEmploymentType(t)} />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={labelStyle}>Skills needed</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SKILLS.map(s => (
              <Tag key={s} label={s} selected={selectedSkills.includes(s)} onClick={() => toggle(s)} />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          style={{ width: '100%', padding: '0.9rem', background: loading ? '#d2d2d7' : '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 15, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {loading ? 'Saving...' : jobId ? 'Save changes' : 'Post job'}
        </button>
      </div>
    </div>
  )
}
