'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Skill } from '@/lib/types'

const STEPS = ['Basics', 'About', 'Your AI work', 'Your stack', 'Links', 'Done']
const AVAILABILITY_OPTIONS = ['freelance', 'full-time', 'contract', 'part-time', 'open']
const LLMS = ['ChatGPT / GPT-4', 'Gemini', 'Mistral', 'Llama', 'Grok', 'Perplexity', 'Cohere', 'Other']
const LANGUAGES = ['Python', 'JavaScript', 'TypeScript', 'Ruby', 'Go', 'Rust', 'Java', 'C#', 'PHP', 'SQL', 'Swift', 'Kotlin']
const FRAMEWORKS = ['Next.js', 'React', 'Vue', 'LangChain', 'LlamaIndex', 'n8n', 'Make', 'Zapier', 'Supabase', 'Firebase', 'FastAPI', 'Node.js', 'Vercel', 'AWS', 'Docker']
const AI_TOOLS = ['Cursor', 'Replit', 'Bolt', 'Lovable', 'v0', 'Windsurf', 'Midjourney', 'ElevenLabs', 'Pinecone', 'Weaviate', 'Claude Code']
const DOMAINS = ['Legal', 'Healthcare', 'Finance', 'Marketing', 'Education', 'E-commerce', 'Real estate', 'HR', 'Customer support', 'Research', 'Media', 'Gaming']
const CLAUDE_USE_CASES = ['Automation and workflows', 'Content creation', 'Coding and development', 'Data analysis', 'Customer support', 'Research', 'Document processing', 'API integration', 'Agent systems', 'Education and training']
const PROFESSIONS = ['Developer', 'Designer', 'Product Manager', 'Consultant', 'Marketer', 'Operator', 'Founder', 'Other']
const SENIORITY_OPTIONS = ['Junior', 'Mid-level', 'Senior', 'Principal', 'Founder / Independent']
const WORK_TYPE_OPTIONS = ['Freelance', 'Full-time', 'Contract', 'Open to all']
const DAY_RATE_OPTIONS = ['Under $200/day', '$200-500/day', '$500-1000/day', '$1000+/day', 'Prefer not to say']
const TIMEZONES = ['UTC-8 (PST)', 'UTC-7 (MST)', 'UTC-6 (CST)', 'UTC-5 (EST)', 'UTC+0 (GMT)', 'UTC+1 (CET)', 'UTC+2 (EET)', 'UTC+3 (Moscow)', 'UTC+5:30 (IST)', 'UTC+8 (SGT/HKT)', 'UTC+9 (JST)', 'UTC+10 (AEST)', 'UTC+12 (NZST)']
const SPOKEN_LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Mandarin', 'Japanese', 'Arabic', 'Hindi', 'Italian', 'Dutch', 'Russian', 'Korean']

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  border: '1px solid #d2d2d7',
  borderRadius: 10,
  fontSize: 15,
  outline: 'none',
  fontFamily: 'inherit',
  background: 'white',
  boxSizing: 'border-box'
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  marginBottom: '0.4rem',
  color: '#1d1d1f'
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

