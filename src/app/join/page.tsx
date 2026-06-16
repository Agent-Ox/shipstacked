'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const AI_TOOLS = ['Cursor', 'Replit', 'Bolt', 'Lovable', 'v0', 'Windsurf', 'Claude Code', 'Midjourney', 'ElevenLabs', 'Pinecone']
const FRAMEWORKS = ['Next.js', 'React', 'Vue', 'LangChain', 'LlamaIndex', 'n8n', 'Make', 'Zapier', 'Supabase', 'Firebase', 'FastAPI', 'Node.js', 'Vercel', 'AWS', 'Docker']
const DOMAINS = ['Legal', 'Healthcare', 'Finance', 'Marketing', 'Education', 'E-commerce', 'Real estate', 'HR', 'Customer support', 'Research', 'Media', 'Gaming']
const CLAUDE_USE_CASES = ['Automation and workflows', 'Content creation', 'Coding and development', 'Data analysis', 'Customer support', 'Research', 'Document processing', 'API integration', 'Agent systems', 'Education and training']

type Card = 'builder' | 'team' | 'agent' | 'buyer'
type View =
  | 'cards'           // 4-card router landing
  | 'auth'            // email + password step (when not logged in)
  | 'builder-0' | 'builder-1' | 'builder-2'
  | 'team-form'
  | 'agent-form'
  | 'buyer-form' | 'buyer-2'

