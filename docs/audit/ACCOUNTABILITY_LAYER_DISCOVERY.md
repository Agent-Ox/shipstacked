# ShipStacked → The Accountable-Human Layer of the Agentic Economy

**Strategic case, repositioning, Phase-1 discovery, and 90-day wedge — sequenced.**

Author: prepared for Thomas Oxlee
Date: 2026-05-18
Status: Phase 1 — Discovery (read-only). No code mutation. Per `AGENTS.md` §"discovery-first protocol", Section H is the change list requiring explicit human approval before any Phase 2.
Reversal path: this document is additive (a new `docs/audit/` file). Deleting it is full reversal. No DDL, no code, no git claims made here.

---

## How to read this

Four parts, each load-bearing for the next. If Part 1 (the money) doesn't hold, Parts 2–4 are moot — that ordering is deliberate and is the one you asked for.

1. **The money math** — who pays, for what unit, against which existing budget line, and why the exit is structural rather than hoped-for.
2. **The repositioning** — what ShipStacked *is* once the target is corrected, and the one-sentence claim the whole site is rebuilt to prove.
3. **The discovery doc** — what in the existing codebase is reused, repointed, or retired, with code citations, as a numbered Phase-2 change list (Section H).
4. **The 90-day wedge** — the smallest shippable thing that earns the right to the rest, with a kill-condition.

A standing caveat that governs all four: the thesis is only true **where a regulator or an insurer makes independent accountability mandatory**. Everywhere else it is a slower evangelism play. The whole document points at the place where the requirement already exists, because that is the only place the four boxes (needed / useful / profitable / buyable) are ticked by the *same* answer.

> **Timeline fact (verified 2026-05-18, supersedes any earlier "August 2026" framing).** The EU AI Act Digital Omnibus reached provisional political agreement on 7 May 2026. Standalone Annex III high-risk obligations now apply **2 December 2027** (not 2 August 2026); Annex I embedded systems apply **2 August 2028**. What still bites in 2026: Article 50(2) synthetic-content/watermarking transparency on **2 December 2026**, and deployer transparency obligations on **2 August 2026**. Practical consequence for this document: the **regulator** is the *scale-by-Dec-2027 horizon*, not a 2026 panic. The **live 2026 forcing function is the liability/insurance/customer-contract lever** — E&O exposure, GDPR enforcement already active, and product-liability/civil-claim exposure that exists today regardless of the AI Act date. Any shipped copy (H1 onward) that asserts an August-2026 high-risk deadline is factually wrong and must not ship.

---

# PART 1 — THE MONEY MATH

The thesis lives or dies on one question: **is what we'd charge for a line item the buyer already has budget for, or a budget category we'd have to invent?** If it maps to an existing line, this is a company. If it requires creating a new budget, it's a multi-year slog regardless of how real the gap is.

## 1.1 The buyer and their existing budget line

The launch buyer is **the regulated operator who is already required to produce an audit trail for AI-assisted decisions** — the role your own Atlas already names **C1, "AI Audit & Conformity Lead"**, defined in `src/content/atlas-v05.md:345` as the person who must *"build the documentation, audit trails, evaluation records, model cards, data lineage, and human-in-the-loop guarantees required for compliance with EU AI Act, NYC Local Law 144, Colorado AI Act, … SOC 2 controls for AI."*

That budget line **already exists** under three names the buyer already pays into:

- **External audit / assurance** — the line that pays a Big Four or a notified body for a conformity assessment. Independent attestation is *the* deliverable; it cannot, by definition, be self-produced. This is the cleanest fit: independence is not a feature we're selling, it's a regulatory requirement the buyer is already funding. **(Horizon line — matures toward the Dec 2027 mandate; not the 2026 wedge.)**
- **E&O / professional-indemnity insurance + customer-contract assurance** — **the live 2026 lever.** Insurers underwriting agent-assisted professional work, and enterprise customers demanding proof before they sign, both create a *today* requirement for an accountable human of record with a verifiable track record. This bites now, independent of the AI Act date, and is where the 90-day wedge points.
- **Compliance tooling / GRC** — the line that already pays for SOC 2 evidence collection, policy management, control monitoring. Agent-output accountability is a net-new control surface inside a budget that already exists and is growing because of the AI Act.
- **E&O / professional-indemnity insurance** — the line that pays the premium. Insurers underwriting agent-assisted professional work will price (or refuse) risk on whether an accountable human of record with a verifiable track record signed off. This is the lever that converts "nice to have" into "required to be covered."

