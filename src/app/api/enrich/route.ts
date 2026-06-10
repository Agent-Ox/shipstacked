/**
 * Batch 5 — auto-enrichment orchestration endpoint.
 *
 * Triggers profile→engine enrichment for a single profile. Called by:
 *   - /join Card 1 after successful profile insert
 *   - EditProfileForm.handleSave after profile update
 *   - /admin "Re-enrich entity" button (admin-only, with ?force=1)
 *
 * Single endpoint holds all orchestration (per Batch 5 §I YAGNI revision —
 * no separate trigger.ts helper). On 200/202 response, enrichment runs via
 * Vercel's `waitUntil` so the function context survives past the response.
 *
 * Locked decisions implemented here:
 *   D1=(b) async fire-and-forget via waitUntil
 *   D2=(b) material-field diff via input_fingerprint check
 *   D3=(d) hybrid: enrichment_runs row + per-receipt dedupe_key (latter in
 *          src/lib/enrichment/profile-adapter.ts and src/lib/paste/publish.ts)
 *   D7=(d) per-artifact granular (existing) + entity-level retry cap
 *   D8=(b)+(d) per-hour count cap + per-entity max retries
 */

import { NextResponse, after } from 'next/server'
import { createHash } from 'node:crypto'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { runRealWriteForOne } from '@/lib/enrichment/profile-adapter'
import { authenticateApiKey } from '@/lib/apiAuth'
import { resolveEntityKindForOwner, findOrCreateAgentEntity, findOrCreateHumanEntity, type EntityRow } from '@/lib/entities'

const ADMIN_EMAIL = 'oxleethomas+admin@gmail.com'

// Env-var-driven caps (D8). Defaults match the locked spec values.
const MAX_PER_HOUR = parseInt(process.env.ENRICH_MAX_PER_HOUR || '20', 10)
const MAX_RETRIES_PER_ENTITY = parseInt(process.env.ENRICH_MAX_RETRIES_PER_ENTITY || '3', 10)

// Material-fields fingerprint TTL — if the most-recent ok run was within
// this window and the fingerprint matches, skip re-enrichment (D2). Beyond
// the window, re-enrich even if the inputs haven't changed (e.g. classifier
// version bump should propagate; GitHub repo content may have changed).
const FINGERPRINT_TTL_MS = 7 * 24 * 60 * 60 * 1000  // 7 days

type Status = 'running' | 'ok' | 'partial' | 'failed'

interface MaterialInputs {
  github_url: string | null
  x_url: string | null
  website_url: string | null
  project_urls: string[]
  post_urls: string[]
}

/**
 * Compute the SHA256 input fingerprint for D2 material-field diff. Sorted
 * arrays so insertion order doesn't change the hash; null normalized to
 * empty string so absent-vs-empty match.
 */
function computeInputFingerprint(inputs: MaterialInputs): string {
  const canonical = JSON.stringify({
    github_url: inputs.github_url || '',
    x_url: inputs.x_url || '',
    website_url: inputs.website_url || '',
    project_urls: [...inputs.project_urls].sort(),
    post_urls: [...inputs.post_urls].sort(),
  })
  return createHash('sha256').update(canonical).digest('hex')
}

async function gatherMaterialInputs(admin: SupabaseClient, profileId: string): Promise<MaterialInputs> {
  const [{ data: profile }, { data: projects }, { data: posts }] = await Promise.all([
    admin.from('profiles').select('github_url, x_url, website_url').eq('id', profileId).maybeSingle(),
    admin.from('projects').select('project_url').eq('profile_id', profileId),
    admin.from('posts').select('url').eq('profile_id', profileId),
  ])
  const p = profile as { github_url: string | null; x_url: string | null; website_url: string | null } | null
  return {
    github_url: p?.github_url ?? null,
    x_url: p?.x_url ?? null,
    website_url: p?.website_url ?? null,
    project_urls: (projects ?? []).map((p: any) => p.project_url).filter((u: string | null): u is string => !!u),
    post_urls: (posts ?? []).map((p: any) => p.url).filter((u: string | null): u is string => !!u),
  }
}

