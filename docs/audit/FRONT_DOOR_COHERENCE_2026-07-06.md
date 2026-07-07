# Front-Door Coherence Audit — identity cards / pillars / Full-Access framing (2026-07-06)

READ-ONLY. Maps every surface that presents the identity cards / "pillars" / Full-Access
framing, to align them all on the post-D2b-2 model.

## SOURCE OF TRUTH (from `/join`, post-D2b-2)
**THREE free identities** — Builder / Team / Agent — plus a **"Company hiring" entry** (Card 4:
"I'm hiring AI talent" → creates a company org). **Full Access ($199/mo) is the ADD-ON** any
account adds — NOT a fourth identity/pillar/species.

## THE HEADLINE INCOHERENCE
The **homepage still renders a literal 4-pillar grid** (`page.tsx:102-130`) with **"Full Access"
as the 4th peer card**, styled identically to Builder/Team/Agent. That directly contradicts the
model: it presents the capability as a fourth species and omits the company-hiring identity
entry. `/join` and `/pricing` already frame Full Access correctly (an add-on); the homepage,
plus "four customer types / four-pillar" language in `/faq` + `/how-it-works` metas, lag behind.

---

## 1. Homepage — `src/app/page.tsx`

### 1a. Hero (`:84-90`) — ALIGNED
- **`:85`** > `ShipStacked is the machine-readable registry for AI-native work. Builders, teams, and agents post real artifacts. Companies (and their agents) find talent by verified capability — not claims or titles.`
- Names the 3 identities + "Companies … find talent." Coherent.

### 1b. "FOUR PILLARS" grid (`:102-130`) — ⛔ NOT ALIGNED (primary fix)
Section comment **`:102`** > `{/* 3 ── FOUR PILLARS ── */}`; CSS **`:43`** > `.pillars { display: grid; grid-template-columns: repeat(4, 1fr); … }`; file comment **`:4`** > `// Phase 8 §B — homepage v3 (four-pillar architecture).`
Four peer `<Link className="pillar">` cards:
- **`:107-109`** — `<h3>Builder</h3>` / `<p>Solo practitioners shipping AI-native work.</p>` / `<span class="price">Free forever</span>`
- **`:113-115`** — `<h3>Team</h3>` / `<p>Agencies, studios, and small teams. Collective proof.</p>` / `Free forever`
- **`:119-121`** — `<h3>Agent</h3>` / `<p>Autonomous agents acting for their principal. A discoverable profile plus full API access.</p>` / `Free + programmatic`
- **`:125-127`** — `<h3>Full Access</h3>` / `<p>Search and contact verified builders, teams, and agents by Atlas-keyed capability.</p>` / `<span class="price">$199/month · add to any account · cancel anytime</span>`

**Mismatches:** (a) "Full Access" is the **4th peer pillar** (same card, same grid slot, `var(--hiring)` accent) — should be an add-on, not a species. (b) **No "Company hiring" identity card** — the model's 4th entry (a company that hires) is absent; the slot is occupied by the capability instead. (c) Card titles are **short** ("Builder"/"Team"/"Agent") vs `/join`'s longer names.

### 1c. "Ready to move?" CTA strip (`:167-183`) — PARTIAL
- **`:170-172`** > `<h3>Ship as Builder or Team</h3>` / `Post work. Get classified. Get discovered.` / `Create free profile →`
- **`:175-177`** > `<h3>Add Full Access</h3>` / `Search + contact by real capability across the entire network.` / `<Link href="/join">Get Full Access →</Link> <span class="note">$199/month</span>`
- **`:180-182`** > `<h3>Build or Extend Agents</h3>` / `Give your agent the key. …` / `Agent auth flow →`
- Full Access is framed as **"Add Full Access"** (add-on ✓), but Builder+Team are fused into one column, Agent is separate, and there's **no company-hiring CTA**. Uneven grouping vs the model.

---

## 2. `/join` — `src/app/join/page.tsx` (SOURCE OF TRUTH) — ALIGNED (definitional)
Heading **`:422`** > `What brings you to ShipStacked?` · sub **`:425`** > `Pick what fits. You can change anytime.` · wedge **`:427-429`** > `Every builder, team, and agent here shows verified proof of work — real shipped projects, ranked. Not demos, not claims.`
Cards:
- **`:439`** — `Solo AI Builder` / (`:437` quote) `"I ship AI work. …"` / `Free supply profile. Optional Full Access later.`
- **`:453`** — `Team / Agency / Studio` / `"We deliver AI implementation for clients. …"` / `Show what your team has shipped. …`
- **`:467`** — `Autonomous Agent` (dark gradient) / `"I'm an AI agent operating on behalf of my principal."` / `API-keyed agent identity. …`
- **`:478-480`** — `I'm hiring AI talent` / `"I run a company and need to find and hire verified AI builders, teams, or agents."` / `Create a company profile, then add Full Access to search and contact the network.`
Add-on note **`:487-489`** > `Full Access ($199/mo) unlocks search and direct contact — add it to any account, anytime. Cancel whenever.`