**Conclusion of 1.1:** the product attaches to an existing, regulation-inflated budget line. It does not require inventing a budget category. This is the single most important finding in the document and it is the green light. (It is also falsifiable — see the kill-condition in Part 4. If the first five discovery conversations reveal the buyer would have to create a new budget, the thesis is wrong and we stop.)

## 1.2 The unit of sale

The atomic primitive already exists in your schema. `src/schemas/proof-receipt-v0.1.ts:8` states the constitutional constraint verbatim: *"Every monetizable interaction must strengthen the graph."* The unit is the **attested accountability receipt**: a signed, append-only record that *this human, with this verifiable track record, is the accountable party for this agent-produced output, at this verification level.*

The verification ladder is already built (`proof-receipt-v0.1.ts:73–80`):

- `L0_claimed` → free, drives graph growth
- `L1_artifact_confirmed` → free, automated
- `L2_technically_checked` → low-cost automated
- `L3_externally_attested` → **the paid tier** — a named accountable human signs, with their receipt history attached
- `L4_cryptographically_signed` → **the enterprise/regulated tier** — DID/VC, portable across rails, audit-grade

The free ladder (L0–L2) is the graph-growth engine and the top-of-funnel. The money is L3 and L4: the levels where independence and a verifiable history are the product. Pricing model is **per-attestation or per-seat-of-accountable-human**, not per-profile and not a flat $199 directory subscription. The current $199/mo employer model is monetizing the wrong primitive (browsing) instead of the constitutional one (attestation that strengthens the graph).

## 1.3 Why the exit is structural, not hoped-for

You asked specifically about buyout. The exit logic is not "build something good and hope." It is forced by one property the market itself defines:

A verification layer locked to a single payment network recreates exactly the fragmentation the networks are trying to escape — the cross-rail-neutrality argument is being made *by the rail ecosystem itself* in primary sources (the "must work across all of them, like HTTPS works across all web servers" framing). And a payment rail **cannot credibly certify the accountability of its own agents** — that is a structural conflict of interest, the auditor-auditing-itself problem.

Therefore the layer that can exist is the *independent, cross-rail* one — and the only natural owners of a proven independent accountability layer at scale are (a) a payment rail that needs the neutral layer it structurally cannot build itself, or (b) a Big Four / assurance incumbent that needs the agent-native accountability product it has no engineering DNA to build. Both are acquirers, not competitors, *if and only if* the layer has reached credible scale with reference customers inside a regulatory moat first.

The asset that makes this *yours* specifically: a strategic acquirer pays a premium for "a regulatory moat with reference customers already inside it." Your embedded position inside a regulated EU practice with live AI Act exposure is the seed of exactly that first reference customer — an asset most founders chasing this would spend two years buying. It is only an asset if the product is shaped to use it, which is Part 2.

**The honest risk, stated once and not softened:** this is a speed play, not a perfect-product play. The defense is neutrality; neutrality is only a moat at scale; therefore you must reach credible scale before a rail ships a "good enough" first-party version. Your build velocity and embedded signal fit a speed play. If they didn't, I'd be advising caution instead.

---

# PART 2 — THE REPOSITIONING

## 2.1 The one sentence the whole site must prove

> **ShipStacked is the independent accountability layer of the agentic economy: the verifiable record of which human is answerable for an agent's work — and whether they have been right before.**

This is a *refinement inside your locked frame, not a departure from it.* "Labor layer of the agentic economy" still holds. The correction is to *which part of the labor layer is actually open*:

- Discovery of builder-humans → **closed** (incumbent automated it; the role-naming game is being run by larger players).
- Identity of agents → **closed** (a settled standards land-grab among well-funded incumbents).
- Payment by agents → **closed** (multiple funded protocols already shipping at volume).
- **Accountability for the human answerable for agent output → open.** Every payment protocol's own documentation names this as the unsolved "crisis of trust" limiting adoption, and explicitly scopes human identity *out* ("human identity is for KYC providers"). Nobody credible owns the human-of-record-with-a-track-record layer.

## 2.2 What the product becomes (not a rebuild — a repointing)

| Existing asset | Was aimed at | Repointed to |
|---|---|---|
| Proof receipt schema (`schemas/proof-receipt-v0.1.ts`) | "portfolio of impressive builds" | **the accountability ledger** — atomic attested records of who is answerable |
| Verification ladder L0–L4 | "verified badge for recruiters" | **the trust-grade of an accountability claim**; L3/L4 are the paid, audit-grade tiers |
| `entities` table, kind `human\|operator\|fleet\|agent`, `owner_user_id` (`lib/entities.ts:22`) | "user accounts" | **the human-of-record primitive** — the accountable party an agent's work traces back to |
| Atlas C1 / C4 roles, EU AI Act Annex III + ISO 42001 mappings (`atlas-v05.md:341–391`) | "28 roles for builders" | **the controlled vocabulary of accountable agent-work roles** the layer references |
| Content negotiation / JSON-LD / receipt JSON-LD (`lib/receipts/jsonld.ts`, `middleware.ts`) | "be a machine-readable beacon" | **the portable, cross-rail attestation format** an auditor or insurer can verify |
| `OutcomeKind.compliance` (already in schema) | unused enum value | **first-class outcome type** for the regulated wedge |
| `/hire` "tell me what's broken, I diagnose in 24h" | concierge placement | **the design-partner intake** for the regulated buyer (your embedded signal, productized slowly) |

The engine is correct. It was aimed at "impress a recruiter" when its own schema says "every monetizable interaction must strengthen the graph" and already ships an `L4_cryptographically_signed` DID/VC tier and a `compliance` outcome kind. You built an accountability ledger and labelled it a portfolio.

## 2.3 What is retired or demoted

Per `AGENTS.md` invariant #6 (*additive, never subtractive, on existing user-facing surfaces*), nothing live is deleted in Phase 2. But the *narrative spine* changes: the $199 browse-the-directory subscription is demoted from primary conversion to a legacy surface; the homepage stops selling "proof-of-work LinkedIn"; the Atlas stops being "28 roles for vibe coders" and becomes the accountable-role vocabulary. These are copy/positioning and routing changes, not deletions, and they are enumerated in Section H.

---

# PART 3 — DISCOVERY DOC (Phase 1, read-only)

This section follows the `AGENTS.md` discovery-first protocol: it enumerates the relevant code, sources each invariant the change touches, and drafts the change list as numbered Phase-2 items that **STOP for human review**. No code is mutated by this document.

## 3.1 Invariants this repositioning touches (and must not break)

- **#3 Brand-free** — the regulated practice is never named anywhere, per your standing rule and the userMemory constraint. Compliance/AI-Act framing is generic; the design-partner relationship is internal context only, never shipped copy.
- **#5 One-source-of-truth markup builders** — the attestation/accountability JSON-LD must derive from one writer, not be re-implemented per surface. Candidate home: extend `lib/receipts/jsonld.ts`, do not fork it.
- **#6 Additive, never subtractive** — repositioning is copy + routing + new surfaces. Existing routes (`/feed`, `/talent`, `/u/[username]`, `/atlas`) stay live; new accountability surfaces render empty-hidden until populated.
- **#2 Published-gate** — any new public accountability surface that lists humans inherits the `profiles.published = true` gate. Non-negotiable.
- **#8 verify-agent-card accuracy guarantee** — if an accountability endpoint ships, it must be added to AgentCard `skills[]` and the verify script must stay green against prod.
- **Atlas-version coherence** — the v0.4/v0.5 mismatch flagged earlier (`atlas/page.tsx` loads `atlas-v05.md`, but `ATLAS_VERSION='v0.4'` is hardcoded at `atlas/page.tsx:577`, `ATLAS_VERSION_DEFAULT='v0.4'` in `lib/atlas/roles.ts:13` and `schemas/proof-receipt-v0.1.ts:47`). This is a pre-existing defect, not introduced here, but it sits on the exact surface (the Atlas as accountable-role vocabulary) the repositioning makes load-bearing. It must be resolved as item H0 before the Atlas can be cited as a stable controlled vocabulary. Touching it brushes the Atlas-version invariant — handle via the existing `ATLAS_VERSION_RENAME` discovery/spec pair already in `docs/`, do not freelance it.

