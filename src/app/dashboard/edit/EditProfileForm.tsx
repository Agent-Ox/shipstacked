'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const AVAILABILITY_OPTIONS = ['freelance', 'full-time', 'contract', 'part-time', 'open']
const PROFESSIONS = ['Developer', 'Designer', 'Product Manager', 'Consultant', 'Marketer', 'Operator', 'Founder', 'Other']
const SENIORITY_OPTIONS = ['Junior', 'Mid-level', 'Senior', 'Principal', 'Founder / Independent']
const WORK_TYPE_OPTIONS = ['Freelance', 'Full-time', 'Contract', 'Open to all']
const DAY_RATE_OPTIONS = ['Under $200/day', '$200-500/day', '$500-1000/day', '$1000+/day', 'Prefer not to say']
const TIMEZONES = ['UTC-8 (PST)', 'UTC-7 (MST)', 'UTC-6 (CST)', 'UTC-5 (EST)', 'UTC+0 (GMT)', 'UTC+1 (CET)', 'UTC+2 (EET)', 'UTC+3 (Moscow)', 'UTC+5:30 (IST)', 'UTC+8 (SGT/HKT)', 'UTC+9 (JST)', 'UTC+10 (AEST)', 'UTC+12 (NZST)']
const SPOKEN_LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Mandarin', 'Japanese', 'Arabic', 'Hindi', 'Italian', 'Dutch', 'Russian', 'Korean']
const LLMS = ['ChatGPT / GPT-4', 'Gemini', 'Mistral', 'Llama', 'Grok', 'Perplexity', 'Cohere', 'Other']
const LANGUAGES = ['Python', 'JavaScript', 'TypeScript', 'Ruby', 'Go', 'Rust', 'Java', 'C#', 'PHP', 'SQL', 'Swift', 'Kotlin']
const FRAMEWORKS = ['Next.js', 'React', 'Vue', 'LangChain', 'LlamaIndex', 'n8n', 'Make', 'Zapier', 'Supabase', 'Firebase', 'FastAPI', 'Node.js', 'Vercel', 'AWS', 'Docker']
const AI_TOOLS = ['Cursor', 'Replit', 'Bolt', 'Lovable', 'v0', 'Windsurf', 'Midjourney', 'ElevenLabs', 'Pinecone', 'Weaviate', 'Claude Code']
const DOMAINS = ['Legal', 'Healthcare', 'Finance', 'Marketing', 'Education', 'E-commerce', 'Real estate', 'HR', 'Customer support', 'Research', 'Media', 'Gaming']
const CLAUDE_USE_CASES = ['Automation and workflows', 'Content creation', 'Coding and development', 'Data analysis', 'Customer support', 'Research', 'Document processing', 'API integration', 'Agent systems', 'Education and training']

const MAX_PROJECTS = 5

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

function TagGroup({ label, items, selected, setSelected }: {
  label: string
  items: string[]
  selected: string[]
  setSelected: (v: string[]) => void
}) {
  const allSelected = items.every(i => selected.includes(i))

  const toggleItem = (val: string) => {
    setSelected(selected.includes(val) ? selected.filter(x => x !== val) : [...selected, val])
  }

  const toggleAll = () => {
    setSelected(allSelected ? [] : [...items])
  }

  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <label style={labelStyle}>{label}</label>
        <button
          type="button"
          onClick={toggleAll}
          style={{ fontSize: 12, color: '#0071e3', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, padding: 0 }}>
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {items.map(item => (
          <Tag key={item} label={item} selected={selected.includes(item)} onClick={() => toggleItem(item)} />
        ))}
      </div>
    </div>
  )
}

type Project = {
  id?: string
  title: string
  description: string
  prompt_approach: string
  outcome: string
  project_url: string
}

const emptyProject = (): Project => ({
  title: '', description: '', prompt_approach: '', outcome: '', project_url: ''
})

