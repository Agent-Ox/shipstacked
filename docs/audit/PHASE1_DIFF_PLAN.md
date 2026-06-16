# Phase 1 — Execution diff plan

**For terminal Claude.** Execute items in order. After each numbered block, run `npx tsc --noEmit` and report the exit code before moving to the next block. If any block breaks `tsc`, stop and report — do not press forward.

**Do not commit yet.** All edits land in the working tree. After the final block, we run `npx tsc --noEmit` + `npm run build` + `verify-agent-card.ts` against local. Only then do we commit and push.

**Pattern for every edit:** use the `Edit` tool with verbatim `old_string` / `new_string` matches. Where this plan shows a "FROM/TO" block, the FROM string must match the file exactly (whitespace, quotes, all of it). Where this plan says "delete," remove the cited lines and any orphaned syntax. Where this plan says "insert," add the new code at the cited location.

If a verbatim match fails, view the file at the cited line range, paste the actual content back to architect-Claude, and stop.

---

## Block 1 — Velocity Score eradication (pure deletes first, then user-visible replacements)

Doing the machine-output / contract deletes first because they're simpler and safer. UI replacements second.

### 1.1 — `src/lib/jsonld/person.ts` — delete velocity from Person JSON-LD

Three edits in this file. Apply them in this order:

**Edit 1.1a** — line 39 area, delete the field from `PersonProfileInput`:
- View lines 35-45 first to confirm exact context.
- Remove the `velocity_score: number | null` line entirely (whichever exact line it sits on).

**Edit 1.1b** — line 93 area, delete the field from the output type:
- View lines 88-100 first.
- Remove the `'shipstacked:velocityScore'?: number` line entirely.

**Edit 1.1c** — lines 183-185, delete the conditional emit block:
- View lines 180-190 first.
- Remove the entire `if (typeof profile.velocity_score === 'number' && profile.velocity_score > 0) { out['shipstacked:velocityScore'] = profile.velocity_score }` block (or its single-line variant — whatever the actual structure is).

**Validate:** `npx tsc --noEmit`. Expected: clean. If errors, the input type or its callers (`/u/[username]`, `collections/assemble.ts`) reference the removed field — those edits come in later blocks but the type system may force them now. If tsc complains about callers, view the caller and apply the corresponding edit from this plan early.

### 1.2 — `src/lib/collections/assemble.ts` — delete velocity from collections

**Edit 1.2a** — line 88, remove `velocity_score` from the select string:
- View lines 85-92.
- The select string includes `'github_url, x_url, linkedin_url, website_url, verified, velocity_score, ...'`. Remove `velocity_score, ` (with the trailing comma+space).

**Edit 1.2b** — line 119, remove the field from the `ConsentedBuilder` type:
- View lines 115-125.
- Remove the `velocity_score: number | null` line.

**Edit 1.2c** — line 196, remove the input thread-through:
- View lines 192-200.
- Remove the `velocity_score: p.velocity_score ?? null,` line from the input object passed to `buildPersonJsonLd`.

**Validate:** `npx tsc --noEmit`. Expected: clean.

### 1.3 — V1 API responses

**Edit 1.3a** — `src/app/api/v1/me/route.ts:34` — remove `velocity_score: profile.velocity_score,` from the returned object. View lines 30-40 first.

**Edit 1.3b** — `src/app/api/v1/profile/route.ts:98` — remove `velocity_score` from the `.select()` string. View lines 95-105 first. The select string currently includes `'username, full_name, role, bio, verified, published, velocity_score'`. Remove `, velocity_score`.

**Validate:** `npx tsc --noEmit`. Expected: clean.

### 1.4 — Application email + messaging joins

**Edit 1.4a** — `src/app/api/apply/route.ts:21,75`:
- Line 21: remove `velocity_score` from the select.
- Line 75: remove the conditional email-body line ``` profile.velocity_score ? ` — Velocity Score: ${profile.velocity_score}/100.` : '.', ``` and replace it with just `'.',` (so the email-body sentence still terminates cleanly).
- View lines 18-25 and 72-80 first.

**Edit 1.4b** — `src/app/api/messages/route.ts:31,49,73`:
- Three conversation-join select strings each contain `velocity_score` inside `profiles!builder_profile_id(...)`. Remove `velocity_score, ` from each (or `, velocity_score` depending on position).
- View each line in context first.

**Edit 1.4c** — `src/app/api/messages/[id]/route.ts:23`:
- Same pattern — remove `velocity_score` from the select.
- View lines 20-30 first.

**Validate:** `npx tsc --noEmit`. Expected: clean.

### 1.5 — Builder profile JSON-LD input

