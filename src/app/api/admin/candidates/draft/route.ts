import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const ADMIN_EMAIL = 'oxleethomas+admin@gmail.com'
const MODEL = 'claude-haiku-4-5-20251001'

type Candidate = {
  id: string
  github_username: string
  full_name: string | null
  x_handle: string
  bio: string | null
  location: string | null
  primary_profession: string | null
  shipping_evidence: string | null
  tier: string | null
  velocity_score: number | null
}

type GitHubRepo = {
  name: string
  description: string | null
  language: string | null
  stargazers_count: number
  fork: boolean
  updated_at: string
}

async function fetchTopRepos(githubUsername: string): Promise<GitHubRepo[]> {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'shipstacked-outreach',
    }
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
    }
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(githubUsername)}/repos?per_page=30&sort=pushed`,
      { headers, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) {
      console.warn(`[draft] GitHub fetch failed for ${githubUsername}: ${res.status}`)
      return []
    }
    const repos = await res.json() as GitHubRepo[]
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000
    const filtered = repos.filter(r =>
      !r.fork &&
      (r.stargazers_count > 0 || new Date(r.updated_at).getTime() > oneYearAgo)
    )
    filtered.sort((a, b) => {
      if (b.stargazers_count !== a.stargazers_count) return b.stargazers_count - a.stargazers_count
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
    return filtered.slice(0, 5)
  } catch (e) {
    console.error(`[draft] GitHub fetch error for ${githubUsername}:`, e)
    return []
  }
}

const SYSTEM_PROMPT = `You are drafting a short tweet from Thomas Oxlee, founder of ShipStacked, to a builder he wants to invite to the platform.

ShipStacked is a hiring platform that surfaces builders by their actual shipped work, not by CV. It's specifically for the AI-native generation: people who ship with Claude Code, Cursor, Lovable, Bolt, and AI agents.

Your job: write ONE tweet that:
1. Names ShipStacked once, briefly, in plain language.
2. Includes the link "shipstacked.com" exactly once.
3. Stays under 270 characters total.
4. Reads like one human writing to another. NOT salesy. NOT templated.
5. Lowercase casual style. Founder voice: warm, direct, no fluff.
6. Ends with low-pressure framing.

CRITICAL RULES:

1. NEVER INVENT FACTS. Only reference what is LITERALLY provided in the data below.
2. If the data lists specific repos by name, you may reference them BY EXACT NAME.
3. If the data lists no repos, do NOT invent one.
4. If the bio mentions specific technologies, you MAY reference those.
5. Do NOT pattern-match the X handle into a fake repo name.
6. Do NOT use training-data knowledge of who this person is. Only use what's provided.
7. If you have NO specific work to reference, write a GENERIC warm message about ShipStacked instead. A generic-but-honest message is infinitely better than a specific-but-fake one.

DO NOT:
- Use em-dashes. Use full stops or commas instead.
- Use emojis.
- Start with "Hey" or generic openers.
- Sound like a recruiter or marketer.
- Say "let's connect" or "let's chat".
- Use the word "platform" more than once.

OUTPUT FORMAT:
Return ONLY the tweet text. No JSON, no commentary, no quotation marks.`

function buildUserPrompt(c: Candidate, repos: GitHubRepo[]): string {
  const lines: string[] = []
  lines.push(`Builder data:`)
  lines.push(``)
  lines.push(`X handle: @${c.x_handle}`)
  lines.push(`GitHub username: ${c.github_username}`)
  if (c.full_name) lines.push(`Name: ${c.full_name}`)
  if (c.location) lines.push(`Location: ${c.location}`)
  if (c.bio) lines.push(`GitHub bio: "${c.bio}"`)
  if (c.primary_profession) lines.push(`Profession: ${c.primary_profession}`)

  if (repos.length > 0) {
    lines.push(``)
    lines.push(`Their top public repos (verified, fetched from GitHub just now):`)
    for (const r of repos) {
      let line = `- "${r.name}"`
      if (r.language) line += ` (${r.language})`
      if (r.stargazers_count > 0) line += ` star${r.stargazers_count}`
      if (r.description) line += ` — ${r.description}`
      lines.push(line)
    }
    lines.push(``)
    lines.push(`You may reference any repo by its EXACT name above. Do not invent repo names not in this list.`)
  } else {
    lines.push(``)
    lines.push(`NO REPO DATA AVAILABLE. Their public GitHub repos are private, deleted, or could not be fetched.`)
    lines.push(`Therefore: do NOT reference any specific repo or project. Write a warm general message instead, mentioning at most their bio or location, then ShipStacked.`)
  }

  lines.push(``)
  lines.push(`Write the tweet now. Stay under 270 characters. Reference ONLY what's verified above.`)

  return lines.join('\n')
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { candidate_id?: string, force_new?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const candidateId = body?.candidate_id?.trim()
  const forceNew = !!body?.force_new

  if (!candidateId) {
    return NextResponse.json({ error: 'candidate_id required' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: candidate, error: fetchErr } = await admin
    .from('candidates')
    .select('id, github_username, full_name, x_handle, bio, location, primary_profession, shipping_evidence, tier, velocity_score')
    .eq('id', candidateId)
    .single()

  if (fetchErr || !candidate) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
  }

  if (!forceNew) {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recentDraft } = await admin
      .from('outreach_drafts')
      .select('id, draft_text, generated_at, was_used')
      .eq('candidate_id', candidateId)
      .eq('was_used', false)
      .gte('generated_at', fiveMinAgo)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recentDraft) {
      return NextResponse.json({
        draft_id: recentDraft.id,
        draft_text: recentDraft.draft_text,
        cached: true,
      })
    }
  }

  const repos = await fetchTopRepos((candidate as Candidate).github_username)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
  }

  const anthropic = new Anthropic({ apiKey })

  let draftText = ''
  let tokensIn = 0
  let tokensOut = 0

  try {
    const userPrompt = buildUserPrompt(candidate as Candidate, repos)
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })
    const block = response.content[0]
    if (block.type === 'text') {
      draftText = block.text.trim()
      draftText = draftText.replace(/^["']|["']$/g, '').trim()
    }
    tokensIn = response.usage.input_tokens
    tokensOut = response.usage.output_tokens
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[draft] Claude error:', msg)
    return NextResponse.json({ error: `Draft generation failed: ${msg}` }, { status: 500 })
  }

  if (!draftText) {
    return NextResponse.json({ error: 'Empty draft from Claude' }, { status: 500 })
  }

  const { data: draft, error: insertErr } = await admin
    .from('outreach_drafts')
    .insert({
      candidate_id: candidateId,
      draft_text: draftText,
      prompt_used: 'recognition_v2_grounded',
      model: MODEL,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
    })
    .select('id')
    .single()

  if (insertErr) {
    console.error('[draft] insert error:', insertErr)
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 })
  }

  await admin
    .from('candidates')
    .update({ last_drafted_at: new Date().toISOString() })
    .eq('id', candidateId)

  return NextResponse.json({
    draft_id: draft.id,
    draft_text: draftText,
    cached: false,
    char_count: draftText.length,
    tokens: { in: tokensIn, out: tokensOut },
    repos_used: repos.length,
    repos_sample: repos.slice(0, 3).map(r => r.name),
  })
}