export async function POST(req: Request) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let resolvedProfile: { id: string; user_id: string | null; username: string }
  let targetUser: User
  let force = false
  // Phase 4 §D.3: the API key's scope drives which entity kind a receipt is
  // attributed to. Undefined on the cookie-session path (no scope → human-first).
  let hintScope: 'builder:rw' | 'buyer:rw' | 'agent:rw' | 'team:rw' | undefined

  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer sk_ss_')) {
    // ── API-key path (agent enrichment trigger from /api/v1/builds) ────
    const apiAuth = await authenticateApiKey(req)
    if (!apiAuth.ok) {
      return NextResponse.json({ error: apiAuth.error }, { status: apiAuth.status })
    }
    const p = apiAuth.auth.profile as { id: string; user_id: string | null; username: string }
    if (!p.user_id) {
      return NextResponse.json({ error: 'API-key profile has no user_id' }, { status: 500 })
    }
    resolvedProfile = { id: p.id, user_id: p.user_id, username: p.username }
    const { data: lookup } = await admin.auth.admin.getUserById(p.user_id)
    if (!lookup?.user) {
      return NextResponse.json({ error: 'Auth user not found for API key' }, { status: 500 })
    }
    targetUser = lookup.user
    hintScope = apiAuth.auth.scope
    // API-key auth ignores ?force=1 (no admin override on the agent path).
  } else {
    // ── Cookie-session path (Card 1 signup, EditProfileForm, admin re-enrich) ─
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(req.url)
    force = url.searchParams.get('force') === '1'

    let body: { profile_id?: string; entity_id?: number } = {}
    try { body = await req.json() } catch { /* allow empty body */ }

    let profileId: string
    if (body.profile_id) {
      profileId = body.profile_id
    } else {
      const { data: ownProfile } = await admin
        .from('profiles')
        .select('id')
        .eq('email', user.email)
        .maybeSingle()
      if (!ownProfile) {
        return NextResponse.json({ error: 'No profile for current user' }, { status: 400 })
      }
      profileId = ownProfile.id
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('id, user_id, username')
      .eq('id', profileId)
      .maybeSingle()
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const isAdmin = user.email === ADMIN_EMAIL || user.user_metadata?.role === 'admin'
    const isOwner = profile.user_id === user.id
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    resolvedProfile = { id: profile.id, user_id: profile.user_id, username: profile.username }
    // Admin re-enrich of another user's profile: resolve the entity for the
    // TARGET profile's owner, not the admin's session user (preserves pre-5R behavior).
    if (!isOwner && profile.user_id) {
      const { data: lookup } = await admin.auth.admin.getUserById(profile.user_id)
      targetUser = lookup?.user ?? user
    } else {
      targetUser = user
    }
  }

  // ── From here, both auth paths converge ────────────────────────────────
  const profileId = resolvedProfile.id

  // Route entity resolution by kind. Agents (API-key auth or any user owning a
  // kind='agent' entity) get their agent entity; humans get their human entity.
  // The resolved entity is threaded into runEnrichment → publishProofReceipt
  // via the new subjectEntity option (Phase 1 Block 5R).
  const kind = await resolveEntityKindForOwner(admin, targetUser.id, hintScope)
  let entity: EntityRow
  try {
    if (kind === 'agent') {
      const result = await findOrCreateAgentEntity(admin, targetUser)
      entity = result.entity
    } else if (kind === 'team') {
      // Team-scoped key: resolve the team entity this user owns. Teams are not
      // minted on this path — they're created via /api/join/team (Phase 4 §E).
      const { data: teamRow } = await admin
        .from('entities')
        .select('id, external_id, kind, display_name, slug, owner_user_id, profile_id')
        .eq('kind', 'team')
        .eq('owner_user_id', targetUser.id)
        .limit(1)
        .maybeSingle()
      if (!teamRow) {
        return NextResponse.json({ error: 'No team entity for team-scoped key' }, { status: 500 })
      }
      entity = teamRow as EntityRow
    } else {
      // 'human' OR null (genuinely new account) — both go through human factory.
      const result = await findOrCreateHumanEntity(admin, targetUser)
      entity = result.entity
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Entity resolution failed: ${err.message}` }, { status: 500 })
  }
  const entityId = entity.id

  // ── D8(b) per-hour count cap (platform-wide) ────────────────────────────
  if (!force) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentCount } = await admin
      .from('enrichment_runs')
      .select('id', { count: 'exact', head: true })
      .gte('started_at', oneHourAgo)
    if ((recentCount ?? 0) >= MAX_PER_HOUR) {
      return NextResponse.json({
        skipped: 'rate_limited',
        reason: `platform cap ${MAX_PER_HOUR}/hr reached (${recentCount} in last hour)`,
      }, { status: 429 })
    }
  }

  // ── D8(d) per-entity max retries in 24h ─────────────────────────────────
  if (!force) {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: entityRecentCount } = await admin
      .from('enrichment_runs')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', entityId)
      .gte('started_at', dayAgo)
    if ((entityRecentCount ?? 0) >= MAX_RETRIES_PER_ENTITY) {
      return NextResponse.json({
        skipped: 'entity_retry_cap',
        reason: `entity cap ${MAX_RETRIES_PER_ENTITY}/24h reached (${entityRecentCount} in last 24h)`,
      }, { status: 429 })
    }
  }

  // ── D2 fingerprint check: skip if material inputs unchanged & recent ───
  const inputs = await gatherMaterialInputs(admin, profileId)
  const fingerprint = computeInputFingerprint(inputs)

  if (!force) {
    const { data: lastOk } = await admin
      .from('enrichment_runs')
      .select('id, started_at, input_fingerprint')
      .eq('entity_id', entityId)
      .eq('status', 'ok')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (lastOk && lastOk.input_fingerprint === fingerprint) {
      const lastRunAge = Date.now() - new Date(lastOk.started_at).getTime()
      if (lastRunAge < FINGERPRINT_TTL_MS) {
        return NextResponse.json({
          skipped: 'no_material_change',
          reason: 'input fingerprint matches last ok run within 7d',
          last_run_id: lastOk.id,
          last_run_at: lastOk.started_at,
        })
      }
    }
  }

  // ── Determine attempt_count (entity-level retry counter) ────────────────
  const { data: lastForEntity } = await admin
    .from('enrichment_runs')
    .select('attempt_count')
    .eq('entity_id', entityId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const attemptCount = ((lastForEntity?.attempt_count as number | undefined) ?? 0) + 1

  // ── Insert enrichment_runs row with status='running' ────────────────────
  const { data: runRow, error: insertErr } = await admin
    .from('enrichment_runs')
    .insert({
      entity_id: entityId,
      status: 'running' as Status,
      input_fingerprint: fingerprint,
      attempt_count: attemptCount,
    })
    .select('id')
    .single()
  if (insertErr || !runRow) {
    return NextResponse.json({ error: `Run row insert failed: ${insertErr?.message}` }, { status: 500 })
  }
  const runId = runRow.id as number

  // ── Fire enrichment via `after` (Next.js 16 stable; equivalent to
  // Vercel's waitUntil) ──────────────────────────────────────────────────
  // Bare `runEnrichment(...)` without await would die when this response is
  // sent (serverless tears down the function context). `after` tells
  // Next.js / Vercel to keep the function alive until the promise resolves
  // (bounded by the function timeout — max ~60s on default plan).
  after(runEnrichment(admin, runId, profileId, entity))

  return NextResponse.json({
    accepted: true,
    run_id: runId,
    entity_id: entityId,
    profile_id: profileId,
    attempt_count: attemptCount,
  }, { status: 202 })
}

/**
 * Background enrichment runner. Runs after the POST response is sent;
 * `waitUntil` keeps the function alive until this resolves (bounded by
 * the Vercel function timeout — max ~60s on default plan).
 */
async function runEnrichment(
  admin: SupabaseClient,
  runId: number,
  profileId: string,
  subjectEntity?: EntityRow,
): Promise<void> {
  const log = (msg: string) => console.log(`[enrich run=${runId}] ${msg}`)
  log('start')
  try {
    const report = await runRealWriteForOne(admin, profileId, log, { subjectEntity })
    const written = report.totals.receipts_written
    const realFailures = report.failures.filter(f => f.stage !== 'duplicate').length
    const duplicates = report.failures.filter(f => f.stage === 'duplicate').length

    // Status resolution:
    //   - all failures (no writes, no dupes) → 'failed'
    //   - some writes + some failures → 'partial'
    //   - writes only (or pure dupes — already enriched) → 'ok'
    let status: Status
    if (written === 0 && duplicates === 0 && realFailures > 0) {
      status = 'failed'
    } else if (realFailures > 0) {
      status = 'partial'
    } else {
      status = 'ok'
    }

    log(`done status=${status} written=${written} failures=${realFailures} dupes=${duplicates}`)

    await admin
      .from('enrichment_runs')
      .update({
        status,
        finished_at: new Date().toISOString(),
        receipts_written: written,
        failures: realFailures,
        error_message: realFailures > 0
          ? report.failures.filter(f => f.stage !== 'duplicate').slice(0, 3).map(f => `${f.stage}: ${f.error.slice(0, 200)}`).join(' | ')
          : null,
      })
      .eq('id', runId)
  } catch (err: any) {
    log(`fatal ${err?.message}`)
    await admin
      .from('enrichment_runs')
      .update({
        status: 'failed' as Status,
        finished_at: new Date().toISOString(),
        error_message: `runEnrichment threw: ${err?.message?.slice(0, 500) || String(err).slice(0, 500)}`,
      })
      .eq('id', runId)
  }
}