**Edit 1.5** — `src/app/u/[username]/page.tsx:125` — remove `velocity_score: profile.velocity_score,` from the `buildPersonJsonLd` input call. View lines 120-130 first.

**Validate:** `npx tsc --noEmit`. Expected: clean (this resolves any tsc complaint from Block 1.1's PersonProfileInput change).

### 1.6 — Dashboard server prop

**Edit 1.6** — `src/app/dashboard/page.tsx:80` — remove the entire `velocityScore={profile?.velocity_score || 0}` line. View lines 75-86 first. The render still works because Item 2 (Block 2) restructures `BuilderDashboardClient`'s prop signature.

**Validate:** `npx tsc --noEmit`. Expected: likely fails here with "Property 'velocityScore' missing" or similar — because `BuilderDashboardClient`'s prop interface still expects it. **Do not fix yet.** This intentional fail is resolved by Block 2 below. Report tsc state and continue to Block 2.

### 1.7 — Auto-verify email copy

**Edit 1.7** — `src/lib/autoVerify.ts:86`:
- FROM: `Every build you post strengthens your Velocity Score and your proof-of-work record.`
- TO: `Every build you post strengthens your proof-of-work record.`
- View lines 82-92 first to get the exact surrounding quote/template literal punctuation.

### 1.8 — Homepage step copy

**Edit 1.8** — `src/app/page.tsx:320`:
- FROM (full sentence): `Get auto-verified when your proof is real. Your Velocity Score shows you&apos;re active. Hirers with real budgets find you — no applications, no guessing.`
- TO: `Get auto-verified when your proof is real. Your shipped work is ranked and discoverable. Hirers with real budgets find you — no applications, no guessing.`
- View lines 315-325 first to confirm the line wraps and `&apos;` encoding.

### 1.9 — Privacy page GDPR row

**Edit 1.9** — `src/app/privacy/page.tsx:110`:
- FROM: `['Calculating Velocity Scores', 'Performance of a contract'],`
- TO: `['Calculating proof-of-work rankings', 'Performance of a contract'],`
- View lines 105-115 first.

### 1.10 — API docs page (three edits + sample JSON)

**Edit 1.10a** — `src/app/api-docs/page.tsx:6` — page metadata description:
- FROM: `description: 'ShipStacked has a real API. Let your agent keep your profile updated, post your builds, and maintain your Velocity Score — automatically.',`
- TO: `description: 'ShipStacked has a real API. Let your agent keep your profile updated, post your builds, and maintain your proof-of-work record — automatically.',`

**Edit 1.10b** — `src/app/api-docs/page.tsx:149` — body copy:
- FROM (single line, possibly with JSX): `ShipStacked has a real API. Bearer token auth. Clean JSON. Your agent can update your profile, post your builds, and keep your Velocity Score high — without you lifting a finger.`
- TO: `ShipStacked has a real API. Bearer token auth. Clean JSON. Your agent can update your profile, post your builds, and keep your proof-of-work record current — without you lifting a finger.`
- View lines 145-155 first.

**Edit 1.10c** — `src/app/api-docs/page.tsx:194` — Endpoint description:
- FROM: `description="Fetch your full profile, skills, projects, velocity score, and verification status."`
- TO: `description="Fetch your full profile, skills, projects, and verification status."`
- View lines 190-200 first.

**Edit 1.10d** — `src/app/api-docs/page.tsx:261` — sample JSON:
- FROM: `    "velocity_score": 74,` (whatever exact indentation and trailing comma).
- TO: delete the line entirely (the JSON example continues without this field).
- View lines 257-270 first to confirm surrounding JSON validity after removal (no trailing-comma issue).

**Validate:** `npx tsc --noEmit`. Still might fail on Block 1.6's dashboard issue. Continue.

### 1.11 — Admin page (4 lines, careful)

**Edit 1.11a** — `src/app/admin/page.tsx:61` — remove the `highVelocity` filter aggregate line:
- FROM: `const highVelocity = profiles?.filter(p => (p.velocity_score || 0) >= 75).length || 0`
- Delete the line entirely. View lines 55-70 first.

**Edit 1.11b** — `src/app/admin/page.tsx:148` — remove the stats-row consumer:
- FROM: `{ label: 'High velocity (75+)', value: String(highVelocity) },`
- Delete the line entirely. View lines 144-152 first. This was the line that would have caused `tsc` to fail in the original Item 1p scope.

**Edit 1.11c** — `src/app/admin/page.tsx:264` — table column header array:
- FROM: `{['Name','Email','Velocity','Verified','Last seen','Joined','Profile'].map(...)}`
- TO: `{['Name','Email','Verified','Last seen','Joined','Profile'].map(...)}`
- (Remove the `'Velocity',` entry. The rest of the `.map(...)` body stays. Adjust any column-width or grid-template-columns CSS in the surrounding container if applicable.)
- View lines 260-272 first.

**Edit 1.11d** — `src/app/admin/page.tsx:275` — per-row velocity span:
- FROM (whole span block): `<span style={{ fontSize: 12, fontWeight: 700, color: (p.velocity_score || 0) >= 75 ? '#1a7f37' : (p.velocity_score || 0) >= 50 ? '#0071e3' : '#aeaeb2' }}>{p.velocity_score || 0}</span>`
- Delete the entire `<span>`. If wrapped in a `<td>` or `<div>` cell, delete that cell too (so the row has one fewer cell, matching the new 6-col header). View lines 270-285 first.

**Validate:** `npx tsc --noEmit`. Expected: clean for this file. Block 1.6's failure persists until Block 2.

### 1.12 — Stale comment cleanup

**Edit 1.12** — `src/app/talent/page.tsx:53`:
- View lines 50-58 first.
- Either delete the line containing `replaces the frozen velocity sort` or rewrite the comment so it no longer references velocity. Suggested: delete entirely (the surrounding code is self-explanatory).

---

## Block 2 — Dashboard VelocityRing → "Proof of Work" card

This block resolves the tsc failure from Block 1.6.

### 2.1 — View the current dashboard structure

Before editing, view:
- `src/app/dashboard/BuilderDashboardClient.tsx` lines 1-100 (to see imports, VelocityRing component, props interface, render).
- `src/app/dashboard/BuilderDashboardClient.tsx` lines 160-205 (to see the VelocityRing card render block and GitHub-card copy).
- `src/app/dashboard/page.tsx` full file (to see what data is already fetched and could feed the new card).

### 2.2 — Compute proof-of-work data in the server component

In `src/app/dashboard/page.tsx`:
- Where the current code fetches the user's profile, projects, skills, github_data, etc., ADD a query for `proof_receipts` filtered by `subject_id = profile.entity_id`. Only run if `profile.entity_id` is non-null.
- Compute four values:
  - `l1Count` = count of receipts where `verification_level = 'L1_artifact_confirmed'`.
  - `l0Count` = count of receipts where `verification_level = 'L0_claimed'`.
  - `distinctHosts` = count of unique hosts from the first artifact of each L1 receipt. Use `extractHost` from `@/lib/ranking/quality-score`. Skip receipts whose host matches `SHARED_DOC_HOST_RE` (also from quality-score.ts).
  - `lastShippedAt` = max `issued_at` across all the receipts, or null.

Pass these four as props to `BuilderDashboardClient` in place of the deleted `velocityScore` prop.

### 2.3 — Rewrite the VelocityRing component → ProofOfWorkCard

In `src/app/dashboard/BuilderDashboardClient.tsx`:

- **Delete** the `VelocityRing` component definition (currently lines 8-35).
- **Write** a new component `ProofOfWorkCard` in its place. Props: `{ l1Count: number, l0Count: number, distinctHosts: number, lastShippedAt: string | null, username: string }`. Render:

```tsx
function ProofOfWorkCard({ l1Count, l0Count, distinctHosts, lastShippedAt, username }: { l1Count: number; l0Count: number; distinctHosts: number; lastShippedAt: string | null; username: string }) {
  const hasProof = l1Count > 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {hasProof ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            <div>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#1d1d1f', lineHeight: 1 }}>{l1Count}</p>
              <p style={{ fontSize: 11, color: '#6e6e73', marginTop: '0.25rem' }}>Verified receipts</p>
            </div>
            <div>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#1d1d1f', lineHeight: 1 }}>{distinctHosts}</p>
              <p style={{ fontSize: 11, color: '#6e6e73', marginTop: '0.25rem' }}>Distinct hosts</p>
            </div>
            <div>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#1d1d1f', lineHeight: 1 }}>{lastShippedAt ? new Date(lastShippedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}</p>
              <p style={{ fontSize: 11, color: '#6e6e73', marginTop: '0.25rem' }}>Last shipped</p>
            </div>
          </div>
          {l0Count > 0 && (
            <p style={{ fontSize: 12, color: '#bf7e00', lineHeight: 1.5 }}>{l0Count} receipt{l0Count === 1 ? '' : 's'} with unreachable artifacts. Re-post with live URLs to upgrade to verified.</p>
          )}
          <a href={`/u/${username}`} style={{ fontSize: 13, fontWeight: 600, color: '#0071e3', textDecoration: 'none' }}>View your public profile →</a>
        </>
      ) : (
        <>
          <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.6 }}>Post your first build below. Your proof-of-work record starts the moment your work is verified.</p>
        </>
      )}
    </div>
  )
}
```

### 2.4 — Update props interface

In `src/app/dashboard/BuilderDashboardClient.tsx`:

- Update the `BuilderDashboardClientProps` interface (currently lines ~64-78). Remove `velocityScore: number`. Add `l1Count: number`, `l0Count: number`, `distinctHosts: number`, `lastShippedAt: string | null`.
- Update the props destructuring (currently line ~64 `velocityScore: initialScore,`). Replace with the four new props.
- Remove the `const [velocityScore] = useState(initialScore)` hook (line ~84).

### 2.5 — Update the card render

In `src/app/dashboard/BuilderDashboardClient.tsx` at the lines that currently render the "Velocity Score card" (around 164-170):

- Change the section heading from `Velocity Score` to `Proof of Work`.
- Replace `<VelocityRing score={velocityScore} />` with `<ProofOfWorkCard l1Count={l1Count} l0Count={l0Count} distinctHosts={distinctHosts} lastShippedAt={lastShippedAt} username={profile.username} />`.

(The card chrome stays — same `background: white`, `border`, `borderRadius`, `padding`.)

### 2.6 — Update GitHub-card copy

In `src/app/dashboard/BuilderDashboardClient.tsx:194`:
- FROM: `Connect to prove your builds are real. Feeds 40 points into your Velocity Score.`
- TO: `Connect to prove your builds are real. Your GitHub activity strengthens your proof-of-work record.`

### 2.7 — Validate Block 2

```
npx tsc --noEmit
```

Expected: clean.

```
grep -rni "velocity" src/ --include="*.ts" --include="*.tsx"
```

Expected: zero matches. If any survive, view them and either fix or report.

---

## Block 3 — atlas_confirmed → confirmed-OR-inferred (3 sites)

### 3.1 — `src/lib/atlas/roles.ts:82` — extend the recent-receipts query

View lines 70-100 first.

Replace `.contains('atlas_confirmed', [roleId])` with a `.or()` filter that matches either array. The Supabase JS client syntax:

```ts
.or(`atlas_confirmed.cs.{${roleId}},atlas_inferred.cs.{${roleId}}`)
```

The `cs` operator means "contains." This may need testing because the comma-inside-braces syntax for `or()` with array-contains can be tricky. If the `.or()` form doesn't parse, fall back to two separate queries unioned in JS:

```ts
const [confirmed, inferred] = await Promise.all([
  admin.from('proof_receipts').select(/* ... */).contains('atlas_confirmed', [roleId]).eq('visibility', 'public'),
  admin.from('proof_receipts').select(/* ... */).contains('atlas_inferred', [roleId]).eq('visibility', 'public'),
])
// dedupe by receipt id, prefer confirmed
const seen = new Set<number>()
const merged = [
  ...(confirmed.data || []).map(r => { seen.add(r.id); return { ...r, _source: 'confirmed' } }),
  ...(inferred.data || []).filter(r => !seen.has(r.id)).map(r => ({ ...r, _source: 'inferred' })),
]
```

If the `.or()` form parses cleanly, prefer it. Otherwise use the union pattern. Either way, the function's return signature stays compatible with its callers (`/atlas/roles/[id]/page.tsx`).

### 3.2 — `src/app/u/[username]/page.tsx:69` — extend receipt select

Add `atlas_inferred` to the select:
- FROM: `.select('id, slug, title, description, event_type, atlas_confirmed, verification_level, issued_at, artifacts')`
- TO: `.select('id, slug, title, description, event_type, atlas_confirmed, atlas_inferred, verification_level, issued_at, artifacts')`

View line 69 in context first.

### 3.3 — `src/app/u/[username]/page.tsx:442-446` — apply the precedent

View lines 435-465 first to see the current chip render.

Apply the same pattern as `src/app/p/[slug]/page.tsx:189-209`. Render confirmed chips first, then inferred-not-in-confirmed chips with a lighter background to distinguish. Pseudo-structure:

```tsx
{((Array.isArray(r.atlas_confirmed) && r.atlas_confirmed.length > 0) ||
  (Array.isArray(r.atlas_inferred) && r.atlas_inferred.length > 0)) && (
  <div style={/* existing chip container styles */}>
    {(r.atlas_confirmed as string[] | undefined ?? []).map((roleId: string) => (
      <Link key={`c-${roleId}`} href={`/atlas/roles/${roleId}`} style={/* primary chip style */}>
        <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{roleId}</span>
      </Link>
    ))}
    {(r.atlas_inferred as string[] | undefined ?? [])
      .filter((roleId: string) => !(r.atlas_confirmed as string[] | undefined ?? []).includes(roleId))
      .map((roleId: string) => (
        <Link key={`i-${roleId}`} href={`/atlas/roles/${roleId}`} style={/* lighter chip style, background: '#fafafd' */}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{roleId}</span>
          <span style={{ marginLeft: '0.25rem', fontSize: 10, color: '#6e6e73' }}>inferred</span>
        </Link>
      ))}
  </div>
)}
```

Match the existing visual treatment of the chip container so the change is purely additive (Invariant #6). Use the EXACT chip style already in use at lines 442-446 — don't invent a new style.

### 3.4 — `src/app/og/route.tsx:48` — extend OG receipt select

- FROM: `.select('title, atlas_confirmed, verification_level, subject_id')`
- TO: `.select('title, atlas_confirmed, atlas_inferred, verification_level, subject_id')`

View line 48 in context first.

### 3.5 — `src/app/og/route.tsx:64` — change roles derivation

- FROM: `const roles: string[] = Array.isArray(receipt?.atlas_confirmed) ? (receipt!.atlas_confirmed as string[]).slice(0, 4) : []`
- TO:
```ts
const confirmed: string[] = Array.isArray(receipt?.atlas_confirmed) ? (receipt!.atlas_confirmed as string[]) : []
const inferred: string[] = Array.isArray(receipt?.atlas_inferred) ? (receipt!.atlas_inferred as string[]) : []
const roles: string[] = [...confirmed, ...inferred.filter(id => !confirmed.includes(id))].slice(0, 4)
```

View lines 60-70 in context first.

### 3.6 — Validate Block 3

```
npx tsc --noEmit
```

Expected: clean.

---

## Block 4 — Card 2 + Card 3 copy honesty on /join

### 4.1 — Card 2 supporting line

`src/app/join/page.tsx:315`:
- FROM: `Free collective supply profile. Optional Buyer Mode.`
- TO: `Reserve your team name. Full profile editor and shipped-work display ship next.`

View lines 312-318 first to confirm exact JSX/quotes.

### 4.2 — Card 3 subline

`src/app/join/page.tsx:328`:
- FROM: `"I'm an agent with my own wallet, tasks, and outcomes."`
- TO: `"I'm an AI agent operating on behalf of my principal."`

View lines 325-332 first. Pay attention to the surrounding JSX/quote escaping.

### 4.3 — Card 3 supporting line

`src/app/join/page.tsx:329`:
- FROM: `Free supply profile. API key issued at signup.`
- TO: `API-keyed agent identity, principal-linked, posts builds and proof. Wallet/autonomous identity ships later.`

### 4.4 — Validate

```
npx tsc --noEmit
```

Expected: clean.

Open the homepage `/join` in dev and visually confirm the three lines render correctly with no quote-escaping artifacts. (Run `npm run dev` in one terminal if not already running.)

---

## Block 5 — Agent enrichment wiring (the load-bearing structural fix)

### 5.1 — Add `resolveEntityKindForOwner` helper to `src/lib/entities.ts`

View the file to find an appropriate place to add the helper (after the existing factories, before `deleteEntity`, is fine).

Add this function and export it:

```ts
/**
 * Resolve the entity kind for a given owner_user_id by querying entities directly.
 * Used by /api/enrich to route receipt subject resolution through the right factory
 * (findOrCreateAgentEntity vs findOrCreateHumanEntity) when called via API-key auth.
 *
 * Returns 'agent' if the user owns a kind='agent' entity (priority).
 * Returns 'human' if the user owns a kind='human' entity.
 * Returns null if neither exists (caller decides whether to mint).
 *
 * Note: this does NOT touch the profiles.entity_id ↔ entities.profile_id link contract,
 * which remains human-only per Spec §0. Agent entities continue to have no profile link.
 */
export async function resolveEntityKindForOwner(
  admin: SupabaseClient,
  userId: string,
): Promise<'agent' | 'human' | null> {
  // Agent priority — if both exist, agent wins (it's the more specific identity).
  const { data: agentRow } = await admin
    .from('entities')
    .select('id')
    .eq('owner_user_id', userId)
    .eq('kind', 'agent')
    .limit(1)
    .maybeSingle()
  if (agentRow) return 'agent'

  const { data: humanRow } = await admin
    .from('entities')
    .select('id')
    .eq('owner_user_id', userId)
    .eq('kind', 'human')
    .limit(1)
    .maybeSingle()
  if (humanRow) return 'human'

  return null
}
```

### 5.2 — Extend `runRealWriteForOne` in `src/lib/enrichment/profile-adapter.ts` to accept optional `entity` param

View `src/lib/enrichment/profile-adapter.ts` and find the `runRealWriteForOne` function signature. Currently it takes `profileId` and resolves the entity internally via `findOrCreateHumanEntity`.

Change the signature:
- FROM: `export async function runRealWriteForOne(profileId: string, ...)`
- TO: `export async function runRealWriteForOne(profileId: string, options?: { entity?: EntityRow }, ...)`

(Adjust the existing param signature to fit. If there are other named params or options already, integrate cleanly.)

Inside the function, where `findOrCreateHumanEntity` is currently called to resolve the entity:
- If `options?.entity` is provided, use it directly (skip the factory call).
- Else, fall back to the existing `findOrCreateHumanEntity` behavior.

Import `EntityRow` from `@/lib/entities` if not already imported.

### 5.3 — Extend `/api/enrich/route.ts` with dual-auth + entity-kind routing

This is the largest single edit in Phase 1. View the full file first if not already in context.

The POST handler currently:
1. Gets cookie session via `createServerSupabaseClient` + `supabase.auth.getUser()`.
2. Returns 401 if no session.
3. Parses body for `profile_id` / `entity_id`.
4. Resolves profile (body.profile_id or self-lookup by email).
5. Auth gates: isOwner or isAdmin.
6. Calls `findOrCreateHumanEntity` unconditionally.
7. Runs caps/fingerprint, then `after(runEnrichment(...))`.

Restructure to:

```ts
import { authenticateApiKey } from '@/lib/apiAuth'
import { resolveEntityKindForOwner, findOrCreateAgentEntity, findOrCreateHumanEntity } from '@/lib/entities'

export async function POST(req: Request) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let resolvedProfile: any
  let resolvedUserId: string
  let resolvedUserEmail: string
  let isApiKeyAuth = false
  let force = false

  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer sk_ss_')) {
    // ── API-key path (agent enrichment trigger from /api/v1/builds) ────
    const apiAuth = await authenticateApiKey(req)
    if (!apiAuth.ok) {
      return NextResponse.json({ error: apiAuth.error }, { status: apiAuth.status })
    }
    resolvedProfile = apiAuth.auth.profile
    resolvedUserId = resolvedProfile.user_id
    resolvedUserEmail = apiAuth.auth.email
    isApiKeyAuth = true
    // API-key auth has no force flag; ignore querystring force=1 for safety.
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

    resolvedProfile = profile
    resolvedUserId = profile.user_id || user.id
    resolvedUserEmail = user.email!
  }

  // ── From here both paths converge ────────────────────────────────────

  // Route entity resolution by kind. Agents posting via API key get their
  // agent entity; humans (Card 1 signup, admin re-enrich) get their human entity.
  const kind = await resolveEntityKindForOwner(admin, resolvedUserId)

  let entity: EntityRow
  try {
    // We need an auth User object for the factories. For cookie-session path,
    // we already have it; for API-key path, fetch it via the admin API.
    let targetUser: User
    if (isApiKeyAuth) {
      const { data: lookup } = await admin.auth.admin.getUserById(resolvedUserId)
      if (!lookup?.user) {
        return NextResponse.json({ error: 'Auth user not found for API key' }, { status: 500 })
      }
      targetUser = lookup.user
    } else {
      const supabase = await createServerSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      targetUser = user!  // already validated above
    }

    if (kind === 'agent') {
      const result = await findOrCreateAgentEntity(admin, targetUser)
      entity = result.entity
    } else {
      // 'human' OR null (genuinely new) — both go through human factory.
      const result = await findOrCreateHumanEntity(admin, targetUser)
      entity = result.entity
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Entity resolution failed: ${err.message}` }, { status: 500 })
  }

  const entityId = entity.id

  // ── existing caps / fingerprint / enrichment_runs / after(runEnrichment) ──
  // (Keep the existing implementation from the original file. The only change
  // below this point is that runRealWriteForOne is called with the resolved
  // entity, so the adapter doesn't re-resolve to human-by-default.)
  //
  // ... (existing per-hour cap check) ...
  // ... (existing per-entity retry cap check) ...
  // ... (existing fingerprint check) ...
  // ... (existing enrichment_runs INSERT) ...

  after(async () => {
    await runRealWriteForOne(resolvedProfile.id, { entity })
  })

  return NextResponse.json({ status: 'enrichment_queued', entity_id: entityId, run_id: /* existing */ })
}
```

**Important:** preserve the existing caps/fingerprint/enrichment_runs logic verbatim. Only the auth detection and entity resolution change. View the full existing file before editing, then apply the restructure carefully.

Imports to add at the top of the file:
```ts
import { authenticateApiKey } from '@/lib/apiAuth'
import { resolveEntityKindForOwner, findOrCreateAgentEntity, findOrCreateHumanEntity, type EntityRow } from '@/lib/entities'
import type { User } from '@supabase/supabase-js'
```

(Some may already be imported — adjust accordingly.)

### 5.4 — Update `/api/v1/builds/route.ts` to trigger enrichment

View `src/app/api/v1/builds/route.ts` (96 lines). The POST handler currently:
1. Authenticates via API key.
2. Inserts a `posts` row.
3. Runs a throwaway 90-day count query (does nothing with the count).
4. Runs `checkAutoVerify`.
5. Returns response.

Apply two changes:

**5.4a** — Delete the throwaway 90-day count query block (lines ~55-62, the block beginning with the `// Trigger velocity recalculation fire-and-forget` comment). Remove the comment as well.

