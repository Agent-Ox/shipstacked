import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Builder API | ShipStacked',
  description: 'ShipStacked has a real API. Let your agent keep your profile updated, post your builds, and maintain your Velocity Score — automatically.',
  alternates: { canonical: 'https://shipstacked.com/api-docs' },
}

const CODE = {
  getMe: `curl https://shipstacked.com/api/v1/me \\
  -H "Authorization: Bearer sk_ss_your_key_here"`,

  patchProfile: `curl -X PATCH https://shipstacked.com/api/v1/profile \\
  -H "Authorization: Bearer sk_ss_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "role": "AI Automation Engineer",
    "bio": "I build production-grade AI systems that eliminate manual work at scale.",
    "location": "London, UK",
    "availability": "freelance",
    "primary_profession": "Developer",
    "day_rate": "$500-1000/day",
    "skills": [
      { "category": "claude_use_case", "name": "Automation and workflows" },
      { "category": "claude_use_case", "name": "Agent systems" },
      { "category": "ai_tool", "name": "Claude Code" },
      { "category": "framework", "name": "n8n" }
    ]
  }'`,

  postBuild: `curl -X POST https://shipstacked.com/api/v1/builds \\
  -H "Authorization: Bearer sk_ss_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "AI contract review tool for a law firm",
    "problem_solved": "Contract reviews were taking 4 hours each.",
    "outcome": "Review time cut from 4 hours to 20 minutes. Client is productising it.",
    "tools_used": "Claude API, n8n, Supabase",
    "time_taken": "2 weekends",
    "url": "https://yourproject.com"
  }'`,

  claudePrompt: `You are my ShipStacked profile manager. Your job is to keep my builder profile 
current and post my builds automatically.

My API key: sk_ss_[YOUR_KEY]
Base URL: https://shipstacked.com/api/v1

When I tell you about something I shipped:
1. POST to /builds with the title, problem_solved, outcome, tools_used, time_taken, and url
2. If my skills or role have changed, PATCH /profile to update them
3. Confirm the post_url so I can share it

Always include outcome and url in build posts — they're required for verification.

Current profile: GET /me to check my current state before making updates.`,
}

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  return (
    <pre style={{
      background: '#0f0f18',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '1.25rem 1.5rem',
      overflowX: 'auto',
      fontSize: 13,
      lineHeight: 1.7,
      color: 'rgba(240,240,245,0.85)',
      fontFamily: "'SF Mono', 'Fira Code', 'Fira Mono', monospace",
      margin: '1rem 0',
      WebkitOverflowScrolling: 'touch',
    }}>
      <code>{code}</code>
    </pre>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '3.5rem' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#1d1d1f', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '0.5px solid #e0e0e5' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function Endpoint({ method, path, description }: { method: string; path: string; description: string }) {
  const colors: Record<string, string> = { GET: '#1a7f37', POST: '#0071e3', PATCH: '#bf7e00', DELETE: '#c00' }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '0.875rem 0', borderBottom: '0.5px solid #f0f0f5' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: colors[method] || '#1d1d1f', background: `${colors[method]}15`, padding: '0.2rem 0.5rem', borderRadius: 6, fontFamily: 'monospace', flexShrink: 0, marginTop: 2 }}>
        {method}
      </span>
      <div>
        <code style={{ fontSize: 14, color: '#1d1d1f', fontFamily: 'monospace', fontWeight: 600 }}>{path}</code>
        <p style={{ fontSize: 13, color: '#6e6e73', marginTop: '0.2rem' }}>{description}</p>
      </div>
    </div>
  )
}

function Field({ name, type, required, description }: { name: string; type: string; required?: boolean; description: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 80px 1fr', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '0.5px solid #f5f5f7', alignItems: 'start', fontSize: 13 }}>
      <code style={{ color: '#1d1d1f', fontFamily: 'monospace', fontWeight: 600 }}>{name}</code>
      <span style={{ color: '#6c63ff', fontFamily: 'monospace' }}>{type}</span>
      <span style={{ color: '#6e6e73', lineHeight: 1.5 }}>
        {required && <span style={{ color: '#c00', fontWeight: 600, marginRight: 4 }}>required</span>}
        {description}
      </span>
    </div>
  )
}

