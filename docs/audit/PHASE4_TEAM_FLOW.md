# Phase 4 — Team flow (real)

**Discovery + execution diff plan in one doc.** Replaces the Phase-1-honest "Reserve your team name" interim with the actual Card 2 deliverable.

**Locked decisions (from prior session turns):**
- Team owned by signing-up human's existing auth account. No separate auth user for the team.
- `team_admins` join table from day one (single-row at signup, multi-admin-ready schema).
- LinkedIn-style soft member linking via `profiles.team_entity_id NULL` column. No invitation flow.
- Single mixed `/talent` directory with type facet (Builder/Team/Agent), defaults to Builder.
- Card 2 final copy: *"Show what your team has shipped. Get found by the SMBs and Series-A's looking for AI implementation capability."*
- Existing builders can create teams from `/join` Card 2 or from dashboard.
- v1 ranking: teams use Formula E unchanged, ranked by their own direct receipts. Aggregate scoring (member receipts → team rank) deferred to post-revenue.
- Paste identity picker on `/paste`: "Post as: [Solo identity / Team identity]" — passes selected `entity_id` to `publishProofReceipt.subjectEntity` (mechanism built in Phase 1 Block 5R, UI new in Phase 4).
- No separate `team_skills` table. Team services live in `services TEXT[]`. Case studies = team-subject receipts via paste flow.
- Phase 3 agent gateway inherited — team API keys + team-scoped V1 endpoints essentially free.
- Phase 3's `<EnableHiringButton>` and `<ConnectAnAgent>` components drop onto team dashboard for composable Buyer Mode + agent management.

**Phase 4's job:** make Card 2 (Team / Agency / Studio) functionally complete. Team can sign up, build a profile, post work, be found, optionally hire from the network, and optionally hand profile management to an agent. Plus: agencies-as-supply-side wedge (per `05_MARKET_CONTEXT.md` §3.5 + `06_ATLAS_STRATEGIC.md` purpose 6c) gets its first real surface.

**Scope estimate:** ~7-10 hours focused work across 2-3 sessions.

**Files touched (estimated count):**
- NEW: 8-10 files (`/team/[slug]/page.tsx`, `/team/[slug]/edit/page.tsx`, `/team/[slug]/TeamProfileClient.tsx`, `/team/[slug]/edit/TeamEditClient.tsx`, `/api/join/team/route.ts`, `/api/v1/team/route.ts`, `<TeamCard>` component, `<IdentityPicker>` component, Organization JSON-LD builder, /team/[slug] OG route)
- Modified: 6-8 files (`/talent/page.tsx` for type facet, `/paste/review` for identity picker, `/join/page.tsx` for Card 2 wiring, `src/lib/entities.ts` for `findOrCreateTeamEntity` + `resolveEntityKindForOwner` extension, `src/lib/atlas/roles.ts` for team-receipts inclusion, `<ConnectAnAgent>` for team variant, `<EnableHiringButton>` for team variant, `verify-agent-card.ts` for team AgentCard skill)
- DDL: 2 new tables (`team_profiles`, `team_admins`), 1 column add (`profiles.team_entity_id`), 1 column add (`entities` already supports `kind='team'` per codebase read — verify)

---

## §A — Pre-flight reads required before any code

Terminal Claude executes these BEFORE any block. Stop on any FROM-string mismatch or unexpected state.

1. **Confirm `entities.kind='team'` is allowed.** Codebase read §0 said "33 human, 1 team (orphan), 1 agent (orphan)" — so the kind column allows 'team'. Confirm via:
   ```sql
   SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c
   JOIN pg_class t ON c.conrelid = t.oid
   WHERE t.relname = 'entities' AND c.contype = 'c';
   ```
   If there's a CHECK constraint enumerating allowed kinds, paste it. If not, kind is free text — fine.

2. **Inspect existing orphan team entity.** Per §0 there's 1 orphan team entity. What's its slug / owner_user_id / display_name? Run:
   ```sql
   SELECT id, slug, kind, display_name, owner_user_id, profile_id, created_at FROM entities WHERE kind = 'team';
   ```
   If it has an owner_user_id pointing to a real user, that user may need migration handling later. If owner_user_id is null, it's pure orphan — can be cleaned up post-Phase-4 or left.

3. **`/api/join/team/route.ts` current state.** Phase 1 Item 4 mentioned this exists with interim "Reserve your team name" behavior. Paste verbatim — Phase 4 rebuilds this entire route.

4. **Current `/talent/page.tsx` ranking + filter structure.** Codebase read mentioned `getRankedBuilders()` + JS facets. Phase 4 adds a type facet. Paste:
   - Imports + props
   - Filter section JSX (where checkboxes/buttons for cluster/role/profession live)
   - Results rendering loop (need to understand how `<BuilderCard>` is rendered to plug in a parallel `<TeamCard>`)

5. **`/paste/review` page structure.** Phase 4 adds the identity picker. Paste verbatim the page or component where the user reviews + confirms a draft before posting. Need to know where to slot the "Post as" dropdown.

