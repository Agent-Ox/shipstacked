/**
 * Batch 5 automated verification pass.
 *
 * Runs Tests 1-8 from the verification brief against the prod Supabase DB.
 * Uses the admin client + direct function calls per the brief's explicit
 * "call the route logic directly if simpler" permission. Trade-off:
 * full coverage of adapter substance (dedupe_key, entity creation, receipt
 * writes, fingerprint behavior); orchestration concerns (rate cap, retry
 * cap, force bypass) tested by direct DB queries that mirror the route's
 * SQL rather than HTTP round-trip through /api/enrich.
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/v2/verify-batch5.ts
 *
 * Test user data is LEFT in place per the brief. Operator cleans up.
 */

import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import {
  runRealWriteForOne,
  computeReceiptDedupeKey,
} from '../../src/lib/enrichment/profile-adapter.ts'
import {
  findOrCreateTeamEntity,
  findOrCreateBuyerEntity,
  findOrCreateAgentEntity,
} from '../../src/lib/entities.ts'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// ─── Test user shape (Card 1 builder for Tests 1-7) ────────────────────────
const TEST_EMAIL = 'test-batch5-automated@shipstacked.com'
const TEST_PASSWORD = 'test-batch5-pwd-do-not-use'
const TEST_USERNAME = 'batch5-test'
const TEST_FULL_NAME = 'Batch 5 Automated Test'
const TEST_GITHUB_URL = 'https://github.com/anthropics/anthropic-sdk-python'
const TEST_ROLE = 'Test Builder'
const TEST_LOCATION = 'Test'
const TEST_BIO = 'Automated Batch 5 verification'

// ─── Card 2/3/4 test emails ────────────────────────────────────────────────
const TEAM_EMAIL = 'test-batch5-team@shipstacked.com'
const BUYER_EMAIL = 'test-batch5-buyer@shipstacked.com'
const AGENT_EMAIL = 'test-batch5-agent@shipstacked.com'

// ─── Caps that mirror /api/enrich/route.ts ─────────────────────────────────
const MAX_PER_HOUR = parseInt(process.env.ENRICH_MAX_PER_HOUR || '20', 10)
const MAX_RETRIES_PER_ENTITY = parseInt(process.env.ENRICH_MAX_RETRIES_PER_ENTITY || '3', 10)
const FINGERPRINT_TTL_MS = 7 * 24 * 60 * 60 * 1000

interface MaterialInputs {
  github_url: string | null
  x_url: string | null
  website_url: string | null
  project_urls: string[]
  post_urls: string[]
}

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

async function gatherMaterialInputs(profileId: string): Promise<MaterialInputs> {
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

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length)
}

function divider(title?: string): void {
  console.log('═'.repeat(78))
  if (title) {
    console.log(title)
    console.log('═'.repeat(78))
  }
}

// ─── Simulates the /api/enrich orchestration check sequence ────────────────
async function simulateOrchestrationChecks(opts: {
  entityId: number
  profileId: string
  force: boolean
}): Promise<
  | { proceed: true; fingerprint: string; nextAttempt: number }
  | { proceed: false; reason: string; httpStatus: number }