## 3.2 SECTION H — the numbered Phase-2 change list (REQUIRES EXPLICIT APPROVAL, ITEM BY ITEM)

Nothing below is executed until you approve it. Items are ordered by risk, lowest first, so the cheap reversible ones can land before the strategic ones.

- **H0 — Resolve the Atlas v0.4/v0.5 incoherence.** Reconcile content version, hero string, JSON-LD `alternativeHeadline`, page `DESCRIPTION`, the hardcoded `ATLAS_VERSION` at `atlas/page.tsx:577`, `ATLAS_VERSION_DEFAULT`, and the receipt-schema `AtlasVersion` enum, via the existing `ATLAS_VERSION_RENAME` spec/discovery pair. Pure defect fix; reversible by `git revert`. Gate for everything that cites the Atlas as a stable vocabulary. *Risk: low. No strategy dependency.*

- **H1 — Repositioning copy, homepage.** Replace the "proof-of-work platform / hiring platform" hero and manifesto with the Part 2.1 sentence and its support. Demote (do not delete) the $199 employer block to a secondary surface. Copy-only; reversible. *Risk: low-medium. Strategy-dependent — gated on your sign-off of Part 2.1's exact wording, reviewed word-for-word per protocol.*

- **H2 — Single accountability JSON-LD writer.** Extend (not fork) `lib/receipts/jsonld.ts` to emit an `AccountabilityAttestation` shape deriving from the existing receipt read path. One writer, per invariant #5. *Risk: medium. Additive.*

- **H3 — L3/L4 paid attestation surface.** The first monetizable surface: a flow where an accountable human signs an attestation against a receipt, their L-grade and receipt history attached. Reuses the verification ladder verbatim; adds a sign + pay step. *Risk: medium-high. Additive; new route renders empty-hidden until used.*

- **H4 — Atlas as accountable-role vocabulary.** Reframe the Atlas surface copy (not the taxonomy data) so C-cluster roles read as accountable-agent-work roles; surface the existing EU AI Act / ISO 42001 mappings as the spine rather than a footnote. *Risk: medium. Copy + emphasis, not data change. Gated on H0.*

- **H5 — AgentCard + verify-script update.** If H3 ships a public endpoint, add it to `lib/agent-card/builder.ts` `skills[]` and confirm `scripts/v2/verify-agent-card.ts` stays green against prod per invariant #8. *Risk: medium. Mechanically gated by the existing verify script.*

- **H6 — Demote/retire the directory narrative.** Routing + nav changes so the accountability layer is the spine and the directory is legacy. Additive per invariant #6 (no route deletion); nav logic in `app/components/NavBar.tsx` already branches by audience, so this is a branch edit, not a rebuild. *Risk: medium. Reversible.*

**Each H-item gets its own discovery sub-pass before its own Phase 2.** This document approves the *direction*; it does not authorize execution of any H-item. That is the next gate.

## 3.3 What this document deliberately does NOT claim

Per the `AGENTS.md` drift caveat, stated honestly:

- It makes **no git claims** — git state was not readable from the working copy and per your standing instruction nothing is declared committed.
- It does **not** assume the structure of any external party's build, per the userMemory constraint.
- It does **not** name the regulated practice, per invariant #3 and your standing rule.
- Market facts in Part 1 are reconstructed from current research and are directionally load-bearing but require the same line-by-line verification standard you apply to external briefs before any of this is used with a third party.

---

# PART 4 — THE 90-DAY WEDGE

