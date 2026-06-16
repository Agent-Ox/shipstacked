# Tier 3 — Founding-Beta Gateway — DISCOVERY (Phase 1)

**Author:** Claude (Opus 4.7, 1M context) — read-only discovery
**Date:** 2026-05-16
**Spec:** `docs/v2/TIER_3_FOUNDING_BETA_GATEWAY_SPEC.md` §4
**Status:** Phase 1 complete. **REVISED 2026-05-16** after Thomas's scope correction: this is a **permanent platform feature — consented collections** (plural, arbitrary, defined by data). Sections A, B, F, and H rewritten generic. C, D, E, G unchanged (they were already slug-parameterised in design — confirmed below). The artifact filename `TIER_3_FOUNDING_BETA_GATEWAY_SPEC.md` stays on disk; the THING built is the generic feature.
**Status:** STOP. Awaiting Thomas's re-approval of the revised Section H before any Phase 2 mutation.
**Governing principle (Spec §0):** infrastructure, not a one-off. Consent is constitutive — zero builders are in any collection until they explicitly, individually opt in. Reusing Beacon 1's `person.ts` must NOT modify it. **No hardcoded slug anywhere in code.** Creating a new collection is DATA (a `collections` row), never new code. No brand / partner / program names anywhere in code or copy.
**Method:** read-only. No DB queries (this is pure code archaeology + design). No repo files modified except this report.

---

## SECTION A — Consent storage recommendation

### REVISED — three tables (collections + memberships + tokens)

The original recommendation kept `collection_memberships` and added `consent_tokens` but treated collection slugs as free-text strings. **The scope correction makes collections themselves data**, so we add a third table — `collections` — whose rows ARE the live collections. No enum, no hardcoded slug in code. Creating a new collection = inserting a row.

```sql
-- 1. collections — rows define what collections exist. Data, not code.
create table public.collections (
  slug         text     primary key,
  title        text     not null,
  description  text,
  created_at   timestamptz not null default now(),
  active       boolean  not null default true
);

-- 2. collection_memberships — per-builder consent per collection.
--    FK to collections.slug means an unknown slug can't be opted into;
--    deleting a collection row cascades-or-blocks per business call
--    (proposed: ON DELETE RESTRICT so consent history can't be lost
--    by an admin accidentally dropping a collection — deactivate
--    instead via collections.active=false).
create table public.collection_memberships (
  id              bigserial primary key,
  profile_id      uuid     not null references public.profiles(id),
  collection_slug text     not null references public.collections(slug) on delete restrict,
  opted_in_at     timestamptz not null default now(),
  opted_out_at    timestamptz,
  source          text     not null check (source in ('dashboard','link')),
  source_metadata jsonb    not null default '{}'::jsonb
);
create index idx_collection_memberships_active
  on public.collection_memberships(collection_slug)
  where opted_out_at is null;
create index idx_collection_memberships_profile
  on public.collection_memberships(profile_id);
alter table public.collection_memberships enable row level security;
alter table public.collections enable row level security;

-- 3. consent_tokens — single-purpose opt-in tokens. FK to collections.
create table public.consent_tokens (
  token           text     primary key,
  profile_id      uuid     not null references public.profiles(id),
  collection_slug text     not null references public.collections(slug) on delete restrict,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  used_at         timestamptz,
  revoked_at      timestamptz
);
create index idx_consent_tokens_profile
  on public.consent_tokens(profile_id)
  where used_at is null and revoked_at is null;
alter table public.consent_tokens enable row level security;

-- collections is publicly readable (the per-collection dashboard cards
-- need it; the public HTML page at /collections/<slug> needs it).
-- Memberships + tokens are service-role-only.
create policy "collections public read"
  on public.collections for select
  to anon, authenticated
  using (active = true);
```

**Reversal SQL:**
```sql
drop table if exists public.consent_tokens;
drop index if exists public.idx_collection_memberships_profile;
drop index if exists public.idx_collection_memberships_active;
drop table if exists public.collection_memberships;
drop policy if exists "collections public read" on public.collections;
drop table if exists public.collections;
```

### Why ON DELETE RESTRICT on the membership FK

If an admin ever deletes a `collections` row, we DO NOT want to silently nuke every consent record (history loss) or to orphan rows. RESTRICT forces the admin to first deactivate (`active=false` — the public-read policy stops surfacing it) and explicitly migrate or null-out memberships before deletion. Safer default for consent data.

### Pre-correction original (preserved below for context)

The original A.1 / A.2 candidates below are now superseded by the three-table design above. The A.2 (`collection_memberships`) table choice was correct; the missing piece was the `collections` parent table. The collections-as-data correction makes the schema match what we're building.

### The original two candidates (now historical — superseded by the three-table design above)

**A.1 — Boolean column on `profiles`:**
```sql
alter table public.profiles
  add column founding_beta_optin     boolean not null default false,
  add column founding_beta_optin_at  timestamptz;
```
Migration cost: ~3 lines DDL, zero row rewrite (default literal), one new index optional. Single-purpose: only works for the founding-beta cohort.

**A.2 — Generalized `collection_memberships` table:**
```sql
create table public.collection_memberships (
  id              bigserial primary key,
  profile_id      uuid     not null references public.profiles(id),
  collection_slug text     not null,
  opted_in_at     timestamptz not null default now(),
  opted_out_at    timestamptz,                       -- null while active; set on withdrawal
  source          text     not null check (source in ('dashboard','link')),
  source_metadata jsonb    default '{}'::jsonb,
  unique (profile_id, collection_slug, opted_in_at)  -- multiple opt-in/out cycles allowed
);
create index idx_collection_memberships_active
  on public.collection_memberships(collection_slug)
  where opted_out_at is null;
```
Migration cost: ~12 lines DDL, one new table, two indexes (primary + partial). Generalizes to every future collection (post-Noah cohorts, recruiter-specific subsets, etc.) at one-time cost.

### Recommendation: **A.2 (collection_memberships table)**

Reasoning tied to Spec §0 ("infrastructure, not a Noah feature"):
- The whole spec's principle is that this serves consumer-N, not just Noah. A single-purpose boolean codifies "Noah is special" into the schema — the same shape problem the spec is explicitly trying to avoid.
- Migration cost is materially the same — one ALTER vs one CREATE TABLE, both apply in a single Dashboard SQL Editor execution with zero downtime, both contain only nullable/defaulted writes (no row rewrite).
- A membership table preserves consent history (opt-in → opt-out → opt-in-again forms three rows; you can answer "was this builder ever in the collection on date X" without losing data). The boolean approach loses history on opt-out unless paired with a separate audit table.
- The `source` column on the membership row is honest about how consent was given (dashboard toggle vs. emailed link) — useful for future trust-and-safety review.
- Reversibility: same as the boolean — `DROP TABLE` reverses cleanly when empty.