6. **`src/lib/entities.ts` current state.** Phase 1 Block 5R added `resolveEntityKindForOwner` (returns 'agent' | 'human' | null). Phase 4 extends to also handle 'team'. Paste:
   - `findOrCreateHumanEntity` signature
   - `findOrCreateAgentEntity` signature (created in Phase 1 §5R)
   - `resolveEntityKindForOwner` current body

7. **`src/lib/atlas/roles.ts` — atlas role page query.** Phase 1 Block 3 extended this to query `atlas_confirmed OR atlas_inferred`. Phase 4 needs to include team-subject receipts (currently filters to entity kind implicitly via `subject_id` join). Paste current query.

8. **`<BuilderCard>` component (wherever it lives).** New `<TeamCard>` mirrors its shape but with team-specific fields. Paste full file.

9. **`/u/[username]/page.tsx` Organization-style render.** Reference for `/team/[slug]/page.tsx` layout. Paste lines 1-200 (imports, data fetch, render structure). Don't need the receipts section verbatim — Phase 4's team receipts query is similar but keyed differently.

10. **`/.well-known/agent-card.json` builder.** The card declares skills with `id`, `name`, `description`, etc. Phase 4 adds a `fetch-team-profile` skill (Invariant #8). Paste the skill-array section of `src/lib/agent-card/builder.ts`.

After all 10 reads, proceed. Stop and report if anything is materially different from what this doc assumes.

---

## §B — Architecture overview

### B.1 — Team identity model

A team is:
- A `kind='team'` row in `entities` (existing table). `owner_user_id` points to the signing-up human's auth.users row. `display_name` = the team's name. `slug` = URL slug (Phase 4 owns slug generation).
- A `team_profiles` row (new table). `entity_id` is the FK back. Rich profile fields (description, services array, location, website, logo, etc.).
- One or more `team_admins` rows (new table). Each row: `team_entity_id` + `user_id`. At signup, one row is inserted for the signing-up human. Multi-admin UX deferred but schema-ready.

A team does NOT have:
- Its own `auth.users` row. The signing-up human manages it.
- A linked `profile.team_entity_id` from the owner's side. The owner's `profiles.team_entity_id` is NULL unless they choose to also list themselves as a member of the team they own (LinkedIn-style).
- An `api_keys` row directly. API keys are created by the human admin and scoped — the human's existing key with appropriate scope (or a new team-scoped key) handles team management.

### B.2 — The mixed `/talent` directory

`/talent` becomes a unified directory. Top facet: "Type: Builder / Team / Agent" — defaults to Builder for backwards compatibility. Per type, the secondary facets adapt:
- Builder: existing cluster / role / shipped / profession / availability filters.
- Team: services array / location / verified.
- Agent: principal / focus (Phase 5 builds; Phase 4 stubs the facet UI).

Ranking is type-segmented at v1:
- Builder type → existing `getRankedBuilders()` Formula E.
- Team type → new `getRankedTeams()` — Formula E applied to team-subject receipts (same scoring function, different `WHERE e.kind='team'` filter on the underlying receipt query).
- Agent type → Phase 5.

Single page, type facet swaps the result list.

### B.3 — Soft member linking (LinkedIn-style)

A builder profile gains an optional `team_entity_id` column. When set:
- On `/u/<username>` builder profile: a "Works with" section displays the team's name and links to `/team/<slug>`.
- On `/team/<slug>` team profile: a "People" section lists everyone whose `team_entity_id` points here (filtered to `published = true` profiles).
- Builder controls the link via their own EditProfileForm (a new text input: "Team / Agency / Studio you're with" — autocomplete on existing team slugs/names, with a "create new" path that bounces to Card 2).
- Team can boot a fake-association via a removal action in `/team/<slug>/edit` (sets a `team_member_blocks` array on the team_profiles row OR sets the profile's `team_entity_id` back to NULL — implementation choice, defaulting to the latter for simplicity).

### B.4 — Paste identity picker

`/paste/review` (the page where a user confirms a draft before posting) gains an `<IdentityPicker>` component. It lists every entity owned by the current user (human + team + agent, queried at server time). User picks which identity is posting. Default = primary identity (human if exists, else first owned entity).

The selected `entity_id` is passed to `publishProofReceipt` via the existing `subjectEntity` parameter Phase 1 Block 5R built. **The plumbing already exists.** Phase 4's job is the UI + the server-side identity-list query.

If the user owns only one entity (the common case — Card 1 Solo builder), the picker is hidden. UI surfaces only when there's an actual choice.

### B.5 — Team API key + V1 endpoints

Phase 3 built the gateway. Phase 4 inherits it.

`/api/keys` already accepts a `scope` parameter (Phase 3 §H.2). Phase 4 adds `'team:rw'` as a valid scope alongside `'builder:rw' | 'buyer:rw' | 'agent:rw'`. New scope unlocks `/api/v1/team*` endpoints:
- `GET /api/v1/team` — team's own profile (for an agent managing the team)
- `PATCH /api/v1/team` — update team profile fields
- `GET /api/v1/team/members` — list linked members
- `POST /api/v1/builds` already exists; with team:rw scope, posts a team-subject receipt via the same Block 5R routing mechanism.

`resolveEntityKindForOwner(user_id)` (Phase 1 Block 5R helper) extends to also detect team ownership. Returns `'agent' | 'team' | 'human' | null` with the same priority order: agent > team > human > null.

When the user owns multiple kinds (e.g., human Solo + team admin), `resolveEntityKindForOwner` returns 'team' if a team-scoped API key was used, 'human' otherwise. **Scope drives the kind, not the user.** This is the cleanest separation.

### B.6 — AgentCard skill addition

Per Invariant #8: every new public discoverable surface adds a skill to the AgentCard. Phase 4 adds:
- `fetch-team-profile` — GET `/team/<slug>` deep-fetch (analogous to the existing `fetch-builder` skill)

That's it for the AgentCard. One additive skill. `verify-agent-card.ts` is updated to assert presence.

### B.7 — Phase 3 components reused on team dashboard

`/team/<slug>/edit` (the team management surface) gets:
- `<EnableHiringButton scope="buyer:rw" variant="card">` — team can enable Buyer Mode (the team's billing handles its own subscription)
- `<ConnectAnAgent scope="team:rw" variant="team_dashboard">` — team can hand profile management to an agent
- Profile edit form (team-specific fields)
- Members list (read from `profiles WHERE team_entity_id = this_team.id`)
- Block-member action (sets the linked profile's team_entity_id to NULL — soft removal)

---

## §C — Block 1: DDL

### C.1 — Operator-paste SQL

```sql
BEGIN;

-- Team profile (rich fields beyond what's in entities)
CREATE TABLE public.team_profiles (
  id BIGSERIAL PRIMARY KEY,
  entity_id BIGINT NOT NULL UNIQUE REFERENCES public.entities(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  tagline TEXT NULL,
  description TEXT NULL,
  services TEXT[] NOT NULL DEFAULT '{}',
  location TEXT NULL,
  website_url TEXT NULL,
  logo_url TEXT NULL,
  contact_email TEXT NULL,
  published BOOLEAN NOT NULL DEFAULT false,
  founded_year INT NULL,
  team_size_range TEXT NULL,  -- '1-5', '6-20', '21-50', '51-100', '100+'
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_team_profiles_entity ON public.team_profiles(entity_id);
CREATE INDEX idx_team_profiles_published ON public.team_profiles(published) WHERE published = true;

-- Multi-admin join table (single row at signup; multi-admin UX deferred but schema-ready)
CREATE TABLE public.team_admins (
  id BIGSERIAL PRIMARY KEY,
  team_entity_id BIGINT NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',  -- 'owner' | 'admin' | 'editor' (UX uses only 'owner' in Phase 4)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_entity_id, user_id)
);

CREATE INDEX idx_team_admins_team ON public.team_admins(team_entity_id);
CREATE INDEX idx_team_admins_user ON public.team_admins(user_id);

-- Soft member linking on builder profiles (LinkedIn-style)
ALTER TABLE public.profiles
  ADD COLUMN team_entity_id BIGINT NULL REFERENCES public.entities(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_team_entity ON public.profiles(team_entity_id) WHERE team_entity_id IS NOT NULL;

COMMIT;
```

### C.2 — Verification

```sql
SELECT count(*) FROM information_schema.columns
WHERE table_schema='public' AND table_name='team_profiles';
-- Expect 16

SELECT count(*) FROM information_schema.columns
WHERE table_schema='public' AND table_name='team_admins';
-- Expect 5

SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='profiles' AND column_name='team_entity_id';
-- Expect 1 row

SELECT count(*) FROM public.profiles WHERE team_entity_id IS NOT NULL;
-- Expect 0 (nothing soft-linked yet)
```

### C.3 — Reversal

```sql
BEGIN;
DROP TABLE IF EXISTS public.team_admins;
DROP TABLE IF EXISTS public.team_profiles;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS team_entity_id;
COMMIT;
```

---

## §D — Block 2: Entity factory + scope routing

### D.1 — Add `findOrCreateTeamEntity` to `src/lib/entities.ts`

Mirrors `findOrCreateHumanEntity` / `findOrCreateAgentEntity` patterns. Signature:

```ts
export async function findOrCreateTeamEntity(
  admin: SupabaseClient,
  user: User,
  teamName: string,
  slug: string,
): Promise<{ entity: EntityRow; was_created: boolean }>
```

Logic:
1. Check if a team entity already exists with this slug. If so, return it (idempotent, was_created=false). Slug collisions surface as 23505 conflicts — bubble up to caller.
2. Otherwise, insert into entities `{ kind: 'team', slug, display_name: teamName, owner_user_id: user.id }`. Returns the new entity, was_created=true.
3. Caller is responsible for inserting the corresponding `team_profiles` row + `team_admins` row.

### D.2 — Extend `resolveEntityKindForOwner` for team

Current behavior (Phase 1 Block 5R):
```ts
// Returns 'agent' | 'human' | null
// Priority: agent > human
```

Extended:
```ts
// Returns 'agent' | 'team' | 'human' | null
// Priority: agent > team > human
// 
// NOTE: This function is called from /api/enrich on the API-key path. Phase 3
// added scope to api_keys. The right scope-aware routing is:
// - If api_key.scope = 'team:rw' → resolve to team entity
// - If api_key.scope = 'agent:rw' → resolve to agent entity
// - Otherwise → resolve to human entity (default builder:rw / buyer:rw)
//
// However, this function takes only user_id. The caller (/api/enrich) should
// pass the scope alongside and let scope drive the decision when ambiguous.
```

The cleaner design: don't make `resolveEntityKindForOwner` infer scope. Instead, `/api/enrich` (Phase 1 §5R) already has the API key context. It passes `auth.scope` as a parameter:

```ts
export async function resolveEntityKindForOwner(
  admin: SupabaseClient,
  userId: string,
  hintScope?: 'builder:rw' | 'buyer:rw' | 'agent:rw' | 'team:rw',
): Promise<'agent' | 'team' | 'human' | null>
```

Behavior:
- If `hintScope === 'team:rw'`, look for a team entity owned by this user. If found, return 'team'. If not, fall through.
- If `hintScope === 'agent:rw'`, look for an agent entity owned by this user. If found, return 'agent'. Fall through.
- Otherwise (no hint, builder:rw, or buyer:rw), prefer human entity → agent → team → null.

This makes `/api/enrich` route receipts to the correct entity kind based on the API key's scope, without needing extra logic at the caller.

### D.3 — Extend `/api/enrich` to pass scope hint

Find the existing `resolveEntityKindForOwner` call in `/api/enrich/route.ts` (added in Phase 1 §5R.3). The API-key branch already has `apiAuth.auth` in scope. Update the call:

```ts
const kind = await resolveEntityKindForOwner(admin, targetUser.id, isApiKeyAuth ? apiAuth.auth.scope : undefined)
```

Then add a `team` branch in the switch on `kind`:
```ts
if (kind === 'team') {
  // Look up team entity for this user (the one matching their team-scope key)
  const { data: teamRow } = await admin
    .from('entities')
    .select('*')
    .eq('kind', 'team')
    .eq('owner_user_id', targetUser.id)
    .limit(1)
    .maybeSingle()
  if (!teamRow) {
    return NextResponse.json({ error: 'No team entity for team-scoped key' }, { status: 500 })
  }
  entity = teamRow as EntityRow
}
```

### D.4 — Validate

```bash
npx tsc --noEmit
```

Existing callers unchanged (Phase 1 / Phase 3 paths still resolve human + agent correctly).

---

## §E — Block 3: Team signup route

### E.1 — Rebuild `/api/join/team`

Replace whatever interim "Reserve your team name" handler exists.

Path: `src/app/api/join/team/route.ts`.

Inputs (JSON body):
```json
{
  "team_name": "Acme AI Studio",
  "slug": "acme-ai-studio",
  "description": "We build AI agents for SMBs.",
  "services": ["AI agent development", "Custom integrations"],
  "location": "Remote",
  "website_url": "https://acme.ai",
  "contact_email": "hi@acme.ai"
}
```

Logic:
1. Authenticate via cookie session (user must be logged in to create a team they own).
2. Validate slug format (`/^[a-z0-9][a-z0-9-]{2,40}[a-z0-9]$/`) and team_name length.
3. Check slug uniqueness against entities table. 409 if taken.
4. `findOrCreateTeamEntity(admin, user, teamName, slug)` → creates entity.
5. Insert `team_profiles` row with the entity_id + provided fields. `published` defaults to false (team owner reviews + clicks Publish in /team/<slug>/edit).
6. Insert `team_admins` row with `{ team_entity_id: entity.id, user_id: user.id, role: 'owner' }`.
7. Return `{ slug, entity_id, edit_url: '/team/<slug>/edit' }`. Frontend redirects.

Error handling:
- 23505 (duplicate slug) → 409 with "Team slug already taken"
- Auth failure → 401
- Other → 500 with generic message

### E.2 — Wire `/join` Card 2 to the new flow

`/join/page.tsx` Card 2 currently links to an interim form. Replace with a form that collects:
- Team name (text)
- Slug (auto-derived from name with manual override)
- Tagline (text)
- Description (textarea)
- Services (multi-select or comma-separated for v1 — pick the simpler)
- Location (text)
- Website URL (text)
- Contact email (defaults to logged-in user's email)

Submit POSTs to `/api/join/team`. On 200, redirect to `/team/<slug>/edit`.

If user not logged in: gate the form — show a "Log in or sign up first to create your team" CTA that bounces to `/login?redirect=/join` (preserving Card 2 intent in the redirect param).

### E.3 — Validate

```bash
npx tsc --noEmit
```

Manual smoke (browser):
- Visit `/join` → click Card 2.
- If anon: log in (existing flow), redirected back.
- Fill form, submit. Lands on `/team/<slug>/edit` with the team published=false (next block builds this page).

---

## §F — Block 4: Team public profile page

### F.1 — `/team/[slug]/page.tsx`

Server component. Mirrors `/u/[username]/page.tsx`'s structure (Organization JSON-LD instead of Person JSON-LD; team-specific render).

Data fetch:
1. Resolve team by slug (entities.slug + entities.kind='team').
2. Fetch team_profiles by entity_id.
3. Fetch linked members (`profiles WHERE team_entity_id = entity.id AND published = true`).
4. Fetch recent team-subject receipts (`proof_receipts WHERE subject_id = entity.id AND visibility = 'public' AND verification_level = 'L1_artifact_confirmed' ORDER BY issued_at DESC LIMIT 50`).
5. Compute proof-of-work aggregates same as `/u/<username>` does for builders (L1 count, distinct hosts, last shipped).

Render:
- Hero: logo, team_name, tagline, location, services tags.
- About: description, founded_year, team_size_range.
- Proof of work: receipt count, distinct hosts, last shipped.
- Receipts list: recent shipped work (each links to `/p/<receipt-slug>`).
- People (LinkedIn-style): grid of linked members with avatar + name + link to `/u/<username>`.
- "Hire this team" CTA: opens the buyer-side message flow (existing — same component as `/u/<username>` uses).

Organization JSON-LD:
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://shipstacked.com/team/<slug>",
  "name": "Acme AI Studio",
  "description": "...",
  "url": "https://acme.ai",
  "logo": "...",
  "address": { "@type": "Place", "name": "Remote" },
  "member": [
    { "@type": "Person", "@id": "https://shipstacked.com/u/alice" },
    ...
  ],
  "shipstacked:teamSize": "6-20",
  "shipstacked:services": ["AI agent development", "Custom integrations"],
  "shipstacked:verified": false,
  "shipstacked:l1ReceiptCount": 14
}
```

`@id` is the canonical team URL — same one-graph-per-URL principle as builder profiles.

### F.2 — `/team/[slug]/OG image`

Path: `src/app/team/[slug]/opengraph-image.tsx` (or wherever the existing OG route pattern lives — codebase read mentioned `/og/route.tsx` handles builder OG).

Render: team name + tagline + services pills + verified badge. Mirror the builder OG template's visual style.

### F.3 — Validate

```bash
npx tsc --noEmit
npm run build
```

Manual: visit `/team/<slug-from-E.3-signup>` → renders the published=false state ("Coming soon — team is finishing their profile") OR the full page if published=true.

If published=false, show a "Preview as owner" path: if the current user is in `team_admins` for this team, render the full page with a preview banner. Otherwise 404 (or "Not published yet").

---

## §G — Block 5: Team edit page

### G.1 — `/team/[slug]/edit/page.tsx`

Server component, auth-gated:
1. Get current user via cookie session.
2. Resolve team by slug.
3. Verify user is in `team_admins` for this team. 403 otherwise.
4. Fetch full team_profiles row + members list.
5. Render `<TeamEditClient>` with all data as props.

### G.2 — `<TeamEditClient>`

Client component with three subsections (similar pattern to `<HirerDashboardClient>` from Phase 2):

**1. Profile fields form:**
- All `team_profiles` fields editable (team_name, tagline, description, services, location, website_url, logo_url, contact_email, founded_year, team_size_range).
- "Save changes" button → PATCH `/api/v1/team`.
- "Publish" / "Unpublish" toggle for `published` field.

**2. Members list (with block action):**
- Read-only display of `profiles WHERE team_entity_id = this_team.id`.
- For each member: avatar, name, username, link to /u/<username>, "Remove from team" button.
- "Remove" sets the profile's `team_entity_id` back to NULL (soft removal). No DDL, just an UPDATE on `profiles`.
- "Members add themselves from their own profile" copy at the top of the section (LinkedIn-style stance).

**3. Phase 3 components:**
- `<EnableHiringButton source="team_dashboard" variant="card">` — team enables Buyer Mode if it wants to hire from the network.
- `<ConnectAnAgent scope="team:rw" variant="team_dashboard" email={ownerEmail}>` — hand team profile management to an agent.

### G.3 — `PATCH /api/v1/team` route

Path: `src/app/api/v1/team/route.ts`.

GET: returns the team profile for the team:rw scoped key's owner. Reuses `apiAuth.auth.scope === 'team:rw'`.
PATCH: updates the team_profiles row (and `entities.display_name` if team_name changed).

Auth: bearer key with `team:rw` scope (per Phase 3 model). Cookie-session path also supported — if user is in `team_admins` for the team derived from session, allow.

### G.4 — Soft removal: `DELETE /api/team/[slug]/members/[username]`

Path: `src/app/api/team/[slug]/members/[username]/route.ts`.

Auth: cookie session, user must be in `team_admins`.
Action: UPDATE `profiles SET team_entity_id = NULL WHERE username = <username> AND team_entity_id = <team>.id`.

### G.5 — Validate

```bash
npx tsc --noEmit
npm run build
```

Manual: visit `/team/<slug>/edit` as owner → form renders. Update fields, save, refresh — fields persist. Publish toggle works. Remove a member (if any linked) → member disappears from list.

---

## §H — Block 6: Builder side member linking

### H.1 — Add `team_entity_id` field to builder EditProfileForm

Pre-edit read: locate the existing EditProfileForm (codebase read §0 mentioned it's at `src/app/dashboard/EditProfileForm.tsx` or similar).

Add a new input field: "Team / Agency / Studio you're with (optional)". Implementation:
- Text input with autocomplete suggestions from `entities WHERE kind='team' AND display_name ILIKE '%'<query>'%'` (debounced query → `GET /api/teams/search?q=...`).
- On match selection, stores the team's entity_id in form state.
- On save, `PATCH /api/v1/profile` writes `team_entity_id`.
- Hint text: "Type your team's name. If they're on ShipStacked, link will appear automatically. Otherwise, ask them to create a team profile via /join."

### H.2 — `GET /api/teams/search`

Path: `src/app/api/teams/search/route.ts`.

Public read-only endpoint. Query param `q` (1-50 chars). Returns top 10 matches:
```json
{ "results": [{ "slug": "acme-ai-studio", "name": "Acme AI Studio", "logo_url": "..." }] }
```

### H.3 — `/u/<username>` renders the linked team

On builder profile, add a "Works with" section under the hero:
- If `profile.team_entity_id` is set AND the team is published, render: team logo + team name → link to `/team/<slug>`.
- If `profile.team_entity_id` is set but team is unpublished, render nothing (graceful degradation).

JSON-LD: add `worksFor` to the Person JSON-LD per schema.org:
```json
{
  "@type": "Person",
  "@id": "https://shipstacked.com/u/alice",
  "worksFor": { "@id": "https://shipstacked.com/team/acme-ai-studio" }
}
```

### H.4 — `PATCH /api/v1/profile` accepts `team_entity_id`

Existing route (Phase 1 + 3) needs an additive field. Find the existing `acceptedFields` array in the route and add `'team_entity_id'`. Validate: must be a valid entity_id with kind='team', or NULL (un-link).

### H.5 — Validate

```bash
npx tsc --noEmit
```

Manual: as a builder, EditProfileForm shows the new field. Type team name, autocomplete fires, select team, save. Visit /u/<username> → "Works with" section appears. Visit /team/<slug> → builder appears in People section.

---

## §I — Block 7: Mixed `/talent` directory with type facet

### I.1 — Pre-edit read

Already in §A.4. Need to know exact filter section structure to add the type facet without breaking existing filters.

### I.2 — `getRankedTeams()` helper

Path: `src/lib/ranking/get-ranked-teams.ts` (new).

Mirrors `getRankedBuilders()` but with `WHERE e.kind = 'team'` on the entities join. Returns `RankedTeam[]` with:
```ts
export interface RankedTeam {
  id: string  // team_profiles.id
  slug: string
  team_name: string
  tagline: string | null
  logo_url: string | null
  description: string | null
  services: string[]
  location: string | null
  verified: boolean
  team_size_range: string | null
  l1_receipt_count: number
  atlas_clusters: string[]
  quality_score: number | null
  ranked: boolean
}
```

Formula E ranking applied to team-subject receipts. Same scoring function, different subject query.

### I.3 — `<TeamCard>` component

Mirrors `<BuilderCard>` shape. Displays team logo, name, tagline, services tags, location, verified badge, l1_receipt_count badge.

### I.4 — Add type facet to `/talent/page.tsx`

Above existing filters, add a type-selector tab strip:
- "Builders" (default, active)
- "Teams"
- "Agents" (Phase 5 — show as "Coming soon" disabled tab in Phase 4)

URL state: `?type=builder|team|agent`. Default `builder`.

When `type === 'team'`:
- Hide builder-specific filters (cluster/role/profession/availability).
- Show team-specific filters: services dropdown (multi-select, union match), location (text), verified (checkbox).
- Call `getRankedTeams()` instead of `getRankedBuilders()`.
- Render `<TeamCard>` instead of `<BuilderCard>`.

When `type === 'agent'`: render empty state ("Agent directory ships in Phase 5").

### I.5 — Validate

```bash
npx tsc --noEmit
npm run build
```

Manual: `/talent` defaults to Builders (unchanged behavior). Click "Teams" tab → URL becomes `?type=team`, filters swap, teams render.

---

## §J — Block 8: Paste identity picker

### J.1 — Server-side identity list query

When the `/paste/review` page loads (or its data-fetch helper), include a query: all entities owned by the current user.

```ts
const { data: ownedEntities } = await admin
  .from('entities')
  .select('id, kind, slug, display_name')
  .eq('owner_user_id', user.id)
```

Pass `ownedEntities` to `<PasteReviewClient>` as a prop.

### J.2 — `<IdentityPicker>` component

Path: `src/app/components/IdentityPicker.tsx` (new).

```tsx
type IdentityOption = { id: number; kind: 'human' | 'team' | 'agent'; slug: string; display_name: string }

type Props = {
  options: IdentityOption[]
  value: number  // entity_id
  onChange: (entity_id: number) => void
}
```

Renders:
- If `options.length === 1`: hidden (single identity, no choice to make).
- If `options.length > 1`: a dropdown labeled "Post as:" with each option formatted as "<display_name> (<kind>)" or with kind-specific icon. Default = first human entity, else first option.

### J.3 — Wire into `/paste/review`

Find the existing "Confirm and publish" handler. Add `subject_entity_id` to the POST body sent to `/api/paste/publish` (or whichever endpoint commits the draft).

### J.4 — Extend `/api/paste/publish` to accept `subject_entity_id`

The endpoint validates that the chosen entity is owned by the current user (security check — can't post as someone else's identity). Then passes `subjectEntity` to `publishProofReceipt`. The plumbing already exists from Phase 1 Block 5R.

### J.5 — Validate

```bash
npx tsc --noEmit
npm run build
```

Manual: as a user who owns both a human entity and a team entity, visit `/paste`, draft something, click Review. Identity picker visible with both options. Select Team → confirm + publish → resulting receipt has `subject_id = team_entity_id`. Visit /team/<slug> → receipt appears in team's recent shipped section. Visit /u/<username> → receipt does NOT appear in builder's section.

---

## §K — Block 9: AgentCard skill addition

### K.1 — Add `fetch-team-profile` skill to builder.ts

In `src/lib/agent-card/builder.ts` skills array, add:

```ts
{
  id: 'fetch-team-profile',
  name: 'Fetch team profile',
  description: 'Retrieve a verified AI agency / team profile by slug, including services, members, location, and recent shipped work.',
  tags: ['hiring', 'profile', 'team', 'agency'],
  examples: [`${CANONICAL_HOST}/team/acme-ai-studio`, `${CANONICAL_HOST}/api/v1/builders/<slug>`],  // confirm exact example URL during execution
  inputModes: ['application/json'],
  outputModes: ['application/json'],
}
```

### K.2 — Add `GET /api/v1/team/[slug]` for public agent-fetch

Path: `src/app/api/v1/team/[slug]/route.ts` (different from `/api/v1/team` which is for the team's OWN profile via team:rw key).

This route is public agent-fetch — any authenticated agent can deep-fetch a team profile, mirroring `/api/v1/builders/[username]`. Returns full team profile + members + recent receipts. Published-only; 404 otherwise.

### K.3 — Update `verify-agent-card.ts`

Add assertion: skills array must include a skill with `id === 'fetch-team-profile'`.

### K.4 — Validate

```bash
npx tsc --noEmit
node --experimental-strip-types scripts/v2/verify-agent-card.ts --base http://localhost:3000
```

Both exit 0.

---

## §L — Block 10: Card 2 honest-copy update

### L.1 — `/join` Card 2 copy

Phase 1 Item 4 shipped interim: "Reserve your team name. Full profile editor and shipped-work display ship next."

Phase 4 updates to the locked Card 2 final copy:

> "Show what your team has shipped. Get found by the SMBs and Series-A's looking for AI implementation capability."

Plus subline (operator-edit acceptable):
> "Free team profile. Optional Buyer Mode. Optional agent management."

### L.2 — Validate
Visual check.

---

## §M — Block 11: Final validation

### M.1 — Gates

```bash
npx tsc --noEmit
npm run build
grep -rni "velocity" src/ --include="*.ts" --include="*.tsx"
node --experimental-strip-types scripts/v2/verify-agent-card.ts --base http://localhost:3000
```

All four exit 0.

### M.2 — End-to-end smoke (local)

1. Log in as a builder. Visit `/join` → Card 2 → fill team signup form → submit. Confirm redirect to `/team/<slug>/edit`. Confirm new entity row (kind=team), team_profiles row, team_admins row exist in DB.

2. In team edit, update fields, click Publish. Confirm `team_profiles.published = true`.

3. Visit `/team/<slug>` (logged out or as different user) → confirm public profile renders. Confirm Organization JSON-LD present.

4. Visit `/talent?type=team` → confirm team appears in directory.

5. Switch back to builder identity, visit `/dashboard/edit` (or wherever the builder EditProfileForm lives). Add team via autocomplete. Save. Visit `/u/<username>` → "Works with" section shows team. Visit `/team/<slug>` → builder appears in People.

6. Visit `/paste`, draft a build. On `/paste/review`, identity picker shows "Solo identity" + "Team identity". Select Team, publish. Verify receipt subject_id matches team entity_id (DB query).

7. Generate a team:rw API key via `<ConnectAnAgent>` on the team edit page. Use it: `curl -H "Authorization: Bearer sk_ss_..." /api/v1/team` → returns team profile. PATCH with new tagline → confirm DB update.

### M.3 — Report

Same template as prior phases. tsc, build, verify-card exit codes; grep counts; git status/diff; list of new + modified files; smoke test results.

Stop. Operator approves, then ship.

---

## §N — Block 12: Ship

### N.1 — Commit

```
git add -A src/ docs/decisions/RESUME_HERE.md scripts/v2/verify-agent-card.ts scripts/v2/verify-batch5.ts
# NOTE (post-ship correction): §D's 3-arg → 4-arg findOrCreateTeamEntity change
# also modified scripts/v2/verify-batch5.ts:565. The original add-list above
# OMITTED it, so commit 8052bf8 shipped entities.ts (4-arg) without the matching
# verify-batch5.ts update → Vercel tsc failed (local tsc passed off the working
# tree). Fixed in follow-up commit 3e2d3ac. verify-batch5.ts is now in the list.

git commit -m "Phase 4: Team flow

Team becomes a first-class customer surface with profile, edit, paste-routing,
mixed /talent directory, soft member linking, and inherited Phase 3 gateway.

Shipped:
- Team signup via /join Card 2 → /api/join/team creates entity (kind='team',
  owner_user_id=signing-up-human), team_profiles row, team_admins row.
- /team/<slug> public profile page with Organization JSON-LD (one-graph-per-URL),
  OG image, proof-of-work aggregates, member list, recent receipts.
- /team/<slug>/edit with full profile editor, Publish toggle, member-remove
  action, plus Phase 3 <EnableHiringButton> and <ConnectAnAgent scope='team:rw'>
  for composable Buyer Mode + agent management.
- Mixed /talent directory with type facet (Builder | Team | Agent stub).
  Builder type unchanged; Team type uses new getRankedTeams() Formula E ranking.
- LinkedIn-style soft member linking: profiles.team_entity_id NULL column,
  builder EditProfileForm autocomplete via /api/teams/search, /u/<username>
  'Works with' section, /team/<slug> People section.
- Paste identity picker on /paste/review: when user owns multiple entities,
  IdentityPicker exposes 'Post as: <human|team|agent>'. Plumbing reuses
  Phase 1 Block 5R subjectEntity parameter — single source of truth.
- /api/v1/team GET/PATCH (team:rw scope) for team-agent profile management.
- /api/v1/team/<slug> public agent-fetch (any authenticated agent).
- /api/teams/search public autocomplete.
- resolveEntityKindForOwner extended with optional hintScope param; routes
  team:rw API key receipts to team entity.
- Card 2 copy updated to final: 'Show what your team has shipped...'
- AgentCard skills array gains fetch-team-profile per Invariant #8;
  verify-agent-card.ts asserts presence.

DDL applied to prod DB before commit:
- New team_profiles table (16 cols)
- New team_admins table (multi-admin-ready, single-row at signup)
- profiles.team_entity_id column added (soft member link)

Did NOT change:
- AgentCard data-publisher posture (one additive skill only).
- MCP server posture (no new tools).
- Phase 3 gateway architecture (inherited as-is).

Deferred to later phases:
- Member receipt attribution (Phase 5+)
- Team aggregate scoring (Phase 5+)
- Multi-admin UX (schema ready; UX pending paying-agency demand)
- Team member 'invite by email' flow (LinkedIn stance is correct for v1)
- Agent type facet on /talent (Phase 5)

Discovery + diff plan: docs/audit/PHASE4_TEAM_FLOW.md (untracked working
tree; Phase 7 commits)."

git push origin main
```

### N.2 — Post-push verification

```bash
node --experimental-strip-types scripts/v2/verify-agent-card.ts --base https://shipstacked.com
```

Exit 0. The new fetch-team-profile skill assertion flips from known-temporary-fail to pass on deploy.

After Vercel deploy:
```bash
curl -s https://shipstacked.com/.well-known/agent-card.json | jq '.skills | map(.id) | contains(["fetch-team-profile"])'
# Expect: true

# Create a test team via UI, then:
curl -s https://shipstacked.com/team/<test-slug> -o /dev/null -w '%{http_code}'
# Expect: 200 (if published) or 404 (if unpublished)
```

### N.3 — Outstanding verifications

Add to `docs/decisions/RESUME_HERE.md` Phase 4 section:
- Team signup end-to-end on prod
- Team edit + publish flow on prod
- /talent?type=team on prod with at least 1 team
- Builder member-link flow on prod (autocomplete + Works-with section)
- Paste identity picker on prod (operator with multiple entities)
- team:rw API key smoke test (GET /api/v1/team + PATCH)
- Member-remove action on prod

---

## §O — Decisions locked

- Team owned by signing-up human's auth account. No separate auth user.
- `team_admins` join table (multi-admin schema-ready; single-row UX in Phase 4).
- LinkedIn-style soft member linking via `profiles.team_entity_id NULL`.
- Single mixed `/talent` with type facet, defaults to Builder.
- Formula E unchanged for teams in v1 (ranked by direct receipts).
- Paste identity picker via `subject_entity_id` body field.
- No `team_skills` table; services in array column; case studies = receipts.
- Phase 3 components inherited (`<EnableHiringButton>`, `<ConnectAnAgent>`).
- One AgentCard skill addition (`fetch-team-profile`).

## §P — Deferred

- Member receipt attribution (post-revenue)
- Team aggregate scoring (post-revenue)
- Multi-admin UX (Phase 5+ when paying agency surfaces demand)
- Member invitation/accept flow (LinkedIn stance correct for v1)
- Block-list table for hostile fake-member-association (defer; simple set-to-NULL is enough)
- Team Atlas role classification (Phase 6)
- Agent type facet on `/talent` (Phase 5)
- AP2 transaction layer for hire confirmations (Phase 9+)

End of Phase 4 doc.