The smallest shippable thing that earns the right to everything above. Not the platform. One sharp wedge.

## 4.1 The wedge

**A single accountable-attestation receipt for one regulated workflow, signed by one accountable human, verifiable by one external party (an auditor or an insurer), portable as cryptographic JSON-LD.**

Concretely: take *one* real AI-assisted decision flow in a regulated context (the kind your embedded position gives you ground-truth on, never named), and produce the end-to-end artifact — receipt → L3 human attestation → L4 signed, verifiable credential → an auditor/insurer can independently verify it without trusting the agent or us. One flow, one buyer-type, one verifier.

## 4.2 Why this wedge and not the platform

It tests the only thing that matters before scaling: **will an external verifier (auditor or insurer) treat the attestation as reducing their risk enough to change a price or a sign-off?** That single yes/no is the entire thesis. Everything else — directory, marketplace, cross-rail portability — is expansion you earn *after* one verifier says yes. Building the platform before that yes is the classic infrastructure death.

It also uses, not rebuilds: the receipt schema, the L0–L4 ladder, the `entities` human-of-record, the JSON-LD path, and `OutcomeKind.compliance` all already exist. The wedge is mostly *wiring existing primitives into one regulated flow plus a sign+verify step*, which fits your build velocity.

## 4.3 90-day shape (not a Gantt chart — three gates)

- **Gate 1 (≈ day 30): the artifact exists.** One flow produces a real L4 signed accountability receipt, independently verifiable. Internal proof only. Reuses existing schema/ladder; new work is the sign+verify step (H2 + a minimal H3).
- **Gate 2 (≈ day 60): an external verifier reacts.** Put the artifact in front of an actual auditor or insurer (your embedded position is the channel; the practice is never named in any output). The question is binary: *does this change how you price or sign off this risk?*
- **Gate 3 (≈ day 90): one paid attestation, or a documented no.** Either one accountable human pays for one L3/L4 attestation against a real flow, or we have a precise, sourced reason the verifier didn't bite.

## 4.4 The kill-condition (stated up front, on purpose)

**If by Gate 2 no external verifier will say the attestation changes a price or a sign-off, the thesis is falsified and we stop — regardless of how compelling the market narrative remains.** The whole edifice rests on independent accountability being *consequential to someone who pays for risk*. If it is not consequential, it is not a business, only an essay. Naming this now is the difference between a 90-day test and a two-year sunk cost.

---

## One-paragraph summary

ShipStacked's engine — atomic proof receipts, an L0–L4 verification ladder ending in cryptographic credentials, a human-of-record entity primitive, EU-AI-Act-mapped role vocabulary, machine-readable JSON-LD — was built correctly and aimed wrongly. The open, urgent, fundable, structurally-buyable gap is the **independent accountable-human layer for agent work**, where a regulator or insurer already makes independent attestation mandatory and a budget line already exists to pay for it. The move is a repointing, not a rebuild; the proof is one 90-day wedge with a hard kill-condition; the exit is structural because the layer must be cross-rail-neutral and the only owners of a neutral layer at scale are the rails and assurance incumbents that structurally cannot build it themselves. Your embedded regulated-practice position is the unfair seed of the first reference customer — the asset that makes this yours and not just anyone's.

---

# PART 5 — H1 COPY SPEC (verbatim, for the executor)

This section is the concrete copy direction for H1. It is the strategist's call, validated by Thomas word-for-word before any Phase 2. Claude Code: treat the strings below as the proposed copy; your Phase 1 job is to locate exactly where in `src/app/page.tsx` each currently-live string lives, produce the change list mapping old→new, and confirm the $199 block is *demoted in page order, not deleted* (invariant #6). Do not invent copy beyond what is here; if a surface needs words not specified here, flag it.

## 5.1 Hero (replaces the current "You shipped something incredible / Nobody important saw it" block)

Eyebrow: `The accountability layer for agent work`

H1: `An agent did the work. Who's answerable for it?`

Subhead: `ShipStacked is the independent record of which human stands behind an agent's output — and whether they've been right before. Verifiable. Portable. Built for the work that carries real consequences.`

