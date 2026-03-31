'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const AVAILABILITY_OPTIONS = ['freelance', 'full-time', 'contract', 'part-time', 'open']
const LLMS = ['ChatGPT / GPT-4', 'Gemini', 'Mistral', 'Llama', 'Grok', 'Perplexity', 'Cohere', 'Other']
const LANGUAGES = ['Python', 'JavaScript', 'TypeScript', 'Ruby', 'Go', 'Rust', 'Java', 'C#', 'PHP', 'SQL', 'Swift', 'Kotlin']
const FRAMEWORKS = ['Next.js', 'React', 'Vue', 'LangChain', 'LlamaIndex', 'n8n', 'Make', 'Zapier', 'Supabase', 'Firebase', 'FastAPI', 'Node.js', 'Vercel', 'AWS', 'Docker']
const AI_TOOLS = ['Cursor', 'Replit', 'Bolt', 'Lovable', 'v0', 'Windsurf', 'Midjourney', 'ElevenLabs', 'Pinecone', 'Weaviate', 'Claude Code']
const DOMAINS = ['Legal', 'Healthcare', 'Finance', 'Marketing', 'Education', 'E-commerce', 'Real estate', 'HR', 'Customer support', 'Research', 'Media', 'Gaming']
const CLAUDE_USE_CASES = ['Automation and workflows', 'Content creation', 'Coding and development', 'Data analysis', 'Customer support', 'Research', 'Document processing', 'API integration', 'Agent systems', 'Education and training']

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