export default function EditProfileForm({ profile, projects: initialProjects, skills }: {
  profile: any
  projects: any[]
  skills: any[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '')
  const [avatarUploading, setAvatarUploading] = useState(false)

  const byCategory = (cat: string) => skills.filter(s => s.category === cat).map(s => s.name)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Please use a JPG, PNG or WebP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Please use an image under 5MB.')
      return
    }

    setAvatarUploading(true)
    setError('')
    try {
      // Resize to 400x400 client-side before upload
      const resized = await new Promise<Blob>((resolve, reject) => {
        const img = new Image()
        const objectUrl = URL.createObjectURL(file)
        img.onload = () => {
          const MAX = 400
          let w = img.width
          let h = img.height
          if (w > h) { h = Math.round(h * MAX / w); w = MAX }
          else { w = Math.round(w * MAX / h); h = MAX }
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, w, h)
          URL.revokeObjectURL(objectUrl)
          canvas.toBlob(
            blob => blob ? resolve(blob) : reject(new Error('Resize failed')),
            'image/jpeg',
            0.85
          )
        }
        img.onerror = reject
        img.src = objectUrl
      })

      const fd = new FormData()
      fd.append('file', new File([resized], 'avatar.jpg', { type: 'image/jpeg' }))
      const res = await fetch('/api/avatar', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) {
        setAvatarUrl(data.url)
      } else {
        setError(data.error || 'Upload failed')
      }
    } catch {
      setError('Upload failed. Please try again.')
    }
    setAvatarUploading(false)
  }

  const [fullName, setFullName] = useState(profile.full_name || '')
  const [role, setRole] = useState(profile.role || '')
  const [location, setLocation] = useState(profile.location || '')
  const [availability, setAvailability] = useState(profile.availability || 'freelance')
  const [primaryProfession, setPrimaryProfession] = useState(profile.primary_profession || '')
  const [seniority, setSeniority] = useState(profile.seniority || '')
  const [workType, setWorkType] = useState(profile.work_type || '')
  const [dayRate, setDayRate] = useState(profile.day_rate || '')
  const [timezone, setTimezone] = useState(profile.timezone || '')
  const [spokenLanguages, setSpokenLanguages] = useState<string[]>(profile.languages || [])
  const [bio, setBio] = useState(profile.bio || '')
  const [about, setAbout] = useState(profile.about || '')
  const [githubUrl, setGithubUrl] = useState(profile.github_url || '')
  const [xUrl, setXUrl] = useState(profile.x_url || '')
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedin_url || '')
  const [websiteUrl, setWebsiteUrl] = useState(profile.website_url || '')

  const [projectsList, setProjectsList] = useState<Project[]>(
    initialProjects.length > 0
      ? initialProjects.slice(0, MAX_PROJECTS).map(p => ({
          id: p.id,
          title: p.title || '',
          description: p.description || '',
          prompt_approach: p.prompt_approach || '',
          outcome: p.outcome || '',
          project_url: p.project_url || '',
        }))
      : [emptyProject()]
  )

  const [selectedUseCases, setSelectedUseCases] = useState<string[]>(byCategory('claude_use_case'))
  const [selectedLLMs, setSelectedLLMs] = useState<string[]>(byCategory('llm'))
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(byCategory('language'))
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>(byCategory('framework'))
  const [selectedAITools, setSelectedAITools] = useState<string[]>(byCategory('ai_tool'))
  const [selectedDomains, setSelectedDomains] = useState<string[]>(byCategory('domain'))

  const updateProject = (index: number, field: keyof Project, value: string) => {
    setProjectsList(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  const addProject = () => {
    if (projectsList.length < MAX_PROJECTS) {
      setProjectsList(prev => [...prev, emptyProject()])
    }
  }

  const removeProject = (index: number) => {
    setProjectsList(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setLoading(true)
    setError('')
    setSaved(false)
    try {
      const supabase = createClient()

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName, role, location, availability, bio, about,
          github_url: githubUrl, x_url: xUrl, linkedin_url: linkedinUrl, website_url: websiteUrl,
          primary_profession: primaryProfession,
          seniority,
          work_type: workType,
          day_rate: dayRate,
          timezone,
          languages: spokenLanguages.length > 0 ? spokenLanguages : null,
        })
        .eq('id', profile.id)

      if (profileError) throw profileError

      // Delete all existing projects then re-insert
      await supabase.from('projects').delete().eq('profile_id', profile.id)

      const validProjects = projectsList.filter(p => p.title.trim())
      if (validProjects.length > 0) {
        await supabase.from('projects').insert(
          validProjects.map((p, i) => ({
            profile_id: profile.id,
            title: p.title,
            description: p.description,
            prompt_approach: p.prompt_approach,
            outcome: p.outcome,
            project_url: p.project_url,
            display_order: i,
          }))
        )
      }

      // Replace all skills
      await supabase.from('skills').delete().eq('profile_id', profile.id)
      const newSkills = [
        ...selectedUseCases.map(name => ({ profile_id: profile.id, category: 'claude_use_case', name })),
        ...selectedLLMs.map(name => ({ profile_id: profile.id, category: 'llm', name })),
        ...selectedLanguages.map(name => ({ profile_id: profile.id, category: 'language', name })),
        ...selectedFrameworks.map(name => ({ profile_id: profile.id, category: 'framework', name })),
        ...selectedAITools.map(name => ({ profile_id: profile.id, category: 'ai_tool', name })),
        ...selectedDomains.map(name => ({ profile_id: profile.id, category: 'domain', name })),
      ]
      if (newSkills.length > 0) await supabase.from('skills').insert(newSkills)

      setSaved(true)
      router.refresh()
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: '#1d1d1f' }}>Edit profile</h1>
        <p style={{ color: '#6e6e73', fontSize: 15, marginBottom: '3rem' }}>Changes appear on your public profile immediately.</p>

        {error && <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: 14, color: '#c00' }}>{error}</div>}
        {saved && <div style={{ background: '#e3f3e3', border: '1px solid #b3e0b3', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: 14, color: '#1a7f37' }}>✓ Profile saved successfully.</div>}

        {/* Basics */}
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e0e0e5' }}>Basics</h2>

        {/* Avatar upload */}
        <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: '#e8f1fd', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 24, fontWeight: 700, color: '#0071e3' }}>
                {fullName ? fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '?'}
              </span>
            )}
          </div>
          <div>
            <label style={{ display: 'inline-block', padding: '0.5rem 1rem', background: avatarUploading ? '#d2d2d7' : '#f5f5f7', color: '#1d1d1f', borderRadius: 980, fontSize: 13, fontWeight: 500, cursor: avatarUploading ? 'not-allowed' : 'pointer' }}>
              {avatarUploading ? 'Uploading...' : avatarUrl ? 'Change photo' : 'Upload photo'}
              <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} disabled={avatarUploading} />
            </label>
            <p style={{ fontSize: 12, color: '#6e6e73', marginTop: '0.4rem' }}>JPG, PNG or WebP. Max 5MB.</p>
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Full name</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Email</label>
          <input type="email" value={profile.email} disabled style={{ ...inputStyle, background: '#f5f5f7', color: '#6e6e73' }} />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Role / title</label>
          <input type="text" value={role} onChange={e => setRole(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Location</label>
          <input type="text" value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Availability</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AVAILABILITY_OPTIONS.map(opt => (
              <Tag key={opt} label={opt} selected={availability === opt} onClick={() => setAvailability(opt)} />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Primary profession</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PROFESSIONS.map(opt => (
              <Tag key={opt} label={opt} selected={primaryProfession === opt} onClick={() => setPrimaryProfession(opt)} />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Seniority</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SENIORITY_OPTIONS.map(opt => (
              <Tag key={opt} label={opt} selected={seniority === opt} onClick={() => setSeniority(opt)} />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Work type preference</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {WORK_TYPE_OPTIONS.map(opt => (
              <Tag key={opt} label={opt} selected={workType === opt} onClick={() => setWorkType(opt)} />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Day rate <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {DAY_RATE_OPTIONS.map(opt => (
              <Tag key={opt} label={opt} selected={dayRate === opt} onClick={() => setDayRate(opt)} />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Timezone</label>
          <select value={timezone} onChange={e => setTimezone(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #d2d2d7', borderRadius: 10, fontSize: 15, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' as const }}>
            <option value="">Select timezone</option>
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={labelStyle}>Languages spoken <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SPOKEN_LANGUAGES.map(lang => (
              <Tag key={lang} label={lang} selected={spokenLanguages.includes(lang)} onClick={() => setSpokenLanguages(spokenLanguages.includes(lang) ? spokenLanguages.filter(l => l !== lang) : [...spokenLanguages, lang])} />
            ))}
          </div>
        </div>

        {/* About */}
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e0e0e5' }}>About</h2>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>One-line bio</label>
          <input type="text" value={bio} onChange={e => setBio(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '2rem' }}>
          <label style={labelStyle}>What do you build with AI?</label>
          <textarea value={about} onChange={e => setAbout(e.target.value)} rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {/* Projects */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e0e0e5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f' }}>Projects ({projectsList.length}/{MAX_PROJECTS})</h2>
          {projectsList.length < MAX_PROJECTS && (
            <button type="button" onClick={addProject} style={{ fontSize: 13, color: '#0071e3', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, padding: 0 }}>
              + Add project
            </button>
          )}
        </div>

        {projectsList.map((p, index) => (
          <div key={index} style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#6e6e73' }}>Project {index + 1}</p>
              {projectsList.length > 1 && (
                <button type="button" onClick={() => removeProject(index)} style={{ fontSize: 12, color: '#c00', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                  Remove
                </button>
              )}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Project title</label>
              <input type="text" value={p.title} onChange={e => updateProject(index, 'title', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>What did you build?</label>
              <textarea value={p.description} onChange={e => updateProject(index, 'description', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>How did you use AI?</label>
              <textarea value={p.prompt_approach} onChange={e => updateProject(index, 'prompt_approach', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Outcome</label>
              <input type="text" value={p.outcome} onChange={e => updateProject(index, 'outcome', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Project URL</label>
              <input type="url" value={p.project_url} onChange={e => updateProject(index, 'project_url', e.target.value)} style={inputStyle} />
            </div>
          </div>
        ))}

        {/* Skills */}
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', margin: '2rem 0 1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e0e0e5' }}>Skills</h2>

        <TagGroup label="AI use cases" items={CLAUDE_USE_CASES} selected={selectedUseCases} setSelected={setSelectedUseCases} />
        <TagGroup label="Other LLMs" items={LLMS} selected={selectedLLMs} setSelected={setSelectedLLMs} />
        <TagGroup label="Coding languages" items={LANGUAGES} selected={selectedLanguages} setSelected={setSelectedLanguages} />
        <TagGroup label="Frameworks and tools" items={FRAMEWORKS} selected={selectedFrameworks} setSelected={setSelectedFrameworks} />
        <TagGroup label="AI-native platforms" items={AI_TOOLS} selected={selectedAITools} setSelected={setSelectedAITools} />
        <TagGroup label="Domain expertise" items={DOMAINS} selected={selectedDomains} setSelected={setSelectedDomains} />

        {/* Links */}
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e0e0e5' }}>Links</h2>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>GitHub</label>
          <input type="url" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>X / Twitter</label>
          <input type="url" value={xUrl} onChange={e => setXUrl(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>LinkedIn</label>
          <input type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '2rem' }}>
          <label style={labelStyle}>Personal website</label>
          <input type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} style={inputStyle} />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          style={{ width: '100%', padding: '0.9rem', background: loading ? '#d2d2d7' : '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 15, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {loading ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
