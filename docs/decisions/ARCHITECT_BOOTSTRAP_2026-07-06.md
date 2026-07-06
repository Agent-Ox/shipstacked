# ShipStacked — Architect Bootstrap (2026-07-06)
Cold-start context for a fresh Architect-Claude + fresh terminal-Claude. All state VERIFIED live at write time (SHAs checked as commits + ancestors of HEAD; DB counts read from prod via service role).

## CURRENT STATE
- **origin/main HEAD: `0a780c5`** (Stage E, live Production, deployment `5336308512` state=success)
- **Parked branch: `hold/stage4-org-page` (`32cde80`)** — unified org public page, awaiting corrected-model re-merge (Cap-Stage 5). Verified: commit exists, NOT an ancestor of HEAD (correctly parked).
- Only branches on origin: `main` + `phase-9-part-1-pillar-dashboard` (pre-existing, ignore).

## STAGE LEDGER (all live Production) — every SHA verified as a commit AND an ancestor of `0a780c5`
Org-unification + capability-decoupling (cap-stages), then the capability-spine/GEO arc, in merge order:
1. **Cap-Stage 1 — `4dfd339`** feat(modes): add 'member' capability (= subscription). Inert primitive; `member = !!subscription` alongside unchanged `hirer`.
2. **Cap-Stage 2 — `d13c9a8`** feat(messaging): message + directory gate on member, not hirer. Widened messaging + full directory to any paid member (incl. paying builders).
3. **Cap-Stage 3 — `ba7f57a`** feat(org): 'hires' is a chosen state, not forced by signup door. Buyer signup sets hires=false; posting-as-team / a company-form toggle set it.
4. **Stage A — `1a50c5c`** feat(geo): de-teaser the talent directory. Full ranked list + full ItemList public; contact/save stay member-gated.
5. **B1 — `fef9755`** feat(capability): vocabulary loader + resolver (`lib/capability/vocab.ts`).
6. **B3 — `2696c3b`** fix(enrichment): normalize schemeless URLs at capture + enrichment (`lib/url/normalize.ts`); `validateUrl` + public paste untouched.
7. **Stage C — `9d151e4`** feat(geo): per-capability answer pages at `/talent/[slug]` (77 SSG/ISR pages).
8. **Stage D1 — `1934c8c`** feat(geo): include teams + agents on capability pages via resolved freetext.
9. **Stage E — `0a780c5`** feat(search): capability filter on `/talent` (`?capability=<slug>`), grouped facet, no SearchAction.

(Between cap-stages and the GEO arc there were also docs commits `3bf821a` capability-seed and `d05760a` B3-state, both ancestors of HEAD.)

## LIVE DB OBJECTS (this session — counts verified against prod)
- **`capability_vocab`** — **77 rows: 74 `canonical` + 3 `graduated`** (verified status breakdown). Cols: `slug` PK, `label`, `layer` [tool/capability/domain], `aliases[]`, `status`, `description`, `source_categories[]`.
- **`capability_atlas_crosswalk`** — **52 rows** (verified). Cols: `capability_slug` → `atlas_role_id` + `atlas_version` + `weight`.
- **`skills` table — CORRECTION vs the ask:** the `capability_slug` column **DOES exist live** (present in the schema; the original ask said "NO column added"). BUT it is **0/1082 populated and UNUSED by any code** (grep: no query reads/writes `skills.capability_slug`; the only match is a comment). D1 uses **read-time resolution** via `resolveCapability`, not the stored column. Net effect matches intent (no stored-column dependency); the empty column is dormant schema — leave or drop later.
- **7 entities minted** for previously entity-less real builders — verified ids/slugs: `62 danielendara157`, `63 chidinmaekegbu274`, `64 aaronwilkins714`, `65 michaelcrafter806`, `66 abhishekarjun819`, `67 chimaobiekwe708`, `68 brysonstarling649` (all kind=human, slug==username, via `findOrCreateHumanEntity`).
- **2 re-enriched** (verified atlas roles): `danielendara157` → **A1**; `aaronwilkins714` → **F3, A4, D2** (URLs healed by B3 normalize; `stackeroo.app`→https, `github.com/danielendara`→https).

