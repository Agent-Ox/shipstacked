# Phase 1 — Revised Block 5

**Supersedes the original Block 5 in `docs/audit/PHASE1_DIFF_PLAN.md`.** Same goal: agent-posted builds via `/api/v1/builds` produce `proof_receipts` rows with `subject_id = agent_entity_id`, agents enter the ranking engine.

**What changed from the original:** the receipt's `subject_id` is set inside `publishProofReceipt`, not in the adapter. So the subject entity has to be threaded from `/api/enrich` → `runRealWriteForOne` → `runRealWrite` → `processArtifactForWrite` → `publishProofReceipt`. Five files, not three. The original plan was a layer too shallow.

**§5.1 is already shipped** (`resolveEntityKindForOwner` exists in `src/lib/entities.ts` HEAD). Don't re-do it.

---

## Pre-edit reads

Before any edits, view these so the FROM strings match verbatim:

1. `src/lib/paste/publish.ts` lines 1-100 (imports + types + `PasteDraftSchema`).
2. `src/lib/paste/publish.ts` lines 180-260 (the `findOrCreateHumanEntity` call site and `subject_id` insert).
3. `src/lib/paste/publish.ts` — search for `findOrCreateHumanEntity` to find the exact line. Confirm there's only one call site in this file.
4. `src/lib/enrichment/profile-adapter.ts` lines 940-960 (the `findOrCreateHumanEntity` call site + dedupe-key entity).
5. `src/lib/enrichment/profile-adapter.ts` — search for `runRealWriteForOne`, `runRealWrite`, `processArtifactForWrite`. Find each function's signature and where they call each other.
6. `src/app/api/enrich/route.ts` lines 200-304 (the bits the original plan said to "preserve verbatim" — `enrichment_runs` insert, `runEnrichment` wrapper, caps).
7. `src/app/api/v1/builds/route.ts` full file (96 lines) — confirm the throwaway-query block at line 55 and the response shape.

After all reads, proceed.

---

## 5R.1 — Extend `publishProofReceipt` to accept an explicit subject entity

The publish writer is the canonical subject-resolution point. Add an optional parameter that pins the subject entity; when present, skip the internal `findOrCreateHumanEntity` call.

### 5R.1a — Update the call signature

View `src/lib/paste/publish.ts` to find the `publishProofReceipt` function signature (likely around the top of the file or in a typed block). The signature today takes something like:

```ts
export async function publishProofReceipt({
  admin,
  user,
  draft,
}: PublishArgs): Promise<PublishResult>
```

(The actual variable names and structure may differ — confirm via the pre-edit read.)

Add an optional `subjectEntity` field to the args type. Pseudo:

```ts
type PublishArgs = {
  admin: SupabaseClient
  user: User
  draft: PasteDraft
  // Phase 1: optional explicit subject entity. When provided, publishProofReceipt
  // uses this entity for proof_receipts.subject_id and skips internal
  // findOrCreateHumanEntity resolution. Used by /api/enrich on the API-key path
  // to route agent-owned receipts onto the agent's kind='agent' entity instead
  // of forcing them onto a (possibly newly-minted) human entity.
  subjectEntity?: EntityRow
}
```

Find the exact existing type definition and add `subjectEntity?: EntityRow` as a new optional field. Import `EntityRow` from `@/lib/entities` if not already imported.

### 5R.1b — Branch the entity resolution inside the function body

Find the line(s) in `src/lib/paste/publish.ts` where `findOrCreateHumanEntity(admin, user)` is called and its result is destructured. The original plan referenced this around line 194 with `entityResult = await findOrCreateHumanEntity(admin, user)` and `subject_id: entity.id` around line 236.

Replace the unconditional call with a branch:

```ts
// Phase 1: prefer caller-provided subject entity (agent enrichment path);
// fall back to human-entity resolution (legacy Card 1 signup, EditProfileForm,
// /paste/review paths — all of which write human-subject receipts).
let entity: EntityRow
let entity_was_created = false
if (subjectEntity) {
  entity = subjectEntity
  // entity_was_created stays false — caller already minted/resolved.
} else {
  const result = await findOrCreateHumanEntity(admin, user)
  entity = result.entity
  entity_was_created = result.was_created
}
```