Both options satisfy the "queryable to produce all consented builders" and "reversible" requirements. The membership table satisfies them *and* sets the right precedent. **Recommend A.2.**

If Thomas overrides to A.1 for v1-simplicity, that's acceptable per the spec's own opt-out clause ("if the generalized option is materially more complex... the boolean is acceptable for v1 with a noted path to generalize"). My read: it's not materially more complex.

### Type-confirmed DDL for the Dashboard SQL Editor (per Tier 1 precedent)

Already type-matched against `profiles.id` (uuid) confirmed via OpenAPI during the Tier 1 discovery — same column the existing `entities.profile_id` already references.

```sql
create table public.collection_memberships (
  id              bigserial primary key,
  profile_id      uuid     not null references public.profiles(id),
  collection_slug text     not null,
  opted_in_at     timestamptz not null default now(),
  opted_out_at    timestamptz,
  source          text     not null check (source in ('dashboard','link')),
  source_metadata jsonb    not null default '{}'::jsonb
);

create index idx_collection_memberships_active
  on public.collection_memberships(collection_slug)
  where opted_out_at is null;

create index idx_collection_memberships_profile
  on public.collection_memberships(profile_id);

alter table public.collection_memberships enable row level security;
-- Service-role-only writes (consistent with V2 ingestion_log pattern).
-- No public policies → no anon/authenticated access. Service role bypasses RLS.
```

For the **opt-in token** path (§C below), a second small table:

```sql
create table public.consent_tokens (
  token           text     primary key,                  -- 256-bit random, base64url
  profile_id      uuid     not null references public.profiles(id),
  collection_slug text     not null,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null,                  -- short-lived: 7 days default
  used_at         timestamptz,                            -- null until redeemed; rejection if non-null
  revoked_at      timestamptz                             -- null until manually invalidated
);

create index idx_consent_tokens_profile
  on public.consent_tokens(profile_id)
  where used_at is null and revoked_at is null;

alter table public.consent_tokens enable row level security;
-- Service-role-only.
```

**Reversal SQL (for the commit message):**
```sql
drop table if exists public.consent_tokens;
drop index if exists public.idx_collection_memberships_profile;
drop index if exists public.idx_collection_memberships_active;
drop table if exists public.collection_memberships;
```

---

## SECTION B — The dashboard control (REVISED — per-collection rendering)

### What changed

The original B treated this as ONE hardcoded card for "founding-beta". **The corrected design renders one card per active collection** that the builder is eligible for, driven by the `collections` table. Zero collections → no section renders. One collection → one toggle. Five collections → five toggles. No collection is ever a code constant.

### Placement

`src/app/dashboard/BuilderDashboardClient.tsx` already has the exact pattern at **lines 445–469**: the "Project enquiries" toggle card — a white card with an UPPERCASE eyebrow label, a one-sentence body explanation, and a pill-style toggle button on the right. **Each per-collection card** follows this pattern exactly (Tier 1 §0 — additive only, no existing card moved or resized).

Insertion point: a **generic `<CollectionToggleCard>` component** rendered in a loop immediately AFTER the existing "Project enquiries" card at line 469, BEFORE the "API Keys" card at line 471. Same outer wrapper styles (`background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem'`).

Loop shape:
```tsx
// Server-fetched: activeCollections + this builder's memberships
const activeCollections = await sb.from('collections')
  .select('slug,title,description').eq('active', true).order('created_at')
const memberships = await sb.from('collection_memberships')
  .select('collection_slug,opted_in_at,source')
  .eq('profile_id', profile.id)
  .is('opted_out_at', null)

// In the dashboard JSX, gated on profile.published:
{profile.published && activeCollections.map(c => (
  <CollectionToggleCard
    key={c.slug}
    collection={c}                                    // {slug, title, description}
    isOptedIn={memberships.some(m => m.collection_slug === c.slug)}
    membership={memberships.find(m => m.collection_slug === c.slug)}
  />
))}
```
Zero active collections → the `.map` renders nothing — no section header, no empty box, byte-identical dashboard to today. **No collection is special.**

### Reachability — fake-gating

`/dashboard/page.tsx:18-22` queries the profile WHERE email = auth user's email — no `published` filter. So a fake's auth user (e.g. `oxleethomas+jennypeterson@gmail.com`) could log in and reach `/dashboard`, see their profile data, and see the new card. **Defence-in-depth required**:

1. **UI gate**: render the opt-in card ONLY when `profile.published === true`. Renders nothing for the 3 fakes even if they reach the dashboard.
2. **API gate**: `POST /api/collections/founding-beta/optin` re-checks `profile.published === true` server-side before writing a `collection_memberships` row. Bypass-proof.
3. **Projection gate**: every projection's underlying query is `WHERE collection_memberships.opted_out_at IS NULL AND profiles.published = true` — defence-in-depth. Even if a consent row somehow exists on an unpublished profile, projections won't surface it.

All three gates are required by the spec's "published AND consent AND not-fake — all required". Implementing as three independent checks at three layers is the standards-shape.

### Disclosure copy — generic template (REVISED)

The card uses ONE generic copy template per collection. Per-collection specifics come from the `collections.title` and `collections.description` columns — never from code. **No brand / partner / program names anywhere.** Per Thomas's standing rule.

```
[card eyebrow]   CONSENTED COLLECTION
[card heading]   (small) Join {collection.title}
[card body]
  ShipStacked maintains consented, machine-readable collections of
  builders that approved partners can access. Joining {collection.title}
  includes only data already public on your profile (name, role,
  location, links, skills, GitHub, verified status), at a public URL
  approved partners can access directly. Nothing new is exposed.
  Opt-in; opt out anytime; default is not joined.

  {if collection.description present: render it here, italic, smaller —
   the collection's own one-line description, e.g. "Builders shipping
   with AI-native tools in the last 90 days". This is what makes each
   collection distinguishable to the builder — no code hardcodes it.}

  Collection URL: shipstacked.com/collections/{collection.slug}

[button (right)]  Not in collection  ⟶  In collection
```