**This is the model:** 3 free identities + a company-hiring entry, Full Access as the add-on.

---

## 3. `/hirers` — `src/app/hirers/page.tsx` — ALIGNED
Not an identity grid — it's the hiring destination. Hero eyebrow **`:161-163`** > `For founders and hiring teams`; **`:165-167`** > `The builders you need are already here.`; **`:169-171`** sub lists proof-of-work value; CTA **`:186`** > `Get full access — $199/mo`. Pricing card (D2a) frames it as **Full Access · $199** (`:344-351`). Consistent with Full-Access-as-capability.

---

## 4. `/pricing` — `src/app/pricing/page.tsx` — ✅ ALIGNED (model done right)
Two cards, NOT four:
- **`:38-39`** — `<h2>Free forever</h2>` / `For builders, teams, and registered agents.` (the 3 identities, one free tier)
- **`:58-61`** — eyebrow `Add to any account` / `<h2>Full Access</h2>` / `$199/month` / `Add to any account. Cancel anytime.`
- **`:70`** — `— A separate profile (your existing Builder/Team/Agent profile stays as-is)` — explicitly states Full Access is NOT a separate identity. 
- **`:64`** — feature `Cross-pillar discovery (one search, all three customer types)` — "all three customer types" = the 3 identities as searchable subjects.
This is exactly the target framing (3 free identities + add-on). Use as the second reference alongside `/join`.

---

## 5. `/how-it-works` — `src/app/how-it-works/page.tsx` — PARTIAL
- meta **`:6`** > `… The mechanics behind the four-pillar proof-of-work registry.` ⛔ "four-pillar"
- **`:32`** > `Here's what that looks like for each of the four customer types.` ⛔ "four customer types"
- 4 sections: **`:35`** `For builders`, **`:44`** `For teams`, **`:52`** `For agents`, **`:67`** `For buyers`.
- Buyer section **`:68`** > `You sign up free at /join Card 4 if you only want to hire. If you already have a Builder, Team, or Agent account, you toggle Full Access on from your dashboard — same effect, $199 a month, cancel anytime.` — this body is **coherent** (Full Access = a toggle/add-on), but the umbrella **"four customer types"** framing presents buyers as a 4th peer species.

---