Wherever the existing code uses `entityResult.entity` or `entityResult.was_created`, switch to the new `entity` / `entity_was_created` locals. The rest of the function body (zod validation, slug generation, the `proof_receipts` INSERT with `subject_id: entity.id`, the 23505 retry handler, the verification_events INSERT, etc.) stays unchanged.

### 5R.1c — Validate

```
npx tsc --noEmit
```

Expected: clean. Existing callers don't pass `subjectEntity`, so they continue using human-entity resolution. The new param is purely additive.

---

## 5R.2 — Thread `subjectEntity` through the adapter chain

The adapter has three nested functions: `runRealWriteForOne` → `runRealWrite` → `processArtifactForWrite`. Each must accept and pass through the optional `subjectEntity`. The dedupe-key computation also needs the entity, so it matches the receipt's subject.

### 5R.2a — `processArtifactForWrite` signature

In `src/lib/enrichment/profile-adapter.ts`, find `processArtifactForWrite`. Its current signature takes admin/profile/artifact/etc. After the pre-edit read, you'll know its exact parameter list.

Add an optional `subjectEntity?: EntityRow` parameter at the end. Inside, where it currently constructs the publish args and calls `publishProofReceipt`, pass `subjectEntity` through:

```ts
const publishResult = await publishProofReceipt({
  admin,
  user,
  draft,
  ...(subjectEntity ? { subjectEntity } : {}),
})
```

Also update the dedupe-key entity. The pre-edit read should show where the dedupe key is computed (around line 942-950, the `findOrCreateHumanEntity` self-call mentioned in the original comment "findOrCreateHumanEntity is invoked inside publishProofReceipt"). The adapter currently calls `findOrCreateHumanEntity` to capture `entity.id` for `computeReceiptDedupeKey`. Replace with the same branch pattern:

```ts
let dedupeEntity: EntityRow
if (subjectEntity) {
  dedupeEntity = subjectEntity
} else {
  const result = await findOrCreateHumanEntity(admin, user)
  dedupeEntity = result.entity
}
const dedupeKey = computeReceiptDedupeKey(dedupeEntity.id, normalizedUrl, eventType)
```