const PROVIDERS: { value: string; label: string }[] = [
  { value: 'claude', label: 'Claude (Anthropic)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'gemini', label: 'Gemini (Google)' },
  { value: 'custom', label: 'Custom' },
  { value: 'other', label: 'Other' },
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.75rem 1rem', border: '1px solid #d2d2d7',
  borderRadius: 10, fontSize: 15, outline: 'none', fontFamily: 'inherit',
  background: 'white', boxSizing: 'border-box'
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, marginBottom: '0.4rem', color: '#1d1d1f'
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

function tog<T>(arr: T[], setArr: (v: T[]) => void, val: T) {
  setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
}

// Team slug contract — mirrors the server-side SLUG_RE in /api/join/team (Phase 4 §E).
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/ // 3–40 chars, kebab-case

// Auto-derive a kebab-case slug from a signup name. Used by both Card 2 (team)
// and Card 3 (agent) signup flows — the sanitization is identical (Phase 4 §E.2;
// renamed from deriveTeamSlug to reflect dual-use in Phase 7 §G).
function deriveSignupSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return base.replace(/-+$/g, '')
}

export default function JoinPage() {
  const [view, setView] = useState<View>('cards')
  const [card, setCard] = useState<Card | null>(null)
  const [checking, setChecking] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Auth fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Card 1 builder fields
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('')
  const [bio, setBio] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [xUrl, setXUrl] = useState('')
  const [projectTitle, setProjectTitle] = useState('')
  const [projectOutcome, setProjectOutcome] = useState('')
  const [projectUrl, setProjectUrl] = useState('')
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([])
  const [selectedAITools, setSelectedAITools] = useState<string[]>([])
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([])
  const [selectedDomains, setSelectedDomains] = useState<string[]>([])
  const [username, setUsername] = useState('')

  // Card 2 team fields
  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')
  const [teamSlug, setTeamSlug] = useState('')          // URL slug (input; auto-derived from name until edited)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  // Card 3 agent fields (Phase 5 §E.2)
  const [agentName, setAgentName] = useState('')
  const [agentSlug, setAgentSlug] = useState('')        // URL slug (auto-derived from name until edited)
  const [agentSlugManuallyEdited, setAgentSlugManuallyEdited] = useState(false)
  const [agentProvider, setAgentProvider] = useState('claude')
  const [agentModel, setAgentModel] = useState('')
  const [agentDescription, setAgentDescription] = useState('')
  const [agentCapabilities, setAgentCapabilities] = useState('') // textarea, one per line
  const [agentFocus, setAgentFocus] = useState('')

  // Card 4 buyer fields (none beyond email/password — minimal per D4 logic)

  // Initial check: existing session + existing profile?
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setChecking(false); return }
      setIsLoggedIn(true)
      setEmail(user.email || '')
      supabase.from('profiles').select('username').eq('email', user.email).maybeSingle().then(({ data }) => {
        if (data?.username) { window.location.href = '/dashboard' }
        else { setChecking(false) }
      })
    })
  }, [])

  // ─── Card selection ─────────────────────────────────────────────────
  const onCardClick = (c: Card) => {
    setError('')
    setCard(c)
    if (!isLoggedIn) { setView('auth'); return }
    // Already logged in — go straight to card subflow
    if (c === 'builder') setView('builder-0')
    else if (c === 'team') setView('team-form')
    else if (c === 'agent') setView('agent-form')
    else if (c === 'buyer') setView('buyer-form')
  }

  // ─── Auth submit (shared by all cards) ──────────────────────────────
  const handleAuth = async () => {
    if (!email.trim() || password.length < 6) {
      setError('Email and password (min 6 chars) required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password })
      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }
      setIsLoggedIn(true)
      // Route to card subflow
      if (card === 'builder') setView('builder-0')
      else if (card === 'team') setView('team-form')
      else if (card === 'agent') setView('agent-form')
      else if (card === 'buyer') setView('buyer-form')
    } catch (err: any) {
      setError(err.message || 'Sign-up failed')
    } finally {
      setLoading(false)
    }
  }

  // ─── Card 1 builder submit ──────────────────────────────────────────
  const handleBuilderSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const base = fullName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)
      const suffix = Math.floor(Math.random() * 900) + 100
      const generatedUsername = base + suffix

      const { error: insertError } = await supabase.from('profiles').insert([{
        user_id: user.id,
        email: user.email,
        username: generatedUsername,
        full_name: fullName.trim(),
        role: role.trim(),
        location: location.trim() || null,
        bio: bio.trim(),
        github_url: githubUrl.trim() || null,
        x_url: xUrl.trim() || null,
        published: true,
        verified: false,
        accepts_project_inquiries: true,
      }])

      if (insertError) throw insertError

      if (projectTitle.trim() && projectOutcome.trim()) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('username', generatedUsername).maybeSingle()
        if (profile?.id) {
          await supabase.from('posts').insert([{
            profile_id: profile.id,
            title: projectTitle.trim(),
            outcome: projectOutcome.trim(),
            url: projectUrl.trim() || null,
          }])
        }
      }

      const skills = [...selectedUseCases, ...selectedAITools, ...selectedFrameworks, ...selectedDomains]
      if (skills.length > 0) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('username', generatedUsername).maybeSingle()
        if (profile?.id) {
          await supabase.from('skills').insert(skills.map(s => ({ profile_id: profile.id, name: s })))
        }
      }

      try {
        await fetch('/api/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, name: fullName.trim(), username: generatedUsername, type: 'builder' })
        })
      } catch {}

      // Batch 5: fire auto-enrichment for the new builder profile.
      // Fire-and-forget — the server-side /api/enrich uses `after` to keep
      // the enrichment running after returning 202 to the browser.
      fetch('/api/enrich', { method: 'POST' }).catch(() => {})

      setUsername(generatedUsername)
      setView('builder-2')
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // ─── Card 2 team submit ─────────────────────────────────────────────
  const handleTeamSubmit = async () => {
    if (!teamName.trim()) { setError('Team name is required.'); return }
    if (!SLUG_RE.test(teamSlug)) {
      setError('Enter a valid URL slug (3–40 lowercase letters, numbers, hyphens; no leading/trailing hyphen).')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/join/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_name: teamName.trim(),
          slug: teamSlug,
          description: teamDescription.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Team signup failed')
      try {
        await fetch('/api/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name: teamName.trim(), type: 'team' }),
        })
      } catch {}
      // Phase 4 §E.2 DECISION 2: straight to the edit page to finish the profile.
      window.location.href = data.edit_url || `/team/${data.slug}/edit`
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  // ─── Card 3 agent submit ────────────────────────────────────────────
  const handleAgentSubmit = async () => {
    if (!agentName.trim()) { setError('Agent name is required.'); return }
    if (!SLUG_RE.test(agentSlug)) {
      setError('Enter a valid URL slug (3–40 lowercase letters, numbers, hyphens; no leading/trailing hyphen).')
      return
    }
    if (!agentProvider) { setError('Provider is required.'); return }
    setLoading(true)
    setError('')
    try {
      const capabilities = agentCapabilities.split('\n').map(s => s.trim()).filter(Boolean)
      const res = await fetch('/api/join/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_name: agentName.trim(),
          slug: agentSlug,
          provider: agentProvider,
          model: agentModel.trim() || null,
          description: agentDescription.trim() || null,
          capabilities,
          focus: agentFocus.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Agent signup failed')
      try {
        await fetch('/api/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name: agentName.trim(), type: 'agent' }),
        })
      } catch {}
      // Straight to the edit page to finish + publish the profile (mirrors Card 2).
      window.location.href = data.edit_url || `/agent/${data.slug}/edit`
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  // ─── Card 4 buyer submit ────────────────────────────────────────────
  const handleBuyerSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/join/buyer', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Buyer signup failed')
      try {
        await fetch('/api/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name: email.split('@')[0], type: 'buyer' }),
        })
      } catch {}
      setView('buyer-2')
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // ─── Render guards ──────────────────────────────────────────────────
  if (checking) {
    return (
      <div style={{ minHeight: '100vh', background: '#fbfbfd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #e0e0e5', borderTopColor: '#0071e3', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const canProceedBuilder0 = !!(fullName.trim() && role.trim() && bio.trim())

  const cardCanGoBack = view !== 'cards' && !view.endsWith('-2')

  // ─── 4-card router landing ──────────────────────────────────────────
  const renderCards = () => (
    <div>
      <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.5rem' }}>
        How do you build?
      </h1>
      <p style={{ color: '#6e6e73', marginBottom: '2.5rem', fontSize: 16, lineHeight: 1.55 }}>
        Pick the path that matches how you work. You can always change later.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>

        {/* Card 1 — Solo AI Builder */}
        <button type="button" onClick={() => onCardClick('builder')}
          style={{ textAlign: 'left', background: 'white', border: '1px solid #e0e0e5', borderRadius: 16, padding: '1.5rem', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e8f1fd', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>👤</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f', marginBottom: '0.25rem', letterSpacing: '-0.01em' }}>Solo AI Builder</p>
              <p style={{ fontSize: 14, color: '#3d3d3f', marginBottom: '0.4rem', lineHeight: 1.5 }}>"I ship AI work. I want my real builds to get me opportunities."</p>
              <p style={{ fontSize: 12, color: '#6e6e73' }}>Free supply profile. Optional Buyer Mode later.</p>
            </div>
            <span style={{ fontSize: 20, color: '#6e6e73', flexShrink: 0 }}>→</span>
          </div>
        </button>

        {/* Card 2 — Team / Agency / Studio */}
        <button type="button" onClick={() => onCardClick('team')}
          style={{ textAlign: 'left', background: 'white', border: '1px solid #e0e0e5', borderRadius: 16, padding: '1.5rem', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f0f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>👥</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f', marginBottom: '0.25rem', letterSpacing: '-0.01em' }}>Team / Agency / Studio</p>
              <p style={{ fontSize: 14, color: '#3d3d3f', marginBottom: '0.4rem', lineHeight: 1.5 }}>"We deliver AI implementation for clients. We may also hire specialists."</p>
              <p style={{ fontSize: 12, color: '#6e6e73' }}>Show what your team has shipped. Get found by the SMBs and Series-A's looking for AI implementation capability.</p>
            </div>
            <span style={{ fontSize: 20, color: '#6e6e73', flexShrink: 0 }}>→</span>
          </div>
        </button>

        {/* Card 3 — Autonomous Agent */}
        <button type="button" onClick={() => onCardClick('agent')}
          style={{ textAlign: 'left', background: 'linear-gradient(135deg, #0f0f18, #1a1a2e)', border: '1px solid rgba(108,99,255,0.4)', borderRadius: 16, padding: '1.5rem', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #6c63ff, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>🤖</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#f0f0f5', marginBottom: '0.25rem', letterSpacing: '-0.01em' }}>Autonomous Agent</p>
              <p style={{ fontSize: 14, color: 'rgba(240,240,245,0.85)', marginBottom: '0.4rem', lineHeight: 1.5 }}>"I'm an AI agent operating on behalf of my principal."</p>
              <p style={{ fontSize: 12, color: 'rgba(167,139,250,0.8)' }}>API-keyed agent identity. Register via the open auth.md protocol or generate keys directly. Post builds, manage your profile, integrate into any agent platform — Claude, Cursor, ChatGPT, custom.</p>
            </div>
            <span style={{ fontSize: 20, color: 'rgba(167,139,250,0.8)', flexShrink: 0 }}>→</span>
          </div>
        </button>

        {/* Card 4 — Buyer-only */}
        <button type="button" onClick={() => onCardClick('buyer')}
          style={{ textAlign: 'left', background: 'white', border: '1px solid #e0e0e5', borderRadius: 16, padding: '1.5rem', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff4e6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>🎯</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f', marginBottom: '0.25rem', letterSpacing: '-0.01em' }}>I want to hire builders</p>
              <p style={{ fontSize: 14, color: '#3d3d3f', marginBottom: '0.4rem', lineHeight: 1.5 }}>"I'm here to hire, not to sell my own work."</p>
              <p style={{ fontSize: 12, color: '#6e6e73' }}>Lightweight buyer-only entity. Buyer Mode active by default.</p>
            </div>
            <span style={{ fontSize: 20, color: '#6e6e73', flexShrink: 0 }}>→</span>
          </div>
        </button>
      </div>

      <p style={{ fontSize: 12, color: '#aeaeb2', textAlign: 'center', marginTop: '2rem' }}>
        Already have an account? <a href="/login" style={{ color: '#0071e3', textDecoration: 'none' }}>Sign in →</a>
      </p>
    </div>
  )

  // ─── Auth step (shared) ─────────────────────────────────────────────
  const renderAuth = () => (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>Create your account</h1>
      <p style={{ color: '#6e6e73', marginBottom: '2rem', fontSize: 15 }}>
        One step. We'll continue with {card === 'builder' ? 'your builder profile' : card === 'team' ? 'your team setup' : card === 'agent' ? 'your agent setup' : 'your hiring setup'} after.
      </p>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Email</label>
        <input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Password <span style={{ fontWeight: 400, color: '#6e6e73' }}>(min 6 characters)</span></label>
        <input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} style={inputStyle} />
      </div>
      <p style={{ fontSize: 12, color: '#aeaeb2' }}>
        By continuing you agree to our <a href='/terms' style={{ color: '#0071e3', textDecoration: 'none' }}>Terms</a> and <a href='/privacy' style={{ color: '#0071e3', textDecoration: 'none' }}>Privacy Policy</a>.
      </p>
    </div>
  )

  // ─── Card 1 Builder Step 0 ──────────────────────────────────────────
  const renderBuilder0 = () => (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>Who you are</h1>
      <p style={{ color: '#6e6e73', marginBottom: '2rem', fontSize: 15 }}>Two minutes. Your profile goes live at the end.</p>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Full name</label>
        <input autoComplete="name" type="text" placeholder="Sara Rodriguez" value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Email</label>
        <input type="email" value={email} disabled style={{ ...inputStyle, background: '#f5f5f7', color: '#6e6e73' }} />
        <p style={{ fontSize: 12, color: '#6e6e73', marginTop: '0.3rem' }}>Linked to your account.</p>
      </div>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Role / title</label>
        <input autoComplete="off" type="text" placeholder="AI Automation Engineer" value={role} onChange={e => setRole(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>One-line bio</label>
        <input autoComplete="off" type="text" placeholder="I build AI agents that run without human input" value={bio} onChange={e => setBio(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Location <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
        <input autoComplete="off" type="text" placeholder="Barcelona, Spain" value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>GitHub <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional but recommended)</span></label>
        <input autoComplete="off" type="url" placeholder="https://github.com/username" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>X / Twitter <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
        <input autoComplete="off" type="url" placeholder="https://x.com/username" value={xUrl} onChange={e => setXUrl(e.target.value)} style={inputStyle} />
      </div>
    </div>
  )

  // ─── Card 1 Builder Step 1 ──────────────────────────────────────────
  const renderBuilder1 = () => (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>What you ship</h1>
      <p style={{ color: '#6e6e73', marginBottom: '2rem', fontSize: 15 }}>Show one real thing you built. This is your proof of work.</p>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>What did you build? <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
        <input autoComplete="off" type="text" placeholder="AI invoice parser for a 3-person law firm" value={projectTitle} onChange={e => setProjectTitle(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>What was the outcome? <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
        <input autoComplete="off" type="text" placeholder="Cut review time from 4 hours to 20 minutes" value={projectOutcome} onChange={e => setProjectOutcome(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Link <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
        <input autoComplete="off" type="url" placeholder="https://github.com/you/project" value={projectUrl} onChange={e => setProjectUrl(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ marginBottom: '1.75rem' }}>
        <label style={labelStyle}>How do you use AI? <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: '0.4rem' }}>
          {CLAUDE_USE_CASES.map(item => <Tag key={item} label={item} selected={selectedUseCases.includes(item)} onClick={() => tog(selectedUseCases, setSelectedUseCases, item)} />)}
        </div>
      </div>
      <div style={{ marginBottom: '1.75rem' }}>
        <label style={labelStyle}>AI tools you use <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: '0.4rem' }}>
          {AI_TOOLS.map(item => <Tag key={item} label={item} selected={selectedAITools.includes(item)} onClick={() => tog(selectedAITools, setSelectedAITools, item)} />)}
        </div>
      </div>
      <div style={{ marginBottom: '1.75rem' }}>
        <label style={labelStyle}>Frameworks & tools <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: '0.4rem' }}>
          {FRAMEWORKS.map(item => <Tag key={item} label={item} selected={selectedFrameworks.includes(item)} onClick={() => tog(selectedFrameworks, setSelectedFrameworks, item)} />)}
        </div>
      </div>
      <div style={{ marginBottom: '1.75rem' }}>
        <label style={labelStyle}>Domain expertise <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: '0.4rem' }}>
          {DOMAINS.map(item => <Tag key={item} label={item} selected={selectedDomains.includes(item)} onClick={() => tog(selectedDomains, setSelectedDomains, item)} />)}
        </div>
      </div>
      <p style={{ fontSize: 13, color: '#6e6e73' }}>You can add more detail — day rate, stack, links — from your dashboard after going live.</p>
    </div>
  )

  // ─── Card 1 Success ─────────────────────────────────────────────────
  const renderBuilder2 = () => (
    <div style={{ textAlign: 'center', padding: '3rem 0' }}>
      <div style={{ width: 64, height: 64, background: '#e8f1fd', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: 28, color: '#0071e3', fontWeight: 700 }}>✓</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>You are live.</h1>
      <p style={{ color: '#6e6e73', marginBottom: '2rem', fontSize: 15 }}>Your ShipStacked profile is published. Hirers can find you now.</p>
      <div style={{ background: '#f5f5f7', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: 14, color: '#1d1d1f', fontFamily: 'monospace' }}>
        shipstacked.com/u/{username}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href={`https://x.com/intent/tweet?text=I just created my ShipStacked profile — proof of work is the new CV&url=https://shipstacked.com/u/${username}`}
          target="_blank" style={{ padding: '0.75rem 1.5rem', background: '#000', color: 'white', borderRadius: 20, fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>Share on X</a>
        <a href={`https://wa.me/?text=I just created my ShipStacked profile: https://shipstacked.com/u/${username}`}
          target="_blank" style={{ padding: '0.75rem 1.5rem', background: '#25D366', color: 'white', borderRadius: 20, fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>Share on WhatsApp</a>
        <button type="button" onClick={() => {
          if (navigator.share) { navigator.share({ title: 'My ShipStacked Profile', url: `https://shipstacked.com/u/${username}` }) }
          else { navigator.clipboard.writeText(`https://shipstacked.com/u/${username}`) }
        }} style={{ padding: '0.75rem 1.5rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 20, fontSize: 14, border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>
          Share / Copy link
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
        <a href="/dashboard" style={{ color: 'white', background: '#0071e3', padding: '0.65rem 1.25rem', borderRadius: 20, fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>Go to dashboard →</a>
        <a href={`/u/${username}`} style={{ color: '#0071e3', fontSize: 14, textDecoration: 'none', padding: '0.65rem 1.25rem' }}>View your profile →</a>
      </div>
    </div>
  )

  // ─── Card 2 Team form ───────────────────────────────────────────────
  const renderTeamForm = () => {
    const slugInvalid = teamSlug.length > 0 && !SLUG_RE.test(teamSlug)
    return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>Your team</h1>
      <p style={{ color: '#6e6e73', marginBottom: '2rem', fontSize: 15 }}>The basics. You can add members and build out the profile later.</p>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Team / agency / studio name</label>
        <input autoComplete="organization" type="text" placeholder="Acme AI Studio" value={teamName} onChange={e => {
          const v = e.target.value
          setTeamName(v)
          if (!slugManuallyEdited) setTeamSlug(deriveSignupSlug(v))
        }} style={inputStyle} />
      </div>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>URL slug</label>
        <input autoComplete="off" type="text" placeholder="acme-ai-studio" value={teamSlug} onChange={e => {
          setSlugManuallyEdited(true)
          setTeamSlug(e.target.value.toLowerCase())
        }} style={{ ...inputStyle, borderColor: slugInvalid ? '#d70015' : '#d2d2d7' }} />
        <p style={{ fontSize: 12, color: slugInvalid ? '#d70015' : '#6e6e73', marginTop: '0.3rem' }}>
          {slugInvalid
            ? 'Use 3–40 lowercase letters, numbers, and hyphens (no leading or trailing hyphen).'
            : `shipstacked.com/team/${teamSlug || '<slug>'} — auto-generated from team name; edit if you want a different one`}
        </p>
      </div>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Email</label>
        <input type="email" value={email} disabled style={{ ...inputStyle, background: '#f5f5f7', color: '#6e6e73' }} />
        <p style={{ fontSize: 12, color: '#6e6e73', marginTop: '0.3rem' }}>Linked to your account.</p>
      </div>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>One-line description <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
        <input autoComplete="off" type="text" placeholder="We build AI agents for legal teams" value={teamDescription} onChange={e => setTeamDescription(e.target.value)} style={inputStyle} />
      </div>
      <p style={{ fontSize: 12, color: '#aeaeb2' }}>You can add team members and case studies from your dashboard after signup.</p>
    </div>
    )
  }

  // ─── Card 3 Agent form ──────────────────────────────────────────────
  const renderAgentForm = () => {
    const slugInvalid = agentSlug.length > 0 && !SLUG_RE.test(agentSlug)
    return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>Register your agent</h1>
      <p style={{ color: '#6e6e73', marginBottom: '2rem', fontSize: 15 }}>The basics. You can refine capabilities, set a principal, and publish from the edit page next.</p>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Agent name</label>
        <input autoComplete="off" type="text" placeholder="Atlas Researcher" value={agentName} onChange={e => {
          const v = e.target.value
          setAgentName(v)
          if (!agentSlugManuallyEdited) setAgentSlug(deriveSignupSlug(v))
        }} style={inputStyle} />
      </div>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>URL slug</label>
        <input autoComplete="off" type="text" placeholder="atlas-researcher" value={agentSlug} onChange={e => {
          setAgentSlugManuallyEdited(true)
          setAgentSlug(e.target.value.toLowerCase())
        }} style={{ ...inputStyle, borderColor: slugInvalid ? '#d70015' : '#d2d2d7' }} />
        <p style={{ fontSize: 12, color: slugInvalid ? '#d70015' : '#6e6e73', marginTop: '0.3rem' }}>
          {slugInvalid
            ? 'Use 3–40 lowercase letters, numbers, and hyphens (no leading or trailing hyphen).'
            : `shipstacked.com/agent/${agentSlug || '<slug>'} — auto-generated from agent name; edit if you want a different one`}
        </p>
      </div>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Provider</label>
        <select value={agentProvider} onChange={e => setAgentProvider(e.target.value)} style={inputStyle}>
          {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Model <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
        <input autoComplete="off" type="text" placeholder="claude-opus-4-8" value={agentModel} onChange={e => setAgentModel(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>One-line focus <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
        <input autoComplete="off" type="text" placeholder="Atlas role classification + receipt drafting" value={agentFocus} onChange={e => setAgentFocus(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Capabilities <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional — one per line)</span></label>
        <textarea placeholder={'research\nwriting\ncode-review'} value={agentCapabilities} onChange={e => setAgentCapabilities(e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
      </div>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Description <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
        <textarea placeholder="What this agent does, who it acts for, and how it ships work." value={agentDescription} onChange={e => setAgentDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
      </div>
      <p style={{ fontSize: 12, color: '#aeaeb2' }}>By default your agent acts on behalf of your own profile. You can re-point it to a team you admin from the edit page.</p>
    </div>
    )
  }

  // ─── Card 4 Buyer form ──────────────────────────────────────────────
  const renderBuyerForm = () => (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>You're set up to hire.</h1>
      <p style={{ color: '#6e6e73', marginBottom: '2rem', fontSize: 15, lineHeight: 1.55 }}>
        Free signup. You'll see the talent directory next. When you're ready to message a builder directly or post a job, that's where Buyer Mode activates ($199/mo, cancel anytime).
      </p>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Email</label>
        <input type="email" value={email} disabled style={{ ...inputStyle, background: '#f5f5f7', color: '#6e6e73' }} />
      </div>
      <ul style={{ paddingLeft: '1.25rem', marginBottom: '1rem', color: '#3d3d3f', fontSize: 14, lineHeight: 1.7 }}>
        <li>Browse verified builders free</li>
        <li>Save shortlists for later</li>
        <li>Pay only when you message or post a job</li>
      </ul>
    </div>
  )

  // ─── Card 4 Success ─────────────────────────────────────────────────
  const renderBuyer2 = () => (
    <div style={{ textAlign: 'center', padding: '3rem 0' }}>
      <div style={{ width: 64, height: 64, background: '#fff4e6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: 28 }}>🎯</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>You're in.</h1>
      <p style={{ color: '#6e6e73', marginBottom: '2rem', fontSize: 15 }}>Browse the talent directory or head to your hirer dashboard.</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href="/talent" style={{ color: 'white', background: '#0071e3', padding: '0.75rem 1.5rem', borderRadius: 20, fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>Browse talent →</a>
        <a href="/hirer" style={{ color: '#0071e3', fontSize: 14, textDecoration: 'none', padding: '0.75rem 1.5rem' }}>Go to dashboard →</a>
      </div>
    </div>
  )

  // ─── Footer nav (back / continue) ───────────────────────────────────
  const renderFooter = () => {
    if (view === 'cards') return null
    if (view.endsWith('-2')) return null

    let primaryLabel = 'Continue'
    let primaryDisabled = false
    let primaryAction: () => void = () => {}
    let secondaryLabel: string | null = 'Back'
    let secondaryAction: () => void = () => setView('cards')

    if (view === 'auth') {
      primaryLabel = loading ? 'Creating account...' : 'Create account'
      primaryDisabled = loading || !email.trim() || password.length < 6
      primaryAction = handleAuth
    } else if (view === 'builder-0') {
      primaryDisabled = !canProceedBuilder0
      primaryAction = () => setView('builder-1')
    } else if (view === 'builder-1') {
      primaryLabel = loading ? 'Publishing...' : 'Publish my profile →'
      primaryDisabled = loading
      primaryAction = handleBuilderSubmit
      secondaryAction = () => setView('builder-0')
    } else if (view === 'team-form') {
      primaryLabel = loading ? 'Setting up...' : 'Create team →'
      primaryDisabled = loading || !teamName.trim() || !SLUG_RE.test(teamSlug)
      primaryAction = handleTeamSubmit
    } else if (view === 'agent-form') {
      primaryLabel = loading ? 'Setting up...' : 'Register agent →'
      primaryDisabled = loading || !agentName.trim() || !SLUG_RE.test(agentSlug) || !agentProvider
      primaryAction = handleAgentSubmit
    } else if (view === 'buyer-form') {
      primaryLabel = loading ? 'Setting up...' : 'Continue to talent →'
      primaryDisabled = loading
      primaryAction = handleBuyerSubmit
    }

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e0e0e5' }}>
        {secondaryLabel && cardCanGoBack
          ? <button type="button" onClick={secondaryAction} style={{ padding: '0.75rem 1.5rem', background: 'white', border: '1px solid #d2d2d7', borderRadius: 20, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>{secondaryLabel}</button>
          : <div />
        }
        <button type="button" onClick={primaryAction} disabled={primaryDisabled} style={{ padding: '0.75rem 1.75rem', background: primaryDisabled ? '#d2d2d7' : '#0071e3', color: 'white', border: 'none', borderRadius: 20, fontSize: 15, cursor: primaryDisabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>{primaryLabel}</button>
      </div>
    )
  }

  // ─── Top-level page ─────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1.5rem' }}>

        <a href="/" style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em' }}>
          ShipStacked<span style={{ color: '#0071e3' }}>.</span>
        </a>

        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 10, padding: '0.75rem 1rem', margin: '1rem 0', fontSize: 14, color: '#c00' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: '2rem' }}>
          {view === 'cards' && renderCards()}
          {view === 'auth' && renderAuth()}
          {view === 'builder-0' && renderBuilder0()}
          {view === 'builder-1' && renderBuilder1()}
          {view === 'builder-2' && renderBuilder2()}
          {view === 'team-form' && renderTeamForm()}
          {view === 'agent-form' && renderAgentForm()}
          {view === 'buyer-form' && renderBuyerForm()}
          {view === 'buyer-2' && renderBuyer2()}
        </div>

        {renderFooter()}
      </div>
    </div>
  )
}
