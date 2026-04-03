'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

type EmployerProfile = {
  id?: string
  email: string
  company_name?: string
  slug?: string
  about?: string
  what_they_build?: string
  location?: string
  team_size?: string
  website_url?: string
  linkedin_url?: string
  x_url?: string
  logo_url?: string
  industry?: string
  hiring_type?: string
  public?: boolean
}

const TEAM_SIZES = ['1-5', '6-20', '21-50', '51-200', '200+']
const INDUSTRIES = ['AI / Machine Learning', 'Software / SaaS', 'Fintech', 'Healthcare', 'Legal', 'Marketing / AdTech', 'E-commerce', 'Education', 'Real estate', 'Media / Content', 'Consulting', 'Other']
const HIRING_TYPES = ['Freelance', 'Full-time', 'Both']

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)
}

function Tag({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '0.35rem 0.75rem', borderRadius: 20, border: '1px solid', fontSize: 13,
      cursor: 'pointer', fontFamily: 'inherit',
      background: selected ? '#0071e3' : 'white',
      borderColor: selected ? '#0071e3' : '#d2d2d7',
      color: selected ? 'white' : '#1d1d1f',
    }}>{label}</button>
  )
}

export default function EmployerDashboardClient({
  email, renewsString, jobs, employerProfile: initial, applications,
}: {
  email: string
  renewsString: string
  jobs: any[]
  employerProfile: EmployerProfile | null
  applications: any[]
}) {
  const [profile, setProfile] = useState<EmployerProfile>(initial || { email, public: false })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [toggling, setToggling] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null)
  const [jobList, setJobList] = useState<any[]>(jobs)
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const isPublic = profile.public || false
  const hasProfile = !!initial?.id

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.7rem 1rem', border: '1px solid #d2d2d7', borderRadius: 10,
    fontSize: 14, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 500, marginBottom: '0.4rem', color: '#1d1d1f',
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    setError('')
    try {
      const canvas = document.createElement('canvas')
      const img = new Image()
      const url = URL.createObjectURL(file)
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = url })
      canvas.width = 200; canvas.height = 200
      const ctx = canvas.getContext('2d')!
      const size = Math.min(img.width, img.height)
      ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 200, 200)
      URL.revokeObjectURL(url)
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.85))
      const supabase = createClient()
      const fileName = `logo-${email.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, blob, { contentType: 'image/jpeg', upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
      setProfile(p => ({ ...p, logo_url: publicUrl }))
    } catch (e: any) {
      setError('Logo upload failed: ' + e.message)
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleToggle = async () => {
    if (!isPublic && !hasProfile) {
      setError('Save your company profile first before making it public.')
      document.getElementById('company-form')?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    if (!isPublic && !profile.company_name) {
      setError('Add a company name before making your profile public.')
      document.getElementById('company-form')?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    setToggling(true)
    try {
      const supabase = createClient()
      const newPublic = !isPublic
      if (hasProfile || initial) {
        await supabase.from('employer_profiles').update({ public: newPublic }).eq('email', email)
      } else {
        await supabase.from('employer_profiles').insert([{ email, public: newPublic }])
      }
      setProfile(p => ({ ...p, public: newPublic }))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setToggling(false)
    }
  }

  const handleSave = async () => {
    if (!profile.company_name?.trim()) { setError('Company name is required'); return }
    setSaving(true); setError(''); setSaved(false)
    try {
      const supabase = createClient()
      const slug = profile.slug || slugify(profile.company_name)
      const data = {
        email, company_name: profile.company_name, slug,
        about: profile.about, what_they_build: profile.what_they_build,
        location: profile.location, team_size: profile.team_size,
        website_url: profile.website_url, linkedin_url: profile.linkedin_url,
        x_url: profile.x_url, logo_url: profile.logo_url,
        industry: profile.industry, hiring_type: profile.hiring_type,
        public: profile.public || false,
      }
      if (hasProfile) {
        await supabase.from('employer_profiles').update(data).eq('email', email)
      } else {
        await supabase.from('employer_profiles').insert([data])
      }
      setProfile(p => ({ ...p, slug }))
      setSaved(true)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Delete this job listing? This cannot be undone.')) return
    setDeletingJobId(jobId)
    try {
      const supabase = createClient()
      await supabase.from('jobs').delete().eq('id', jobId).eq('employer_email', email)
      setJobList(prev => prev.filter(j => j.id !== jobId))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDeletingJobId(null)
    }
  }

  const getJobApplications = (jobId: string) => applications.filter(a => a.job_id === jobId)

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '3rem 1.5rem' }}>

        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.4rem' }}>Find and hire AI-native builders.</h1>
          <p style={{ fontSize: 15, color: '#6e6e73' }}>Full Access · active<span style={{ margin: '0 0.5rem', color: '#d2d2d7' }}>·</span>Renews {renewsString}</p>
        </div>

        <a href="/talent" style={{ display: 'block', background: '#0071e3', borderRadius: 18, padding: '2rem 2.5rem', textDecoration: 'none', marginBottom: '1rem' }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>Core product</p>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: 'white', letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>Search talent</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem' }}>Browse and contact verified AI-native builders directly. Ask Scout for instant matches.</p>
          <span style={{ display: 'inline-block', background: 'white', color: '#0071e3', padding: '0.6rem 1.25rem', borderRadius: 980, fontSize: 14, fontWeight: 600 }}>Browse talent →</span>
        </a>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
          <a href="/post-job" style={{ display: 'block', background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', textDecoration: 'none' }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6e6e73', marginBottom: '0.5rem' }}>Hiring</p>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: '0.3rem' }}>Post a job</h3>
            <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.5 }}>List a role and let builders apply directly.</p>
          </a>
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem' }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6e6e73', marginBottom: '0.5rem' }}>Active listings</p>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: '0.3rem' }}>{jobList.length} job{jobList.length !== 1 ? 's' : ''}</h3>
            <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.5 }}>{jobList.length > 0 ? jobList[0].role_title : 'No active listings yet.'}</p>
          </div>
        </div>

        {jobList.length > 0 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: '1rem', letterSpacing: '-0.01em' }}>Your job listings</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {jobList.map((job: any) => {
                const expires = new Date(job.expires_at)
                const daysLeft = Math.max(0, Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                const jobApps = getJobApplications(job.id)
                const isExpanded = expandedJobId === job.id
                return (
                  <div key={job.id} style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.2rem' }}>{job.role_title}</p>
                        <p style={{ fontSize: 13, color: '#6e6e73' }}>
                          {job.location} · {daysLeft} days left
                          {jobApps.length > 0 && (
                            <span style={{ marginLeft: 8, background: '#e8f0fe', color: '#1a56db', borderRadius: 10, padding: '0.1rem 0.5rem', fontSize: 12, fontWeight: 500 }}>
                              {jobApps.length} applicant{jobApps.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: 12, padding: '0.3rem 0.75rem', background: daysLeft <= 7 ? '#fff3e0' : '#e3f3e3', color: daysLeft <= 7 ? '#e65100' : '#1a7f37', borderRadius: 980, fontWeight: 500 }}>
                          {daysLeft <= 7 ? `${daysLeft}d left` : 'Active'}
                        </span>
                        {jobApps.length > 0 && (
                          <button onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                            style={{ fontSize: 12, padding: '0.3rem 0.75rem', background: '#f5f5f7', color: '#1d1d1f', border: 'none', borderRadius: 980, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                            {isExpanded ? 'Hide' : 'View'} applicants
                          </button>
                        )}
                        <a href={`/post-job?edit=${job.id}`}
                          style={{ fontSize: 12, padding: '0.3rem 0.75rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>
                          Edit
                        </a>
                        <button onClick={() => handleDeleteJob(job.id)} disabled={deletingJobId === job.id}
                          style={{ fontSize: 12, padding: '0.3rem 0.75rem', background: 'white', color: '#c00', border: '1px solid #ffd0d0', borderRadius: 980, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, opacity: deletingJobId === job.id ? 0.5 : 1 }}>
                          {deletingJobId === job.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                    {isExpanded && jobApps.length > 0 && (
                      <div style={{ borderTop: '1px solid #f0f0f5', background: '#fafafa', padding: '1rem 1.5rem' }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                          Applicants ({jobApps.length})
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {jobApps.map((app: any) => (
                            <div key={app.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', border: '1px solid #e0e0e5', borderRadius: 10, padding: '0.75rem 1rem' }}>
                              <div>
                                <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.1rem' }}>{app.builder_name || 'Builder'}</p>
                                <p style={{ fontSize: 12, color: '#6e6e73' }}>{app.builder_email} · Applied {new Date(app.created_at).toLocaleDateString()}</p>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {app.profile_id && (
                                  <a href={`/u/${app.profile_id}`} target="_blank"
                                    style={{ fontSize: 12, padding: '0.3rem 0.75rem', background: '#0071e3', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>
                                    View profile
                                  </a>
                                )}
                                <span style={{
                                  fontSize: 12, padding: '0.3rem 0.75rem', borderRadius: 980, fontWeight: 500,
                                  background: app.status === 'hired' ? '#e3f3e3' : app.status === 'contacted' ? '#e8f0fe' : '#f5f5f7',
                                  color: app.status === 'hired' ? '#1a7f37' : app.status === 'contacted' ? '#1a56db' : '#6e6e73',
                                }}>{app.status || 'Applied'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ borderTop: '0.5px solid #e0e0e5', paddingTop: '2rem', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em' }}>Company profile</h2>
              <p style={{ fontSize: 13, color: '#6e6e73', marginTop: '0.25rem' }}>
                {isPublic && profile.slug ? 'Public at shipstacked.com/company/' + profile.slug : 'Your profile is private — only you can see this.'}
              </p>
            </div>
            <button onClick={handleToggle} disabled={toggling}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: toggling ? 'not-allowed' : 'pointer', fontFamily: 'inherit', padding: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: isPublic ? '#1a7f37' : '#6e6e73' }}>{isPublic ? 'Public' : 'Private'}</span>
              <div style={{ width: 44, height: 26, borderRadius: 13, background: isPublic ? '#1a7f37' : '#d2d2d7', position: 'relative', transition: 'background 0.2s', opacity: toggling ? 0.6 : 1 }}>
                <div style={{ position: 'absolute', top: 3, left: isPublic ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
              </div>
            </button>
          </div>

          {isPublic && profile.slug && (
            <a href={'/company/' + profile.slug} target="_blank"
              style={{ display: 'inline-block', fontSize: 12, color: '#0071e3', textDecoration: 'none', marginBottom: '1.25rem', fontWeight: 500 }}>
              View public profile →
            </a>
          )}

          {error && <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: 14, color: '#c00' }}>{error}</div>}
          {saved && <div style={{ background: '#e3f3e3', border: '1px solid #b3e0b3', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: 14, color: '#1a7f37' }}>
            ✓ Profile saved.{profile.public && profile.slug ? ` Live at shipstacked.com/company/${profile.slug}` : ' Toggle public when ready to go live.'}
          </div>}

          <div id="company-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem' }}>

            <div>
              <label style={labelStyle}>Company logo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div onClick={() => logoInputRef.current?.click()}
                  style={{ width: 72, height: 72, borderRadius: 14, border: '1px solid #d2d2d7', background: '#f5f5f7', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {profile.logo_url ? <img src={profile.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 24 }}>🏢</span>}
                </div>
                <div>
                  <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}
                    style={{ fontSize: 13, padding: '0.4rem 0.9rem', background: '#f5f5f7', color: '#1d1d1f', border: '1px solid #d2d2d7', borderRadius: 980, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                    {uploadingLogo ? 'Uploading...' : profile.logo_url ? 'Change logo' : 'Upload logo'}
                  </button>
                  <p style={{ fontSize: 12, color: '#aeaeb2', marginTop: '0.3rem' }}>Square image recommended. JPG or PNG.</p>
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Company name *</label>
                <input type="text" placeholder="Acme Corp" value={profile.company_name || ''} onChange={e => setProfile(p => ({ ...p, company_name: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Location</label>
                <input type="text" placeholder="London, UK" value={profile.location || ''} onChange={e => setProfile(p => ({ ...p, location: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Industry</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {INDUSTRIES.map(ind => <Tag key={ind} label={ind} selected={profile.industry === ind} onClick={() => setProfile(p => ({ ...p, industry: ind }))} />)}
              </div>
            </div>

            <div>
              <label style={labelStyle}>About your company</label>
              <textarea placeholder="What does your company do?" value={profile.about || ''} onChange={e => setProfile(p => ({ ...p, about: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div>
              <label style={labelStyle}>What are you building with AI?</label>
              <textarea placeholder="We're using AI to automate legal document review..." value={profile.what_they_build || ''} onChange={e => setProfile(p => ({ ...p, what_they_build: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Hiring type</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {HIRING_TYPES.map(ht => <Tag key={ht} label={ht} selected={profile.hiring_type === ht} onClick={() => setProfile(p => ({ ...p, hiring_type: ht }))} />)}
                </div>
              </div>
            </div>


            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Team size</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TEAM_SIZES.map(size => <Tag key={size} label={size} selected={profile.team_size === size} onClick={() => setProfile(p => ({ ...p, team_size: size }))} />)}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Website</label>
                <input type="url" placeholder="https://yourcompany.com" value={profile.website_url || ''} onChange={e => setProfile(p => ({ ...p, website_url: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>LinkedIn</label>
                <input type="url" placeholder="https://linkedin.com/company/..." value={profile.linkedin_url || ''} onChange={e => setProfile(p => ({ ...p, linkedin_url: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>X (Twitter)</label>
                <input type="url" placeholder="https://x.com/yourcompany" value={profile.x_url || ''} onChange={e => setProfile(p => ({ ...p, x_url: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            <button onClick={handleSave} disabled={saving}
              style={{ padding: '0.75rem', background: saving ? '#d2d2d7' : '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 14, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', width: '100%' }}>
              {saving ? 'Saving...' : 'Save company profile'}
            </button>
          </div>
        </div>

        <div style={{ borderTop: '0.5px solid #e0e0e5', paddingTop: '2rem' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: '1rem', letterSpacing: '-0.01em' }}>Account</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 12, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '0.2rem' }}>Subscription</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>Full Access · $199/month</p>
              </div>
              <span style={{ fontSize: 12, padding: '0.3rem 0.75rem', background: '#e3f3e3', color: '#1a7f37', borderRadius: 980, fontWeight: 500 }}>Active</span>
            </div>
            <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 12, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '0.2rem' }}>Password</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>Update your password</p>
              </div>
              <a href="/reset-password" style={{ fontSize: 13, padding: '0.5rem 1rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>Reset</a>
            </div>
            <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 12, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '0.2rem' }}>Cancel subscription</p>
                <p style={{ fontSize: 14, color: '#1d1d1f' }}>You will keep access until {renewsString}.</p>
              </div>
              <form action="/api/employer/cancel" method="POST">
                <button type="submit" style={{ fontSize: 13, padding: '0.5rem 1rem', background: 'white', color: '#c00', border: '1px solid #ffd0d0', borderRadius: 980, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>Cancel</button>
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
