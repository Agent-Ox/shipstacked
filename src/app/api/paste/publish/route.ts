/**
 * POST /api/paste/publish
 *
 * Step 6 of V2 Phase 1A. Turns a paste-flow draft into a committed proof
 * receipt with canonical URL. See docs/v2/STEP_6_PUBLISH_API_SPEC.md.
 *
 * The route is a thin shell over src/lib/paste/publish.ts:
 *   - rate limit
 *   - auth check (Supabase session cookie)
 *   - resolve draft: inline body is authoritative (carries user edits);
 *     draft_id is treated as a pointer for Redis cleanup only
 *   - zod-validate the draft
 *   - delegate to publishProofReceipt() with the service-role admin client
 *   - map result → HTTP response
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { rateLimit } from '@/lib/rateLimit'
import { PasteDraftSchema, publishProofReceipt } from '@/lib/paste/publish'
import { getDraft } from '@/lib/paste/draft'
import type { EntityRow } from '@/lib/entities'

const RATE_WINDOW_SECONDS = 60
const RATE_PER_IP = 20
const RATE_GLOBAL = 100

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: Request) {
  const ip = clientIp(req)
  const ipCheck = await rateLimit(`paste_publish_ip:${ip}`, RATE_WINDOW_SECONDS, RATE_PER_IP)
  if (!ipCheck.success) {
    const retryAfter = Math.max(1, ipCheck.reset - Math.floor(Date.now() / 1000))
    return NextResponse.json(
      { success: false, error: 'rate_limited', message: 'Too many requests. Try again in a minute.' },
      { status: 429, headers: { 'retry-after': String(retryAfter) } },
    )
  }
  const globalCheck = await rateLimit('paste_publish_global', RATE_WINDOW_SECONDS, RATE_GLOBAL)
  if (!globalCheck.success) {
    const retryAfter = Math.max(1, globalCheck.reset - Math.floor(Date.now() / 1000))
    return NextResponse.json(
      { success: false, error: 'rate_limited', message: 'Publisher is busy. Try again in a minute.' },
      { status: 429, headers: { 'retry-after': String(retryAfter) } },
    )
  }

  // ── Auth ──────────────────────────────────────────────────────────────
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'unauthenticated', message: 'Sign in to publish.' },
      { status: 401 },
    )
  }

  // ── Body ──────────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'invalid_draft', message: 'Body must be JSON.' },
      { status: 400 },
    )
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { success: false, error: 'invalid_draft', message: 'Body must be a JSON object.' },
      { status: 400 },
    )
  }
  const o = body as Record<string, unknown>
  const draftId = typeof o.draft_id === 'string' ? o.draft_id : undefined
  const inlineDraft = o.draft
  // Phase 4 §J — optional explicit subject identity (the "Post as" picker).
  const subjectEntityId = typeof o.subject_entity_id === 'number' ? o.subject_entity_id : undefined

  if (!draftId) {
    return NextResponse.json(
      { success: false, error: 'invalid_draft', message: 'draft_id is required.' },
      { status: 400 },
    )
  }
  if (!inlineDraft) {
    return NextResponse.json(
      { success: false, error: 'invalid_draft', message: 'draft is required.' },
      { status: 400 },
    )
  }

  // Redis presence is the idempotency token (spec §6): once a draft is
  // published, the Redis key is deleted; a second click sees no draft and
  // gets draft_expired. The inline draft remains the authority for content.
  const redisDraft = await getDraft(draftId)
  if (!redisDraft) {
    return NextResponse.json(
      { success: false, error: 'draft_expired', message: 'Draft has expired or already been published. Start again from /paste.' },
      { status: 400 },
    )
  }

  const parsed = PasteDraftSchema.safeParse(inlineDraft)
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'invalid_draft',
        message: 'Draft failed validation.',
        details: parsed.error.issues.slice(0, 5).map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
      { status: 400 },
    )
  }

  // ── Subject entity (Phase 4 §J) — when the user picked a non-default
  // identity, resolve it and ownership-check it (can't post as someone else's
  // identity). Omitted → publishProofReceipt defaults to human resolution. ──
  const admin = adminClient()
  let subjectEntity: EntityRow | undefined
  if (subjectEntityId !== undefined) {
    if (!Number.isInteger(subjectEntityId) || subjectEntityId <= 0) {
      return NextResponse.json(
        { success: false, error: 'invalid_draft', message: 'subject_entity_id must be a positive integer.' },
        { status: 400 },
      )
    }
    const { data: ent } = await admin
      .from('entities')
      .select('id, external_id, kind, display_name, slug, owner_user_id, profile_id')
      .eq('id', subjectEntityId)
      .eq('owner_user_id', user.id)
      .maybeSingle()
    if (!ent) {
      return NextResponse.json(
        { success: false, error: 'invalid_draft', message: 'subject_entity_id must reference an entity owned by the current user.' },
        { status: 400 },
      )
    }
    subjectEntity = ent as EntityRow
  }

  // ── Delegate ──────────────────────────────────────────────────────────
  const result = await publishProofReceipt({
    admin,
    user,
    draft: parsed.data,
    draftId,
    requestId: req.headers.get('x-vercel-id') ?? req.headers.get('x-request-id') ?? undefined,
    subjectEntity,
  })

  if (result.success) {
    return NextResponse.json({
      success: true,
      canonical_url: result.canonical_url,
      slug: result.slug,
      id: result.id,
      entity_canonical_url: result.entity_canonical_url,
    })
  }
  const status = result.error === 'invalid_draft' ? 400 : 500
  return NextResponse.json(result, { status })
}
