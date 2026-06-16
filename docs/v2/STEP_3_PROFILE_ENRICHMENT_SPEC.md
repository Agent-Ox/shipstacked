# ShipStacked — Step 3: Propagate Infrastructure Across Real Builder Profiles

**For:** Claude Code, executing in `shipstacked` repo
**Builds on:** the clean base at 781b543 (Beacons 1–5 live, Tier 4 reconciled, MCP discoverable). The infrastructure exists; this step makes it actually *land* on the real builders it was built for.
**Output:** The genuine builder profiles (the Tier 1 backfilled cohort) are fully served by the accumulated infrastructure — complete Person JSON-LD, receipts surfaced where real data exists, Atlas-role linkage where applicable — so a builder who signed up to get found is actually maximally findable.
**Status:** Discovery-first. Additive. Fully within existing T&Cs/Privacy (public-profile display is legitimate-interest processing the platform already performs). No new data use. No consent question — this is the core service doing its job.

---

## 0. Why this, and why it's unambiguously in-scope

Five beacons built infrastructure: Schema.org Person markup, the receipts section, Atlas role taxonomy + linkage, agent-discoverable surfaces, the MCP server. Across that work the focus was on *building the machinery and proving it correct*. The machinery is live and verified. But the point of the machinery is the **real builders** — the Tier 1 backfilled cohort (17 genuine profiles, the duplicate-bug cohort) — getting found and hired, which is exactly what they signed up for.

This step closes the gap between "infrastructure exists" and "infrastructure fully serves the real builders." It is the most clearly in-bounds work in the whole engagement:

- **Privacy §3:** "Displaying your public profile to employers and visitors" is listed as legitimate-interest processing the platform already does.
- **Privacy §4:** published profiles are explicitly public and indexed.
- **Terms §8.1:** users grant ShipStacked licence to display and promote their content on the platform.

Enriching how a published profile is rendered/marked-up for discovery *is that exact service*. No new data use, no third party, no consent step, no T&C change. This is the platform delivering the promise the builder signed up for. Ship it like any other platform improvement — discovery-first, but no special legal gate.

(Distinct from the separate, parked partner-channel question, which DOES need a T&C delta — explicitly out of scope here.)

---

## 1. What this is, in one sentence

For the real builder cohort, ensure each accumulated infrastructure surface (Person JSON-LD completeness, receipts where real data exists, Atlas-role linkage where applicable, agent-discoverability) actually renders correctly and completely on their live public profiles — additive, fixing under-population, never fabricating data.

---

## 2. Scope

**Ships in this spec:**
- A discovery pass over the **real builder cohort** (the Tier 1 backfilled genuine profiles — discovery identifies the exact set from the existing data; the 3 known fakes and any unpublished/test profiles are EXCLUDED and must stay excluded by the existing published-gate).
- For each infra surface, identify where it is **under-populated or not rendering** for real builders and fix the rendering/markup so it serves them fully:
  - **Person JSON-LD** (`src/lib/jsonld/person.ts` — reused, NOT modified unless discovery proves a real rendering gap and §6-escalates): is every real builder getting complete, correct Person markup (identifier = entity external_id, sameAs links, the fields the builder actually provided)? Fix population/wiring gaps, not the single-source builder itself.
  - **Receipts section** (`/u/[username]`): is it rendering for builders who have real receipt data, and correctly hidden-when-empty for those who don't? No fabricated receipts — only surface what genuinely exists.
  - **Atlas-role linkage:** where a real builder's profile maps to an Atlas role (via existing claim/data — NOT inferred or invented), is that linkage rendered/marked-up? If the linkage mechanism doesn't exist for profiles yet, that's a discovery finding to scope, not auto-build.
  - **Agent-discoverability:** are real builder profiles correctly represented in the surfaces Beacons 1–5 built (JSON-LD, the feed filters, MCP get-builder)? Confirm they're fully present, not just non-fake.
- The smallest set of additive changes that makes the real builders fully served by what already exists.

