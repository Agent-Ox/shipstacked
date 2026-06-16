# ShipStacked — Tier 3, Beacon 1: Schema.org Markup on V1 Pages

**For:** Claude Code, executing in `shipstacked` repo
**Builds on:** Tier 0 (site truthful), Tier 1 (V1↔V2 identity merged — commit 1e9c81a, live)
**Output:** Every existing V1 page emits valid Schema.org JSON-LD. ShipStacked becomes machine-readable to crawlers, recruiter agents, and LLM ingestion pipelines — *where they already are*, with no one having to visit a new URL.
**Status:** First beacon in the Doc 05 locked order. Additive-only. Discovery-first. Read-only until Thomas approves the change plan.

---

## 0. Why this is Beacon 1 (the strategic frame — cite when scoping)

From handover Doc 05 (the most recent master handover), the locked S-tier beacon order:

> Schema.org → AgentCard at /.well-known/agent-card.json → AGENTS.md across repos → Atlas-as-package → MCP server → NLWeb → Agent Skill

Schema.org is **first** because it is the highest-leverage, lowest-risk way to execute the core strategy Thomas stated: *"meet builders and agents where they are — don't make them come to ShipStacked to make a profile — be infrastructure with the right beacons baked in."*

Schema.org JSON-LD markup on the existing pages means:
- Every recruiter agent, LLM crawler, and search engine that already crawls the web now reads ShipStacked's builders, jobs, and the Atlas as **structured data** — without anyone visiting a new endpoint.
- It is the prerequisite the Noah founding-beta gateway consumes: the gateway is "a consented collection of `schema.org/Person` records." Person markup must exist first.
- It is purely additive: JSON-LD lives in `<script type="application/ld+json">` in the page head/body. It changes nothing a human sees. Zero friction, zero risk to existing users — the Tier 1 governing constraint (add, never subtract/move/break) applies here trivially because markup is invisible to humans.

This beacon is the difference between ShipStacked being *a website agents can find* and *infrastructure agents can read*. It ships first because it compounds the moment it deploys and it gates the Noah work.

---

## 1. Scope of this beacon

Add valid, accurate Schema.org JSON-LD to every existing V1 page type that has a meaningful structured-data representation. Discovery determines the exact page inventory; the expected set:

- **Builder profile** (`/u/[username]`) → `schema.org/Person` (+ `shipstacked:` namespace extensions, consistent with the V2 receipt/Atlas JSON-LD already shipped)
- **Jobs** (`/jobs`, `/jobs/[id]`) → `schema.org/JobPosting` — BUT note Tier 0 retired all seed jobs (all 24 paused, URLs 308 → /jobs). Discovery must determine whether JobPosting markup is moot right now (no active jobs) or should be built dormant-ready for when real jobs exist. Recommend: build the JobPosting emitter, gated on `status='active'`, so it lights up automatically when a real job is ever posted — but emits nothing now (no active jobs). Flag if this is wasted effort vs. deferring.
- **Homepage** (`/`) → `schema.org/Organization` + `WebSite` (with `SearchAction` if site search exists)
- **Atlas** (`/atlas`) → already has JSON-LD from earlier work; discovery confirms what's there and whether it needs a `DefinedTermSet` wrapper to complement the per-role `DefinedTerm` already shipped at `/atlas/roles/[id]`
- **Leaderboard / talent / feed** → evaluate per-page; these may warrant `ItemList` or `CollectionPage` or nothing — discovery recommends per page, do not force markup where it isn't semantically honest

What does NOT ship in this beacon:
- AgentCard (`/.well-known/agent-card.json`) — Beacon 2
- AGENTS.md — Beacon 3
- Atlas npm package — Beacon 4
- MCP server — Beacon 5
- The Noah gateway itself — it *consumes* this beacon but is its own spec after the Person markup is verified
- Any change to the V2 JSON-LD already shipped on `/p/[slug]` and `/atlas/roles/[id]` (those are correct; don't touch them — only confirm they don't conflict)

---

## 2. Hard constraints