**5.4b** — Add an `after()` enrichment trigger after the `posts` insert succeeds, before the response is returned. Pseudo-code:

```ts
import { after } from 'next/server'

// ... existing POST handler ...

const { data: inserted, error } = await db.from('posts').insert(post).select().single()
if (error) return apiError(500, 'Failed to create build post', error.message)

// (Delete the old throwaway count query that was here.)

const nowVerified = await checkAutoVerify(profile.id)

// Fire enrichment so the build creates a proof_receipt and enters the ranking engine.
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

return apiOk({
  build_posted: true,
  // ... rest of existing response ...
})
```

Import `after` from `next/server` at the top if not already.

### 5.5 — Validate Block 5

```
npx tsc --noEmit
```

Expected: clean.

End-to-end test will run as part of §I.5 verification later.

---

## Block 6 — Junk profile cleanup (Dashboard SQL, operator-mediated)

This block requires the operator to paste SQL into the Supabase Dashboard. Terminal Claude does NOT have DDL access per Invariant #4.

Output the SQL block below to the operator. They paste it into Dashboard, run forward, and confirm execution.

**Forward SQL (Dashboard):**

```sql
BEGIN;
UPDATE public.profiles
SET published = false
WHERE username IN ('paddybot130', 'batch5-test', 'hyy922')
  AND published = true;

UPDATE public.proof_receipts
SET visibility = 'private'
WHERE subject_id IN (
  SELECT entity_id FROM public.profiles
  WHERE username IN ('paddybot130', 'batch5-test', 'hyy922')
    AND entity_id IS NOT NULL
);
COMMIT;
```

