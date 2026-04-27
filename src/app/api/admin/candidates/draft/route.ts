import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const ADMIN_EMAIL = 'oxleethomas+admin@gmail.com'
const MODEL = 'claude-haiku-4-5-20251001'  // cheapest, fastest

// =====================================================================
// POST /api/admin/candidates/draft
//
// Generates a personalised tweet draft for one candidate using Claude.
// Stores the draft in outreach_drafts and returns it.
//
// Body: { candidate_id: string, force_new?: boolean }
//
// If a recent draft (< 5 min old) exists, returns it instead of regenerating
// — unless force_new=true (the regenerate button).
// =====================================================================

type Candidate = {
  id: string
  github_username: string
  full_name: string | null
  x_handle: string
  bio: string | null
  location: string | null
  primary_profession: string | null
  top_repos: unknown
  shipping_evidence: string | null
  tier: string | null
  velocity_score: number | null
}

const SYSTEM_PROMPT = `You are drafting a short, personal tweet from Thomas Oxlee, founder of ShipStacked, to a builder he's identified as AI-native and worth reaching out to.

ShipStacked is a hiring platform that surfaces builders by their actual shipped work, not by CV. It's specifically for the AI-native generation: people who ship with Claude Code, Cursor, Lovable, Bolt, and AI agents.

Your job: write ONE tweet that:
1. References something SPECIFIC about this builder's actual public work — a repo name, a project, a tool they built. Not generic praise.
2. Names ShipStacked once, briefly, in plain language.
3. Includes the link "shipstacked.com" exactly once.
4. Stays under 270 characters total (X tweet limit is 280, leave room).
5. Reads like one human writing to another. NOT salesy. NOT templated.
6. Lowercase casual style is fine. Founder voice: warm, direct, no fluff.
7. Ends with low-pressure framing — "thought you'd like it", "no pressure", "your call". Make it easy to ignore.

DO NOT:
- Use em-dashes (—). Use full stops or commas instead.
- Use emojis.
- Start with "Hey" or generic openers like "Saw your work".
- Sound like a recruiter or a marketer.
- Say "let's connect" or "let's chat".
- Repeat the @handle (the tweet platform handles tagging once).
- Use the word "platform" more than once.

OUTPUT FORMAT:
Return ONLY the tweet text. No JSON, no commentary, no quotation marks. Just the raw tweet starting with the @ tag.`

function buildUserPrompt(c: Candidate): string {
  const lines: string[] = []
  lines.push(`Builder to reach out to:`)
  lines.push(``)
  lines.push(`X handle: @${c.x_handle}`)
  lines.push(`GitHub: ${c.github_username}`)
  if (c.full_name) lines.push(`Name: ${c.full_name}`)
  if (c.location) lines.push(`Location: ${c.location}`)
  if (c.bio) lines.push(`GitHub bio: "${c.bio}"`)
  if (c.primary_profession) lines.push(`Profession: ${c.primary_profession}`)
  if (c.tier) lines.push(`Tier: ${c.tier}`)
  if (c.velocity_score && c.velocity_score > 0) lines.push(`Velocity score: ${c.velocity_score}`)
  if (c.shipping_evidence) lines.push(`Shipping evidence: ${c.shipping_evidence}`)

  if (c.top_repos) {
    let repos: Array<{ name?: string; description?: string; url?: string; readme_excerpt?: string }> = []
    try {
      if (typeof c.top_repos === 'string') {
        repos = JSON.parse(c.top_repos)
      } else if (Array.isArray(c.top_repos)) {
        repos = c.top_repos as Array<{ name?: string; description?: string }>
      }
    } catch { /* ignore */ }

    if (repos.length > 0) {
      lines.push(``)
      lines.push(`Top public repos:`)
      for (const r of repos.slice(0, 3)) {
        if (r.name) {
          let line = `- ${r.name}`
          if (r.description) line += `: ${r.description}`
          lines.push(line)
          if (r.readme_excerpt) {
            lines.push(`  README excerpt: "${r.readme_excerpt.slice(0, 200)}"`)
          }
        }
      }
    }
  }

  lines.push(``)
  lines.push(`Write the tweet now. Reference something SPECIFIC about this builder. Stay under 270 characters.`)

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

  // Fetch candidate
  const { data: candidate, error: fetchErr } = await admin
    .from('candidates')
    .select('id, github_username, full_name, x_handle, bio, location, primary_profession, top_repos, shipping_evidence, tier, velocity_score')
    .eq('id', candidateId)
    .single()

  if (fetchErr || !candidate) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
  }

  // Reuse recent draft if it exists and not forcing new
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

  // Generate new draft via Claude
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
  }

  const anthropic = new Anthropic({ apiKey })

  let draftText = ''
  let tokensIn = 0
  let tokensOut = 0

  try {
    const userPrompt = buildUserPrompt(candidate as Candidate)

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const block = response.content[0]
    if (block.type === 'text') {
      draftText = block.text.trim()
      // Strip surrounding quotes if Claude added them
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

  // Validate length (X cap is 280, but URLs auto-shorten to 23)
  // Rough check: if draft is over 280 raw, warn but still save
  if (draftText.length > 290) {
    console.warn('[draft] over length:', draftText.length, 'chars')
  }

  // Persist
  const { data: draft, error: insertErr } = await admin
    .from('outreach_drafts')
    .insert({
      candidate_id: candidateId,
      draft_text: draftText,
      prompt_used: 'recognition_v1',
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

  // Mark candidate as having a fresh draft
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
  })
}