export default function EditProfileForm({ profile, projects, skills }: {
  profile: any
  projects: any[]
  skills: any[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const byCategory = (cat: string) => skills.filter(s => s.category === cat).map(s => s.name)

  const [fullName, setFullName] = useState(profile.full_name || '')
  const [role, setRole] = useState(profile.role || '')
  const [location, setLocation] = useState(profile.location || '')
  const [availability, setAvailability] = useState(profile.availability || 'freelance')
  const [bio, setBio] = useState(profile.bio || '')
  const [about, setAbout] = useState(profile.about || '')
  const [githubUrl, setGithubUrl] = useState(profile.github_url || '')
  const [xUrl, setXUrl] = useState(profile.x_url || '')
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedin_url || '')
  const [websiteUrl, setWebsiteUrl] = useState(profile.website_url || '')

  const firstProject = projects[0]
  const [projectTitle, setProjectTitle] = useState(firstProject?.title || '')
  const [projectDesc, setProjectDesc] = useState(firstProject?.description || '')
  const [projectPrompt, setProjectPrompt] = useState(firstProject?.prompt_approach || '')
  const [projectOutcome, setProjectOutcome] = useState(firstProject?.outcome || '')
  const [projectUrl, setProjectUrl] = useState(firstProject?.project_url || '')

  const [selectedUseCases, setSelectedUseCases] = useState<string[]>(byCategory('claude_use_case'))
  const [selectedLLMs, setSelectedLLMs] = useState<string[]>(byCategory('llm'))
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(byCategory('language'))
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>(byCategory('framework'))
  const [selectedAITools, setSelectedAITools] = useState<string[]>(byCategory('ai_tool'))
  const [selectedDomains, setSelectedDomains] = useState<string[]>(byCategory('domain'))

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  const handleSave = async () => {
    setLoading(true)
    setError('')
    setSaved(false)
    try {
      const supabase = createClient()

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          role,
          location,
          availability,
          bio,
          about,
          github_url: githubUrl,
          x_url: xUrl,
          linkedin_url: linkedinUrl,
          website_url: websiteUrl,
        })
        .eq('id', profile.id)

      if (profileError) throw profileError

      // Update or insert first project
      if (projectTitle) {
        if (firstProject) {
          await supabase.from('projects').update({
            title: projectTitle,
            description: projectDesc,
            prompt_approach: projectPrompt,
            outcome: projectOutcome,
            project_url: projectUrl,
          }).eq('id', firstProject.id)
        } else {
          await supabase.from('projects').insert([{
            profile_id: profile.id,
            title: projectTitle,
            description: projectDesc,
            prompt_approach: projectPrompt,
            outcome: projectOutcome,
            project_url: projectUrl,
          }])
        }
      }

      // Replace all skills — delete then re-insert
      await supabase.from('skills').delete().eq('profile_id', profile.id)

      const newSkills = [
        ...selectedUseCases.map(name => ({ profile_id: profile.id, category: 'claude_use_case', name })),
        ...selectedLLMs.map(name => ({ profile_id: profile.id, category: 'llm', name })),
        ...selectedLanguages.map(name => ({ profile_id: profile.id, category: 'language', name })),
        ...selectedFrameworks.map(name => ({ profile_id: profile.id, category: 'framework', name })),
        ...selectedAITools.map(name => ({ profile_id: profile.id, category: 'ai_tool', name })),
        ...selectedDomains.map(name => ({ profile_id: profile.id, category: 'domain', name })),
      ]

      if (newSkills.length > 0) {
        await supabase.from('skills').insert(newSkills)
      }

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
      <nav style={{ borderBottom: '0.5px solid #e0e0e5', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em' }}>
          ClaudHire<span style={{ color: '#0071e3' }}>.</span>
        </a>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <a href="/dashboard" style={{ fontSize: 13, color: '#6e6e73', textDecoration: 'none' }}>← Dashboard</a>
          <a href={`/u/${profile.username}`} target="_blank" style={{ fontSize: 13, color: '#0071e3', textDecoration: 'none' }}>View profile →</a>
        </div>
      </nav>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: '#1d1d1f' }}>Edit profile</h1>
        <p style={{ color: '#6e6e73', fontSize: 15, marginBottom: '3rem' }}>Changes are saved instantly and appear on your public profile.</p>

        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: 14, color: '#c00' }}>
            {error}
          </div>
        )}

        {saved && (
          <div style={{ background: '#e3f3e3', border: '1px solid #b3e0b3', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: 14, color: '#1a7f37' }}>
            ✓ Profile saved successfully.
          </div>
        )}

        {/* Basics */}
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e0e0e5' }}>Basics</h2>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Full name</label>
          <input autoComplete="name" type="text" value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Email</label>
          <input type="email" value={profile.email} disabled style={{ ...inputStyle, background: '#f5f5f7', color: '#6e6e73' }} />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Role / title</label>
          <input autoComplete="organization-title" type="text" value={role} onChange={e => setRole(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Location</label>
          <input autoComplete="off" type="text" value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '2rem' }}>
          <label style={labelStyle}>Availability</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AVAILABILITY_OPTIONS.map(opt => (
              <Tag key={opt} label={opt} selected={availability === opt} onClick={() => setAvailability(opt)} />
            ))}
          </div>
        </div>

        {/* About */}
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e0e0e5' }}>About</h2>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>One-line bio</label>
          <input autoComplete="off" type="text" value={bio} onChange={e => setBio(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '2rem' }}>
          <label style={labelStyle}>What do you build with Claude?</label>
          <textarea autoComplete="off" value={about} onChange={e => setAbout(e.target.value)} rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {/* Project */}
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e0e0e5' }}>Featured project</h2>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Project title</label>
          <input autoComplete="off" type="text" value={projectTitle} onChange={e => setProjectTitle(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>What did you build?</label>
          <textarea autoComplete="off" value={projectDesc} onChange={e => setProjectDesc(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>How did you use Claude?</label>
          <textarea autoComplete="off" value={projectPrompt} onChange={e => setProjectPrompt(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Outcome</label>
          <input autoComplete="off" type="text" value={projectOutcome} onChange={e => setProjectOutcome(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '2rem' }}>
          <label style={labelStyle}>Project URL</label>
          <input autoComplete="off" type="url" value={projectUrl} onChange={e => setProjectUrl(e.target.value)} style={inputStyle} />
        </div>

        {/* Skills */}
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e0e0e5' }}>Skills</h2>

        {[
          { label: 'Claude use cases', items: CLAUDE_USE_CASES, selected: selectedUseCases, setSelected: setSelectedUseCases },
          { label: 'Other LLMs', items: LLMS, selected: selectedLLMs, setSelected: setSelectedLLMs },
          { label: 'Coding languages', items: LANGUAGES, selected: selectedLanguages, setSelected: setSelectedLanguages },
          { label: 'Frameworks and tools', items: FRAMEWORKS, selected: selectedFrameworks, setSelected: setSelectedFrameworks },
          { label: 'AI-native platforms', items: AI_TOOLS, selected: selectedAITools, setSelected: setSelectedAITools },
          { label: 'Domain expertise', items: DOMAINS, selected: selectedDomains, setSelected: setSelectedDomains },
        ].map(({ label, items, selected, setSelected }) => (
          <div key={label} style={{ marginBottom: '1.75rem' }}>
            <label style={labelStyle}>{label}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {items.map(item => (
                <Tag key={item} label={item} selected={selected.includes(item)} onClick={() => toggle(selected, setSelected, item)} />
              ))}
            </div>
          </div>
        ))}

        {/* Links */}
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e0e0e5' }}>Links</h2>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>GitHub</label>
          <input autoComplete="off" type="url" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>X / Twitter</label>
          <input autoComplete="off" type="url" value={xUrl} onChange={e => setXUrl(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>LinkedIn</label>
          <input autoComplete="off" type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '2rem' }}>
          <label style={labelStyle}>Personal website</label>
          <input autoComplete="off" type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} style={inputStyle} />
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