## 6. `/faq` — `src/app/faq/page.tsx` — MOSTLY ALIGNED (meta lags)
- meta **`:6`** > `Common questions about the proof-of-work registry, four customer types, …` ⛔ "four customer types"
- **`:39`** > `Builders, teams, and agents publish what they've shipped. Buyers find them …` — coherent.
- section **`:47`** > `For builders, teams, and agents`; **`:48`** > `Choose Builder (Card 1), Team (Card 2), or Agent (Card 3).` — lists only the **3 identity cards** for "getting listed" (Card 4 buyer correctly excluded — a buyer isn't "listed"). Coherent.
- section **`:55`** `For buyers`; **`:57`** > `What does Full Access get me?` — Full Access framed as the capability. Coherent.
- Only the **meta description** carries the stale "four customer types."

---

## 7. Other surfaces
- **NavBar** (`src/app/components/NavBar.tsx:52-58`, unauth menu) > `Atlas / How it works / Pricing / Build Feed / Browse talent` — no pillar/identity framing. ALIGNED.
- **FooterBar** (`src/app/components/FooterBar.tsx:60-71`) — nav links incl. `Hire talent` (`:65`, → `/for-hirers`). No pillar framing. ALIGNED.
- No `/about` or other marketing surface lists the identities as pillars (grep for `pillar|four|Builder.*Team.*Agent` found only the surfaces above; remaining `pillar` hits are `dashboard/page.tsx` comments about the internal "pillar-aware dashboard" — not front-door copy).

---

## COHERENCE TABLE

| Surface | 3 identities named as | 4th / Full Access presented as | Aligned w/ /join? |
|---|---|---|---|
| **/join** (`join/page.tsx:439-489`) | Solo AI Builder / Team·Agency·Studio / Autonomous Agent | **Company-hiring entry** ("I'm hiring AI talent") + Full Access **add-on note** | ✅ source of truth |
| **/pricing** (`pricing/page.tsx:38-74`) | "For builders, teams, and registered agents" (one Free tier) | **Full Access · "Add to any account"** (add-on tier) | ✅ yes |
| **Homepage hero** (`page.tsx:85`) | "Builders, teams, and agents" | "Companies … find talent" (prose) | ✅ yes |
| **Homepage FOUR PILLARS** (`page.tsx:102-130`) | Builder / Team / Agent (short titles) | **"Full Access" as 4th PEER PILLAR** (card in a 4-col grid) | ⛔ **NO** — capability-as-pillar; no company entry; title mismatch |
| **Homepage "Ready to move?"** (`page.tsx:167-183`) | "Ship as Builder or Team" (fused) / "Build or Extend Agents" | "Add Full Access" (add-on ✓) | ⚠️ partial — uneven grouping, no company CTA |
| **/how-it-works** (`how-it-works/page.tsx:6,32,67-68`) | For builders / teams / agents | "For buyers" as a **4th "customer type"**; body says Full Access is a toggle ✓ | ⚠️ partial — "four customer types" framing |
| **/faq** (`faq/page.tsx:6,47-48,55-57`) | "For builders, teams, and agents" (Cards 1/2/3) | "For buyers" → Full Access capability | ⚠️ mostly — only meta says "four customer types" |
| **/hirers** (`hirers/page.tsx:161-186`) | (hiring destination, not a grid) | Full Access CTA ($199/mo) | ✅ yes |
| **NavBar** unauth (`NavBar.tsx:52-58`) | (no identity framing) | — | ✅ n/a |
| **FooterBar** (`FooterBar.tsx:60-71`) | (no identity framing) | — | ✅ n/a |

---

## FLAGGED MISMATCHES (grouped)

**A. Full Access framed as a peer pillar/species (not an add-on)**
- `page.tsx:123-127` — the 4th "pillar" card **"Full Access"** in the 4-col grid. THE primary fix.
- (`page.tsx:167-183` strip frames it as "Add Full Access" — already add-on-ish; lower priority.)

**B. 4th card = naked capability vs company-hiring identity entry**
- `page.tsx:125` `<h3>Full Access</h3>` occupies the slot where the model puts a **company-hiring** entry ("I'm hiring AI talent", `join:478`). Homepage has **no company-hiring identity card at all** — it should add one and demote Full Access to an add-on line/badge.

**C. Card-title naming inconsistency (homepage vs /join)**
- Homepage `Builder` / `Team` / `Agent` (`page.tsx:107,113,119`) vs /join `Solo AI Builder` / `Team / Agency / Studio` / `Autonomous Agent` (`join:439,453,467`). Homepage brevity is defensible, but the two front doors should agree on nouns (or at least not contradict).

**D. Surfaces still implying "four" identities/peers**
- `page.tsx:4` comment `four-pillar architecture` · `page.tsx:102` `FOUR PILLARS` · `page.tsx:43` CSS `repeat(4, 1fr)`
- `faq/page.tsx:6` meta `four customer types`
- `how-it-works/page.tsx:6` meta `four-pillar …` · `:32` `each of the four customer types`

---

## RECOMMENDED ALIGNMENT (for a future copy-only stage — NOT done here)
1. **Homepage FOUR PILLARS → THREE identities + a company-hiring entry, Full Access as an add-on line.** Options: (a) 3 identity pillars (Builder/Team/Agent) + a distinct **"Companies hiring"** entry, with Full Access shown as a `+ $199/mo add-on` badge/footnote under the grid (mirroring `/join`'s add-on note); OR (b) keep a 4th card but make it the **company-hiring identity** ("Hiring AI talent") and move the "$199 · add to any account" line into an add-on strip. Rename the grid from "FOUR PILLARS", switch CSS to 3-or-4 identity columns intentionally.
2. **Homepage titles** — align with `/join` (or set a single canonical short set used on both).
3. **"Ready to move?" strip** — split Builder/Team, add a company-hiring CTA, keep "Add Full Access" as the add-on column.
4. **Metas** — `faq:6` and `how-it-works:6,32`: replace "four customer types / four-pillar" with "three identities + hiring" (or "builders, teams, agents — and the companies hiring them").
5. **/pricing and /join stay as the reference** — already correct.

This is a **copy/framing** alignment; none of it touches flow, routing, or the `/api/join/*` logic.

## Method
Read of `page.tsx` (hero/pillars/strip), `join/page.tsx`, `hirers/page.tsx`, `pricing/page.tsx`,
`how-it-works/page.tsx`, `faq/page.tsx`, `NavBar.tsx`, `FooterBar.tsx` + grep over
`pillar|four|Solo AI Builder|Autonomous Agent|add to any account|Builder.*Team.*Agent`.
Read-only — no source mutated.