- **Additive-only.** JSON-LD is added to page output. No existing HTML, layout, copy, route, or behavior changes. A human sees an identical page. (The Tier 1 §0 rule applies trivially: markup is invisible; this beacon cannot, by construction, subtract/move/break anything a user experiences — but verify that holds, don't assume.)
- **Accurate, not aspirational.** The markup must describe what is *actually true* on the page. No fabricated fields. If a builder has no verified status, the markup doesn't claim one. (This is the Tier 0 truthfulness principle applied to structured data: machine-readable lies are worse than human-readable ones because agents ingest them at scale.)
- **Consistent with shipped V2 JSON-LD.** The V2 work already established a `shipstacked:` namespace (`https://shipstacked.com/schema/v0.1#`) and a `@context` pattern on `/p/[slug]` and `/atlas/roles/[id]`. Beacon 1's markup uses the SAME `@context` and namespace conventions so the whole site is one coherent graph, not two dialects.
- **Reflects the post-Tier-1 reality.** The 3 fakes are `published=false` → they must NOT appear in any Person markup or any ItemList. The 17 backfilled builders have linked entities — Person markup on their profiles should reference their entity (`@id` → their canonical URL) so the Person beacon and the V2 entity graph are linked. Discovery determines exactly how.
- **Discovery before mutation.** Phase 1 is read-only. Terminal Claude produces a markup plan and STOPS. Thomas approves. Then Phase 2 implements.
- Standard commit gate: `tsc --noEmit` clean, `npm run build` clean. Plus: every emitted JSON-LD block must validate (terminal Claude validates structurally; note that Google Rich Results / schema.org validator is the external truth but can't be hit from the sandbox — structural validation + correct types is the bar).

---

## 3. PHASE 1 — Discovery (read-only, STOP, await approval)

Produce `docs/audit/BEACON_1_DISCOVERY.md`. Mutate nothing.

### 3.1 Page inventory

Enumerate every page under `src/app/` that renders for a public (non-admin, non-API) URL. For each: path, file, what it renders, and a recommendation:
- Which `schema.org` type honestly describes it (Person, Organization, JobPosting, ItemList, CollectionPage, WebSite, DefinedTermSet, or "none — no honest structured representation")
- If "none," say so plainly — do not invent markup for pages that have no honest structured form

### 3.2 What JSON-LD already exists

The V2 work shipped JSON-LD on `/p/[slug]`, `/atlas/roles/[id]`, and inline on some pages (the audit mentioned a site-level Organization block in the layout). Report:
- Every existing `<script type="application/ld+json">` or JSON-LD emitter in the codebase, file:line
- The exact `@context` and namespace pattern used (so Beacon 1 matches it)
- Any existing Organization/Person markup that Beacon 1 would duplicate or conflict with — Beacon 1 must reconcile, not double-emit

### 3.3 Person markup plan (the load-bearing one — Noah gateway depends on it)

For `/u/[username]`:
- The exact data available on the page to populate a `schema.org/Person` (name, headline/role, location, skills, sameAs links to GitHub/socials, the linked entity canonical URL, verified status, projects as `CreativeWork`?)
- Propose the exact Person JSON-LD shape, including `shipstacked:` extensions consistent with the V2 namespace, and including `@id` linking to the builder's canonical identity (their `/u/username`, and a reference to their V2 entity if one is linked — the 17 backfilled builders have `profile.entity_id`)
- How verified status is represented honestly (the 3 fakes are `published=false` so their profile pages 404 — confirm they emit no Person markup at all; the markup must reflect post-Tier-1 truth)
- Whether projects on the profile should be nested `CreativeWork` / `hasPart` — recommend based on what's honest and what the Noah gateway would want to consume

### 3.4 JobPosting — is it moot?

Tier 0 paused all 24 seed jobs. Report:
- Are there ANY `status='active'` jobs? (Expected: 0)
- Recommendation: build the JobPosting emitter gated on `status='active'` (lights up when a real job is posted, emits nothing now), OR defer JobPosting entirely until a real job exists. State the cost/benefit. Lean: build it dormant-ready only if it's cheap; otherwise defer and note as a fast-follow when real jobs return.

### 3.5 Organization / WebSite / homepage

- What the homepage currently emits (per 3.2)
- Proposed `Organization` + `WebSite` markup — accurate fields only (no fabricated metrics; Tier 0 removed the fake hires badge, the markup must not reintroduce a fabricated number in structured form)
- Whether a `WebSite` `SearchAction` is honest (only if site search actually exists and works)

### 3.6 Collection pages (leaderboard / talent / feed)

For each: is an `ItemList` / `CollectionPage` honest and useful, or is markup here noise? Recommend per page. If `ItemList` for leaderboard/talent: it MUST exclude the 3 fakes (they're `published=false`) — confirm the data source already filters them post-Tier-1, or flag that the markup query needs the filter (same class of check as the Tier 0 status-filter and Tier 1 fake-surface audits).

### 3.7 Implementation approach

- Recommend HOW the markup is emitted: a shared `src/lib/jsonld/` module with per-type builders (consistent with the V2 `src/lib/receipts/jsonld.ts` / `src/lib/atlas/jsonld.ts` pattern already established), invoked per page, rendered as a `<script type="application/ld+json">` in the page
- Confirm this does not require touching the V2 emitters (reuse the pattern, don't modify the existing ones)
- Confirm SSR/streaming compatibility (Tier 1 made profile pages dynamic; the markup must render server-side so crawlers see it without executing JS)

### 3.8 Discovery output

`docs/audit/BEACON_1_DISCOVERY.md`, sections A–H:
- A: full public-page inventory + recommended schema type per page (incl. honest "none")
- B: existing JSON-LD inventory + the `@context`/namespace pattern to match
- C: the exact Person markup shape (the Noah-critical one) with `@id`/entity linking
- D: JobPosting recommendation (build-dormant vs defer)
- E: Organization/WebSite markup, accurate fields only
- F: collection-page recommendations + fake-exclusion confirmation
- G: implementation module plan
- H: precise numbered Phase 2 change list — every file touched, every emitter added, each individually approvable

STOP. One-paragraph summary. Await explicit approval of Section H.

---

## 4. PHASE 2 — Execution (only after Thomas approves Section H)

Execute the approved Section H. Expected shape:

- Add `src/lib/jsonld/` builders (Person, Organization, WebSite, JobPosting-gated, ItemList where approved), matching the V2 namespace/`@context` pattern exactly
- Wire each builder into its page as a server-rendered `<script type="application/ld+json">`
- Reconcile any existing site-level Organization markup (don't double-emit; one coherent graph)
- The 3 fakes emit zero markup (their pages 404 post-Tier-1; verify)
- The 17 linked builders' Person markup references their entity `@id` so the Person beacon and V2 entity graph are one graph
- No human-visible change to any page

### 4.1 Verification (before commit)

- Every page that should emit JSON-LD does, server-side (curl the raw HTML, confirm the `<script type="application/ld+json">` is present WITHOUT executing JS — crawler's-eye view)
- Every emitted block is structurally valid JSON and uses correct schema.org types (terminal Claude parses and structurally validates each; note schema.org's own validator is the external truth but unreachable from sandbox)
- Person markup on a real killer (e.g. `/u/aniketaslaliya801`) is accurate: name, role, GitHub sameAs, verified status all match the actual page content; `@id` links to his canonical identity
- The 3 fakes (`/u/jennypeterson224` etc.) → 404, zero Person markup emitted anywhere for them; absent from any ItemList
- Existing V2 JSON-LD (`/p/[slug]`, `/atlas/roles/[id]`) UNCHANGED and still valid (Beacon 1 must not regress the V2 graph)
- Homepage Organization markup contains NO fabricated metric (Tier 0 truthfulness holds in structured form)
- Human-visible regression: pick 2 pages, confirm rendered HTML body (minus the new `<script>` block) is byte-identical to pre-beacon — additive-only proven
- `tsc --noEmit` clean, `npm run build` clean
- Tier 0 + Tier 1 regression: seed-job 308s intact, fakes still 404, 17 entities still linked, no fabricated badge

### 4.2 Commit + push

Commit message documents every page that gained markup, the schema types, the namespace consistency with V2, explicit confirmation of additive-only (no human-visible change) and fake-exclusion. No production *data* mutation in this beacon (markup is code only) — so no reversal SQL needed, but note `git revert <commit>` fully reverses it cleanly. Push, poll prod, verify markup present in raw production HTML (crawler's-eye curl), report.

---

## 5. Escalate if

- A page has no honest structured representation but the spec implies one — say so, emit nothing, don't invent markup
- Existing site-level Organization/Person markup conflicts in a way that can't be cleanly reconciled (propose options)
- Person markup would require exposing data a builder hasn't consented to make machine-readable at scale (flag — this is the Noah-gateway consent question arriving early; for Beacon 1, Person markup should only include what's ALREADY public on the human-readable profile page; anything beyond that is a consent question for the Noah gateway spec, not this one)
- JobPosting turns out non-trivial to build dormant-ready (defer it, note as fast-follow)
- The post-Tier-1 fake-exclusion isn't automatically handled by a page's data source (needs a filter, like the Tier 0/Tier 1 precedents)

---

## 6. After Beacon 1 ships

ShipStacked is machine-readable across its whole existing surface, in one coherent `shipstacked:`-namespaced graph, reflecting post-Tier-1 truth. This unblocks, in order:

- **The Noah founding-beta gateway** — now buildable as a consented collection over the `schema.org/Person` records this beacon created. Its own spec. The consent mechanism (per-builder opt-in, dashboard + email when timing is right) and the canonical-JSON-LD-with-CSV/URL-projections design get specced then, with one question to Noah first: what does his AppSumo onboarding actually ingest.
- **Beacon 2:** AgentCard at `/.well-known/agent-card.json` (note Doc 05's correction: `agent-card.json`, NOT `agent.json`)
- **Beacons 3–5:** AGENTS.md, Atlas npm package, MCP server — each its own focused spec, Doc 05 order
- **Tier 4:** the isolated tech-debt sweep — separate spec, sequenced after Beacon 1, internally split (safe code cleanup vs. production-data/config with discovery-first approval)

Each beacon is one focused spec, discovery-first, the protocol that has now caught a fake and two spec errors before they became permanent. No mega-batches.

---

*End of Beacon 1 spec.*