Expected affected rows: 3 profiles updated, 2 receipts updated (only `batch5-test` has entity_id=22 with 2 public receipts).

**Reversal SQL (keep on hand, don't run unless we need to revert):**

```sql
BEGIN;
UPDATE public.profiles
SET published = true
WHERE username IN ('paddybot130', 'batch5-test', 'hyy922');

UPDATE public.proof_receipts
SET visibility = 'public'
WHERE subject_id IN (
  SELECT entity_id FROM public.profiles
  WHERE username IN ('paddybot130', 'batch5-test', 'hyy922')
    AND entity_id IS NOT NULL
);
COMMIT;
```

After operator confirms execution, re-run the §H.1 SELECT to verify state:

```sql
SELECT username, published FROM public.profiles
WHERE username IN ('paddybot130', 'batch5-test', 'hyy922');
```

Expected: all three rows show `published = false`.

---

## Block 7 — Checkout session-keying

### 7.1 — Rewrite `src/app/api/checkout/route.ts`

The whole file (30 lines) gets the cookie-session check and override. Replace the file entirely with:

```ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PRICES = {
  full_access: 'price_1TJhIzE3cjWtx7BrDkZxLavC',
}

export async function POST(req: Request) {
  const { product, email: bodyEmail } = await req.json()

  const priceId = PRICES[product as keyof typeof PRICES]
  if (!priceId) {
    return NextResponse.json({ error: 'Invalid product' }, { status: 400 })
  }

  // Session-keying: if the user is authenticated, override the body email
  // with the auth-session email. Prevents the email-mismatch footgun where
  // a logged-in user creates a subscription on a different email than the
  // one getEntityModes reads. (Phase 1 fix.)
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const customerEmail: string | undefined = user?.email || bodyEmail || undefined

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer_email: customerEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { product, ...(user ? { authed_user_id: user.id } : {}) },
    subscription_data: { metadata: { product, ...(user ? { authed_user_id: user.id } : {}) } },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'}/hirers#pricing`,
  })

  return NextResponse.json({ url: session.url })
}
```

### 7.2 — Update `src/app/hirers/page.tsx` for authenticated users

View the file first to find the email input + checkout flow. Identify the JSX block where the email input lives (the `#pricing` section, around the existing `goToCheckout` handler).

