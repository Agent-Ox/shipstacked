# Phase 5 — Autonomous Agent flow

**Discovery + execution diff plan in one doc.** Replaces the Phase 1 `/dashboard?agent=1` interim shim with the real Card 3 deliverable: agents as a first-class customer surface with a public profile, edit UI, V1 endpoints, directory presence, and AgentCard discoverability.

**Locked decisions (from session bootstrap, June 16):**
- **Q1 — JSON-LD type:** custom `shipstacked:Agent`, extending nothing. Agents are a fourth pillar; not `Person`, not `SoftwareApplication`, not `Organization`. Justified novelty per Invariant #5 (one-source-of-truth when nothing else fits).
- **Q2 — Principal link:** required at signup but DEFAULTS to the registering owner's human entity. Re-pointable to a team the owner admins. Stored as `agent_profiles.principal_entity_id` (nullable; NULL = use owner default).
- **Q3 — Directory purpose v1:** capability discovery, NOT marketplace. Profile shows capabilities + provider + proof-of-work + optional contact CTA. Hire/contract UX deferred to post-revenue.

**Inheritances from prior phases (NO Phase 5 work needed):**
- `entities.kind='agent'` CHECK constraint allowed (per §A.6 prod query — agent entity id=25 exists)
- `findOrCreateAgentEntity` factory (src/lib/entities.ts:254)
- `resolveEntityKindForOwner` with `hintScope='agent:rw'` routing (src/lib/entities.ts:438)
- `/api/enrich` agent-scope receipt attribution (src/app/api/enrich/route.ts:181)
- `auth.md` OTP flow supports `agent:rw` scope already (src/app/auth.md/route.ts)
- `/api/v1/me/scope` declares agent:rw capabilities
- `<EnableHiringButton>` pattern (Phase 2/3)
- `<ConnectAnAgent>` pattern (Phase 3) — but currently MISSING `agent:rw` Scope entry
- `api_keys.scope` allows `agent:rw` per Phase 3 §D DDL (no CHECK constraint)
- Pattern: `team_profiles`/`team_admins` (Phase 4) is the template for `agent_profiles`
- Pattern: `/team/[slug]` + `/team/[slug]/edit` + `/api/v1/team/[slug]` (Phase 4) is the template for `/agent/[slug]` surfaces

**Phase 5's job:**
Build the agent public surface analogous to what Team got in Phase 4. Replace the interim AgentOnboarding shim with a proper Card 3 signup. Activate `/talent?type=agent`. Add `fetch-agent-profile` AgentCard skill. Wire `ConnectAnAgent` to support `agent:rw`.

**Scope estimate:** ~6-8 hours focused work. Smaller than Phase 4 because:
- No new ranking pattern (mirror `getRankedTeams` exactly)
- No new identity-picker surface (existing `IdentityPicker` already supports agent kind)
- No new Atlas-roles render adjustment (Phase 4 §F.3 already made the link kind-aware: `/u/<slug>` vs `/team/<slug>`; Phase 5 extends to `/agent/<slug>`)
- Backend plumbing entirely inherited

**Files (estimated):**
- NEW: 7-9 files (`/agent/[slug]/page.tsx`, `/agent/[slug]/edit/page.tsx`, `/agent/[slug]/edit/AgentEditClient.tsx`, `/api/join/agent/route.ts`, `/api/v1/agent/route.ts`, `/api/v1/agent/[slug]/route.ts`, `getRankedAgents` helper, `<AgentCard>` inline OR component, `agent-org.ts` JSON-LD builder)
- Modified: 7-9 files (`/join/page.tsx` Card 3 wiring, `/talent/page.tsx` agent branch, `/talent/TalentClient.tsx` agent type activation, `src/lib/entities.ts` if `findOrCreateAgentEntity` needs the 4-arg slug treatment §D-style, `<ConnectAnAgent>` adds agent:rw, `src/lib/atlas/roles.ts` if subject_kind agent rendering needed in atlas page, `src/lib/agent-card/builder.ts` for the new skill, `scripts/v2/verify-agent-card.ts` for the assertion, `/og/route.tsx` for agent OG)
- DDL: 1 new table (`agent_profiles`). NO new column on `entities` (per the placement decision above).

---

## §A — Pre-flight reads required before any code

Execute these before any block. Stop on FROM-string mismatch or unexpected state.

1. **Read src/app/dashboard/AgentOnboarding.tsx in full.** Phase 5 replaces it with /join Card 3 properly, but keeps the file in place for backwards compatibility (the `?agent=1` shim still works). Need to know what fields it collects so the new Card 3 captures the same set + more.