(Adjust variable names to match what's actually in the file.)

### 5R.2b — `runRealWrite` signature

In `src/lib/enrichment/profile-adapter.ts`, find `runRealWrite`. Add an optional `subjectEntity?: EntityRow` parameter. Pass it through to every `processArtifactForWrite` call inside.

### 5R.2c — `runRealWriteForOne` signature

Find `runRealWriteForOne`. Current signature (confirmed from terminal Claude's previous read):

```ts
export async function runRealWriteForOne(
  admin: SupabaseClient,
  profileId: string,
  log: (msg: string) => void = () => {},
): Promise<WriteReport>
```

Add an optional 4th parameter:

```ts
export async function runRealWriteForOne(
  admin: SupabaseClient,
  profileId: string,
  log: (msg: string) => void = () => {},
  opts?: { subjectEntity?: EntityRow },
): Promise<WriteReport>
```

Pass `opts?.subjectEntity` into the inner `runRealWrite` call.

### 5R.2d — Validate

```
npx tsc --noEmit
```

Expected: clean. Existing callers (`/api/enrich` on its current cookie-session path) don't pass `opts`, so they continue using the human-entity resolution baked into `processArtifactForWrite`.

---

## 5R.3 — Extend `/api/enrich/route.ts` with dual-auth + entity-kind routing

This is the largest single file change. The plan: add an API-key branch at the top, route entity resolution through `resolveEntityKindForOwner`, then thread the resolved entity into the existing `runEnrichment` wrapper.

### 5R.3a — Add imports

At the top of `src/app/api/enrich/route.ts`, ensure these imports exist (add what's missing):

```ts
import { authenticateApiKey } from '@/lib/apiAuth'
import { resolveEntityKindForOwner, findOrCreateAgentEntity, findOrCreateHumanEntity, type EntityRow } from '@/lib/entities'
import type { User } from '@supabase/supabase-js'
```

Don't duplicate any that already exist.

### 5R.3b — Restructure the POST handler

The current handler (lines ~85-205 per the pre-flight read) does cookie-session-only auth, then resolves the profile via body.profile_id or self-email-lookup, then auth-gates (isOwner || isAdmin), then calls `findOrCreateHumanEntity` to get the entity for caps/runs queries, then runs caps + fingerprint + `enrichment_runs` insert + `after(runEnrichment(...))`.

The restructure inserts the API-key branch above the cookie-session branch and routes entity resolution through `resolveEntityKindForOwner`. Everything from caps onward stays intact.

Find this block (around line 85, the cookie-session check that returns 401):

```ts
export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const url = new URL(req.url)
  const force = url.searchParams.get('force') === '1'

  let body: { profile_id?: string; entity_id?: number } = {}
  try { body = await req.json() } catch { /* allow empty body — caller may target self */ }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
```

(Adjust to actual file content via the pre-edit read.)

Replace this opening with:

```ts
export async function POST(req: Request) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let resolvedProfile: { id: string; user_id: string | null; username: string }
  let targetUser: User
  let isApiKeyAuth = false
  let force = false

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
    isApiKeyAuth = true
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
    targetUser = user
  }

  // ── From here, both auth paths converge ────────────────────────────────
```

After this convergence point, the existing code continues — but with the entity resolution replaced:

Find the existing `findOrCreateHumanEntity` call (around line 145-155 per the original file). Replace:

```ts
  // OLD:
  // const { entity } = await findOrCreateHumanEntity(admin, targetUser)
  // const entityId = entity.id
```

with:

```ts
  // Route entity resolution by kind. Agents (API-key auth or any user owning a
  // kind='agent' entity) get their agent entity; humans get their human entity.
  // The resolved entity is threaded into runEnrichment → publishProofReceipt
  // via the new subjectEntity option (Phase 1 Block 5R).
  const kind = await resolveEntityKindForOwner(admin, targetUser.id)
  let entity: EntityRow
  try {
    if (kind === 'agent') {
      const result = await findOrCreateAgentEntity(admin, targetUser)
      entity = result.entity
    } else {
      // 'human' OR null (genuinely new account) — both go through human factory.
      const result = await findOrCreateHumanEntity(admin, targetUser)
      entity = result.entity
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Entity resolution failed: ${err.message}` }, { status: 500 })
  }
  const entityId = entity.id
```

**Preserve everything after this verbatim** — the per-hour cap check, the per-entity retry cap, the fingerprint check, the `enrichment_runs` insert, the `after(runEnrichment(admin, runId, profileId))` call, the final response.

### 5R.3c — Update `runEnrichment` to pass `subjectEntity`

Still in `src/app/api/enrich/route.ts`, find the `runEnrichment` function (likely later in the same file). Its current signature probably looks like:

```ts
async function runEnrichment(admin: SupabaseClient, runId: number, profileId: string): Promise<void>
```

Update it to also accept and forward the resolved entity:

```ts
async function runEnrichment(
  admin: SupabaseClient,
  runId: number,
  profileId: string,
  subjectEntity?: EntityRow,
): Promise<void> {
  // ... existing body ...
  // The call to runRealWriteForOne inside this function gets the new param:
  const report = await runRealWriteForOne(admin, profileId, log, { subjectEntity })
  // ... rest of the existing body unchanged ...
}
```

Find the actual `runRealWriteForOne(...)` call inside `runEnrichment` and add the `{ subjectEntity }` opts param.

In the POST handler where `after(runEnrichment(admin, runId, profileId))` is called, change to:

```ts
after(runEnrichment(admin, runId, resolvedProfile.id, entity))
```

### 5R.3d — Validate

```
npx tsc --noEmit
```

Expected: clean.

---

## 5R.4 — `/api/v1/builds/route.ts` — delete throwaway query + add enrichment trigger

Same as the original §5.4 in PHASE1_DIFF_PLAN.md. Now safe to apply because Block 5R routes the subject correctly.

### 5R.4a — Delete the throwaway 90-day count block

View `src/app/api/v1/builds/route.ts` lines 50-70 to confirm exact structure.

Find this block (around lines 54-62):

```ts
  // Trigger velocity recalculation fire-and-forget
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  db.from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profile.id)
    .gte('created_at', cutoff.toISOString())
    .then(() => {})