**Does NOT ship here:**
- Any fabrication of data — no invented receipts, no inferred Atlas roles, no padded fields. Only surface what the builder genuinely provided/earned. Fabrication is the single worst failure here (it's the exact thing Tier 0 tore down — a fake "10+ hires" badge).
- Any change to the 3 known fakes / unpublished / test profiles (they stay gated out — verify the published-gate still excludes them).
- Modifying the single-source builders (`person.ts` etc.) unless a real rendering bug is found → §6 escalation, propose don't auto-rewrite.
- The partner-channel / Noah access (separate, parked, needs T&C delta — explicitly NOT here).
- Any T&C/privacy change (not needed for this; the separate delta is its own task).
- Any new feature, any operational act, any Phase B item.
- Bulk profile mutation beyond what's needed to correct rendering/markup population (this is about the infra serving real data, not rewriting builder data).

---

## 3. Hard constraints

- **Never fabricate.** Only surface data the builder genuinely provided or genuinely earned (real receipts, real claimed roles, real GitHub activity). Under-population is fixed by *rendering what exists*, never by inventing. If a real builder has no receipts, the section stays hidden — that's correct, not a gap to fill. Fabrication here would recreate the exact dishonesty Tier 0 removed.
- **The published-gate / fake-exclusion stays absolute.** The 3 fakes (jennypeterson224, johnchambers73, oxleethomasagentox598) and any unpublished/test profile must remain non-rendered everywhere, including any newly-touched surface. Verify the no-oracle property still holds (MCP get-builder) and the feed/profile gates still exclude fakes after any change.
- **Reuse single sources; don't rewrite them.** `person.ts` is the sole Person-markup writer (Beacon 1 invariant, 9 commits unbroken). This step fixes *population/wiring/rendering*, not the builder. If a builder change is genuinely required, §6-escalate with a byte-identical-output proof requirement (the Beacon 4 / Beacon 5 pattern), don't auto-modify.
- **Real-cohort only, identified from data not assumption.** Discovery must derive the real-builder set from the actual database/published-gate, not from a hardcoded list or memory. Report exactly which profiles are in scope and why, and prove the excluded set (fakes/unpublished) is excluded.
- **Additive, in-scope, no legal gate but full engineering rigor.** This is squarely within existing T&Cs/Privacy (public-profile display) — no consent step, no T&C change. But it still gets the standard discovery-first protocol, the standard gate, and reversibility.
- **Brand-free / no secrets / no strategic context.** Standing rule.
- **`git revert` reverses cleanly.** Code/markup-only where possible. If any production-data correction is needed (e.g. a mis-populated entity link for a real builder), it records exact reversal SQL in the commit (Tier 0/1 precedent) and is itself a §6-flagged sub-item Thomas approves explicitly — not bundled blindly.
- **Discovery before mutation.** Phase 1 read-only. Terminal Claude reports the real cohort, the per-surface population gaps, the exact additive fixes, any single-source-change escalations, any production-data-correction sub-items — STOPS. Thomas approves Section H. Then Phase 2.
- Standard gate: `tsc`/`build` clean, `verify-agent-card.ts` + Beacon 5 no-oracle still green, prior-tier prod regressions intact, fakes still excluded, no fabricated data anywhere.

---

## 4. PHASE 1 — Discovery (read-only, STOP, await approval)

Produce `docs/audit/STEP_3_DISCOVERY.md`. Mutate nothing.

### 4.1 The real builder cohort (from data, not assumption)
- Derive the exact set of real, published builder profiles from the database/published-gate. Report the count and how the set is defined. Prove the 3 known fakes + any unpublished/test profiles are excluded by the existing gate.
- For each real builder (or representative sample if the cohort is large, plus the full list): what data they actually have (profile fields, GitHub linkage, receipts, any claimed Atlas role).

### 4.2 Per-surface population audit (read-only)
For each infra surface, for the real cohort, report what's actually rendering vs. under-populated:
- **Person JSON-LD:** is each real builder getting complete correct Person markup? Where is it thin/missing/mis-wired? Is `identifier` = entity external_id present? Are provided fields surfaced? (Cite exact rendering, e.g. curl `/u/<real-builder>` and inspect the JSON-LD.)
- **Receipts:** rendering for real-data builders? Correctly hidden-when-empty? Any real receipt data NOT surfacing (a true gap) vs. correctly absent (no data — leave hidden)?
- **Atlas-role linkage:** does a profile→Atlas-role linkage mechanism exist? For builders with a genuine claimed/derivable role, is it rendered? If the mechanism doesn't exist, scope it as a finding — do NOT auto-build or infer roles.
- **Agent surfaces:** are real builders fully present in MCP get-builder / feed / JSON-LD (not merely non-fake but fully represented)?

### 4.3 The exact additive fixes
- Per surface: the precise minimal additive change that makes real builders fully served, WITHOUT fabricating and WITHOUT rewriting single sources. Distinguish: (a) pure rendering/wiring fixes (safe, additive), (b) any single-source change needed (§6 escalation, byte-identical-proof required), (c) any production-data correction for a real builder (§6 sub-item, exact reversal SQL, explicit separate approval).
- Confirm each fix surfaces only genuine data.

### 4.4 Fake-exclusion & no-fabrication proof design
- The exact verification that, after the fixes: the 3 fakes + unpublished stay non-rendered everywhere (incl. MCP no-oracle still byte-identical); and nothing surfaced is fabricated (every rendered receipt/role/field traces to real builder-provided/earned data).

### 4.5 Discovery output
`docs/audit/STEP_3_DISCOVERY.md`, sections A–H:
- A: the real cohort (count, definition, exclusion proof)
- B: per-surface population audit (what renders vs. under-populated, with cited evidence)
- C: the exact additive fixes, split into (a) safe rendering/wiring, (b) single-source §6 escalations, (c) production-data §6 sub-items with reversal SQL
- D: the fake-exclusion + no-fabrication verification design
- E: confirmation: in-scope of existing T&Cs/Privacy (no consent/T&C change needed); no partner-channel work; no Phase B; single sources not rewritten (or escalated); brand-free/no-secrets
- F: any surface where "serving the real builder" would require fabricating or inferring → flag, do NOT do it; report as a product gap for Thomas, not an auto-fix
- G: any other finding/surprise (flag, don't fix)
- H: precise numbered Phase 2 change list, each individually approvable; sub-items (b) and (c) explicitly marked as needing their own explicit approval, not bundled into the safe additive set

STOP. One-paragraph summary. Await explicit Section H approval.

---

## 5. PHASE 2 — Execution (only after Thomas approves Section H)

Execute approved Section H — the safe additive rendering/wiring fixes by default; any (b) single-source or (c) production-data sub-item ONLY if explicitly separately approved in the Section H sign-off.

### 5.1 Verification (before commit)
- Real builders now fully served: spot-check several real `/u/<builder>` — Person JSON-LD complete (identifier present, real fields surfaced), receipts rendering where real data exists and hidden where not, Atlas linkage rendered where genuine.
- **No fabrication:** every newly-surfaced receipt/role/field on every checked profile traces to genuine builder data. Zero invented content. (This is the load-bearing check — the anti-Tier-0-badge property.)
- **Fakes still excluded:** the 3 fakes + unpublished non-rendered everywhere; MCP get-builder no-oracle still byte-identical (fake == nonexistent); feed/profile gates still exclude fakes.
- Single sources byte-unchanged (`person.ts` etc. git diff = 0) unless an approved (b) escalation, in which case its byte-identical-output proof is shown.
- Any approved (c) production-data correction: applied exactly as approved, reversal SQL in the commit, only the approved rows touched.
- `tsc`/`build` clean; `verify-agent-card.ts` + Beacon 5 verify still green; prior-tier prod regressions intact.
- `git status`: only the intended files; no out-of-scope source touched.

### 5.2 Commit + push
Commit message documents: the real cohort served, the per-surface fixes (additive/rendering), explicit confirmation NOTHING fabricated (every surfaced datum is genuine), fakes still excluded + no-oracle intact, single sources unchanged (or the approved escalation + proof), any production-data sub-item + its reversal SQL, in-scope-of-existing-T&Cs (no consent/T&C change), brand-free/no-secrets, `git revert` reverses. Push, poll prod, re-verify on prod (real builders served, fakes excluded, no-oracle holds), report.

---

## 6. Escalate if
- Serving a real builder "fully" would require fabricating or inferring data (receipts they didn't earn, roles they didn't claim) — do NOT; report as a product gap for Thomas to decide, not an auto-fill
- A fix requires modifying a single-source builder (`person.ts` etc.) — §6, propose + require byte-identical-output proof, don't auto-rewrite
- A fix requires correcting production data for a real builder — §6 sub-item, exact reversal SQL, explicit separate approval, not bundled
- Any change risks the fake-exclusion / no-oracle property — stop, that property is absolute
- The real-cohort definition is ambiguous from the data — report the ambiguity, don't guess the set
- Anything tempts touching the partner-channel/Noah path or a T&C change — out of scope here, separate task

---

## 7. After Step 3 ships
The real builders are fully served by the infrastructure built for them — maximally findable, honestly represented, exactly the service they signed up for. Then:
- **Separate task:** the T&C/Privacy delta for the partner-discovery channel (the parked Noah question — needs the §4 "no other third parties" line corrected, accurate partner-access language, and the user-notification both docs require; chat-Claude drafts, Thomas/lawyer reviews).
- **Parked, circle back:** the Microsoft/GitHub role-certification → candidate input for Atlas v0.5.
- **Phase B (separate, no urgency):** thomasoxlee198, hire-confirm feature — own cycles, recommend leave.
- **Decoupled, Thomas-only:** publish `@shipstacked/atlas-roles` (deferred — Atlas self-describes as pre-stable with v0.5 coming; publish at v0.5, not now).

Additive, in-scope, honest. The infrastructure finally serves the people it was built for. The protocol holds.

---

*End of Step 3 spec.*