export default function ApiDocsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 100%)', padding: '5rem 1.5rem 4rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 980, padding: '0.3rem 0.875rem', marginBottom: '1.5rem' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6c63ff', display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(167,139,250,0.9)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Builder API</span>
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, letterSpacing: '-0.03em', color: '#f0f0f5', lineHeight: 1.08, marginBottom: '1rem', maxWidth: 700, margin: '0 auto 1rem' }}>
          Let your agent keep<br />your profile current.
        </h1>
        <p style={{ fontSize: 'clamp(1rem, 2vw, 1.1rem)', color: 'rgba(240,240,245,0.55)', maxWidth: 520, margin: '0 auto 2.5rem', lineHeight: 1.7, fontWeight: 300 }}>
          ShipStacked has a real API. Bearer token auth. Clean JSON. Your agent can update your profile, post your builds, and keep your Velocity Score high — without you lifting a finger.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={{ padding: '0.875rem 1.75rem', background: '#6c63ff', color: 'white', borderRadius: 980, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
            Get your API key →
          </Link>
          <a href="#quickstart" style={{ padding: '0.875rem 1.75rem', background: 'rgba(255,255,255,0.08)', color: 'rgba(240,240,245,0.85)', borderRadius: 980, fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>
            Jump to quickstart
          </a>
        </div>
      </div>

      {/* Docs body */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '4rem 1.5rem 6rem' }}>

        {/* Quickstart */}
        <Section title="Quickstart" >
          <div id="quickstart" />
          <p style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.7, marginBottom: '1.25rem' }}>
            Three steps. Your agent is live in under 5 minutes.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { n: '01', t: 'Create your ShipStacked profile', d: 'Sign up at shipstacked.com/join — takes 5 minutes. This is the one thing your agent can\'t do for you, and that\'s intentional.' },
              { n: '02', t: 'Generate an API key', d: 'Go to your dashboard → API Keys section → Create key. Name it after your agent. Copy it — you\'ll only see it once.' },
              { n: '03', t: 'Brief your agent', d: 'Give your agent the key and the system prompt below. It handles the rest.' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: '1rem', background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.25rem 1.5rem' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6c63ff', fontFamily: 'monospace', flexShrink: 0, marginTop: 3 }}>{s.n}</span>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.25rem' }}>{s.t}</p>
                  <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.6 }}>{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Endpoints */}
        <Section title="Endpoints">
          <p style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.7, marginBottom: '1.25rem' }}>
            Base URL: <code style={{ fontFamily: 'monospace', background: '#f0f0f5', padding: '0.15rem 0.4rem', borderRadius: 4 }}>https://shipstacked.com/api/v1</code>
            <br />
            Authentication: <code style={{ fontFamily: 'monospace', background: '#f0f0f5', padding: '0.15rem 0.4rem', borderRadius: 4 }}>Authorization: Bearer sk_ss_...</code>
          </p>
          <Endpoint method="GET" path="/me" description="Fetch your full profile, skills, projects, velocity score, and verification status." />
          <Endpoint method="PATCH" path="/profile" description="Update profile fields and skills. Only send fields you want to change." />
          <Endpoint method="POST" path="/builds" description="Post a build to the Build Feed. Include outcome and url to count towards auto-verification." />
          <Endpoint method="GET" path="/builds" description="Fetch your 20 most recent build posts." />
        </Section>

        {/* PATCH /profile fields */}
        <Section title="PATCH /profile — fields">
          <p style={{ fontSize: 14, color: '#6e6e73', marginBottom: '1rem' }}>All fields are optional. Only include what you want to update.</p>
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '0 1.25rem', marginBottom: '1.25rem' }}>
            <Field name="full_name" type="string" description="Your full name" />
            <Field name="role" type="string" description="Your role title e.g. 'AI Automation Engineer'" />
            <Field name="bio" type="string" description="One-line bio shown on your profile card" />
            <Field name="about" type="string" description="Longer about section" />
            <Field name="location" type="string" description="City, Country" />
            <Field name="availability" type="string" description="freelance | full-time | contract | part-time | open" />
            <Field name="primary_profession" type="string" description="Developer | Designer | Consultant | Marketer | Founder | Other" />
            <Field name="day_rate" type="string" description="Under $200/day | $200-500/day | $500-1000/day | $1000+/day" />
            <Field name="timezone" type="string" description="e.g. UTC+0 (GMT)" />
            <Field name="languages" type="string[]" description="Spoken languages e.g. ['English', 'Spanish']" />
            <Field name="github_url" type="string" description="Full URL to your GitHub profile" />
            <Field name="x_url" type="string" description="Full URL to your X/Twitter profile" />
            <Field name="linkedin_url" type="string" description="Full URL to your LinkedIn profile" />
            <Field name="website_url" type="string" description="Your personal site or portfolio" />
            <Field name="skills" type="object[]" description="Array of { category, name } — replaces all existing skills" />
            <Field name="projects" type="object[]" description="Array of { title, description, outcome, project_url } — replaces all existing projects" />
            <Field name="published" type="boolean" description="Set to true to make your profile public" />
          </div>
          <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '0.5rem' }}>Valid skill categories:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
            {['claude_use_case', 'language', 'framework', 'ai_tool', 'llm', 'domain'].map(c => (
              <code key={c} style={{ fontSize: 12, background: '#f0f0f5', padding: '0.2rem 0.5rem', borderRadius: 6, fontFamily: 'monospace' }}>{c}</code>
            ))}
          </div>
          <CodeBlock code={CODE.patchProfile} />
        </Section>

        {/* POST /builds fields */}
        <Section title="POST /builds — fields">
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '0 1.25rem', marginBottom: '1.25rem' }}>
            <Field name="title" type="string" required description="What you built — keep it specific" />
            <Field name="problem_solved" type="string" description="What problem this solved" />
            <Field name="outcome" type="string" description="The measurable result. Required for auto-verification." />
            <Field name="tools_used" type="string" description="e.g. Claude API, n8n, Supabase" />
            <Field name="time_taken" type="string" description="e.g. 2 weekends, 4 days" />
            <Field name="url" type="string" description="Link to the live project. Required for auto-verification." />
          </div>
          <div style={{ background: '#e3f3e3', border: '1px solid #b3e0b3', borderRadius: 10, padding: '0.875rem 1rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: 13, color: '#1a7f37', lineHeight: 1.6 }}>
              <strong>Auto-verification tip:</strong> Include both <code style={{ fontFamily: 'monospace' }}>outcome</code> and <code style={{ fontFamily: 'monospace' }}>url</code> in your build posts. These are required for ShipStacked to auto-verify your profile. Your agent should always include them.
            </p>
          </div>
          <CodeBlock code={CODE.postBuild} />
        </Section>

        {/* GET /me example */}
        <Section title="GET /me — example response">
          <CodeBlock code={CODE.getMe} />
          <CodeBlock language="json" code={`{
  "ok": true,
  "profile": {
    "username": "james-m",
    "full_name": "James M.",
    "role": "AI Automation Engineer",
    "verified": true,
    "published": true,
    "velocity_score": 74,
    "github_connected": false,
    "skills": [
      { "category": "claude_use_case", "name": "Automation and workflows" },
      { "category": "ai_tool", "name": "Claude Code" }
    ],
    "profile_url": "https://shipstacked.com/u/james-m"
  }
}`} />
        </Section>

        {/* Claude system prompt */}
        <Section title="Claude system prompt template">
          <p style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.7, marginBottom: '1rem' }}>
            Copy this prompt, paste in your API key, and give it to your Claude agent. It will keep your profile updated automatically every time you tell it about something you shipped.
          </p>
          <CodeBlock code={CODE.claudePrompt} />
        </Section>

        {/* Rate limits */}
        <Section title="Rate limits and limits">
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, overflow: 'hidden' }}>
            {[
              { item: 'Requests per minute', value: '60 per API key' },
              { item: 'API keys per profile', value: '5 maximum' },
              { item: 'Build posts via API', value: 'Unlimited' },
              { item: 'Profile updates', value: 'Unlimited' },
              { item: 'Key visibility', value: 'Shown once at generation — store it securely' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.875rem 1.25rem', borderBottom: i < 4 ? '0.5px solid #f0f0f5' : 'none', fontSize: 14 }}>
                <span style={{ color: '#1d1d1f', fontWeight: 500 }}>{row.item}</span>
                <span style={{ color: '#6e6e73' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* CTA */}
        <div style={{ background: 'linear-gradient(135deg, #0f0f18, #1a1a2e)', borderRadius: 20, padding: '2.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(108,99,255,0.8)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Ready to automate?</p>
          <h3 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: '#f0f0f5', marginBottom: '0.75rem' }}>Get your API key</h3>
          <p style={{ fontSize: 14, color: 'rgba(240,240,245,0.5)', marginBottom: '1.75rem', lineHeight: 1.6 }}>
            Sign up as a builder, go to your dashboard, and generate a key.<br />Your agent does the rest.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/join" style={{ padding: '0.875rem 1.75rem', background: '#6c63ff', color: 'white', borderRadius: 980, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              Create free profile
            </Link>
            <Link href="/dashboard" style={{ padding: '0.875rem 1.75rem', background: 'rgba(255,255,255,0.08)', color: 'rgba(240,240,245,0.8)', borderRadius: 980, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
              Go to dashboard →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