Add a session check. Approach:
- On mount, fetch `/api/messages/unread` is already used — fetch `getUser` via Supabase client instead, or expose a tiny helper. Simplest: call `supabase.auth.getUser()` on mount and store the email.
- If authenticated, replace the email input with a read-only "Subscribing as `<email>`" indicator + a small "use a different email" link that calls `/api/logout`.
- If not authenticated, keep the existing email-input form.

Concrete approach: view the existing email-input JSX, then wrap it in a conditional:

```tsx
const [authEmail, setAuthEmail] = useState<string | null>(null)

useEffect(() => {
  const supabase = createClient()
  supabase.auth.getUser().then(({ data: { user } }) => {
    setAuthEmail(user?.email || null)
  })
}, [])

// ... in the JSX ...
{authEmail ? (
  <div style={/* whatever the email-input container's style is */}>
    <p style={{ fontSize: 14, color: '#1d1d1f' }}>Subscribing as <strong>{authEmail}</strong></p>
    <a href="/api/logout" style={{ fontSize: 12, color: '#0071e3', textDecoration: 'none' }}>Use a different email</a>
    <button onClick={goToCheckoutWithSession}>Subscribe — $199/mo</button>
  </div>
) : (
  /* existing email-input JSX */
)}
```

`goToCheckoutWithSession` calls `/api/checkout` without sending an email (the route now reads from session). The existing `goToCheckout` for unauthenticated flow keeps sending the body email.