Primary CTA: `See how accountability works →` (→ links to the existing How/explainer section, not /join)

Secondary CTA (unchanged target): `Read the API docs →` (→ /api-docs)

Hero note (replaces "Join the founding cohort…"): `For operators shipping agent work where being wrong has a cost.`

## 5.2 Manifesto (replaces "The hiring world just broke")

Heading: `Agents do the work now. The accountability didn't follow.`

Body para 1: `Identity for the agent exists. Payment for the agent exists. Discovery for the agent exists. The one unanswered question is the one that matters when money moves or a decision lands: which human is accountable for what the agent produced — and is there any verifiable reason to trust them?`

Body para 2 (bold lead): `**Every agent-payment protocol's own documentation names this as the unsolved problem.** They verify the agent. They explicitly leave the human out of scope. That gap is where the risk concentrates — and where ShipStacked sits.`

Body para 3: `Not a directory. Not a hiring platform. An independent, portable record: this human is answerable for this agent's work, at this verified level, with this track record behind them. The kind of proof an auditor or an insurer can check without taking anyone's word for it.`

Closing line (bold): `**The work that carries consequences needs a name attached to it. ShipStacked is where that name is verifiable.**`

## 5.3 The $199 block — DEMOTE, do not delete (invariant #6)

Current state: the $199/mo employer-browse block is a primary conversion surface high on the page. H1 demotes it: it moves *below* the new accountability explanation and the proof/how-it-works section, and its framing changes from "browse verified builders" to a secondary line. New heading for the demoted block: `Hiring for agent-native work?` Keep the existing $199 mechanic and link entirely intact — only its position in page order and its heading change. It must still render and still function. Nothing about the Stripe path, the checkout, or the route changes — this is copy + DOM order only.

## 5.4 Hard constraints on H1 copy