export default function JoinPage() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [authUserId, setAuthUserId] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('')
  const [availability, setAvailability] = useState('freelance')
  const [primaryProfession, setPrimaryProfession] = useState('')
  const [seniority, setSeniority] = useState('')
  const [workType, setWorkType] = useState('')
  const [dayRate, setDayRate] = useState('')
  const [timezone, setTimezone] = useState('')
  const [spokenLanguages, setSpokenLanguages] = useState<string[]>([])
  const [bio, setBio] = useState('')
  const [about, setAbout] = useState('')

  const [projectTitle, setProjectTitle] = useState('')
  const [projectDesc, setProjectDesc] = useState('')
  const [projectPrompt, setProjectPrompt] = useState('')
  const [projectOutcome, setProjectOutcome] = useState('')
  const [projectUrl, setProjectUrl] = useState('')

  const [githubUrl, setGithubUrl] = useState('')
  const [xUrl, setXUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')

  const [selectedLLMs, setSelectedLLMs] = useState<string[]>([])
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([])
  const [selectedAITools, setSelectedAITools] = useState<string[]>([])
  const [selectedDomains, setSelectedDomains] = useState<string[]>([])
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([])

  // On mount — require auth session. If no session, send to /signup.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.href = '/signup'
        return
      }
      setAuthUserId(user.id)
      if (user.email) setEmail(user.email)
      setChecking(false)
    })
  }, [])

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  const generateUsername = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 999)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const slug = generateUsername(fullName)
      setUsername(slug)

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert([{
          full_name: fullName,
          email,
          username: slug,
          role,
          location,
          availability,
          bio,
          about,
          github_url: githubUrl,
          x_url: xUrl,
          linkedin_url: linkedinUrl,
          website_url: websiteUrl,
          primary_profession: primaryProfession,
          seniority,
          work_type: workType,
          day_rate: dayRate,
          timezone,
          languages: spokenLanguages.length > 0 ? spokenLanguages : null,
          verified: false,
          published: true,
          ...(authUserId && { user_id: authUserId }),
        }])
        .select()
        .single()

      if (profileError) throw profileError

      if (projectTitle) {
        await supabase.from('projects').insert([{
          profile_id: profileData.id,
          title: projectTitle,
          description: projectDesc,
          prompt_approach: projectPrompt,
          outcome: projectOutcome,
          project_url: projectUrl
        }])
      }

      const skills: Partial<Skill>[] = [
        ...selectedUseCases.map(name => ({ profile_id: profileData.id, category: 'claude_use_case', name })),
        ...selectedLLMs.map(name => ({ profile_id: profileData.id, category: 'llm', name })),
        ...selectedLanguages.map(name => ({ profile_id: profileData.id, category: 'language', name })),
        ...selectedFrameworks.map(name => ({ profile_id: profileData.id, category: 'framework', name })),
        ...selectedAITools.map(name => ({ profile_id: profileData.id, category: 'ai_tool', name })),
        ...selectedDomains.map(name => ({ profile_id: profileData.id, category: 'domain', name })),
      ]

      if (skills.length > 0) {
        await supabase.from('skills').insert(skills)
      }

      // Upgrade client role to builder if needed
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser?.user_metadata?.role === 'client') {
        await supabase.auth.updateUser({ data: { role: 'builder' } })
      }

      await fetch('/api/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: fullName, username: slug })
      })

      setStep(5)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const canProceed = () => {
    if (step === 0) return fullName && email && role
    if (step === 1) return bio
    return true
  }

  // Show nothing while checking auth — prevents flash of form before redirect
  if (checking) {
    return (
      <div style={{ minHeight: '100vh', background: '#fbfbfd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #e0e0e5', borderTopColor: '#0071e3', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1.5rem' }}>

        <a href="/" style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em' }}>
          ShipStacked<span style={{ color: '#0071e3' }}>.</span>
        </a>

        {step < 5 && (
          <div style={{ margin: '2rem 0' }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: '0.5rem' }}>
              {STEPS.slice(0, 5).map((s, i) => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? '#0071e3' : '#e0e0e5' }} />
              ))}
            </div>
            <p style={{ fontSize: 13, color: '#6e6e73' }}>Step {step + 1} of 5 — {STEPS[step]}</p>
          </div>
        )}

        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: 14, color: '#c00' }}>
            {error}
          </div>
        )}

        {step === 0 && (
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>The basics</h1>
            <p style={{ color: '#6e6e73', marginBottom: '2rem', fontSize: 15 }}>Tell us who you are and what you do.</p>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Full name</label>
              <input autoComplete="name" type="text" placeholder="Sara Rodriguez" value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Email</label>
              <input
                autoComplete="email"
                type="email"
                placeholder="sara@example.com"
                value={email}
                disabled={true}
                style={{ ...inputStyle, background: '#f5f5f7', color: '#6e6e73' }}
              />
              <p style={{ fontSize: 12, color: '#6e6e73', marginTop: '0.3rem' }}>Linked to your account.</p>
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Role / title</label>
              <input autoComplete="organization-title" type="text" placeholder="AI Automation Engineer" value={role} onChange={e => setRole(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Location</label>
              <input autoComplete="off" type="text" placeholder="Barcelona, Spain" value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Availability</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {AVAILABILITY_OPTIONS.map(opt => (
                  <Tag key={opt} label={opt} selected={availability === opt} onClick={() => setAvailability(opt)} />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Primary profession</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PROFESSIONS.map(opt => (
                  <Tag key={opt} label={opt} selected={primaryProfession === opt} onClick={() => setPrimaryProfession(opt)} />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Seniority</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SENIORITY_OPTIONS.map(opt => (
                  <Tag key={opt} label={opt} selected={seniority === opt} onClick={() => setSeniority(opt)} />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Work type preference</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {WORK_TYPE_OPTIONS.map(opt => (
                  <Tag key={opt} label={opt} selected={workType === opt} onClick={() => setWorkType(opt)} />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Day rate <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {DAY_RATE_OPTIONS.map(opt => (
                  <Tag key={opt} label={opt} selected={dayRate === opt} onClick={() => setDayRate(opt)} />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Timezone</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #d2d2d7', borderRadius: 10, fontSize: 15, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' as const }}>
                <option value="">Select timezone</option>
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Languages spoken <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SPOKEN_LANGUAGES.map(lang => (
                  <Tag key={lang} label={lang} selected={spokenLanguages.includes(lang)} onClick={() => setSpokenLanguages(spokenLanguages.includes(lang) ? spokenLanguages.filter(l => l !== lang) : [...spokenLanguages, lang])} />
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>About you</h1>
            <p style={{ color: '#6e6e73', marginBottom: '2rem', fontSize: 15 }}>This is what employers see first.</p>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>One-line bio</label>
              <input autoComplete="off" type="text" placeholder="Builds AI-powered automation tools for healthcare teams" value={bio} onChange={e => setBio(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>What do you build with AI?</label>
              <textarea autoComplete="off" placeholder="Describe your AI work, what problems you solve, who you have worked with..." value={about} onChange={e => setAbout(e.target.value)} rows={5}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>Your AI work</h1>
            <p style={{ color: '#6e6e73', marginBottom: '1.5rem', fontSize: 15 }}>Show one real project. This is your proof.</p>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>How do you primarily use AI?</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CLAUDE_USE_CASES.map(uc => (
                  <Tag key={uc} label={uc} selected={selectedUseCases.includes(uc)} onClick={() => toggle(selectedUseCases, setSelectedUseCases, uc)} />
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Project title</label>
              <input autoComplete="off" type="text" placeholder="e.g. Automated reporting pipeline" value={projectTitle} onChange={e => setProjectTitle(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>What did you build?</label>
              <textarea autoComplete="off" placeholder="Describe what the project does and the problem it solves" value={projectDesc} onChange={e => setProjectDesc(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>How did you use AI?</label>
              <textarea autoComplete="off" placeholder="Describe your prompting approach and how you structured the workflow" value={projectPrompt} onChange={e => setProjectPrompt(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>What was the outcome?</label>
              <input autoComplete="off" type="text" placeholder="e.g. Cut reporting time by 80%, saved 12 hours per week" value={projectOutcome} onChange={e => setProjectOutcome(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Project URL</label>
              <input autoComplete="off" type="url" placeholder="https://" value={projectUrl} onChange={e => setProjectUrl(e.target.value)} style={inputStyle} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>Your full stack</h1>
            <p style={{ color: '#6e6e73', marginBottom: '2rem', fontSize: 15 }}>Select everything you work with.</p>
            {[
              { label: 'Other LLMs you use', items: LLMS, selected: selectedLLMs, setSelected: setSelectedLLMs },
              { label: 'Coding languages', items: LANGUAGES, selected: selectedLanguages, setSelected: setSelectedLanguages },
              { label: 'Frameworks and tools', items: FRAMEWORKS, selected: selectedFrameworks, setSelected: setSelectedFrameworks },
              { label: 'AI-native platforms', items: AI_TOOLS, selected: selectedAITools, setSelected: setSelectedAITools },
              { label: 'Domain expertise', items: DOMAINS, selected: selectedDomains, setSelected: setSelectedDomains },
            ].map(({ label, items, selected, setSelected }) => {
              const allSelected = items.every(i => selected.includes(i))
              return (
                <div key={label} style={{ marginBottom: '1.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <label style={labelStyle}>{label}</label>
                    <button type="button" onClick={() => setSelected(allSelected ? [] : [...items])}
                      style={{ fontSize: 12, color: '#0071e3', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, padding: 0 }}>
                      {allSelected ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {items.map(item => (
                      <Tag key={item} label={item} selected={selected.includes(item)} onClick={() => toggle(selected, setSelected, item)} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {step === 4 && (
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>Your links</h1>
            <p style={{ color: '#6e6e73', marginBottom: '2rem', fontSize: 15 }}>Help employers find your work. All optional.</p>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>GitHub</label>
              <input autoComplete="off" type="url" placeholder="https://github.com/username" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>X / Twitter</label>
              <input autoComplete="off" type="url" placeholder="https://x.com/username" value={xUrl} onChange={e => setXUrl(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>LinkedIn</label>
              <input autoComplete="off" type="url" placeholder="https://linkedin.com/in/username" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Personal website</label>
              <input autoComplete="off" type="url" placeholder="https://yoursite.com" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} style={inputStyle} />
            </div>
          </div>
        )}

        {step === 5 && (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div style={{ width: 64, height: 64, background: '#e8f1fd', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: 28, color: '#0071e3', fontWeight: 700 }}>
              ✓
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>You are live.</h1>
            <p style={{ color: '#6e6e73', marginBottom: '2rem', fontSize: 15 }}>Your ShipStacked profile is published. Share it everywhere.</p>
            <div style={{ background: '#f5f5f7', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: 14, color: '#1d1d1f', fontFamily: 'monospace' }}>
              shipstacked.com/u/{username}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href={`https://x.com/intent/tweet?text=I just created my ShipStacked profile — here is what I build with AI&url=https://shipstacked.com/u/${username}`}
                target="_blank" style={{ padding: '0.75rem 1.5rem', background: '#000', color: 'white', borderRadius: 20, fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>
                Share on X
              </a>
              <a href={`https://wa.me/?text=I just created my ShipStacked profile: https://shipstacked.com/u/${username}`}
                target="_blank" style={{ padding: '0.75rem 1.5rem', background: '#25D366', color: 'white', borderRadius: 20, fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>
                Share on WhatsApp
              </a>
              <button type="button" onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: 'My ShipStacked Profile', url: `https://shipstacked.com/u/${username}` })
                } else {
                  navigator.clipboard.writeText(`https://shipstacked.com/u/${username}`)
                }
              }} style={{ padding: '0.75rem 1.5rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 20, fontSize: 14, border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>
                Share / Copy link
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <a href="/dashboard" style={{ display: 'inline-block', color: 'white', background: '#0071e3', padding: '0.65rem 1.25rem', borderRadius: 20, fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>
                Go to dashboard →
              </a>
              <a href={`/u/${username}`} style={{ display: 'inline-block', color: '#0071e3', fontSize: 14, textDecoration: 'none', padding: '0.65rem 1.25rem' }}>
                View your profile →
              </a>
            </div>
          </div>
        )}

        {step < 5 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e0e0e5' }}>
            {step > 0 ? (
              <button type="button" onClick={() => setStep(s => s - 1)}
                style={{ padding: '0.75rem 1.5rem', background: 'white', border: '1px solid #d2d2d7', borderRadius: 20, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
                Back
              </button>
            ) : <div />}
            {step < 4 ? (
              <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
                style={{ padding: '0.75rem 1.75rem', background: canProceed() ? '#0071e3' : '#d2d2d7', color: 'white', border: 'none', borderRadius: 20, fontSize: 15, cursor: canProceed() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontWeight: 500 }}>
                Continue
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={loading}
                style={{ padding: '0.75rem 1.75rem', background: loading ? '#d2d2d7' : '#0071e3', color: 'white', border: 'none', borderRadius: 20, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                {loading ? 'Publishing...' : 'Publish my profile'}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  )
}