## WHAT'S LIVE (the capability spine + GEO)
- **Canonical vocabulary + resolver** (`lib/capability/vocab.ts`): `loadVocab` / `resolveCapability` / `resolveMany` / `getVocabByLayer` (fail-soft, module-memoized, WeakMap O(1) index over slug/label/alias).
- **capability→builders/teams/agents matching** (`lib/capability/practitioners.ts`): `getSubjectsForCapability` = crosswalk-roles ∪ resolved-freetext, symmetric per pillar (builders' skills, teams' services[], agents' capabilities[]); Formula-E ordered; module-memoized global bundle.
- **`/talent/[slug]`** — 77 SSG/ISR(1h) answer-first per-capability pages; ranked proof-backed builders + teams + agents; ItemList JSON-LD (all three via personId/teamOrgId/agentOrgId); in sitemap. Coverage: 76/77 have ≥1 builder; 13 have a team/agent (test data).
- **`/talent`** de-teasered (full ranked list public + full ItemList) + `?capability=<slug>` filter (grouped facet, composes with existing filters; heavy match only when active).
- **URL-normalize** (`lib/url/normalize.ts`) at capture (signup + edit) + enrichment call site; `validateUrl` (https-only) + the public `/paste` flow untouched.

## PENDING (priority order)
- **Stage F: machine-surface polish** — extend sitemap coverage (teams `/team/*`, agents `/agent/*`, `/atlas`, `/atlas/roles/*`, `/p/*` still absent); AgentCard + `llms.txt` to enumerate the capability pages; optional `/talent/[slug]` → `/talent?capability=` cross-link; capability filter on the `/talent` team/agent tabs (E was builder-only; team/agent use the separate `goCluster` param mechanism).
- **Stage D2: FRONT DOOR** — retire `client` mode; rename "Hiring Access" → membership ("Full Access" is the architect's lean, **NOT decided**); signup-card restructure (3 identities + membership add-on vs 4 cards reframed — **NOT decided**). **TWO POSITIONING DECISIONS PENDING (operator's call: the name + the card model).**
- **Cap-Stage 5: org-unification finish** — re-merge parked `hold/stage4-org-page` (`32cde80`) on the corrected member/hires model; re-key jobs (`employer_email` → `subject_entity_id`) + messaging; deprecate `employer_profiles`.
- **Deferred:** 5 URL-less real builders (abhishekarjun819, brysonstarling649, chidinmaekegbu274, chimaobiekwe708, michaelcrafter806) — entities minted, need a real URL to enrich (re-engagement nudge — growth, not eng); P2 multi-team switcher; P3 agent dashboard; team/agent E2E test; the dormant empty `skills.capability_slug` column (drop or wire).

## WORKING RULES (hard)
- **Byte-review ACTUAL pushed bytes before every merge** (curl raw / GitHub API base64). **VERIFY THE SHA EXISTS before reasoning about any commit** — tc summaries have claimed non-existent commits multiple times this session; byte-review/`git cat-file` caught every one.
- Never "probably"; diagnose first. Facts from cat/grep/live DB only, never recall.
- Make the architectural call and defend it; no A/B/C menus on design. But product/positioning/ICP/naming = **operator's call**.
- Don't over-engineer (a proxy + a documented invariant beats purity at sitewide cost — see the NavBar `!modes.client` decision).
- **38 real builders are the invariant** — every change non-destructive/additive to them.
- **Review flow:** tc commits local main → pushes `review/*` → architect byte-reads raw → merge. The `git push origin review/*:main` refspec **errors as expected** (no local ref by that name); fallback = confirm local main == reviewed SHA, then `push local main`. (Merges this session were done via `git push origin <sha>:main` fast-forward — also fine.)
- **DB DDL: tc CANNOT run it** — goes through the Supabase Dashboard SQL Editor (operator runs; use `/sql/new` for a clean editor). Additive/nullable only, always with a reversal SQL block.
- **RELAY:** for LONG tc output, tc **writes to a file** in-repo (or /tmp) + architect reads via raw GitHub — inline paste does not reach the architect. Short confirms inline are OK.
- **Architect's curl to shipstacked.com is EDGE-BLOCKED** (403 on everything) — deploy smoke tests route through tc via the GitHub **deployments API** (poll for the Production deployment of the merged SHA → state=success), not architect curl. Web search still works for the architect.
- Stripe is live ($1 test price, real $199); purge test org/team/agent data pre-launch.

## FAST VERIFY COMMANDS (for the cold-start to re-confirm)
```
git rev-parse origin/main            # expect 0a780c5...
for s in 4dfd339 d13c9a8 ba7f57a 1a50c5c fef9755 2696c3b 9d151e4 1934c8c 0a780c5; do git merge-base --is-ancestor $s origin/main && echo "$s ok"; done
git log --oneline -1 32cde80         # parked stage 4
# DB (needs .env.local service role): capability_vocab=77, capability_atlas_crosswalk=52, entities 62-68 human
```