### 7.3 — Validate Block 7

```
npx tsc --noEmit
```

Expected: clean.

Manual walkthrough (run `npm run dev`):
- Visit `/hirers#pricing` in incognito → email-input form, type any email, see Stripe checkout email match. (Don't actually pay.)
- Log in as a test user → visit `/hirers#pricing` → see "Subscribing as `<test-email>`," click subscribe → Stripe checkout's `customer_email` matches the logged-in user's email regardless of what was in the body.

---

## Block 8 — Defensive getEntityModes hardening

### 8.1 — Add warning log to `src/lib/user.ts`

View the file (66 lines).

After the `subscription` query inside `getEntityModes()`, add one console.warn line. The exact placement: after `subscription` resolves to null AND the user has a profile with `user_id`. Something like:

```ts
// After existing `const subscription = ...` resolves:
if (!subscription && user && profile?.user_id) {
  console.warn(`[getEntityModes] user ${user.id} (email=${user.email}) has profile but no active subscription — verify email match if expected as paying customer`)
}
```

View the function body first to find the right insertion point. Don't introduce control-flow changes; just add the log.

### 8.2 — Validate Block 8

```
npx tsc --noEmit
```

Expected: clean.

---

## Block 9 — Final validation gates

### 9.1 — Type + build clean

```
npx tsc --noEmit
npm run build
```

Both exit 0.

### 9.2 — Velocity grep guard (case-insensitive per Flag B resolution)

```
grep -rni "velocity" src/ --include="*.ts" --include="*.tsx"
```

Expected: zero matches. If any survive, view them and either fix or report.

### 9.3 — verify-agent-card.ts against local

```
npm run dev  # in another terminal
node --experimental-strip-types scripts/v2/verify-agent-card.ts --base http://localhost:3000
```

Exit 0. All 11 example URLs probe correctly. MCP initialize round-trips.

### 9.4 — Report state

Output a summary:
- All 9 blocks executed?
- Final tsc / build exit codes.
- Final grep -rni "velocity" results.
- verify-agent-card.ts exit code + brief summary.
- Operator has run Block 6 SQL? (yes/no — required before final commit)

Stop and wait for operator approval to commit + push.

---

## Notes for terminal Claude

- **Verbatim edits only.** If any FROM string doesn't match exactly, view the file at the cited range, paste actual content back to architect-Claude via the operator, and stop. Don't guess.
- **No commit until Block 9 reports clean.** Working tree changes only.
- **Operator-gated steps:** Block 6 requires the operator paste SQL into Supabase Dashboard. Output the SQL clearly when you reach Block 6 and explicitly wait for operator confirmation.
- **If tsc breaks at any intermediate block:** report which block, paste the tsc output, stop. Architect-Claude will diagnose.
- **Time estimate:** 2-4 hours of focused execution. Don't rush — each block has a validation step for a reason.

End of Phase 1 diff plan.