Substitution rule: every `{collection.X}` is filled at render from the live `collections` row. **No string in the code or copy mentions any partner, program, brand, or use case.** The collection's title and description carry the human-readable specifics.

The toggle button mirrors the existing inquiries-toggle: a pill button with a status dot, green when in, grey when out. Saving state: "Joining..." / "Leaving...".

The copy is deliberately:
- **Specific** about what's included (the exact public-data set from Beacon 1's Person markup).
- **Specific** about what is NOT new ("Nothing new is exposed" — directly addresses the consent-not-to-new-exposure principle from Spec §3).
- **Specific** about reversibility (one sentence on opt-out, immediate effect, no friction).
- **Generic** about consumers ("approved partners can access" — no brand / partner / program names, per Thomas's standing rule).
- **NOT** marketing copy.

### Two follow-on controls visible in the same card

Below the toggle, when the builder is already in the collection:
- A "View what partners see" link → opens `/collections/founding-beta?builder=<their slug>` in a new tab (the HTML projection scrolled/anchored to their own entry — so they can verify their inclusion entry is what they think it is).
- A small "Opted in on YYYY-MM-DD via dashboard|link" line (transparency about the consent provenance — pulled from `collection_memberships.opted_in_at` + `source`).

These are honesty / agency surfaces, not new content disclosures. They mirror what the spec calls "opt-out is as easy as opt-in" — the builder can see what they've consented to at any moment.

---

## SECTION C — The tokenized opt-in-link path

### Design

A single-purpose, scoped, expiring token. Built around the `consent_tokens` table (§A above).

**Token generation** (admin-only — exposed via a service-role-only endpoint or, more cleanly, an admin script):
1. Look up `profile_id` for the target builder. Require `published=true` (can't generate tokens for fakes).
2. `token = crypto.randomBytes(32).toString('base64url')` — 43-char URL-safe string, 256 bits of entropy.
3. Insert into `consent_tokens` with `expires_at = now() + interval '7 days'`, `collection_slug = 'founding-beta'`.
4. The opt-in URL: `https://shipstacked.com/collections/founding-beta/optin?t=<token>`.

This spec does NOT send the link (per §2 "no outreach by this spec"). It produces it; Thomas decides when to email it (an out-of-band Resend send, hand-curated to specific killers per the Tier 2 priority list — Aniket first per the cohort).

**Token redemption** (public endpoint, no Supabase auth required — the token IS the authentication for this single action):
1. `GET /collections/founding-beta/optin?t=<token>` — server-renders a confirmation page showing the SAME disclosure as the dashboard control + a confirm button.
2. `POST /api/collections/founding-beta/optin/redeem` with `{ token }`:
   - Look up `consent_tokens` row. Reject if not found / expired / used / revoked.
   - Re-check `profile.published = true`. Reject if false (defence: builder may have been unpublished between token issue and redemption).
   - Insert `collection_memberships` row with `source = 'link'`, `source_metadata = { token_id: ..., redeemed_at: now() }`.
   - Mark `consent_tokens.used_at = now()`.
   - Render success page with same "View what partners see" link as the dashboard control.

### Why single-purpose (vs. Supabase magic-link reuse)

Considered: generating a Supabase magic-link with `redirectTo=/dashboard/optin`. Rejected per Spec §3 "single-purpose (opt-in only — it cannot perform any other account action)". A Supabase magic-link logs the user into their full account — broader scope than the spec allows. The custom `consent_tokens` table approach gives a token that **literally cannot do anything except opt this specific profile into this specific collection** — by construction.

### Why expires_at = 7 days

Compromise between "freshness" (consent should be recent at point of redemption — a token issued 3 months ago doesn't reflect today's intent) and "real life" (a builder might not click on a Tuesday email until the weekend). 7 days is comfortably above the typical email-click window. Token can be re-issued if it expires.

### Threat model (one paragraph)

- **Stolen token** → an attacker can opt that specific builder in, full stop. They cannot read other builder data, change passwords, post content, or do anything else. The "damage" is unwanted inclusion in a public, consented-collection of public-data items — which the legitimate builder can opt out of in one click from their dashboard. Damage ceiling: low. Compare to a stolen Supabase magic-link, which gives full account access. **The single-purpose design is the security feature.**
- **Token brute-force** → 256 bits of entropy in a base64url string. Negligible.
- **Token replay** → `used_at` is set on redemption; second redemption rejected.
- **Builder-unpublished-after-issue** → re-checked at redemption time. Reject.

---

## SECTION D — The canonical JSON-LD collection endpoint

### URL + content-negotiation

Mirror the V2 pattern exactly (`/p/<slug>.json` and `/atlas/roles/<id>.json` with middleware-driven content negotiation, established in commit `151a59e`):

- `GET /collections/founding-beta` → HTML projection (§E).
- `GET /collections/founding-beta.json` → canonical JSON-LD.
- `GET /collections/founding-beta` with `Accept: application/ld+json` → canonical JSON-LD (rewritten by middleware).
- `GET /collections/founding-beta.csv` → CSV projection.

Middleware additions (parallel to existing `/p/<slug>.json` and `/atlas/roles/<id>.json` handlers at `src/middleware.ts:18-46`):
```ts
const collectionJsonMatch = pathname.match(/^\/collections\/([^/]+)\.json$/)
if (collectionJsonMatch) {
  const url = request.nextUrl.clone()
  url.pathname = `/api/collections/${collectionJsonMatch[1]}/jsonld`
  return NextResponse.rewrite(url)
}
const collectionCsvMatch = pathname.match(/^\/collections\/([^/]+)\.csv$/)
if (collectionCsvMatch) {
  const url = request.nextUrl.clone()
  url.pathname = `/api/collections/${collectionCsvMatch[1]}/csv`
  return NextResponse.rewrite(url)
}
// Accept: application/ld+json on /collections/<slug> → JSON-LD
if (wantsJsonLd) {
  const collectionMatch = pathname.match(/^\/collections\/([^/]+)$/)
  if (collectionMatch) {
    const url = request.nextUrl.clone()
    url.pathname = `/api/collections/${collectionMatch[1]}/jsonld`
    return NextResponse.rewrite(url)
  }
}
```
Same shape as Beacon 1's V2 negotiation — bails before the auth gate so the JSON-LD/CSV endpoints stay public reads.

### JSON-LD shape

```jsonc
{
  "@context": [
    "https://schema.org",
    { "shipstacked": "https://shipstacked.com/schema/v0.1#" }
  ],
  "@type": ["ItemList", "shipstacked:BuilderCollection"],
  "@id": "https://shipstacked.com/collections/founding-beta",
  "name": "ShipStacked founding-beta cohort",
  "description": "Consented, opt-in-only collection of founding-cohort builders. Each entry is the same schema.org/Person markup served at the builder's canonical /u/<username> URL.",
  "numberOfItems": <count>,
  "dateModified": "<ISO timestamp of most recent membership change>",
  "shipstacked:collectionSlug": "founding-beta",
  "shipstacked:consentModel": "explicit-per-builder-opt-in",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "item": <Person object — produced by buildPersonJsonLd from Beacon 1>
    },
    // ...
  ]
}
```

Each `item` is the EXACT Person object that `buildPersonJsonLd(profile, entity, skills, projects, github)` returns — same shape, same `@id`, same `identifier`, same `shipstacked:` extensions. **No new Person serializer. Direct reuse.**

That means: a consumer reading `/collections/founding-beta.json` and one reading `/u/aniketaslaliya801` (or its `.json` equivalent — currently the Person markup is inline in the HTML, not at a `.json` URL; that's a possible Beacon 1 follow-up but out of this spec's scope) gets byte-identical Person data. **One graph.**

### Empty-state honesty

```jsonc
{
  "@context": [...],
  "@type": ["ItemList", "shipstacked:BuilderCollection"],
  "@id": "https://shipstacked.com/collections/founding-beta",
  "name": "ShipStacked founding-beta cohort",
  "numberOfItems": 0,
  "itemListElement": []
}
```

A 200 response with `numberOfItems: 0` is the honest empty state. **Not 404, not an error.** Crawlers and import tools can poll the endpoint and observe consent growth over time. On deploy, the collection is empty — confirmed via Spec §5.1 verification gate.

### Caching

Per V2 precedent (`Cache-Control: public, max-age=60, stale-while-revalidate=300`). Consent is low-frequency; 60-second freshness is appropriate. The `ETag` can hash the membership-change-max-timestamp + count so a partner can use `If-None-Match` for efficient polling.

---

## SECTION E — CSV + HTML projections

### CSV — `/collections/founding-beta.csv`

Columns (the realistic ingest-tool minimal set):
```
username,profile_url,full_name,role,location,skills,github_username,verified,entity_identifier,opted_in_at
```

- `username` — primary key for cross-reference (matches profiles.username).
- `profile_url` — `https://shipstacked.com/u/<username>` — the canonical resource URL (same `@id` Beacon 1's Person uses; consumers can dereference for fuller data).
- `full_name`, `role`, `location` — flattened scalars from Person.
- `skills` — pipe-delimited concatenation of the same `knowsAbout` array from Person (CSV doesn't do arrays; pipe is the common convention).
- `github_username` — flattened from the `shipstacked:github.username` field where present, otherwise empty.
- `verified` — `"true"` when Person markup carries `shipstacked:verified`, else `"false"` (CSV consumers expect string booleans).
- `entity_identifier` — the V2 entity external_id (the `shipstacked:entity:<ulid>`) when the builder is Tier-1-backfilled, else empty.
- `opted_in_at` — ISO timestamp from `collection_memberships.opted_in_at`.

**Crucial implementation invariant**: the CSV is generated from the SAME query that builds the canonical JSON-LD. A single internal function `getConsentedCollection(slug)` returns the list of `{profile, entity, skills, projects, github, membership}` records; both the JSON-LD endpoint and the CSV endpoint project from that one list. **One source of truth — verify in Phase 2 that an opt-out disappears from both endpoints simultaneously without two separate code paths.**

CSV-specific concerns:
- RFC 4180 quoting: wrap any field containing comma, quote, or newline in double-quotes; double internal quotes (`"` → `""`).
- CRLF line endings (RFC 4180 default).
- UTF-8 BOM-free (modern import tools handle it; BOM creates problems with column header detection).
- `Content-Type: text/csv; charset=utf-8`.
- `Content-Disposition: attachment; filename="shipstacked-founding-beta.csv"` so browser-driven downloads land with a sensible name.

### HTML — `/collections/founding-beta`

A clean page showing the consented builders as cards. Layout:

- Header: "ShipStacked founding-beta cohort · N builders · last updated YYYY-MM-DD HH:MM UTC". A one-paragraph description of what the collection is (echoing the same disclosure copy from the dashboard toggle for honest framing — same words, no marketing reframe).
- Below header: filter UI is unnecessary at this scale (<100 builders for the foreseeable future). One simple list of profile cards, each linking to `/u/<username>`.
- Card shape: reuse the existing `/talent` page's builder-card component if it can be extracted cleanly; otherwise a minimal inline card with avatar + name + role + verified badge + location + "View profile →" link. Same visual language as the rest of the site (no new design language imposed).
- Empty state: "No builders have opted in yet. The collection appears here as builders consent." — honest, accurate, never displays placeholder data.

The HTML page is for human eyeballing — Thomas or a partner sanity-checking the cohort, not the primary machine consumption path (that's the JSON-LD and CSV).

### The one-source-of-truth invariant — testable

Spec §5.1 verification: "A builder opting out disappears from all three projections simultaneously". The implementation makes this trivially true by reading from one internal function. Phase 2 must include an explicit check: opt-in a test profile, fetch all three endpoints, see the entry present in all three; opt-out, fetch all three again, see absence in all three within the cache TTL. **Single source, single query, three renderings.**

---

## SECTION F — Consent-integrity checks (the load-bearing properties)

### The four gates (every read of any collection enforces all four — REVISED)

```
in_collection(builder, slug) ↔
  collections row exists with slug=<slug> AND active=true        (collection exists & is live)
  AND profile.published = true                                    (post-Tier-1 fake gate)
  AND collection_memberships row exists for (profile_id, slug)    (builder consented)
      with opted_out_at IS NULL                                   (consent still active)
  AND profile.id NOT IN <3 known fakes>                           (implicit — published=false)
```

The fourth condition is **automatically satisfied by the second** — the 3 fakes are `published=false` post-Tier-1. We do not maintain an explicit fakes-list; we rely on `published=true` as the universal gate (consistent with Beacon 1's H9a fix and Tier 1's overall fake-exclusion discipline).

**The first gate is new under the revised design**: a request for `/collections/<unknown-slug>` returns 404 cleanly (collection doesn't exist). A request for `/collections/<deactivated-slug>` (active=false) also returns 404. This is the slugs-as-data invariant — collections exist because rows exist; their absence is honest.

### Fakes cannot opt in to ANY collection (verified by design)

- `/dashboard` opt-in cards: per-collection rendering is gated on `profile.published === true`. The 3 fakes' dashboards (if reached) show zero cards regardless of how many active collections exist.
- `POST /api/collections/<slug>/optin`: re-checks `profile.published === true` AND `collections.active === true` for the given slug. Server rejects either fail.
- Tokenized link redemption: re-checks `profile.published === true` AND collection existence/active. Server rejects (and the admin token-mint script refuses to issue for unpublished profiles, AND refuses to issue against an unknown / inactive collection slug, AND requires `--collection <slug>` as an explicit argument — no default).
- Projections: read filter is `collections.active = true AND profiles.published = true`. Even if a stale consent row somehow exists for an unpublished profile or against a deactivated collection, the projections do not surface it.

### Real-account-not-builder (Andreas)

Per Spec §4.6: `andreaschristodoulou643` is a real account, `published=true` (untouched by Tier 1). He CAN technically opt in if he chooses. The spec explicitly says we don't editorialize about who's "worthy" — consent is the only filter. This is correct by design: the gateway is consent-gated infrastructure, not editorial-gated. If Andreas opts in, his card appears. He's unlikely to (no AI work to showcase) but the mechanism does not hand-discriminate.

### Unpublished-after-opt-in scenario (the live gate)

A builder opts in. Later, they unpublish their profile (`published=false`, e.g. via dashboard edit). Result: their `collection_memberships` row still exists with `opted_out_at IS NULL`, BUT the projection's `WHERE profiles.published = true` filter excludes them. They disappear from all projections. If they republish, they reappear (their consent remains intact — they never withdrew it).

This is the right behaviour. Unpublishing one's profile means "I'm not visible publicly right now" — including in derived collections. Re-publishing restores everything they previously consented to. **No surprise gaps, no surprise restoration of unwanted state.**

### Opt-out is as easy as opt-in (§3)

Single-click in the dashboard: same toggle button, opposite state. Sets `collection_memberships.opted_out_at = now()` (preserves history; does NOT delete the row). Projections see them absent on the next read (within cache TTL ≤ 60s). No emails, no friction, no "are you sure".

---

## SECTION G — Beacon 1 reuse — confirmation of NON-modification

### Direct reuse

`src/lib/jsonld/person.ts:116` exports `buildPersonJsonLd(profile, entity, skills, projects, github)`. Beacon 1 (commit `0ceb69a`) shipped this as the per-page Person emitter on `/u/[username]`. The gateway's canonical JSON-LD assembler calls this function unchanged for each consented builder. **Zero modifications.**

The function signature is already aligned with everything the gateway needs:
- `profile: PersonProfileInput` — built from the same `profiles` columns the gateway query selects.
- `entity: PersonEntityInput | null` — the Tier-1 entity row when `profile.entity_id` is set (the 17 backfilled), null otherwise.
- `skills`, `projects`, `github` — same per-builder queries that `/u/[username]/page.tsx` already runs.

The internal `getConsentedCollection(slug)` function loads all of these in a small number of queries (one bulk select per related table, keyed by the consented profile IDs) and maps them through `buildPersonJsonLd`.

### What NOT to touch

Beacon 1's `src/lib/jsonld/person.ts` — UNTOUCHED.
Beacon 1's `src/app/u/[username]/page.tsx` per-profile Person emit — UNTOUCHED.
Beacon 1's other builders (`organization.ts`, `website.ts`, `job-posting.ts`, `employer-org.ts`, `article.ts`, `item-list.ts`, `atlas-article.ts`, `context.ts`, `README.md`) — UNTOUCHED.
V2 surfaces (`src/lib/receipts/jsonld.ts`, `src/lib/atlas/jsonld.ts`, `/p/[slug]`, `/atlas/roles/[id]`) — UNTOUCHED.

### The "one graph" invariant preserved

A consumer reading `/collections/founding-beta.json` and then dereferencing one of its Person `@id` values (e.g. `https://shipstacked.com/u/aniketaslaliya801`) gets a page whose embedded Person markup is byte-identical to the embedded Person object in the collection. **Because both are produced by the same function with the same inputs.** This is the structural prerequisite the Noah gateway consumes; Beacon 1 made it true at the per-profile level; this spec extends it to the collection level without breaking the equivalence.

### Spec §6 escalation check — passes

The spec lists "Reusing Beacon 1's person.ts requires modifying it" as an escalation trigger. Discovery confirms: no modification needed. The function as shipped is a clean fit. If a future variation is needed (e.g. a Person variant that omits a field for a specific consumer's privacy requirement), it would be a separate wrapper function in the gateway code — Beacon 1's `person.ts` stays intact.

---

## SECTION H — Proposed Phase 2 change list (REVISED — generic; superseded version below original)

The original H below is superseded by this revised list. Per Thomas's scope correction: collections are data, no hardcoded slug, dashboard renders one card per active collection, admin creates collections by inserting rows.

### H1 (revised) — Migration: three tables (collections + memberships + tokens)

New file `supabase/migrations/<timestamp>_consented_collections.sql` with the DDL from §A (revised — three tables + the public-read RLS policy on `collections`). Applied via Dashboard SQL Editor per the Tier 1 precedent. Type-confirmed: `profiles.id` is `uuid` (Tier 1 OpenAPI verification still holds). Reversal DDL captured for the commit.

### H2 (revised) — Backend module: `src/lib/collections/` (slug-as-parameter everywhere)

New directory. Every function takes `slug: string` as an argument. **No `COLLECTION_SLUG_FOUNDING_BETA` constant. No default slug.** Files:
- `context.ts` — shared types + the published-data invariant guard. NO slug constants. Re-exports the canonical-host helper from `src/lib/jsonld/context.ts` for cross-graph `@id` consistency.
- `collections.ts` — `getCollection(slug)`, `listActiveCollections()`, `requireActiveCollection(slug)` (throws on unknown/inactive). The slugs-as-data layer.
- `consent.ts` — `optIn(profile_id, slug, source, metadata)`, `optOut(profile_id, slug)`, `isConsented(profile_id, slug)`, `listMembershipsForProfile(profile_id)`. Every function takes slug as a parameter.
- `tokens.ts` — `mintToken(profile_id, slug, ttl)`, `redeemToken(token)`, `revokeToken(token)`. Token always carries its slug; redemption verifies both.
- `assemble.ts` — `getConsentedCollection(slug)`: the SINGLE function that returns the consented set with profiles + entities + skills + projects + github_data, ready for `buildPersonJsonLd` mapping. Slug-parameterised.
- `jsonld.ts` — `buildCollectionJsonLd(collection, items)`: wraps Beacon 1's `buildPersonJsonLd` output in ItemList. Takes the collection ROW (slug+title+description) for honest naming.
- `csv.ts` — `buildCollectionCsv(items)`: RFC-4180 projection. Slug-agnostic (just shapes rows).
- `README.md` — module quick-ref. Documents: collections are data, slug is always a parameter, generic by construction, no per-collection branching.

### H3 (revised) — Public API routes (dynamic `[slug]`, no defaults)

- `GET /api/collections/[slug]/jsonld` — pure JSON-LD endpoint. Confirms `requireActiveCollection(slug)`; 404 on unknown/inactive. `Content-Type: application/ld+json`, V2 cache headers, ETag from membership-change timestamp + count.
- `GET /api/collections/[slug]/csv` — CSV projection. Same gate. `Content-Disposition: attachment; filename="shipstacked-<slug>.csv"`.

### H4 (revised) — Public pages (dynamic `[slug]`, no defaults)

- `GET /collections/[slug]` (`src/app/collections/[slug]/page.tsx`) — HTML projection. Honest empty state when 0 members. **404 when slug is unknown or inactive** — `notFound()` is the right shape; we don't pretend the collection exists.
- `GET /collections/[slug]/optin` (`src/app/collections/[slug]/optin/page.tsx`) — token-redemption confirmation page. Same disclosure template as the dashboard card (generic, parametrised by collection.title).

### H5 (revised) — Middleware additions (dynamic, no hardcoded slug)

`src/middleware.ts` — three new match patterns inside `tryContentNegotiation()`:
```ts
/^\/collections\/([^/]+)\.json$/  → /api/collections/<$1>/jsonld
/^\/collections\/([^/]+)\.csv$/   → /api/collections/<$1>/csv
/^\/collections\/([^/]+)$/  with Accept: application/ld+json → /api/collections/<$1>/jsonld
```
Pure pattern rewrites — middleware does not validate the slug; the API route does (and returns 404 for unknown). V2 spine + Tier 0 redirect untouched.

### H6 (revised) — Authenticated mutation endpoints (slug-parameterised)

- `POST /api/collections/[slug]/optin` — dashboard-driven opt-in. Requires Supabase session. Re-checks `profile.published === true` AND `collections.active === true` for the slug. Writes `collection_memberships` with `source = 'dashboard'`.
- `POST /api/collections/[slug]/optout` — dashboard-driven opt-out. Same gates. Sets `opted_out_at = now()`.
- `POST /api/collections/[slug]/optin/redeem` — token-driven opt-in. Body: `{ token }`. Token IS the auth (no Supabase session required). Re-checks all gates including slug match in token row.

### H7 (revised) — Dashboard UI: per-collection rendering (the load-bearing rework)

`src/app/dashboard/BuilderDashboardClient.tsx` — insert ONE `<CollectionToggleCard>` per active collection between the existing "Project enquiries" card (line 469) and the "API Keys" card (line 471). The component takes `{ collection, isOptedIn, membership }` props. Loop is `activeCollections.map(...)`. Gated on `profile.published === true`. **Zero active collections → zero cards rendered → dashboard byte-identical to today.** Generic disclosure template per §B (revised), substituting `{collection.title}` and `{collection.description}` from the row. No hardcoded slug, no brand/partner/program names anywhere in the component code.

Server-side data loaded once in `src/app/dashboard/page.tsx` and passed to the client component: `activeCollections` (from `collections`) + the user's `memberships` (from `collection_memberships`). One extra round trip on dashboard load; cached at the Supabase REST layer.

### H8 (revised) — Two admin scripts (both fully generic)

**`scripts/v2/create-collection.ts`** — creates a `collections` row (the only way to introduce a new collection):
```
node --env-file=.env.local --experimental-strip-types \
  scripts/v2/create-collection.ts \
  --slug <slug> --title "<title>" [--description "<desc>"] [--active true]
```
Validates slug format (lowercase, hyphens, no spaces, ≤64 chars). Refuses to insert duplicate slug. Outputs the canonical collection URL on success.

**`scripts/v2/mint-consent-token.ts`** — generates a single-purpose opt-in token. Refuses unpublished profiles AND unknown/inactive collections:
```
node --env-file=.env.local --experimental-strip-types \
  scripts/v2/mint-consent-token.ts \
  --username <username> --collection <slug> [--ttl-days 7]
```
Outputs the redemption URL `https://shipstacked.com/collections/<slug>/optin?t=<token>`. **No default for --collection** — must be passed explicitly. Thomas sends emails out-of-band; this script sends nothing.

### H9 (revised) — Verification (every gate slug-parametric)

Per Spec §5.1, every gate must pass — verified across **at least two collections** to prove genericness:
- Migration applied via Dashboard SQL Editor: all three tables present, indexes present, RLS enabled, public-read policy on `collections` works.
- Default state: 0 rows in `collections` → dashboard renders no opt-in cards (byte-identical to today). `/collections/anything` → 404. `/collections/anything.json` → 404.
- **Create two test collections via the admin script** (e.g. `test-alpha` and `test-beta`). Confirm:
  - Dashboard now shows TWO cards on a published builder's account, each with that collection's title/description rendered from data.
  - Opting into `test-alpha` only puts the builder in `test-alpha` projections (json/csv/html). `test-beta`'s projections remain empty.
  - Opting into BOTH puts the builder in both, independently.
  - Opt-out of one doesn't affect the other.
- Fake-exclusion: 3 fakes' dashboards render ZERO cards regardless of how many collections exist. API rejects on direct hit.
- Token flow per collection: mint-consent-token for `test-alpha` → redemption URL has `test-alpha` in path → builder consents → membership row has `source='link'` and `collection_slug='test-alpha'`. Token cannot be replayed; expired tokens rejected; unknown/inactive slug at mint refused.
- One-source invariant per collection: opt-in test builder into `test-alpha`; fetch all three projections of `test-alpha`; opt-out; refetch — disappears from all three simultaneously.
- Beacon 1 untouched: `curl /u/aniketaslaliya801 | grep ld+json` returns SAME Person markup as pre-deploy.
- V2 spine untouched: `/atlas/roles/A1.json` still 200 application/ld+json.
- Tier 0 + Tier 1 + Beacon 1 regressions: all intact.
- **Cleanup before commit:** delete the test collections (`scripts/v2/create-collection.ts --deactivate <slug>` OR direct DB deactivate) so the production `collections` table is empty post-verification — zero builders auto-enrolled into anything because zero collections exist for them to be enrolled in.
- `tsc --noEmit` clean; `npm run build` clean.
- **Show rendered UI to Thomas** before push: a screenshot or curled dashboard HTML showing the per-collection card pattern with a real test collection visible.

### H10 (revised) — Commit + push

Commit message documents:
- The DDL applied to prod via Dashboard (three tables + public-read RLS) + reversal DDL.
- **Collections are data**: framing as the permanent platform feature, not a one-off. `founding-beta` (or any specific slug) is never a code constant.
- Zero collections exist in the production `collections` table at commit time (test collections deleted in cleanup) → zero builders auto-enrolled.
- Generic dashboard rendering: one card per active collection, per builder, gated on `profile.published`.
- Fake-exclusion: four gates (collection-active, profile-published, consent, implicit-fake-exclusion-via-published), all enforced at every layer.
- Reuse of Beacon 1 `person.ts` — direct, no modification.
- One-source invariant: per-collection, all projections derived from one query.
- Reversal: `git revert <commit>` + the DDL reversal SQL fully reverses. No DB rows to reverse if H9 cleanup was done.

### H11 (revised) — Explicit non-goals

- Does NOT create any specific collection in production (cleanup deletes test collections; production `collections` table is empty at commit). Thomas runs `create-collection.ts` separately, when ready, with the slug/title/description he chooses.
- Does NOT auto-enroll any builder into any collection. Default state across all collections and all builders: not in any.
- Does NOT modify any Beacon 1 / V2 file.
- Does NOT change any existing dashboard layout — additive per-collection cards only, gated on `profile.published`.
- Does NOT add `/collections/<slug>` to the sitemap (consent-gated; discoverability is via partner-shared URL).
- Does NOT introduce a second source of Person serialization — `buildPersonJsonLd` is the only writer of Person markup site-wide.
- Does NOT hardcode any collection slug anywhere in code. Slugs come from the database, always.
- Does NOT name any partner, program, brand, or use case in any code or copy. Generic everywhere.
- Does NOT send any email. Token-mint outputs URLs; Thomas's call to send.

---

### Original H (now superseded — preserved below for context)

The original H below shipped a single-collection ("founding-beta") design with a `COLLECTION_SLUG_FOUNDING_BETA` constant and a one-card dashboard. Both wrong per the scope correction. Kept for diff-readability against the revised version above.

### H1 (original — superseded) — Migration: `collection_memberships` + `consent_tokens` tables

### H1 — Migration: `collection_memberships` + `consent_tokens` tables

New file `supabase/migrations/<timestamp>_collection_memberships_consent_tokens.sql` containing the DDL from §A. Applied via Dashboard SQL Editor per the Tier 1 precedent (terminal Claude can't apply DDL from its session).

Type-confirmed DDL (copy-paste-ready):
```sql
create table public.collection_memberships (
  id              bigserial primary key,
  profile_id      uuid     not null references public.profiles(id),
  collection_slug text     not null,
  opted_in_at     timestamptz not null default now(),
  opted_out_at    timestamptz,
  source          text     not null check (source in ('dashboard','link')),
  source_metadata jsonb    not null default '{}'::jsonb
);
create index idx_collection_memberships_active
  on public.collection_memberships(collection_slug)
  where opted_out_at is null;
create index idx_collection_memberships_profile
  on public.collection_memberships(profile_id);
alter table public.collection_memberships enable row level security;

create table public.consent_tokens (
  token           text     primary key,
  profile_id      uuid     not null references public.profiles(id),
  collection_slug text     not null,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  used_at         timestamptz,
  revoked_at      timestamptz
);
create index idx_consent_tokens_profile
  on public.consent_tokens(profile_id)
  where used_at is null and revoked_at is null;
alter table public.consent_tokens enable row level security;
```

Reversal SQL (for the commit message):
```sql
drop table if exists public.consent_tokens;
drop index if exists public.idx_collection_memberships_profile;
drop index if exists public.idx_collection_memberships_active;
drop table if exists public.collection_memberships;
```

### H2 — Backend module: `src/lib/collections/`

New directory with the gateway core logic. Files:
- `context.ts` — `COLLECTION_SLUG_FOUNDING_BETA = 'founding-beta'` + the published-data invariant guard.
- `consent.ts` — `optIn(profile_id, source, metadata)`, `optOut(profile_id, slug)`, `isConsented(profile_id, slug)` helpers. Service-role-only Supabase client.
- `tokens.ts` — `mintToken(profile_id, slug, ttl)`, `redeemToken(token)`, `revokeToken(token)`. `crypto.randomBytes(32).toString('base64url')`.
- `assemble.ts` — `getConsentedCollection(slug)`: the SINGLE function that returns the consented set with profiles + entities + skills + projects + github_data, ready for `buildPersonJsonLd` mapping.
- `jsonld.ts` — `buildCollectionJsonLd(slug, items)`: wraps the per-Person markup (from Beacon 1's `buildPersonJsonLd`) in the ItemList structure from §D.
- `csv.ts` — `buildCollectionCsv(slug, items)`: RFC-4180 CSV projection from the same items.
- `README.md` — module quick-ref + the one-source-of-truth invariant + the published gate's three layers.

### H3 — Public API routes

- `GET /api/collections/<slug>/jsonld` (`src/app/api/collections/[slug]/jsonld/route.ts`) — pure JSON-LD endpoint, content-negotiation-rewritten by middleware. `Content-Type: application/ld+json; charset=utf-8`, `Cache-Control: public, max-age=60, stale-while-revalidate=300`. ETag from membership-change timestamp + count.
- `GET /api/collections/<slug>/csv` (`src/app/api/collections/[slug]/csv/route.ts`) — CSV projection. Same cache headers. `Content-Disposition: attachment; filename="shipstacked-<slug>.csv"`.

### H4 — Public pages

- `GET /collections/<slug>` (`src/app/collections/[slug]/page.tsx`) — HTML projection per §E. Server-rendered for crawler-readability and SEO. Honest empty state when `numberOfItems === 0`.
- `GET /collections/<slug>/optin` (`src/app/collections/[slug]/optin/page.tsx`) — token-redemption confirmation page. Reads `?t=<token>`, validates server-side, shows the same disclosure as the dashboard control, confirm/cancel buttons.

### H5 — Middleware additions

`src/middleware.ts` — three new match patterns inside `tryContentNegotiation()` parallel to the existing receipts/atlas ones (§D code block). Negotiated rewrites only; auth gate unchanged. V2 spine + Tier 0 redirect untouched.

### H6 — Authenticated API endpoints (mutate consent)

- `POST /api/collections/<slug>/optin` — dashboard-driven opt-in. Requires Supabase auth session (the builder themselves). Re-checks `profile.published === true`. Writes `collection_memberships` with `source = 'dashboard'`.
- `POST /api/collections/<slug>/optout` — dashboard-driven opt-out. Sets `opted_out_at = now()`. One-click symmetry with opt-in.
- `POST /api/collections/<slug>/optin/redeem` — token-driven opt-in. Body: `{ token }`. Public (no Supabase session required — the token IS the auth, per §C). Re-checks `profile.published === true`. Writes membership with `source = 'link'`.

### H7 — Dashboard UI

`src/app/dashboard/BuilderDashboardClient.tsx` — insert the new opt-in card per §B between the existing "Project enquiries" card (lines 445–469) and "API Keys" card (line 471). Same outer wrapper styles. Gated on `profile.published === true`. Toggle pill button mirrors the existing inquiries-toggle pattern (lines 452–467). Disclosure copy verbatim per §B. On click → `POST /api/collections/founding-beta/optin` (or `/optout`).

### H8 — Token-minting script (admin tool, no UI)

`scripts/v2/mint-consent-token.ts` — terminal utility. CLI: `node --env-file=.env.local --experimental-strip-types scripts/v2/mint-consent-token.ts --username <username> --collection founding-beta [--ttl-days 7]`. Refuses unpublished profiles. Outputs the redemption URL. Thomas runs this when he's ready to send a specific killer an emailed link (out-of-band — this spec does not send the email).

### H9 — Verification (before commit)

Per Spec §5.1, every gate must pass:
- Migration applied via Dashboard SQL Editor: both tables present, indexes present, RLS enabled.
- Default state: 0 rows in `collection_memberships` → `GET /collections/founding-beta.json` returns valid ItemList with `numberOfItems: 0` and empty `itemListElement`. Same for `.csv` (header row only) and HTML (honest empty state).
- Dashboard opt-in flow: log in as a test builder → toggle on → `collection_memberships` row written → all three projections show the test builder. Toggle off → `opted_out_at` set → all three projections drop the row within cache TTL.
- Fake-exclusion: 3 fakes (`/dashboard` as them if possible, or direct API hits with forged session) cannot create a `collection_memberships` row. UI gate + API gate + projection gate all enforce.
- Token flow: `mint-consent-token.ts` for a test builder → curl the redemption URL → confirm → membership row written with `source='link'`. Token cannot be reused (second attempt rejected). Expired token rejected. Token for an unpublished profile refused at mint time.
- One-source invariant: opt-in test builder; fetch all three endpoints; confirm SAME builder set; opt-out; refetch; confirm SAME absent in all three.
- Beacon 1 untouched: `curl https://localhost:3000/u/aniketaslaliya801 | grep ld+json` returns the SAME Person markup as pre-deploy.
- V2 spine untouched: `/atlas/roles/A1.json` still 200 application/ld+json. `/p/<slug>.json` route still works.
- Tier 0 + Tier 1 + Beacon 1 regressions: seed-job 308, fakes 404, fake-authored posts 404, leaderboard fake-free, all intact.
- `tsc --noEmit` clean, `npm run build` clean.

### H10 — Commit + push

Commit message documents:
- The DDL applied to prod (via Dashboard) + reversal DDL (Tier 1 precedent).
- The consent mechanism (collection_memberships table + consent_tokens table).
- Zero builders auto-enrolled — defaults set so opt-in is required.
- Fake-exclusion: 3 gates (UI, API, projection), all required, all live.
- Reuse of Beacon 1 `person.ts` — direct, no modification.
- One-source invariant: all three projections derived from one query.
- Reversal: `git revert <commit>` + the DDL reversal SQL fully reverses.

### H11 — What this spec does NOT do (explicit non-goals)

- Does NOT send any email to any builder. Token-mint script outputs URLs; Thomas's call to send.
- Does NOT auto-enroll the 17 Tier-1-backfilled builders, the 6 killers, or anyone else. Default state: 0 builders in the collection.
- Does NOT modify any Beacon 1 file. Pure reuse.
- Does NOT modify any V2 file (`src/lib/receipts/`, `src/lib/atlas/`, `/p/[slug]`, `/atlas/roles/[id]`).
- Does NOT change any existing dashboard layout — additive card only, between two existing cards.
- Does NOT add /collections/founding-beta to the sitemap (it's a public-ish collection but the canonical discoverability path is partner-shared URL + Person markup cross-references, not sitemap crawl — and sitemap inclusion would invite generic indexing of an opt-in-gated collection, which is the wrong story; can be added in a follow-up if needed).
- Does NOT add new schema.org types beyond `ItemList` + the existing Beacon 1 `Person`/`shipstacked:Builder`. The collection is just a wrapped Person list.
- Does NOT introduce a second source of Person serialization — `buildPersonJsonLd` is the only writer of Person markup site-wide.

---

## Method notes

- Tasks: 47 (current state survey), 48 (Beacon 1 `person.ts` confirmation), 49 (this report).
- Surveyed: `profiles` schema (post-Tier-1, with `entity_id` column from the merge); `/dashboard/BuilderDashboardClient.tsx` toggle pattern at lines 445–469 (existing "Project enquiries" card as the design template); `src/middleware.ts` content-negotiation pattern (the V2 receipts/atlas rewrites at lines 18–46 as the template); `src/lib/jsonld/person.ts` (Beacon 1's `buildPersonJsonLd` signature confirmed as direct reuse); `src/app/api/magic-link/route.ts` (existing token-generation pattern, noted but NOT reused — single-purpose requirement disqualifies Supabase magic-link reuse).
- No DB queries this session (read-only doesn't require them; everything needed is schema-shape-known from prior audits).
- No code or data mutated.
- Type confirmation for the DDL: `profiles.id` is `uuid` (confirmed against the live OpenAPI during Tier 1 discovery; same column the Tier 1 migration's `entities.profile_id` already references).

---

*End of Phase 1 discovery. STOP. Awaiting Thomas's review and explicit Section H approval before Phase 2.*