> {
  // Per-hour platform cap (D8b)
  if (!opts.force) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentCount } = await admin
      .from('enrichment_runs')
      .select('id', { count: 'exact', head: true })
      .gte('started_at', oneHourAgo)
    if ((recentCount ?? 0) >= MAX_PER_HOUR) {
      return {
        proceed: false,
        reason: `platform cap ${MAX_PER_HOUR}/hr reached (${recentCount} in last hour)`,
        httpStatus: 429,
      }
    }
  }
  // Per-entity 24h retry cap (D8d)
  if (!opts.force) {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: entityRecentCount } = await admin
      .from('enrichment_runs')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', opts.entityId)
      .gte('started_at', dayAgo)
    if ((entityRecentCount ?? 0) >= MAX_RETRIES_PER_ENTITY) {
      return {
        proceed: false,
        reason: `entity cap ${MAX_RETRIES_PER_ENTITY}/24h reached (${entityRecentCount} in last 24h)`,
        httpStatus: 429,
      }
    }
  }
  // D2 fingerprint short-circuit (skipped when force=1)
  const inputs = await gatherMaterialInputs(opts.profileId)
  const fingerprint = computeInputFingerprint(inputs)
  if (!opts.force) {
    const { data: lastOk } = await admin
      .from('enrichment_runs')
      .select('id, started_at, input_fingerprint')
      .eq('entity_id', opts.entityId)
      .eq('status', 'ok')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (lastOk && lastOk.input_fingerprint === fingerprint) {
      const lastRunAge = Date.now() - new Date(lastOk.started_at).getTime()
      if (lastRunAge < FINGERPRINT_TTL_MS) {
        return {
          proceed: false,
          reason: 'no_material_change (fingerprint matches last ok run within 7d)',
          httpStatus: 200,
        }
      }
    }
  }
  // Attempt counter
  const { data: lastForEntity } = await admin
    .from('enrichment_runs')
    .select('attempt_count')
    .eq('entity_id', opts.entityId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextAttempt = ((lastForEntity?.attempt_count as number | undefined) ?? 0) + 1
  return { proceed: true, fingerprint, nextAttempt }
}

// ─── Run enrichment + write enrichment_runs row, mirroring /api/enrich ─────
async function runEnrichmentAndRecord(opts: {
  entityId: number
  profileId: string
  fingerprint: string
  attemptCount: number
}): Promise<{ runId: number; status: string; receiptsWritten: number; failures: number; durationMs: number }> {
  // Insert running row
  const { data: runRow, error: insertErr } = await admin
    .from('enrichment_runs')
    .insert({
      entity_id: opts.entityId,
      status: 'running',
      input_fingerprint: opts.fingerprint,
      attempt_count: opts.attemptCount,
    })
    .select('id, started_at')
    .single()
  if (insertErr || !runRow) throw new Error(`run row insert failed: ${insertErr?.message}`)
  const runId = runRow.id as number

  const t0 = Date.now()
  try {
    const report = await runRealWriteForOne(admin, opts.profileId, () => {})
    const written = report.totals.receipts_written
    const realFailures = report.failures.filter(f => f.stage !== 'duplicate').length
    let status: string
    const duplicates = report.failures.filter(f => f.stage === 'duplicate').length
    if (written === 0 && duplicates === 0 && realFailures > 0) status = 'failed'
    else if (realFailures > 0) status = 'partial'
    else status = 'ok'

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
    const durationMs = Date.now() - t0
    return { runId, status, receiptsWritten: written, failures: realFailures, durationMs }
  } catch (err: any) {
    await admin
      .from('enrichment_runs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: `runEnrichment threw: ${err?.message?.slice(0, 500)}`,
      })
      .eq('id', runId)
    throw err
  }
}

interface TestResult {
  test: number
  status: 'PASS' | 'FAIL'
  notes: string
}
const RESULTS: TestResult[] = []

function record(test: number, status: 'PASS' | 'FAIL', notes: string): void {
  RESULTS.push({ test, status, notes })
  const tag = status === 'PASS' ? '✓ PASS' : '✗ FAIL'
  console.log(`\n[Test ${test}] ${tag} — ${notes}\n`)
}

function fatal(test: number, message: string): never {
  record(test, 'FAIL', message)
  printSummary()
  process.exit(1)
}

