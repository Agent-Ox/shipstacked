# ShipStacked — Tier 3: The Founding-Beta Gateway (Noah is consumer #1)

**For:** Claude Code, executing in `shipstacked` repo
**Builds on:** Beacon 1 (commit 0ceb69a, live — schema.org/Person on every published builder profile, entity-linked)
**Output:** A consented, standards-shaped collection of vetted builders, machine-readable, that any partner (Noah's AppSumo founding beta first) can ingest. The first instance of ShipStacked acting as supply infrastructure to the agentic economy.
**Status:** Discovery-first. Read-only until Thomas approves the change plan. Built to industry standards — NOT to one consumer's onboarding quirks.

---

## 0. The governing principle (cite when any decision is ambiguous)

**This is infrastructure, not a Noah feature.** It is built to current industry standards for consented, machine-readable people-collections. Noah's AppSumo founding-beta launch is consumer #1 — not the spec author. The same endpoint serves the next partner, a recruiter agent, or an LLM pipeline without modification.

Consequences of this principle:
- The canonical form is **JSON-LD** (`schema.org/ItemList` of `schema.org/Person`, using the exact `shipstacked:` dual-context Beacon 1 already established). This is the source of truth.
- Pragmatic **projections** of that one canonical form ship alongside it because real consumers today ingest different formats: a **CSV** projection (spreadsheet/import-tool consumers), a **shareable HTML URL** (human review). One source, multiple renderings — never multiple independent exporters.
- **Consent is constitutive, not a feature.** A builder is in the collection only by explicit, specific, per-person opt-in. No builder is included because Thomas thinks they'd want to be. "Hand Noah as many as possible" means *as many as opt in*, filtered by consent, not by hand-curation.
- We do NOT ask Noah what to build. We build the standard. His answer only selects which existing projection he uses.

---

## 1. What this is, in one sentence

A builder opts in (dashboard toggle and/or an emailed link, when Thomas chooses to send it) → they join a named collection → that collection is dereferenceable as canonical JSON-LD at a stable URL, with CSV and human-readable projections of the same data → Noah's founding-beta onboarding (or any consumer) ingests whichever projection fits, all reading the same consented truth.

---

## 2. Scope

**Ships in this spec:**
- A consent mechanism: per-builder opt-in to a named collection (start with one collection: the founding-beta cohort). Storage, the dashboard control, and an opt-in-via-link path.
- A canonical collection endpoint: `schema.org/ItemList` of `schema.org/Person`, `shipstacked:` dual-context, one entry per consented builder, each `@id` = their canonical profile URL (the exact key Beacon 1 emits — one graph).
- Two projections of that canonical form: CSV and a human-readable HTML page.
- Reuses Beacon 1's `src/lib/jsonld/person.ts` builder — the per-person Person markup already exists and is correct; this spec assembles consented ones into a collection. Do NOT rebuild Person markup.

**Does NOT ship here:**
- Any change to Beacon 1's per-profile Person emitters (they're correct and live — reuse, don't modify)
- Beacon 2 (AgentCard), Beacons 3-5 — separate specs
- Any outreach to builders or to Noah (that's Thomas's timing decision; this builds the mechanism, Thomas decides when to flip it on and who to tell)
- Tier 4 tech debt
- Auto-enrolling anyone. Zero builders are in the collection until they individually opt in.

---

## 3. Hard constraints

- **Consent before inclusion, always.** No builder appears in any projection until they have explicitly opted in. Default state for every builder: not in the collection. This is non-negotiable and is the single most important property of the whole feature — a consent leak here is the kind of thing that permanently destroys trust with exactly the people ShipStacked most needs.
- **Only the 3-fakes-excluded, post-Tier-1 truth.** The 3 neutralized fakes (`published=false`) can never opt in (their profiles 404; the dashboard control must not be reachable for them). Only real, published builders can consent. Beacon 1's fake-exclusion discipline carries forward.
- **Standards-shaped canonical form.** The JSON-LD collection validates as `schema.org/ItemList` + `schema.org/Person`, uses Beacon 1's exact dual-context and namespace. Projections are derived from it, never authored independently.
- **Opt-out is as easy as opt-in.** A builder can withdraw consent at any time; withdrawal removes them from the canonical form and therefore from every projection immediately (next regeneration / on read). No "contact us to be removed" friction.
- **Reflects only what's already public.** A consented builder's collection entry contains only data already visible on their public profile (Beacon 1's Person markup is exactly this set). Opting in to the collection does NOT expose anything beyond what their profile already shows. Consent is to *inclusion in the collection*, not to *new data exposure*.
- **Additive, no pain (Tier 1 §0 still governs).** The dashboard gains a control; nothing existing moves or breaks. A builder who never opts in sees one new optional toggle and zero other change.
- **Discovery before mutation.** Phase 1 read-only. Terminal Claude produces the plan, STOPS, Thomas approves Section H, then Phase 2.
- Standard commit gate: `tsc --noEmit` clean, `npm run build` clean.

---

## 4. PHASE 1 — Discovery (read-only, STOP, await approval)

Produce `docs/audit/GATEWAY_DISCOVERY.md`. Mutate nothing.

### 4.1 Consent storage

- Examine the post-Tier-1 schema. Where does per-builder consent live? Options to evaluate: a new column on `profiles` (e.g. `founding_beta_optin boolean default false` + `founding_beta_optin_at timestamptz`), or a new `collection_memberships` table (builder_id, collection_slug, opted_in_at, opted_out_at) that generalizes to future collections.
- Recommend ONE. Bias toward the generalizable `collection_memberships` table IF it's low-cost — the principle is infrastructure, and a single-boolean only serves the Noah case while a membership table serves every future collection (the same "build the standard not the instance" logic). State the migration cost of each. Flag if the generalized option is materially more complex; if so, the boolean is acceptable for v1 with a noted path to generalize.
- Whatever the mechanism: it must be queryable to produce "all builders where consent = true for collection X", and reversible (opt-out flips it back, history preserved if a membership table).

### 4.2 The consent control (dashboard)

- Locate the builder dashboard / profile-edit surface (post-Tier-1). Where would an opt-in control live without moving or disrupting anything (Tier 1 §0)?
- Propose the control: a clear, plain-language toggle — what it says, what it discloses (exactly what gets shared and with whom: "your public profile info, as a machine-readable record, in the ShipStacked founding-beta collection that partners like AppSumo can access"), how to opt out.
- The disclosure copy must be honest and specific. Draft it. It should not oversell ("get discovered by AppSumo!") nor be vague ("share your data"). It states plainly what the collection is, that it's opt-in, that it's withdrawable, and that it contains only already-public profile data.
- Confirm the control is NOT reachable for the 3 fakes or any `published=false` profile.

### 4.3 The opt-in-via-link path

- Thomas may want to nudge specific builders by email (when timing is right — that's Thomas's call, not this spec's). Design a tokenized opt-in link: a builder clicks it, lands authenticated (or logs in), sees the same disclosure as the dashboard control, confirms. Same consent record either way.
- This is the *mechanism* only. No emails are sent by this spec. Thomas decides when/whom; the spec builds the path so it's ready.
- Token must be safe: scoped to the specific builder, expiring, single-purpose (opt-in only — it cannot perform any other account action).

### 4.4 The canonical collection endpoint

- Propose the URL (e.g. `/collections/founding-beta` for the human page, `/collections/founding-beta.json` and `Accept: application/ld+json` content-negotiation for canonical JSON-LD — mirroring the V2 `/p/[slug]` and `/atlas/roles/[id]` content-negotiation pattern already shipped, for consistency).
- The JSON-LD shape: `schema.org/ItemList`, `shipstacked:` dual-context (Beacon 1's exact `@context`), `itemListElement` an ordered list of `schema.org/Person` entries — each one produced by REUSING Beacon 1's `src/lib/jsonld/person.ts` builder for a consented builder. Each Person `@id` = their canonical profile URL (the one-graph key).
- Only consented, published, non-fake builders appear. Empty collection → valid empty `ItemList` (not an error, not noise — an honest empty collection).
- Caching: same `Cache-Control` pattern as the V2 JSON-LD endpoints. Regenerates as consent changes (consent is low-frequency; short cache is fine).

### 4.5 The projections

- **CSV projection:** `/collections/founding-beta.csv` — a flat, import-friendly rendering of the SAME consented set. Columns: the fields a partner ingest tool realistically needs (name, profile URL, headline/role, location, primary skills, GitHub URL, verified status, entity identifier). Derived from the canonical form, not independently queried. One source of truth.
- **Human-readable projection:** `/collections/founding-beta` HTML — a clean page showing the consented builders as cards (reuse existing profile-card components if present), so Thomas or a partner can eyeball the cohort. Honest empty state when no one's opted in yet.
- All three (JSON-LD, CSV, HTML) render the SAME consented set from the SAME query. Verify this invariant in Phase 2: a builder opting out disappears from all three simultaneously.

### 4.6 Fake / consent-integrity checks

- Confirm the 3 fakes cannot opt in (profiles 404; control unreachable).
- Confirm `andreaschristodoulou643` (real, not-a-builder, untouched per Tier 1) CAN technically opt in if he chooses — he's a real account; the spec does not editorialize about who's "worthy", consent is the only filter. (He's unlikely to, having no AI work, but the mechanism must not hand-discriminate — consent is the filter, by design.)
- Confirm a `published=false`-after-opt-in builder is excluded from projections even if their consent flag is true (consent AND published AND not-fake — all required; published is the live gate).

### 4.7 Discovery output

`docs/audit/GATEWAY_DISCOVERY.md`, sections A–H:
- A: consent storage recommendation (boolean vs membership table, with migration cost)
- B: the dashboard control — placement, exact disclosure copy draft, fake-unreachable confirmation
- C: the tokenized opt-in-link path design (mechanism only, no sends)
- D: the canonical JSON-LD collection endpoint shape (reusing Beacon 1 person.ts)
- E: the CSV + HTML projections, derived-from-canonical confirmed
- F: consent-integrity checks (fakes can't opt in; published+consent+not-fake all required)
- G: confirmation this reuses Beacon 1's person.ts and does not modify any Beacon 1 / V2 emitter
- H: precise numbered Phase 2 change list, each item individually approvable, migration (if any) flagged for Dashboard-SQL-Editor application per the Tier 1 precedent (terminal Claude can't apply DDL from its session — provide the type-confirmed DDL for Thomas to run in the Supabase Dashboard)

STOP. One-paragraph summary. Await explicit Section H approval.

---

## 5. PHASE 2 — Execution (only after Thomas approves Section H)

Execute approved Section H. Expected shape:

- Consent storage (migration applied via Dashboard SQL Editor per Tier 1 precedent — terminal Claude provides type-confirmed DDL, Thomas runs it, confirms, then terminal Claude proceeds with service-role data/code work)
- Dashboard opt-in control with the approved disclosure copy; unreachable for fakes/unpublished
- Tokenized opt-in-link path (mechanism; no emails sent)
- `/collections/founding-beta` (HTML) + `.json` (canonical JSON-LD via content-negotiation, reusing Beacon 1 person.ts) + `.csv` (projection)
- All three render the same consented set from one query

### 5.1 Verification (before commit)

- Opt-in flow: a test builder opts in → appears in all three projections. Opts out → disappears from all three simultaneously (the one-source invariant).
- Consent default: every existing builder is NOT in the collection until they explicitly opt in (zero builders in the collection on first deploy — verify the collection is empty until a real opt-in occurs).
- Fakes: the 3 neutralized fakes cannot reach the opt-in control; not in any projection even if their consent column were force-set (published gate holds).
- Canonical JSON-LD validates as `schema.org/ItemList` + `Person`, Beacon 1 dual-context, each Person `@id` = canonical profile URL (one-graph key intact).
- CSV parses, columns correct, same row set as JSON-LD.
- HTML page renders, honest empty state when no opt-ins.
- Beacon 1 untouched: `src/lib/jsonld/person.ts` reused not modified; per-profile Person markup on `/u/[username]` unchanged; V2 spine unchanged.
- Tier 0 / Tier 1 / Beacon 1 regressions all intact.
- Additive: a builder who doesn't opt in sees one new optional dashboard control and zero other change (Tier 1 §0).
- `tsc` clean, `build` clean.

### 5.2 Commit + push

Commit message documents: consent mechanism, the endpoint + projections, the reuse of Beacon 1 person.ts, explicit confirmation that zero builders are auto-enrolled and consent is required, fake-exclusion, and the one-source invariant. If a migration was applied via Dashboard, record the exact DDL + reversal DDL in the commit message (Tier 1 precedent). Push, poll prod, verify on production: the collection endpoint returns a valid empty ItemList (no one's opted in yet), the dashboard control is present, fakes can't reach it. Report.

---

## 6. Escalate if

- The generalizable `collection_memberships` table is materially more complex than a boolean (Thomas decides: generalize now vs. boolean-with-noted-path)
- Any design would auto-enroll builders or make opt-out harder than opt-in (forbidden — §3, escalate)
- The dashboard control can't be added without moving/disrupting existing dashboard content (Tier 1 §0 — additive only; escalate, propose deferring the visible surface)
- Reusing Beacon 1's person.ts requires modifying it (it must NOT be modified — if the collection needs a variant, propose a wrapper, escalate)
- The opt-in token design has any path to performing a non-opt-in account action (security — must be single-purpose; escalate)
- Discovery finds an existing consent/sharing mechanism that conflicts

---

## 7. After the gateway ships

ShipStacked has a consented, standards-shaped supply endpoint — the first instance of it being infrastructure to the agentic economy rather than a destination. Then:

- **Thomas's call, separately:** when to flip it on, when/whom to nudge (the 6 killers first per the deferred Tier 2, Aniket first), and the one informational question to Noah — *which projection does your AppSumo founding-beta onboarding ingest* (JSON-LD / CSV / a URL you review). His answer selects an existing projection; it does not change what was built.
- **Beacon 2:** AgentCard at `/.well-known/agent-card.json` (Doc 05 corrected path)
- **Beacons 3-5:** AGENTS.md, Atlas npm package, MCP server — Doc 05 order, each its own spec
- **Tier 4:** isolated tech-debt sweep (separate spec, internally split safe-code vs. production-data with discovery-first approval)

The gateway is built to standards, so the next partner after Noah needs zero new engineering — they consume the same endpoint. That is the difference between infrastructure and a one-off, and it is the whole thesis.

---

*End of Founding-Beta Gateway spec.*