```

Delete the entire block including the comment line.

### 5R.4b — Add `after()` enrichment trigger

At the top of the file, ensure `import { after } from 'next/server'` exists. Add it if missing.

After the `posts` insert succeeds (and after `checkAutoVerify` runs), add the enrichment trigger:

```ts
  const nowVerified = await checkAutoVerify(profile.id)

  // Phase 1: trigger enrichment so the agent's build creates a proof_receipt
  // and enters the ranking engine. Subject resolution routes to the agent's
  // kind='agent' entity via resolveEntityKindForOwner in /api/enrich.
  after(async () => {
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'
      await fetch(`${siteUrl}/api/enrich`, {
        method: 'POST',
        headers: {
          'Authorization': req.headers.get('authorization')!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
    } catch (err) {
      console.warn('[v1/builds] enrichment trigger failed', err)
    }
  })

  const hasOutcomeAndUrl = !!(post.outcome && post.url)

  return apiOk({
    // ... existing response shape ...
  })
```

(Adjust placement to fit the actual file structure — the trigger goes AFTER `checkAutoVerify` and BEFORE the `apiOk` return, so the response isn't delayed by the trigger but `after()` keeps the function context alive.)

### 5R.4c — Validate

```
npx tsc --noEmit
npm run build
grep -rni "velocity" src/ --include="*.ts" --include="*.tsx"
```

Expected: tsc clean, build clean, grep returns ZERO matches. The last velocity reference (the builds:55 comment) is gone with 5R.4a.

---

## 5R.5 — End-to-end smoke test (manual, before commit)

This is the structural fix's verification. It can wait until after Block 9, but doing it now confirms the architecture works before we commit.

If `npm run dev` is running:

```bash
# Find an existing test agent's API key (you'll have one from prior agent testing).
# If you don't have one, generate one via /dashboard?agent=1 in the browser, then test.

# Set variables
AGENT_KEY="sk_ss_<paste-test-key-here>"
SITE="http://localhost:3000"

# Post a test build
curl -X POST "$SITE/api/v1/builds" \
  -H "Authorization: Bearer $AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Phase 1 Block 5R smoke test",
    "outcome": "Verified the agent enrichment wiring lands proof_receipts with the agent entity subject",
    "url": "https://github.com/anthropics/claude-code"
  }'

# Wait ~30 seconds for enrichment to complete

# Then via the Supabase Dashboard SQL Editor or a small script:
SELECT pr.id, pr.slug, pr.subject_id, e.kind, e.slug, pr.verification_level, pr.issued_at
FROM proof_receipts pr
JOIN entities e ON e.id = pr.subject_id
WHERE pr.issued_at > NOW() - INTERVAL '5 minutes'
ORDER BY pr.issued_at DESC LIMIT 5;
```

Expected: at least one new `proof_receipts` row where `e.kind = 'agent'`. If `e.kind = 'human'`, Block 5R is wrong — stop and report.

If the smoke test passes, proceed. If it fails (`kind = 'human'` shows up, or no receipt at all), stop and paste the SQL output + any enrichment_runs status back to architect-Claude.

---

## 5R Summary

Files touched by Block 5R (in order):

1. `src/lib/paste/publish.ts` — accept optional `subjectEntity`, branch entity resolution.
2. `src/lib/enrichment/profile-adapter.ts` — thread `subjectEntity` through `processArtifactForWrite` (and the dedupe-key entity), `runRealWrite`, `runRealWriteForOne`.
3. `src/app/api/enrich/route.ts` — dual-auth detection + route through `resolveEntityKindForOwner` + pass `entity` to `runEnrichment`.
4. `src/app/api/v1/builds/route.ts` — delete throwaway 90-day query, add `after()` enrichment trigger.

Plus the already-shipped:
- `src/lib/entities.ts` — `resolveEntityKindForOwner` helper (from §5.1, in working tree).

Five files total in Block 5R. After execution + validation, run the smoke test in §5R.5. Then proceed to Block 6 (junk profile SQL).

End of Revised Block 5.