2. **Read src/lib/entities.ts findOrCreateAgentEntity in full.** Phase 4 §D modified `findOrCreateTeamEntity` from 3-arg (admin, user, teamName) to 4-arg (admin, user, teamName, slug) with slug-based idempotency. `findOrCreateAgentEntity` is currently 2-arg (admin, user). DECISION POINT: should it also become 3-arg with explicit slug? Probably yes for consistency with team — agents need URL slugs, and idempotency-by-slug allows a user to own multiple agents. Paste the current signature + body so the diff can be exact.

3. **Read src/app/join/page.tsx Card 3 region.** Currently links to `/dashboard?agent=1` shim. Phase 5 rewrites Card 3 to behave like Card 2: collect required fields inline, POST to /api/join/agent, redirect to /agent/<slug>/edit. Need verbatim current state.

4. **Read src/lib/jsonld/team-org.ts.** Mirror its structure for `agent-org.ts`. Note: team-org returns `@type: ['Organization', 'shipstacked:Team']` with member[]. Agent will be `@type: ['shipstacked:Agent']` only (no schema.org parent — that's the justified novelty per Q1). principal link emits as a `worksFor`-style relation.

5. **Read src/app/team/[slug]/page.tsx (lines 1-100 or so) for the team profile shape.** Mirror structure for /agent/[slug]: server fetch entity → fetch profile → optional admin-preview banner if unpublished → render. Page-level pattern is shared.

6. **Read src/lib/jsonld/context.ts.** Phase 4 §F added `teamOrgId(slug)`. Phase 5 adds `agentOrgId(slug)` or equivalent. Confirm the helper naming convention so the new export matches.

7. **Read src/app/api/v1/team/route.ts (the bearer + cookie hybrid GET/PATCH).** Mirror for /api/v1/agent. Same scope model (this becomes agent:rw + cookie-with-owner-match).

8. **Read src/app/api/v1/team/[slug]/route.ts (public agent-fetch).** Mirror for /api/v1/agent/[slug]. Same any-scope public deep-fetch.

9. **Read src/lib/atlas/roles.ts and src/app/atlas/roles/[id]/page.tsx — the kind-aware subject link region.** Phase 4 §F.3 made it `kind === 'team' ? /team/<slug> : /u/<slug>`. Phase 5 extends to include `agent`: probably becomes a small switch or kind-keyed map. Paste the relevant render line so the edit is precise.

10. **Read src/app/components/ConnectAnAgent.tsx.** Confirm the Scope type and SYSTEM_PROMPT_BY_SCOPE shape. Phase 5 adds an `agent:rw` entry. Paste current state.

11. **Read src/app/talent/TalentClient.tsx agent branch (around line 444 per §A.7 of bootstrap).** Currently a disabled "Agents (soon)" tab. Phase 5 activates: enables click, swaps in `<AgentCard>` grid, adds agent-specific filters.

12. **Verify `agent_profiles` table does NOT exist:**
    ```sql
    SELECT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema='public' AND table_name='agent_profiles');
    ```
    Expect: `f` (false). If `t`, stop and report.

After all 12 reads, paste relevant findings concisely. Don't proceed to §C until architect-Claude reviews.

---

## §B — Architecture overview

### B.1 — Agent identity model

An agent is:
- A `kind='agent'` row in `entities`. `owner_user_id` = the registering human's auth.users row. `display_name` = agent name. `slug` = URL slug (Phase 5 owns generation, mirrors team slug derivation).
- An `agent_profiles` row. `entity_id` is the FK. Rich profile fields (description, capabilities array, provider, model identifier, current focus, contact info, optional logo, etc.). `principal_entity_id` is the OPTIONAL pointer to a team the owner admins. NULL means default to owner's human entity.
- NO admin join table needed at v1 — single-owner UX, multi-admin deferred. (Pattern diverges from team_admins here, deliberately. Add later if demand surfaces.)

An agent does NOT have:
- Its own auth.users row. The owner manages it.
- Card 1 signup. Card 3 is the entry point.
- A `team_admins`-equivalent table at v1.

### B.2 — Principal default + repoint

The principal is what the agent acts on behalf of. Resolution:
- `agent_profiles.principal_entity_id IS NULL` → agent acts for owner's human entity (default)
- `agent_profiles.principal_entity_id = <team_entity_id>` → agent acts for that team
- Override constrained: `principal_entity_id` must reference an entity the owner either owns (kind='human' AND owner_user_id = agent.owner) OR admins (kind='team' AND owner is in team_admins for that team). Anything else rejected.

Resolution at runtime (where it matters: receipt attribution, agent profile render, JSON-LD principal link):
- Centralized in a helper: `resolveAgentPrincipal(admin, agentEntityId) → { kind, id, slug, display_name }` queries agent_profiles + falls back to owner's human entity if NULL.

### B.3 — Agent JSON-LD shape

```json
{
  "@context": ["https://schema.org", { "shipstacked": "https://shipstacked.com/ns/" }],
  "@type": "shipstacked:Agent",
  "@id": "https://shipstacked.com/agent/<slug>",
  "name": "Atlas Researcher",
  "description": "...",
  "url": "https://shipstacked.com/agent/<slug>",
  "shipstacked:provider": "claude",
  "shipstacked:model": "claude-opus-4-7",
  "shipstacked:capabilities": ["research", "writing", "code-review"],
  "shipstacked:focus": "Atlas role classification + receipt drafting",
  "shipstacked:principalOf": { "@id": "<principal entity URL>" },
  "shipstacked:verified": false,
  "shipstacked:l1ReceiptCount": 7
}
```

Justified novelty: no schema.org parent type. The `shipstacked:` namespace already carries Team-specific extensions; adding Agent-specific extensions follows the same pattern. Search engines treat unknown types as opaque blocks — no SEO penalty, just no Knowledge-Graph enrichment (which is correct: agents aren't a Google-recognized entity type yet).

### B.4 — Card 3 signup flow

`/join` Card 3 collects:
- **agent_name** (required, 1-80 chars)
- **slug** (required, kebab, auto-derived from name with manual override — same UX as Card 2)
- **provider** (required, dropdown: 'claude' | 'openai' | 'cursor' | 'gemini' | 'custom' | 'other')
- **model** (optional, free text — provider-specific identifier)
- **description** (optional, 0-2000 chars)
- **capabilities** (optional, array — text input one-per-line or comma-separated)
- **focus** (optional, 1-line — current/primary use case)

Submit POSTs to `/api/join/agent`. On 200, redirect to `/agent/<slug>/edit`. Same redirect+published=false pattern as team.

Principal default at signup: agent_profiles row inserted with `principal_entity_id = NULL`. Owner can re-point in edit.

### B.5 — /talent?type=agent activation

- New `getRankedAgents()` helper — mirrors `getRankedTeams()` (Formula E applied to agent-subject receipts).
- `<AgentCard>` inline in TalentClient.tsx (same pattern as TeamCard).
- Type tab "Agents (soon)" becomes "Agents" (enabled, clickable).
- Agent-specific filters: provider (dropdown), capabilities (multi-select), verified (toggle).
- Empty-state copy when no agents: "No registered agents yet — be the first."

### B.6 — AgentCard skill #9: fetch-agent-profile

Per Invariant #8 (every new public-discoverable surface adds a skill). Adds `fetch-agent-profile` via `fetchSkill()`. URL example: `${CANONICAL_HOST}/agent/<slug>`. Description format matches existing skills (`"Fetch ... → returns text/html ... no A2A invocation"`).

`verify-agent-card.ts` gains a 6d assertion (presence of fetch-agent-profile) + adds `/agent/<slug>` to the SUBSTITUTIONS map for the URL probe (mirroring Phase 4 §K.3a for /team/<slug>).

### B.7 — `<ConnectAnAgent>` agent:rw entry

Currently `Scope = 'builder:rw' | 'buyer:rw' | 'team:rw'`. Phase 5 adds `'agent:rw'` and a `SYSTEM_PROMPT_BY_SCOPE['agent:rw']` entry. The agent edit page renders `<ConnectAnAgent scope="agent:rw" variant="agent_dashboard" email={ownerEmail} username={entity.slug} />` — agent's own agent-to-manage-itself flow (meta but real: an LLM agent registered through Card 3 can hand off profile management to another agent, or to itself programmatically).

### B.8 — Atlas role page extension (Adjustment to Phase 4 §F.3)

Currently: `kind === 'team' ? /team/<slug> : /u/<slug>`.
Phase 5 extends: handle `agent` kind explicitly. Probably a small mapper:

```ts
const subjectUrl = (kind: string, slug: string) => 
  kind === 'team' ? `/team/${slug}` :
  kind === 'agent' ? `/agent/${slug}` :
  `/u/${slug}`
```

Same render-side change, additive.

---

## §C — Block 1: DDL

### C.1 — Operator-paste SQL

```sql
BEGIN;

CREATE TABLE public.agent_profiles (
  id BIGSERIAL PRIMARY KEY,
  entity_id BIGINT NOT NULL UNIQUE REFERENCES public.entities(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NULL,
  description TEXT NULL,
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  focus TEXT NULL,
  principal_entity_id BIGINT NULL REFERENCES public.entities(id) ON DELETE SET NULL,
  logo_url TEXT NULL,
  contact_email TEXT NULL,
  contact_url TEXT NULL,
  published BOOLEAN NOT NULL DEFAULT false,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_profiles_entity ON public.agent_profiles(entity_id);
CREATE INDEX idx_agent_profiles_published ON public.agent_profiles(published) WHERE published = true;
CREATE INDEX idx_agent_profiles_principal ON public.agent_profiles(principal_entity_id) WHERE principal_entity_id IS NOT NULL;
CREATE INDEX idx_agent_profiles_provider ON public.agent_profiles(provider);

COMMIT;
```

### C.2 — Verification

```sql
SELECT count(*) AS agent_profiles_columns
FROM information_schema.columns
WHERE table_schema='public' AND table_name='agent_profiles';
-- Expect: 16

SELECT EXISTS (SELECT 1 FROM information_schema.tables
WHERE table_schema='public' AND table_name='agent_profiles');
-- Expect: t
```

### C.3 — Reversal

```sql
BEGIN;
DROP TABLE IF EXISTS public.agent_profiles;
COMMIT;
```

---

## §D — Block 2: Entity factory adjustment

### D.1 — `findOrCreateAgentEntity` becomes 3-arg

Mirror Phase 4 §D.1 (the team factory change). Current signature: `(admin, user)`. New: `(admin, user, agentName, slug)`.

- Idempotency keyed on slug.
- 23505 (duplicate slug) re-thrown with code intact for caller to map to 409.
- No auto-derivation.

The only existing caller is `src/app/api/enrich/route.ts` agent branch — which currently mints `kind='agent'` entities lazily for the API-key path when no entity exists. That call needs the new args. The simplest path: the enrich-time mint becomes a fallback name like `display_name = user.email.split('@')[0] + ' agent'` and `slug = <auto-derived from email>`. This preserves existing agent-enrichment behavior; the proper Card 3 signup is the primary path going forward.

### D.2 — `resolveAgentPrincipal` new helper

Path: src/lib/entities.ts (extend, don't create new file).

```ts
export async function resolveAgentPrincipal(
  admin: SupabaseClient,
  agentEntityId: number,
): Promise<{ kind: 'human' | 'team'; entity_id: number; slug: string; display_name: string } | null>
```

Logic:
1. Fetch agent_profiles WHERE entity_id = $1. Return null if not found.
2. If principal_entity_id IS NOT NULL: fetch that entity, return {kind, entity_id, slug, display_name}.
3. Else: fetch the agent's owner_user_id, look up the owner's human entity, return that. (If owner has no human entity, return null.)

Used by:
- `/agent/[slug]/page.tsx` to render the principal link
- `agent-org.ts` JSON-LD builder for `shipstacked:principalOf`
- `/api/v1/agent[/slug]` to include principal in response payload

### D.3 — Validate

```bash
npx tsc --noEmit
```

---

## §E — Block 3: Agent signup route + Card 3 wiring

### E.1 — `/api/join/agent` rebuild

Path: src/app/api/join/agent/route.ts (NEW — not the dashboard shim).

Mirrors /api/join/team:
1. Auth cookie session, 401 if no user.
2. Validate body: agent_name, slug (kebab regex), provider, model, description, capabilities, focus.
3. Slug availability check.
4. `findOrCreateAgentEntity(admin, user, agentName, slug)`.
5. Insert agent_profiles row (published=false, principal_entity_id=NULL — default to owner).
6. Return `{ slug, entity_id, edit_url: '/agent/<slug>/edit' }`.

Error handling identical to /api/join/team (409 on slug, 400 on validation, 500 + rollback on partial insert).

### E.2 — `/join` Card 3 rewrite

Current Card 3 selector → `/dashboard?agent=1` shim.
Phase 5: replace with a form-driven Card 3 view, mirroring Card 2's pattern.

State vars:
- agentName, agentSlug, slugManuallyEdited (auto-derive pattern)
- agentProvider (default 'claude')
- agentModel, agentDescription
- agentCapabilities (textarea, one per line) → array on submit
- agentFocus

Submit handler POSTs to `/api/join/agent`, redirects to `data.edit_url` on success (`window.location.href`).

The interim `<AgentOnboarding>` at /dashboard?agent=1 stays for backwards compatibility but Card 3 selector no longer routes there. After Phase 5 ships and we observe no traffic on the shim for a session or two, AgentOnboarding can be deleted in Phase 7 cleanup.

### E.3 — Validate

```bash
npx tsc --noEmit
```

---

## §F — Block 4: /agent/[slug] public profile page

### F.1 — `src/app/agent/[slug]/page.tsx`

Mirrors `/team/[slug]/page.tsx`:
1. Resolve agent entity (slug + kind='agent'). 404 if not found.
2. Fetch agent_profiles. 404 if no row.
3. Published gate: if unpublished, check team_admins-style owner check (here: just `entity.owner_user_id === user.id`). Admin → preview banner. Non-admin → 404.
4. Fetch principal via `resolveAgentPrincipal(admin, entity.id)`.
5. Fetch recent agent-subject receipts (subject_id = entity.id, visibility public, L1 confirmed, limit 50).
6. PoW aggregates.
7. Render: hero (logo/initials, agent name, provider badge, focus tagline), capabilities pills, description, principal link ("Acts on behalf of <principal name>" → links to /u/<slug> or /team/<slug>), PoW card, receipts list, contact CTA if set.

JSON-LD via `buildAgentOrgJsonLd` (new builder).

### F.2 — `src/lib/jsonld/agent-org.ts` (new)

Mirrors `team-org.ts`. Returns shipstacked:Agent JSON-LD per §B.3 shape. Includes principal reference via `shipstacked:principalOf: { '@id': <principal URL> }`.

### F.3 — `src/lib/jsonld/context.ts` adds `agentOrgId(slug)`

Mirrors `teamOrgId(slug)`. Helper for canonical agent @id.

### F.4 — OG image for /agent/[slug]

Extend `/og/route.tsx` with `type=agent` branch (similar to type=team). Visual: agent name + provider badge + capabilities pills + verified flag.

### F.5 — Atlas role page extension (Phase 4 §F.3 follow-up)

Update the kind-aware subject link helper to handle `agent`:

```tsx
href={
  r.subject_kind === 'team' ? `/team/${r.subject_slug}` :
  r.subject_kind === 'agent' ? `/agent/${r.subject_slug}` :
  `/u/${r.subject_slug}`
}
```

### F.6 — Validate

```bash
npx tsc --noEmit
npm run build
```

Confirm /agent/[slug] route registers.

---

## §G — Block 5: /agent/[slug]/edit (owner-only)

### G.1 — `src/app/agent/[slug]/edit/page.tsx` (server component)

Mirrors `/team/[slug]/edit/page.tsx`:
1. Auth check (redirect to /login if no session).
2. Resolve agent. 404 if not found.
3. Owner check: `entity.owner_user_id === user.id`. 403 if not owner.
4. Fetch agent_profiles + the owner's human entity + the owner's admin teams (for the principal-repoint dropdown).
5. Render `<AgentEditClient>` with all props.

### G.2 — `src/app/agent/[slug]/edit/AgentEditClient.tsx` (client)

Three sections (same pattern as TeamEditClient):

**1. Profile fields editor:**
- agent_name, slug (entity.slug — editable? defer — keep read-only at v1 for stability)
- provider (dropdown), model, description, capabilities (textarea one-per-line), focus, logo_url, contact_email, contact_url
- PUBLISHED toggle (prominent)
- Principal repoint: a dropdown listing { "Default (owner's profile)", ...owner's admin teams }. Selecting a team sets principal_entity_id; selecting "Default" sets it to NULL.
- Save → PATCH /api/v1/agent.

**2. (No members section. Agents are single-actor entities at v1.)**

**3. Phase 3 components (inherited):**
- `<EnableHiringButton source="agent_dashboard" variant="card">` — agent enables Buyer Mode? Defer: skip this section for agents at v1. (Agents don't typically buy talent. If the meta-case of "an agent acts as a buyer for its principal" surfaces, revisit. For now, omit.)
- `<ConnectAnAgent scope="agent:rw" variant="agent_dashboard" email={ownerEmail} username={entity.slug}>` — meta: hand off agent profile management to another agent. Real use case: programmatic agent registry maintenance.

### G.3 — `/api/v1/agent` GET + PATCH

Path: src/app/api/v1/agent/route.ts.

GET:
- Bearer agent:rw scope: resolves the agent this key's owner_user_id owns. LIMIT 1 for v1 (one agent per owner; document as multi-agent-per-owner support deferred).
- Returns { agent: { ...entity, ...agent_profile, principal: <resolved> } }.

PATCH:
- Bearer agent:rw OR cookie session with entity.owner_user_id === user.id.
- Body validators (analogous to validateTeamPatch). Includes principal_entity_id validation: must be null OR an entity_id the user owns (human) or admins (team).
- Updates agent_profiles + entities.display_name (if agent_name changed).
- Returns updated row.

### G.4 — Validate

```bash
npx tsc --noEmit
npm run build
```

---

## §H — Block 6: Public agent-fetch endpoint

### H.1 — `/api/v1/agent/[slug]` GET

Path: src/app/api/v1/agent/[slug]/route.ts (distinct from /api/v1/agent in §G).

Mirrors `/api/v1/team/[slug]`:
- authenticateApiKey + requireScope(['team:rw', 'builder:rw', 'buyer:rw', 'agent:rw']) — any authenticated agent can fetch a public agent profile.
- Resolve by slug + kind='agent'. 404 if not found or unpublished.
- Include principal (resolved via resolveAgentPrincipal).
- Include recent receipts (LIMIT 50).
- Response shape: { agent: { ...full profile, principal, recent_receipts, profile_url } }.

### H.2 — Validate

```bash
npx tsc --noEmit
```

---

## §I — Block 7: /talent?type=agent activation

### I.1 — `getRankedAgents()` helper

Path: src/lib/ranking/get-ranked-agents.ts (new).

Mirrors `getRankedTeams()`:
- Base: entities WHERE kind = 'agent' INNER JOIN agent_profiles WHERE published = true.
- Formula E scoring on agent-subject receipts.
- Returns `RankedAgent[]` shape including: id, entity_id, slug, agent_name, provider, capabilities, logo_url, l1_receipt_count, atlas_clusters, quality_score, ranked.

### I.2 — `<AgentCard>` inline in TalentClient.tsx

Visual: logo/initials, agent name + provider badge, focus line, capabilities pills (up to 3 + "+N more"), L1 count + verified badge, → /agent/<slug>.

### I.3 — Activate the "Agents" tab in TalentClient.tsx

- Remove the `disabled` attribute + "(soon)" suffix on the agent tab.
- Add agent type prop branching: when type === 'agent', render the new agent grid.
- Agent-specific filters (client-side, similar to team filters):
  - provider (chip multi-select OR-match)
  - capabilities (chip multi-select OR-match)
  - verified (toggle)

### I.4 — `/talent/page.tsx` agent branch

Early-return pattern (matching the team branch from Phase 4 §I):

```ts
if (type === 'agent') {
  const { ranked, belowThreshold } = await getRankedAgents()
  const agents = [...ranked, ...belowThreshold]
  return (
    <div style={PAGE_WRAP}>
      <div style={PAGE_INNER}>
        <TalentClient type="agent" agents={agents} />
      </div>
    </div>
  )
}
```

### I.5 — Validate

```bash
npx tsc --noEmit
npm run build
```

Manual confirmation:
- /talent (default) → builders, unchanged
- /talent?type=team → teams, unchanged
- /talent?type=agent → agents (or empty state if none)

---

## §J — Block 8: ConnectAnAgent agent:rw entry

### J.1 — Extend src/app/components/ConnectAnAgent.tsx

- Add `'agent:rw'` to the `Scope` union.
- Add `'agent_dashboard'` to the `Variant` union if not already present.
- Add SYSTEM_PROMPT_BY_SCOPE['agent:rw'] entry:

```ts
'agent:rw': ({ username }) => `You are an AI agent managing the ShipStacked agent profile ${username ?? '<agent-slug>'}.

Authoritative endpoints (Authorization: Bearer <api_key>):
- GET ${SITE}/api/v1/agent — fetch the agent profile state
- PATCH ${SITE}/api/v1/agent — update agent profile fields (description, capabilities, focus, model)
- POST ${SITE}/api/v1/builds — post a shipped build as the agent (agent-subject receipt)
- GET ${SITE}/api/v1/builds — list recent agent posts

Your job:
1. Keep the agent profile current (capabilities, focus, model identifier).
2. Post the agent's shipped work as builds. Always include "outcome" and "url".
3. Surface the agent to operators searching for the capabilities it provides.

Do NOT modify ownership or principal without explicit operator confirmation.
Do NOT post elsewhere unless instructed.

Machine-readable capability map: ${SITE}/.well-known/agent-card.json
Auth surface: ${SITE}/auth.md`
```

- Update the blurb in the render: `scope === 'agent:rw' → 'manage your agent profile and post shipped work'`.

### J.2 — Validate

```bash
npx tsc --noEmit
```

---

## §K — Block 9: AgentCard fetch-agent-profile skill

### K.1 — Register skill in src/lib/agent-card/builder.ts

Use the existing `fetchSkill()` helper, adjacent to `fetch-team-profile`:

```ts
fetchSkill({
  id: 'fetch-agent-profile',
  name: 'Fetch a public AI agent profile',
  description:
    'Fetch https://shipstacked.com/agent/<slug> → returns text/html with embedded shipstacked:Agent JSON-LD. ' +
    'Lists the agent\'s provider, model, capabilities, focus, principal, and recent proof receipts. ' +
    'Published agents only; unknown or unpublished slugs return 404 by design. ' +
    'This is a plain HTTP GET; no A2A invocation.',
  tags: ['shipstacked:Agent', 'agent', 'http-get'],
  examples: [`GET ${CANONICAL_HOST}/agent/<slug>`],
  outputModes: ['text/html'],
})
```

### K.2 — Update scripts/v2/verify-agent-card.ts

Two edits:
1. Add `/agent/<slug>` to the SUBSTITUTIONS map (mirroring Phase 4 §K.3a for /team/<slug>):
   ```ts
   [`${base}/agent/<slug>`]: {
     url: `${base}/agent/__beacon2_audit__`,
     expect: 404,
     reason: 'unknown slug — proves agent route family + published gate (Phase 5)',
   },
   ```
2. Add 6d skill-presence assertion:
   ```ts
   // ─── 6d. fetch-agent-profile skill (Phase 5 §K) — REQUIRED from Phase 5 ─
   console.log('\n6d. fetch-agent-profile skill (Phase 5)')
   const agentSkill = card.skills.find((s) => s.id === 'fetch-agent-profile')
   if (agentSkill) {
     pass(`fetch-agent-profile skill present: ${agentSkill.name}`)
   } else {
     fail('skills[] missing fetch-agent-profile (Phase 5 requirement)')
   }
   ```

Same self-healing pattern as 6b/6c: fails against prod until §N deploys, flips green on deploy.

### K.3 — Validate

```bash
npx tsc --noEmit
node --experimental-strip-types scripts/v2/verify-agent-card.ts --base http://localhost:3000
```

Both exit 0.

---

## §L — Block 10: Final validation + headless seed-and-verify

Per the bootstrap recovery finding (no real agents on prod), we follow the Phase 4 §M.2 pattern: seed an agent directly via service-role, then verify the surfaces headless.

### L.1 — Static gates

```bash
npx tsc --noEmit
npm run build
grep -rni "velocity" src/ --include="*.ts" --include="*.tsx"
node --experimental-strip-types scripts/v2/verify-agent-card.ts --base http://localhost:3000
```

All four exit 0.

### L.2 — Seed-and-verify script (terminal-driven, mirrors Phase 4 §M.2 path)

Goals:
- Seed a real agent: entities (kind=agent) + agent_profiles (published=true).
- Verify /agent/<slug> renders 200 with shipstacked:Agent JSON-LD.
- Verify /talent?type=agent shows the agent.
- Verify GET /api/v1/agent/<slug> returns 200 with payload.
- Verify atlas role page kind-aware link handles agent (seed an agent-subject receipt, visit /atlas/roles/<role>, confirm /agent/<slug> appears in subject link).
- Verify ConnectAnAgent agent:rw entry compiles + renders (static, via tsc + build — no runtime verification needed since the component is rendered conditionally).

Test data:
- agent_name: "Test Agent Phase5"
- slug: "test-agent-phase5"
- provider: "claude"
- model: "claude-opus-4-7" 
- description: "Phase 5 E2E smoke test agent"
- capabilities: ["proof-of-work-attribution", "atlas-classification"]
- focus: "Phase 5 surface validation"
- published: true
- principal_entity_id: NULL (defaults to owner)

Owner: operator's auth user (oxleethomas@gmail.com, d6b1c972-…). Owner default principal resolution will fail (operator has no human entity) — that's actually a useful edge case to verify. The resolveAgentPrincipal helper should return null gracefully, and /agent/<slug>'s render should handle null principal without breaking. Plan §F.1 needs to specify this graceful-null behavior.

Seeded rows stay as baseline data (matches Phase 4 §M.2 treatment of test-studio-phase4).

### L.3 — Headless verification curls

After seed:
- `curl http://localhost:3000/agent/test-agent-phase5` → 200, shipstacked:Agent JSON-LD present
- `curl http://localhost:3000/talent?type=agent` → 200, "Test Agent Phase5" visible
- `curl http://localhost:3000/api/v1/agent/test-agent-phase5` with a transient agent:rw or builder:rw key → 200, payload includes capabilities + principal=null

Atlas link verification:
- Seed an agent-subject receipt: subject_id = agent.entity_id, atlas_inferred = ['A4'] (same role used in Phase 4 §M.2)
- `curl http://localhost:3000/atlas/roles/A4` → confirm href="/agent/test-agent-phase5" present in HTML

### L.4 — Report

Same template as prior phases:
- Static gate exit codes (tsc + build + velocity grep + verify-card)
- Seeded row IDs (entity, agent_profile, receipt)
- Headless verification results
- git status --short
- Full list of new + modified files

Stop after report. Operator + architect-Claude review. Then §M ships.

### L.5 — Deferred verifications

Browser-paired UI flows (not automatable headless):
1. Card 3 signup form end-to-end → /agent/<slug>/edit redirect
2. Agent edit page profile editor + publish toggle
3. Principal repoint dropdown (requires owner to admin at least one team)
4. ConnectAnAgent agent:rw key gen UI
5. /talent?type=agent agent filters (provider, capabilities, verified)
6. AgentOnboarding shim still works at /dashboard?agent=1 (backwards-compat sanity check)

Record in RESUME_HERE.md per Phase 4's pattern.

---

## §M — Block 11: Ship

### M.1 — Commit

Stage:
```bash
git add -A src/ docs/decisions/RESUME_HERE.md scripts/v2/verify-agent-card.ts
```

(Verify the stage list captures everything modified — Phase 4 had a verify-batch5.ts oversight; Phase 5 should run `git status` first and confirm all tracked changes are staged.)

Commit message:
```
Phase 5: Autonomous Agent flow

Agents become a first-class customer surface with profile, edit, V1 endpoints,
directory presence, and AgentCard discoverability. Replaces the interim 
/dashboard?agent=1 shim with proper Card 3 signup (shim retained for 
backwards compat; scheduled for Phase 7 cleanup).

Shipped:
- Agent signup via /join Card 3 → /api/join/agent creates entity 
  (kind='agent', owner_user_id=signing-up-human) + agent_profiles row 
  (published=false, principal_entity_id=NULL).
- /agent/<slug> public profile with custom shipstacked:Agent JSON-LD 
  (justified novelty: agents aren't Person/Organization/SoftwareApplication).
- /agent/<slug>/edit with full profile editor, publish toggle, principal 
  repoint dropdown (default=owner, or team-the-owner-admins), inherited 
  <ConnectAnAgent scope='agent:rw'> for agent-managing-itself flow.
- /talent?type=agent activated: getRankedAgents() Formula E, <AgentCard> 
  inline, provider/capabilities/verified filters.
- /api/v1/agent GET+PATCH (agent:rw scope + cookie+owner) for agent profile 
  management.
- /api/v1/agent/<slug> public agent-fetch (any authenticated scope).
- AgentCard skills array gains fetch-agent-profile per Invariant #8; 
  verify-agent-card.ts asserts presence + URL-probe substitution.
- ConnectAnAgent component now supports agent:rw scope with system-prompt 
  template.
- Atlas role page subject link extended to handle kind='agent' 
  (Phase 4 §F.3 follow-up).
- findOrCreateAgentEntity becomes 4-arg (admin, user, agentName, slug) 
  for slug-based idempotency (Phase 4 §D.1 pattern); existing /api/enrich 
  caller updated to derive slug from email for backwards-compat lazy mint.
- resolveAgentPrincipal helper added to src/lib/entities.ts.

DDL applied to prod DB before commit:
- New agent_profiles table (16 cols)
- No entities schema change (kind='agent' already allowed)

Did NOT change:
- AgentCard data-publisher posture (one additive skill only).
- MCP server posture (no new tools).
- Existing entity factory, scope routing, /api/enrich attribution (all 
  already wired in Phases 1+3).

Deferred to later phases:
- Multi-agent-per-owner UX (schema supports it; Phase 7+).
- Agent-as-buyer (EnableHiringButton on agent dashboard) — defer until 
  demand surfaces.
- /dashboard?agent=1 shim removal (Phase 7 cleanup after a session of 
  no-traffic observation).
- Card 3 signup → browser walkthrough verification (deferred, requires 
  operator to dogfood Card 1 first per recurring constraint).

Discovery + diff plan: docs/audit/PHASE5_AGENT_FLOW.md (untracked working 
tree; Phase 7 commits per pattern).
```

### M.2 — Push + post-deploy verify

```bash
git push origin main
```

Poll prod /agent/test-agent-phase5 (the seeded slug) → flip 404 → 200 when deploy lands.

Then:
```bash
node --experimental-strip-types scripts/v2/verify-agent-card.ts --base https://shipstacked.com
curl -s https://shipstacked.com/talent?type=agent | grep "Test Agent Phase5"
curl -s -H "Authorization: Bearer <transient agent:rw or builder:rw key>" https://shipstacked.com/api/v1/agent/test-agent-phase5
```

All three green.

### M.3 — Update RESUME_HERE.md

- Convert "Phase 5 in-flight" → "Phase 5 completed, committed this session."
- Add "Phase 5 — deferred verifications" section per §L.5.

---

## §N — Decisions locked (June 16)

- shipstacked:Agent JSON-LD type (Q1)
- Principal: required signup, defaults to owner, re-pointable to admin-team (Q2)
- Directory: capability discovery, not marketplace (Q3)
- `agent_profiles.principal_entity_id` (nullable column on agent_profiles, NOT on entities)
- `findOrCreateAgentEntity` becomes 4-arg with slug (consistency with Phase 4 §D.1 team factory)
- Phase 1 AgentOnboarding shim retained for backwards-compat; Phase 7 deletion candidate
- No multi-admin table at v1 (single-owner UX)
- No EnableHiringButton on agent dashboard at v1 (agent-as-buyer deferred)

## §O — Deferred

- Multi-agent-per-owner UX (Phase 7+)
- Agent-as-buyer (post-revenue)
- /dashboard?agent=1 shim deletion (Phase 7)
- Card 3 browser walkthrough (blocked: operator has no profile)
- Principal repoint UI verification (needs operator to admin at least one team beyond the seeded Test Studio Phase4)
- ConnectAnAgent agent:rw UI verification (browser-paired)

End of Phase 5 doc.