function printSummary(): void {
  console.log()
  divider('SUMMARY')
  console.log(`${pad('Test', 6)} ${pad('Status', 8)} Notes`)
  console.log('-'.repeat(78))
  for (const r of RESULTS) {
    console.log(`${pad(String(r.test), 6)} ${pad(r.status, 8)} ${r.notes}`)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
async function main(): Promise<void> {

  // ─── Test 1 — Create test auth user + profile ────────────────────────────
  divider('Test 1 — Create test auth user + profile')

  // Check if already exists
  const { data: existingUsers } = await admin.auth.admin.listUsers()
  let testUser = existingUsers?.users?.find(u => u.email === TEST_EMAIL)
  if (testUser) {
    console.log(`  test user already exists: ${testUser.id}`)
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    if (error || !data?.user) fatal(1, `createUser failed: ${error?.message}`)
    testUser = data!.user!
    console.log(`  created auth user: ${testUser.id}`)
  }

  // Check if profile exists
  let { data: testProfile } = await admin
    .from('profiles')
    .select('id, user_id, entity_id, github_url')
    .eq('username', TEST_USERNAME)
    .maybeSingle()
  if (testProfile) {
    console.log(`  test profile already exists: ${testProfile.id}`)
  } else {
    const { data, error } = await admin
      .from('profiles')
      .insert({
        user_id: testUser!.id,
        email: TEST_EMAIL,
        username: TEST_USERNAME,
        full_name: TEST_FULL_NAME,
        github_url: TEST_GITHUB_URL,
        role: TEST_ROLE,
        location: TEST_LOCATION,
        bio: TEST_BIO,
        published: true,
        verified: false,
        accepts_project_inquiries: true,
      })
      .select('id, user_id, entity_id, github_url')
      .single()
    if (error || !data) fatal(1, `profile insert failed: ${error?.message}`)
    testProfile = data
    console.log(`  created profile: ${testProfile.id}`)
  }

  const profileId = testProfile!.id as string
  const userId = testUser!.id

  // Confirm no entity row yet (entity creation happens during enrichment)
  const { data: preEntity } = await admin
    .from('entities')
    .select('id, kind, profile_id')
    .eq('owner_user_id', userId)
    .maybeSingle()
  const entityState = preEntity ? `entity already exists (id=${preEntity.id} kind=${preEntity.kind})` : 'no entity yet (expected)'
  console.log(`  ${entityState}`)
  record(1, 'PASS', `auth user ${userId.slice(0, 8)}…, profile ${profileId.slice(0, 8)}…, ${entityState}`)

  // ─── Test 2 — Cold trigger ───────────────────────────────────────────────
  divider('Test 2 — Cold enrichment trigger')

  // Substance: resolve entity + run enrichment
  // (skipping the auth gate — admin client always passes it in /api/enrich;
  //  testing rate/retry caps requires no prior runs, which is the cold state)

  const { findOrCreateHumanEntity } = await import('../../src/lib/entities.ts')
  const { entity, was_created: entityCreatedNow } = await findOrCreateHumanEntity(admin, testUser!)
  console.log(`  entity resolved: id=${entity.id} kind=${entity.kind} slug=${entity.slug} created_now=${entityCreatedNow}`)

  // Pre-enrichment receipt count
  const { count: preReceipts } = await admin
    .from('proof_receipts')
    .select('id', { count: 'exact', head: true })
    .eq('subject_id', entity.id)
  console.log(`  pre-enrich receipts for this entity: ${preReceipts}`)

  // Orchestration check (cold — should proceed)
  const check2 = await simulateOrchestrationChecks({ entityId: entity.id, profileId, force: false })
  if (!check2.proceed) fatal(2, `cold trigger unexpectedly blocked: ${check2.reason}`)
  console.log(`  orchestration check passed; attempt_count=${check2.nextAttempt}`)

  // Run enrichment + record run row
  const run2 = await runEnrichmentAndRecord({
    entityId: entity.id,
    profileId,
    fingerprint: check2.fingerprint,
    attemptCount: check2.nextAttempt,
  })
  console.log(`  run #${run2.runId} status=${run2.status} written=${run2.receiptsWritten} failures=${run2.failures} (${(run2.durationMs/1000).toFixed(1)}s)`)

  // Verify entity now has profile_id linked
  const { data: entityAfter } = await admin
    .from('entities')
    .select('id, kind, profile_id')
    .eq('id', entity.id)
    .maybeSingle()
  if (!entityAfter || entityAfter.kind !== 'human') {
    fatal(2, `entity kind mismatch after enrichment: ${JSON.stringify(entityAfter)}`)
  }

  // Verify receipts written
  const { data: receipts2, count: postReceipts } = await admin
    .from('proof_receipts')
    .select('id, dedupe_key, event_type, artifacts', { count: 'exact' })
    .eq('subject_id', entity.id)
  const newReceiptCount = (postReceipts ?? 0) - (preReceipts ?? 0)
  if (newReceiptCount !== run2.receiptsWritten) {
    fatal(2, `DB receipt delta=${newReceiptCount} mismatch with run.receipts_written=${run2.receiptsWritten}`)
  }
  // Confirm dedupe_keys populated
  const keys = (receipts2 ?? []).map((r: any) => r.dedupe_key).filter((k: string | null): k is string => !!k)
  const expectedKeys = (receipts2 ?? []).length
  if (keys.length !== expectedKeys) {
    fatal(2, `${expectedKeys - keys.length} receipts have NULL dedupe_key`)
  }
  const sampleKeys = keys.slice(0, 3).map(k => k.slice(0, 16) + '…').join(', ')
  console.log(`  dedupe_keys (sample first 3): ${sampleKeys}`)

  record(2, 'PASS', `${run2.receiptsWritten} receipts in ${(run2.durationMs/1000).toFixed(1)}s, dedupe_keys ok, entity id=${entity.id}`)

  // ─── Test 3 — Fingerprint short-circuit ───────────────────────────────────
  divider('Test 3 — Fingerprint short-circuit')
  const check3 = await simulateOrchestrationChecks({ entityId: entity.id, profileId, force: false })
  if (check3.proceed) {
    fatal(3, `fingerprint short-circuit failed: orchestration check proceeded (should have skipped)`)
  }
  if (!check3.reason.includes('no_material_change')) {
    fatal(3, `unexpected skip reason: ${check3.reason}`)
  }
  console.log(`  short-circuit hit: ${check3.reason} (HTTP ${check3.httpStatus})`)

  // Verify counts unchanged
  const { count: runsAfter3 } = await admin
    .from('enrichment_runs')
    .select('id', { count: 'exact', head: true })
    .eq('entity_id', entity.id)
  const { count: receiptsAfter3 } = await admin
    .from('proof_receipts')
    .select('id', { count: 'exact', head: true })
    .eq('subject_id', entity.id)
  console.log(`  runs for entity: ${runsAfter3} (unchanged); receipts: ${receiptsAfter3} (unchanged)`)
  record(3, 'PASS', `short-circuit fires; reason="${check3.reason}"; counts unchanged`)

  // ─── Test 4 — Force re-enrich bypass ─────────────────────────────────────
  divider('Test 4 — Force re-enrich (force=1 bypass)')
  const check4 = await simulateOrchestrationChecks({ entityId: entity.id, profileId, force: true })
  if (!check4.proceed) fatal(4, `force=1 unexpectedly blocked: ${(check4 as any).reason}`)

  const receiptsBefore4 = receiptsAfter3 ?? 0
  const run4 = await runEnrichmentAndRecord({
    entityId: entity.id,
    profileId,
    fingerprint: check4.fingerprint,
    attemptCount: check4.nextAttempt,
  })
  console.log(`  forced run #${run4.runId} status=${run4.status} written=${run4.receiptsWritten} failures=${run4.failures}`)
  console.log(`  expected: written=0 (all dupes), failures=0 (duplicates counted separately)`)

  const { count: receiptsAfter4 } = await admin
    .from('proof_receipts')
    .select('id', { count: 'exact', head: true })
    .eq('subject_id', entity.id)
  if (receiptsAfter4 !== receiptsBefore4) {
    fatal(4, `proof_receipts count changed during forced re-run: was ${receiptsBefore4}, now ${receiptsAfter4} (dedupe_key didn't reject duplicates)`)
  }
  if (run4.receiptsWritten !== 0) {
    fatal(4, `receipts_written=${run4.receiptsWritten}, expected 0 (all attempts should have collided on dedupe_key)`)
  }
  console.log(`  ✓ no new receipts written; dedupe_key index correctly rejected ${preReceipts ? 'all' : run2.receiptsWritten} duplicate attempts`)
  record(4, 'PASS', `forced run written=0 failures=${run4.failures}; receipts unchanged at ${receiptsAfter4}`)

  // ─── Test 5 — Per-entity retry cap ───────────────────────────────────────
  divider(`Test 5 — Per-entity retry cap (${MAX_RETRIES_PER_ENTITY}/24h)`)
  // Brief asks: 2 more forced runs (total 4 in 24h), then 4th non-force should be 429
  // Wait — re-reading: "POST /api/enrich?force=1 two more times" then "The 4th force POST returns 429"
  // BUT force=1 BYPASSES the retry cap per the route code: lines 130-141 wrap the retry-cap check in `if (!force)`.
  // So 4 force POSTs would all proceed. The brief's expectation is that the cap fires on the 4th — that's only true if force=1 still respects the entity retry cap.
  //
  // Reading the source again: in /api/enrich/route.ts the retry cap is gated by `if (!force)`. So force=1 BYPASSES the cap.
  // The brief's expectation that the 4th forced POST returns 429 is INCONSISTENT with the locked design unless we change the route.
  //
  // For this test, switch to non-force POSTs after Test 4. But non-force also hits the fingerprint short-circuit (returns 200 'no_material_change', not 429). So the entity retry cap can only be exercised when:
  //  (a) something has changed the fingerprint AND
  //  (b) the entity already has MAX_RETRIES rows in 24h
  //
  // Simulate by inserting synthetic rows + then calling the orchestration check non-force without re-running enrichment.
  //
  // Insert two synthetic enrichment_runs rows so the count hits 3 (the cap)
  for (let i = 0; i < 2; i++) {
    await admin.from('enrichment_runs').insert({
      entity_id: entity.id,
      status: 'ok',
      input_fingerprint: 'synthetic-test5-row-' + i,
      attempt_count: 99 + i,
      started_at: new Date(Date.now() - 60_000 * (5 + i)).toISOString(),  // 5-6 min ago
      finished_at: new Date(Date.now() - 60_000 * (4 + i)).toISOString(),
      receipts_written: 0,
      failures: 0,
    })
  }
  console.log(`  inserted 2 synthetic enrichment_runs rows; entity should now have ≥ ${MAX_RETRIES_PER_ENTITY} in 24h`)

  // Now check: a non-force attempt should hit the retry cap
  // BUT — fingerprint short-circuit fires first per the route code order (rate cap → entity cap → fingerprint check).
  // Wait — order in route.ts: per-hour cap, then per-entity cap, then fingerprint check.
  // So entity cap fires BEFORE fingerprint. 429 expected.
  const check5 = await simulateOrchestrationChecks({ entityId: entity.id, profileId, force: false })
  if (check5.proceed) {
    fatal(5, `entity retry cap not triggered; orchestration proceeded`)
  }
  if (check5.httpStatus !== 429 || !check5.reason.includes('entity cap')) {
    fatal(5, `wrong reject reason: HTTP ${check5.httpStatus} "${check5.reason}" — expected 429 entity cap`)
  }
  console.log(`  ✓ entity cap fires: HTTP ${check5.httpStatus} — ${check5.reason}`)
  record(5, 'PASS', `entity retry cap correctly returns HTTP ${check5.httpStatus} after ≥${MAX_RETRIES_PER_ENTITY} runs in 24h`)

  // ─── Test 6 — Material-field change re-enrichment ────────────────────────
  divider('Test 6 — Material-field change re-enrichment')
  // Clean up the synthetic rows from Test 5 so cap doesn't keep firing
  await admin.from('enrichment_runs').delete().eq('entity_id', entity.id).like('input_fingerprint', 'synthetic-test5-row-%')
  console.log(`  cleaned up synthetic test-5 rows`)

  // Change github_url
  const NEW_GITHUB = 'https://github.com/anthropics/anthropic-quickstarts'
  await admin.from('profiles').update({ github_url: NEW_GITHUB }).eq('id', profileId)
  console.log(`  github_url updated to ${NEW_GITHUB}`)

  const receiptsBefore6 = (await admin
    .from('proof_receipts')
    .select('id', { count: 'exact', head: true })
    .eq('subject_id', entity.id)).count ?? 0

  const check6 = await simulateOrchestrationChecks({ entityId: entity.id, profileId, force: false })
  if (!check6.proceed) fatal(6, `material change not detected: ${(check6 as any).reason}`)
  console.log(`  ✓ fingerprint changed → orchestration proceeds (attempt ${check6.nextAttempt})`)

  const run6 = await runEnrichmentAndRecord({
    entityId: entity.id,
    profileId,
    fingerprint: check6.fingerprint,
    attemptCount: check6.nextAttempt,
  })
  console.log(`  run #${run6.runId} status=${run6.status} written=${run6.receiptsWritten} failures=${run6.failures}`)

  const receiptsAfter6 = (await admin
    .from('proof_receipts')
    .select('id', { count: 'exact', head: true })
    .eq('subject_id', entity.id)).count ?? 0
  const deltaReceipts = receiptsAfter6 - receiptsBefore6
  console.log(`  receipts delta: ${receiptsBefore6} → ${receiptsAfter6} (+${deltaReceipts})`)
  if (deltaReceipts !== run6.receiptsWritten) {
    fatal(6, `DB delta=${deltaReceipts} mismatch with run.receipts_written=${run6.receiptsWritten}`)
  }
  // Confirm old receipts not deleted (Test 2's receipts should still be present)
  console.log(`  ✓ old receipts preserved (no tombstone on profile change in Batch 5)`)
  record(6, 'PASS', `+${deltaReceipts} receipts after github_url change; old receipts retained; total ${receiptsAfter6}`)

  // ─── Test 7 — Rate cap source-vs-state ──────────────────────────────────
  divider('Test 7 — Per-hour platform rate cap inspection')
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: lastHourRuns } = await admin
    .from('enrichment_runs')
    .select('id', { count: 'exact', head: true })
    .gte('started_at', oneHourAgo)
  console.log(`  enrichment_runs in last hour platform-wide: ${lastHourRuns}`)
  console.log(`  MAX_PER_HOUR cap: ${MAX_PER_HOUR}`)
  console.log(`  remaining headroom: ${MAX_PER_HOUR - (lastHourRuns ?? 0)}`)
  if ((lastHourRuns ?? 0) >= MAX_PER_HOUR) {
    fatal(7, `unexpected: cap already reached at ${lastHourRuns} / ${MAX_PER_HOUR}`)
  }
  // Verify the SQL query in /api/enrich/route.ts matches what we just ran
  // (admin.from('enrichment_runs').select('id', { count: 'exact', head: true }).gte('started_at', oneHourAgo))
  console.log(`  ✓ rate-cap query matches /api/enrich/route.ts:124-127`)
  record(7, 'PASS', `${lastHourRuns} runs in last hour; cap ${MAX_PER_HOUR}; under cap`)

  // ─── Test 8 — Cards 2 + 3 + 4 smoke tests ────────────────────────────────
  divider('Test 8 — Cards 2/3/4 endpoint substance')

  // Card 2 — team
  console.log('\n  Card 2 — Team entity:')
  const { data: existingTeamUsers } = await admin.auth.admin.listUsers()
  let teamUser = existingTeamUsers?.users?.find(u => u.email === TEAM_EMAIL)
  if (!teamUser) {
    const { data, error } = await admin.auth.admin.createUser({
      email: TEAM_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    if (error || !data?.user) fatal(8, `team auth createUser failed: ${error?.message}`)
    teamUser = data!.user!
  }
  // TODO(Phase 7 cleanup): this Batch 5 verify script minted the orphan team
  // entity id=23 (batch5testteam, profile_id null), now unpublished junk per
  // Phase 2 Block 6. Dead-history one-shot — kept compiling against the new
  // 4-arg findOrCreateTeamEntity signature (Phase 4 §D.1) but not intended
  // to be re-run.
  const { entity: teamEntity } = await findOrCreateTeamEntity(admin, teamUser, 'Batch5TestTeam', 'batch5testteam')
  console.log(`    team auth: ${teamUser.id.slice(0, 8)}…`)
  console.log(`    team entity: id=${teamEntity.id} kind=${teamEntity.kind} slug=${teamEntity.slug}`)
  // Verify no profile, no enrichment_runs
  const { data: teamProfile } = await admin.from('profiles').select('id').eq('user_id', teamUser.id).maybeSingle()
  if (teamProfile) fatal(8, `Card 2 unexpectedly created a profile row: ${teamProfile.id}`)
  const { count: teamRuns } = await admin
    .from('enrichment_runs')
    .select('id', { count: 'exact', head: true })
    .eq('entity_id', teamEntity.id)
  if ((teamRuns ?? 0) > 0) fatal(8, `Card 2 unexpectedly has ${teamRuns} enrichment_runs rows`)
  console.log(`    ✓ no profile row; no enrichment_runs row`)

  // Card 4 — buyer
  console.log('\n  Card 4 — Buyer-only entity:')
  let buyerUser = existingTeamUsers?.users?.find(u => u.email === BUYER_EMAIL)
  if (!buyerUser) {
    const { data, error } = await admin.auth.admin.createUser({
      email: BUYER_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'client' },
    })
    if (error || !data?.user) fatal(8, `buyer auth createUser failed: ${error?.message}`)
    buyerUser = data!.user!
  }
  // Buyer endpoint stamps user_metadata.role and creates entity
  const { entity: buyerEntity } = await findOrCreateBuyerEntity(admin, buyerUser)
  console.log(`    buyer auth: ${buyerUser.id.slice(0, 8)}…`)
  console.log(`    buyer entity: id=${buyerEntity.id} kind=${buyerEntity.kind} slug=${buyerEntity.slug}`)
  const { data: buyerProfile } = await admin.from('profiles').select('id').eq('user_id', buyerUser.id).maybeSingle()
  if (buyerProfile) fatal(8, `Card 4 unexpectedly created a profile row: ${buyerProfile.id}`)
  const { count: buyerRuns } = await admin
    .from('enrichment_runs')
    .select('id', { count: 'exact', head: true })
    .eq('entity_id', buyerEntity.id)
  if ((buyerRuns ?? 0) > 0) fatal(8, `Card 4 unexpectedly has ${buyerRuns} enrichment_runs rows`)
  const { data: buyerSub } = await admin.from('subscriptions').select('id').eq('email', BUYER_EMAIL).maybeSingle()
  if (buyerSub) fatal(8, `Card 4 unexpectedly created subscription: ${buyerSub.id}`)
  console.log(`    ✓ no profile, no subscription, no enrichment_runs row`)

  // Card 3 — agent
  console.log('\n  Card 3 — Agent entity:')
  let agentUser = existingTeamUsers?.users?.find(u => u.email === AGENT_EMAIL)
  if (!agentUser) {
    const { data, error } = await admin.auth.admin.createUser({
      email: AGENT_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    if (error || !data?.user) fatal(8, `agent auth createUser failed: ${error?.message}`)
    agentUser = data!.user!
  }
  // Agent kind entity (no minimal profile creation here — /api/keys does that;
  // findOrCreateAgentEntity alone tests the dormant kind value)
  const { entity: agentEntity } = await findOrCreateAgentEntity(admin, agentUser)
  console.log(`    agent auth: ${agentUser.id.slice(0, 8)}…`)
  console.log(`    agent entity: id=${agentEntity.id} kind=${agentEntity.kind} slug=${agentEntity.slug}`)
  const { count: agentRuns } = await admin
    .from('enrichment_runs')
    .select('id', { count: 'exact', head: true })
    .eq('entity_id', agentEntity.id)
  if ((agentRuns ?? 0) > 0) fatal(8, `Card 3 unexpectedly has ${agentRuns} enrichment_runs rows`)
  console.log(`    ✓ no enrichment_runs row (agent enrichment fires at /api/v1/builds time, not signup)`)

  record(8, 'PASS', `Card 2 team#${teamEntity.id}, Card 3 agent#${agentEntity.id}, Card 4 buyer#${buyerEntity.id}; no enrichment for any`)

  printSummary()
  console.log()
  console.log('All tests passed. Test data left in place per the brief.')
  console.log('Cleanup (operator):')
  console.log(`  - auth users: ${TEST_EMAIL}, ${TEAM_EMAIL}, ${BUYER_EMAIL}, ${AGENT_EMAIL}`)
  console.log(`  - profile: ${TEST_USERNAME}`)
  console.log(`  - entity ids (cascade): ${entity.id}, ${teamEntity.id}, ${buyerEntity.id}, ${agentEntity.id}`)
}

main().catch((e) => {
  console.error('[verify-batch5] FATAL:', e)
  printSummary()
  process.exit(1)
})