- No occurrence of "August 2026", "August 2, 2026", or any high-risk regulatory deadline. The Timeline fact block at the top of this document governs. If urgency is implied, it is liability/insurance/consequence-driven, never a regulator-date countdown.
- Brand-free (invariant #3): the regulated practice is never named or alluded to specifically.
- Additive/non-destructive (invariant #6): no live section deleted, no route moved, no URL changed. The agent-flow section, build-feed preview, founder story, final CTA all remain; H1 changes the hero, the manifesto, and the $199 block's position+heading only. Anything beyond that scope is flagged, not absorbed.
- One homepage is the H1 scope. /atlas, /talent, /feed copy are later H-items, untouched here.

---

# PART 6 — H2 SPEC: ACCOUNTABILITY FIELDS IN THE RECEIPT JSON-LD WRITER

This is the concrete spec for H2. Strategist's call; Thomas approves the shape before any Phase 2. The executor's Phase 1 job is to confirm this against live code, produce a numbered change list, and flag any conflict — same protocol as H0/H1.

## 6.1 The actual finding (corrects the briefing's framing of H2)

The briefing called H2 "build a single accountability JSON-LD writer." That is wrong in a useful way. The writer already exists (`src/lib/receipts/jsonld.ts`, `receiptJsonLd()`), and per invariant #5 it is the one-source-of-truth writer for the receipt machine surface — it must be **extended, never forked**.

The real defect: `getReceiptBundle()` (`src/lib/receipts/render.ts`) already fetches `bundle.attestations` (`AttestationRow`: `attestor_role`, `statement`, `signed_at`) and `bundle.verification_events` (`VerificationEventRow`: `level`, `method`, `achieved_at`, `evidence`). `receiptJsonLd()` consumes `bundle.receipt` and `bundle.subject` only — it **silently drops both attestations and verification_events**. The accountability spine (who is answerable, at what verified level, with what evidence trail) is read into memory and then never reaches the machine-readable output. An auditor or insurer fetching the receipt JSON-LD today cannot see the attestation chain because it is dropped one function before serialization.

H2 = stop dropping it. Extend the single writer to emit the data the bundle already carries.

## 6.2 Shape to add (additive only — no existing field changes)

Extend `ProofReceiptJsonLd` and `receiptJsonLd()` with two new top-level keys, both in the existing `shipstacked:` namespace, both arrays, both empty-omitted (if the bundle has none, the key is absent — never `null`, never `[]` rendered as noise; this preserves byte-equivalence for receipts that have no attestations yet, which matters for the regression proof):

1. `shipstacked:attestations` — one entry per `AttestationRow`:
   - `'@type': 'shipstacked:Attestation'`
   - `'shipstacked:attestorRole'`: `attestor_role` (string, verbatim)
   - `'shipstacked:statement'`: `statement` (string, verbatim)
   - `'shipstacked:signedAt'`: `signed_at` (ISO string, verbatim)

2. `shipstacked:verificationTrail` — one entry per `VerificationEventRow`, ordered as fetched (append-only ladder order is the trust signal — do not reorder):
   - `'@type': 'shipstacked:VerificationEvent'`
   - `'shipstacked:level'`: `level`
   - `'shipstacked:method'`: `method`
   - `'shipstacked:achievedAt'`: `achieved_at`
   - `'shipstacked:evidence'`: `evidence` (the `Record<string,unknown>` emitted as-is; it is already a JSON object)

No change to `@context`, `@type`, or any existing key. The existing `shipstacked:verificationLevel` (the current top-line level) stays exactly as-is — `verificationTrail` is the *history behind* that level, not a replacement. Both coexist.

## 6.3 Hard constraints

- Invariant #5: extend `receiptJsonLd()` in place. Do not create a second writer, do not add a parallel module. The `ProofReceiptJsonLd` interface and the function are edited together in `src/lib/receipts/jsonld.ts`.
- Invariant #6 / regression: a receipt with zero attestations and zero verification_events must serialize **byte-identical** to its pre-H2 output (keys omitted when empty). This is the regression gate — the executor proves it the H0 way: pick/construct a no-attestation receipt, capture `/p/[slug]` JSON-LD pre vs post, normalize, prove SHA-identical. Receipts *with* attestations are expected to differ (that is the point); prove those by asserting the new keys are present and correctly shaped, not by byte-equivalence.
- No schema change, no DDL, no migration. This is serialization-only over data the bundle already returns. `schema_version` does NOT bump — the receipt schema is unchanged; only the JSON-LD projection grows. (If the executor finds a reason this needs a `schema_version` bump, that is a flag-and-stop, not a unilateral call — same rule as H0.)
- No route, env, Stripe, DNS, Supabase change. Pure projection logic in one file.
- The `evidence` object may contain arbitrary keys. Do NOT filter, rename, or "clean" it — emit verbatim. If it could contain a brand name or the regulated practice (invariant #3), that is a data-hygiene concern for the wedge's input, NOT something the serializer silently mutates. Flag it as a wedge-input rule; the writer stays faithful to its input.

## 6.4 Why this is the gate before the wedge

The wedge produces one real attestation that an external verifier (auditor/insurer) must independently check. "Independently check" means: fetch the receipt's machine-readable form and see the attestation chain without trusting ShipStacked's UI. Until H2 ships, that chain is dropped before serialization — the wedge's verifier would have nothing machine-readable to verify. H2 is the minimum that makes the wedge's core claim ("an auditor can verify this without taking anyone's word") physically true rather than aspirational.

## 6.5 Phase 2 verification gates

- `npx tsc --noEmit` clean (interface + function edited together; type-coherent).
- `npm run build` clean (route gate).
- Empty-case byte-equivalence: a no-attestation receipt's `/p/[slug]` JSON-LD SHA-identical pre/post (redact any per-request nonce per the H0 durable pattern; clear `.next` between captures per the H0 durable pattern).
- Populated-case shape assertion: a receipt with ≥1 attestation and ≥1 verification_event emits `shipstacked:attestations` and `shipstacked:verificationTrail` with the exact key shape in §6.2, in fetch order, evidence verbatim.
- Grep proof: no brand/August-2026 tokens introduced by the writer itself (the writer adds structure, not copy — this should be trivially clean).
- Reversal: pure code, `git revert <sha>` full reversal.
