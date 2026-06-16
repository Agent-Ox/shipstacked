# ShipStacked — Strategic Briefing for Advisor

**Prepared by:** Thomas Oxlee (founder) with Claude
**Date:** 15 May 2026
**Reading time:** ~25 minutes
**Status:** Strategic regroup in progress. V1 live and operating. V2 shape under debate.

---

## 0. The question I need an advisor's view on

ShipStacked V1 is live, operating, and has a coherent (if narrow) shape. V2 is unresolved. The unresolved part is not a feature list — it is the strategic identity of the company.

**Three concrete unresolved questions, in priority order:**

1. **Pricing identity.** Marketplace ($199/mo hiring seats, today's model) vs. infrastructure (MCP-native protocol play, paid by usage/API/embedded verification) vs. hybrid. This decision determines everything downstream.
2. **TAM scope.** Vibe-coder hiring marketplace (today's homepage), full-Atlas labor-layer claim (Atlas v0.3), or the new framing I am converging on — *MCP-native node at the surface where the maximum number of humans + agents in the agentic economy already operate*.
3. **Build sequence for V2.** Three candidate surfaces (described below). Which combination, in which order, with what 30-day shippable v1.

Everything in this brief is in service of those three decisions.

---

## 1. What ShipStacked V1 is (live, operating, as of May 15 2026)

### 1.1 Positioning (current homepage)

> "The proof-of-work platform for AI-native builders."

Tagline on hero: *"You shipped something incredible last week. Nobody important saw it."*

Sub-positioning: *"ShipStacked is where AI-native builders post their work, prove what they can do, and get found by the people worth working with. No CVs. No guessing. Just proof."*

### 1.2 Live product surface

Routes deployed on Vercel:

- `/` — landing page (builder + hiring team funnel)
- `/atlas` — the practitioner-defined labor map (V2 strategic asset, 11,335 words)
- `/hire` — hiring intake form ("tell me what's broken")
- `/hire/thanks`, `/hire-confirm` — post-intake flows
- `/claim` — role-claim flow (practitioners self-classify into the Atlas taxonomy)
- `/claim/thanks` — post-claim
- `/feed` — the public "Build Feed" (real builds, real outcomes)
- `/jobs` — open roles
- `/leaderboard` — builder ranking
- `/talent` — browse builders (hiring-side entry)
- `/api-docs` — Builder API documentation (agents can fill profiles autonomously)
- `/llms.txt` — machine-readable index
- `/login`, `/join`, `/terms`, `/privacy`

### 1.3 Mechanic — how V1 works today

**Builder side (free):**
1. Sign up (60 seconds, email + password — the one thing the builder's agent cannot do for them)
2. Generate an API key in the dashboard
3. Hand the API key + system prompt to their agent
4. Agent fills profile, posts builds, keeps the Velocity Score current

**Hiring side (paid, $199/mo):**
- Browse verified builders
- Message directly
- No commissions, no placement fees, cancel anytime

**Stated traction:** 10+ hires made (per homepage copy).

### 1.4 Tech stack

Built with Claude Code by a solo founder. Stack: Supabase, Vercel, Stripe, Resend (DKIM + SES records on `send.shipstacked.com` are load-bearing — must not be deleted). Notification email: `ox@agentagous.com`.

### 1.5 The Atlas (V2 strategic asset, already shipped)

Published 13 May 2026 at `shipstacked.com/atlas`. 11,335 words. The first practitioner-defined map of the agentic-economy labor market. Authored under Thomas's name and current professional context (embedded as the AI integration operator at an EU-regulated practice with AI Act exposure).

**Atlas structure — six parts:**

- **Part I — The Workforce.** 28 specialist roles in 5 clusters (A: Implementation & Deployment; B: Reliability & Operations; C: Governance, Risk & Compliance; D: Design & Architecture; E: Translation & Enablement). Each role tagged with automation trajectory (🔴 Resistant / 🟡 Partial collapse / 🟢 Collapsible) and demand/supply signals.
- **Part II — The Operators.** Five operator types (F1 Solo, F2 Boutique, F3 Vertical, F4 Function, F5 Integration). A new economic unit — not employee, not freelancer, not consultant, not agency, not SaaS founder.
- **Part III — The Compliance Layer.** Three sub-clusters (Research / Operations / External) reflecting how frontier labs actually organize this work.
- **Part IV — Alignment & Interpretability Research.** Distinct labor surface, runs through Anthropic Fellows / MATS / Redwood / ARC pipelines.
- **Part V — Model Training & RLHF.** Mercor / Scale / Surge population. Already $1B+ market dominated by Mercor.
- **Part VI — Industry Vertical AI Specialists.** Healthcare, legal, financial services, defense, manufacturing. The largest segment of AI hiring globally.

**Atlas v0.4 planned additions (already specified, not yet published):** domain-practitioner-with-integrated-AI as a distinct supply category (~1.5–3M globally, highest-LTV); ISCO/SOC/O*NET crosswalk per role; EU AI Act + ISO 42001 explicit mapping; expanded compensation data; acquisition-as-talent-supply pattern named; three-layer venture structure named; named companies per vertical; expanded Part IV alignment research detail; OpenAI Frontier / superapp framing implications; the "hiding in plain sight" phenomenon named explicitly (practitioners doing genuine AI work who are classified by LinkedIn as something generic).

### 1.6 The handover trail (durable failsafes, Thomas's Downloads folder)

- `SHIPSTACKED_HANDOVER.md`
- `ATLAS_V0.3_FULL.md` (also at `src/content/atlas-v03.md`)
- `HANDOVER_ADDENDUM_STEP4.md`
- `HANDOVER_STEP5_INFLECTION.md` — strategic frame logic
- `HANDOVER_STEP6_ROLLOUT.md` — 30-item beacon roadmap + VC map, produced 14 May 2026

These have not been re-read in the current planning session. They contain the prior shape of the V2 plan. Re-reading them through the May-15 strategic frame is one of the next moves.

### 1.7 Strategic frame (locked from prior work, but now under pressure)

ShipStacked claims **"the labor layer of the agentic economy."** Layered mental model:

- Financial layer = Stripe / Visa / Mastercard
- Discovery layer = Anthropic / OpenAI
- **Labor layer = open, ShipStacked claims it**

Every build item must pass four filters:
1. **Build once**
2. **Beacon-shaped** (creates inbound, not outbound)
3. **Plugs into the agentic economy directly**
4. **Compounds** (each integration makes the next one easier)

Cuts (things deliberately not done): community/cultural layer, manual outreach, marketing-content-as-work.

---

## 2. The current market — labor disruption in real time, May 2026

This section is current data, sourced May 15 2026, not memory.

### 2.1 The headline labor-market signal

- **ManpowerGroup 2026 Talent Shortage Survey** (39,000 employers across 41 countries): "AI Model & Application Development" is the single hardest-to-fill skill in the world for the first time in the survey's history.
- **Bain & Company:** half of 1.3M US AI jobs may go unfilled by 2027.
- **Forrester:** 75% of organizations attempting to build AI agents in-house will fail.
- **RAND:** 80% of AI projects fail to deliver business value.
- **MIT:** 95% of GenAI pilots never reach production.
- **Pertama Partners 2026:** 42% of companies abandoned AI initiatives in 2025; failed projects cost average $4.2M–$8.4M depending on failure mode.
- **WRITER survey:** 67% of executives report data breaches from unapproved AI tools.

### 2.2 The structural response from frontier labs and capital

- **May 4 2026:** Anthropic + Blackstone + Hellman & Friedman + Goldman Sachs announce a $1.5B venture to solve "the scarcity of engineers who can implement frontier AI systems at speed." Same day: OpenAI + TPG + Bain announce a near-identical $4B venture.
- **May 11 2026:** OpenAI formally launches **The OpenAI Deployment Company** ($10B) and simultaneously acquires Tomoro — a 150-person UK consultancy — to staff it with Forward Deployed Engineers + Deployment Specialists from day one. Explicit consulting/integration partners: Bain & Company, Capgemini, McKinsey.
- **April 2026:** EY launched a UK & Ireland FDE practice.
- **Indeed:** 800–1000% growth in Forward Deployed Engineer postings between January and September 2025.
- **EU AI Act enforcement date: August 2 2026 — 77 days from now.** Fines up to 7% of global revenue. Every regulated EU business needs compliance-layer hires.

### 2.3 Where the supply already lives — current data, May 2026

**AI coding assistants (the agentic-economy primary surface):**

| Tool | Users | Revenue | Notes |
|---|---|---|---|
| **Cursor (Anysphere)** | ~1M+ DAU | $2B ARR (Q1 2026), $50B valuation talks | 67% of Fortune 500. Highest revenue-per-employee in software history (~50 employees). xAI right-to-acquire deal at $60B announced 21 April 2026. |
| **OpenAI Codex** | 3M+ weekly active users (April 2026) | bundled in ChatGPT | 1M → 2M → 3M in three months. GPT-5.5-Codex. Astral acquisition (uv/Ruff/ty). Becoming the OpenAI "superapp." Skills marketplace **emerging right now** per OpenAI VP Sottiaux. |
| **Claude Code** | n/a public number | Anthropic at $19B ARR run-rate | #1 most-used and most-loved per Pragmatic Engineer 900-dev survey. Agent view shipped May 12 2026. Weekly limits raised 50% May 13 2026 (anti-Codex move). 60%+ business chatbot share (Ramp data, Feb 2026). |
| **Replit** | 40M+ users | $265M ARR (end 2025), targeting $1B by EOY 2026, $9B valuation | Heterogeneous — students, hobbyists, professionals. |

**AI app builders (vibe coders, broader builder population):**

| Tool | Users | Revenue | Notes |
|---|---|---|---|
| **Lovable** | ~8M users | $206M ARR (Nov 2025), $6.6B valuation | Fastest European startup ramp ever. 100K products built daily. Backed by NVIDIA, Salesforce, Databricks, Atlassian. **Most users are non-developers** — landing pages, MVPs, internal tools. Security: 14 vulnerabilities common in shipped apps per Particula. |
| **Bolt (StackBlitz)** | 5M+ registered (May 2025 disclosure) | $40M ARR in 5 months | WebContainer architecture. Dev-skewing. |
| **v0 (Vercel)** | smaller | $20/mo Premium | Developer-skewing. Frontend-only. |
| **Emergent** | 6M users | $100M ARR in 8 months | 70% non-coder users. Fastest-growing vibe coding tool globally. |
| **Base44** | n/a | sold to Wix for $80M in 6 months | Operator-pattern example. |

**The Karpathy insight (March 2026):** *"The most productive AI-native developers use Cursor, Codex, Claude Code, and others simultaneously — switching based on availability and task fit. The goal is maximum token throughput across every subscription."*

→ The highest-value builder is on three tools at once. No single platform captures their proof-of-work. **This is the gap ShipStacked can occupy.**

### 2.4 Where the hiring side already lives

- **LinkedIn Recruiter:** ~$1K/seat/month. Cannot see AI-native builders well (no taxonomy for them).
- **Wellfound (ex-AngelList Talent):** 10M+ opt-in candidates. Recruit Pro $499/mo. Closest direct comp to ShipStacked. Opt-in candidates respond at 50% higher rates than scraped profiles (Wellfound's own data).
- **Juicebox / SeekOut / Findem:** AI aggregators, 800M+ profiles, natural-language search. Trying to solve the same problem from the recruiter side using public-data aggregation.
- **GitHub:** still the proof-of-work surface technical recruiters x-ray.
- **Mercor:** $1B annualized revenue (Feb 2026), paying $1.5M+ daily to 300K+ contractor network. Dominates RLHF + domain-expert AI training labor.

### 2.5 Frontier-lab role specialization (the leading indicator)

What's at frontier labs now is at customers in 12–24 months. **Anthropic alone has 9+ distinct safety/policy specialisms** across Frontier Red Team (Autonomy / Cyber / Emerging Risks), Safeguards Red Team, Alignment, Interpretability, Societal Impacts, Detection & Response, plus the Applied AI super-cluster (Forward Deployed Engineer, Solutions Architect, Applied AI Architect, Partner Solutions Architect, Prompt and Context Engineer, AI Evaluations Engineer).

**Compensation reality (2026, from Levels.fyi + KORE1 + public JDs):**
- FDE average TC: $238K, range $205–486K, Staff $630K+
- Palantir / OpenAI / Anthropic FDE: $350–550K mid-to-senior TC
- UK FDE: £138K average, £253K+ top
- New York has surpassed San Francisco as the FDE hub (35% vs 11% of postings)
- Defense and Healthcare command the highest vertical premiums
- Domain specialists command 30–50% premiums over generalists
- Over 75% of AI job listings now specifically seek domain experts

### 2.6 Verticalization is happening fast

Per multiple staffing-market sources:
- **Healthcare AI:** 640K positions in 2026, 36.8% CAGR, $110B+ market by 2030
- **Manufacturing AI:** 620K positions
- **Financial services AI:** 470K positions; top comp ($300K+ at hedge funds, $400K+ for trading-model engineers)
- **Defense / government AI:** clearance-gated, premium-paid

### 2.7 The Noah Kagan signal (validation, not variable)

Noah Kagan (AppSumo / Sumo Group) has been in direct contact. Provided personal phone. Pushing a June 15 2026 launch for something agent-economy-adjacent. Thomas drafted a strategic field-manual brief — *"The Agentic Economy Distribution Stack"* (~2,867 words at `/mnt/user-data/outputs/NOAH_BRIEF.md`) — to send.

**Thomas's clear framing (locked):** Noah is **validation** — independent confirmation that the original ShipStacked gut (a place for AI-native builders to be hired and hire) is right. Whatever Noah builds, Thomas does not assume nature or structure of that build. Noah is not a strategic input to V2 direction.

### 2.8 The "hiding in plain sight" phenomenon

Many practitioners doing genuine A1 (AI Integration Operator), A2 (FDE), A4 (Agent Workflow Implementer), A6 (Deployment Strategist) work are classified by their employer and by LinkedIn as something generic ("Senior Engineer," "Solutions Consultant," "Tech Lead"). LinkedIn's taxonomy literally cannot see them. The Atlas reframes their identity. The `/claim` form is the structural mechanism by which they self-classify into a routable supply pool.

---

## 3. The strategic shape under debate for V2

### 3.1 What V2 is *not* (settled)

- Not a feature ship. The product surface is roughly complete for V1's stated thesis.
- Not "more Atlas content." The Atlas exists and is load-bearing as published.
- Not "manual outreach to builders or hiring teams." Cut by the four filters.
- Not "community/cultural layer." Cut by the four filters.
- Not "Noah-aligned co-launch." Noah is validation, not a variable.

### 3.2 What V2 *is* — three converging answers from the current planning session

The session converged through three reframes, each sharper than the last.

**Reframe 1 (Thomas, opening): "Distribution mechanics, baked into the build, machine-readable. Distribution is the moat — but clarity must come first."**

**Reframe 2 (Thomas, mid-session): "We need mechanics that seamlessly integrate ShipStacked into vibe coders, AI-native devs, platforms, Claude, OpenAI etc. Seamless distribution by meeting builders where they build and arbitraging them over."**

→ Translated: *distribution = ingestion infrastructure.* ShipStacked pulls proof-of-work over from where it's already being shipped, with minimal friction, ideally with the builder doing nothing.

**Reframe 3 (Thomas, latest): "Build at a surface where we seamlessly touch as many active humans and agents in this space right now. The agentic economy is the focus; vibe coders have a chair at that table, but it's just one chair."**

→ Translated: **ShipStacked is an MCP-native node on the agentic economy.** The product is not a website. The product is a protocol position. Every human and agent in the agentic economy can read from and write to ShipStacked through the protocol they're already using.

### 3.3 Why MCP specifically

- **MCP is the canonical interop layer** between agents and external tools/data, originated by Anthropic, adopted by OpenAI, Google, Microsoft, Hugging Face.
- **Every Claude Code session** has agent-view + MCP support natively (shipped May 12 2026).
- **OpenAI Codex has Skills** — *"shareable, composable text-based instruction sets that steer agent behavior. Marketplaces for these Skills are beginning to emerge"* (Sottiaux, Fortune interview).
- **Cursor's agent runtime** consumes MCP.
- **CrewAI / LangGraph / Mastra** production agent frameworks all support MCP.

This is the surface that grew ~10x in the last six months and is still growing. It is the single densest concentration of human-agent collaboration anywhere in the agentic economy.

### 3.4 The seven supply populations and how proof-of-work accumulates for each

| Population | Where proof accumulates | Mechanic needed |
|---|---|---|
| Vibe coders | Lovable / Bolt / v0 published URLs | URL import |
| AI-native engineers | GitHub repos, Cursor / Claude Code sessions | GitHub sync + MCP |
| **Operators** | Customer testimonials, recurring revenue, fleet outputs | Claim + revenue verification |
| **Compliance leads** | Conformity assessments, audit trails, ISO 42001 docs | Verified credential publishing |
| **Vertical specialists** | Domain credentials + AI deliverables (clinical pilots, contract review tools) | Hybrid: credentials + ship feed |
| **RLHF domain experts** | Mercor track record, paper authorship | Cross-platform import |
| **Domain-practitioners-with-integrated-AI** | Client engagements, professional reputation, peer referrals | Peer claim + practice-evidence |

Vibe coders are 1 of 7 populations. The other 6 are larger by headcount and higher by per-practitioner LTV. **V1's homepage and mechanics serve populations 1 and 2 only.**

### 3.5 The three V2 surfaces (under debate)

**Surface 1 — ShipStacked MCP Server (universal write surface).**
- `shipstacked.post_proof` — any agent posts proof of a completed task to a builder's profile, with the builder's auth
- `shipstacked.verify_builder` — any agent or human queries "is this person who they say they are, and what have they shipped"
- `shipstacked.search_talent` — recruiter-side agents find candidates
- `shipstacked.publish_role` — company-side agents post needs

Not a "Claude Code integration." A **canonical MCP server that any agent connects to.** Claude Code uses natively. Codex consumes as a Skill. Cursor reads via agent runtime. LangGraph / CrewAI / Mastra call via standard MCP. One build, every chair.

**Surface 2 — Public read API + `llms.txt` + Schema.org markup (universal read surface).**
- Every ShipStacked profile is a machine-readable JSON-LD document at a stable URL
- The Atlas role taxonomy becomes a **published controlled vocabulary** (`shipstacked.com/atlas/roles/A1`, `/F3`, etc.) — like ISCO codes but for the agentic economy
- Other systems reference Atlas roles canonically → ShipStacked becomes source-of-record

**Surface 3 — Multi-population claim + verification (human write surface).**
- Extend existing `/claim` flow so each of the seven populations has a fast claim path
- Different proof-of-work shapes per population, all converging on the same canonical profile

**Status:** Thomas's stated read is "all three are essential — they're one move." Treat as one product, not three.

### 3.6 The pricing fork (unresolved — the most important question)

Three honest options:

**Option A — Marketplace (current).**
- $199/mo hiring seats. Builders free.
- Comps: Wellfound ($499/mo), LinkedIn Recruiter ($1K/seat), Hired.
- Ceiling: ~$50–150M ARR over 5–7 years.
- Acquirers: Indeed, LinkedIn, Workday, ZipRecruiter.

**Option B — Infrastructure.**
- Read API: paid by usage / API calls / enterprise contracts above threshold.
- Write side: companies and platforms pay to embed ShipStacked verification primitives in their own products.
- Builders always free.
- Comps: Clearbit ($150M HubSpot acquisition), PeopleDataLabs, Apollo.io; identity-adjacent: Clerk, Auth0, Stripe Identity.
- Ceiling: $500M–$2B ARR over 7–10 years if MCP keeps winning.

**Option C — Hybrid.**
- Keep $199/mo as near-term cash mechanic (proven, fund the build).
- Price MCP/API surface as infrastructure from day one — published even before load-bearing.
- Risk: the hybrid becomes neither — solo founder gets pulled back to safe marketplace revenue, never finishes the infrastructure build.

**Tradeoff table:**

| Dimension | Marketplace (A) | Infrastructure (B) | Hybrid (C) |
|---|---|---|---|
| Time to first revenue | Now | 6–12 months | Now |
| Ceiling | $50–150M ARR | $500M–$2B ARR | depends on discipline |
| Defensibility | Network effects (replicable) | Protocol position + canonical taxonomy (rare) | both, if executed |
| Solo-founder fit | High | Medium (needs standards/partner work) | High if disciplined |
| Validates Noah signal | Yes — current shape | Better — saw the *next* shape | Yes |
| Risk of being neither | n/a | n/a | High |

**My recommendation to Thomas, sitting at C with weighted commitment to B.** Thomas's own stated view: "this is the most important point you raised." Decision pending advisor input.

---

## 4. What V1 looks like through the V2 lens

A few honest observations:

1. **The homepage is selling a smaller story than the company actually is.** Homepage = vibe-coder marketplace. Atlas = agentic-economy labor layer. The gap is the V2 question.
2. **`/llms.txt` and the Builder API already exist and are agent-fillable.** These are V2 primitives already shipped under a V1 label. The MCP server is a natural next layer on top.
3. **`/claim` is the verification primitive in embryo form.** Extending it for each of the seven populations is the path to multi-population coverage without rebuilding.
4. **The Atlas is doing dual duty as marketing artifact AND controlled vocabulary.** The marketing artifact role is mostly played out. The controlled-vocabulary role is unstarted.
5. **"10+ hires made" on the homepage** is the proof-of-traction. Worth knowing whether to upgrade that number, replace with a different metric, or move it as positioning evolves.

---

## 5. What I'm asking the advisor to weigh in on

In order of urgency:

**A. Pricing identity (Section 3.6).** This is the single most important call. Everything downstream depends on it. My recommendation is Hybrid weighted toward Infrastructure, but the case against it (solo-founder discipline risk) is real.

**B. TAM scope (Section 3.4).** Should the homepage and mechanics catch up to the Atlas's full TAM, or should ShipStacked stay narrowly positioned for vibe coders + AI-native engineers and let the broader populations come later? My read: catch up, but sequence carefully — populations 1, 2, 3 (vibe coders, AI-native engineers, operators) in the next 90 days; populations 4–7 in the following 90.

**C. The three V2 surfaces (Section 3.5).** Are these the right three, in the right priority? Specifically: does the MCP server lead, or should it be a follow-on to extending the existing builder API + Atlas controlled vocabulary?

**D. The Noah signal calibration (Section 2.7).** Thomas's stated position is "Noah is validation only, not a variable." Is there a stronger move available — using Noah's distribution opportunistically without making ShipStacked dependent on it?

**E. The "build vs. standards" tension.** The infrastructure shape requires both shipping code AND doing standards work (publishing the Atlas as a controlled vocabulary, getting other systems to adopt it). Standards work is slow and political. Is it the right thing for a solo founder to take on, or is there a way to shape ShipStacked so other systems adopt the taxonomy without explicit standards work?

---

## 6. Working notes for the advisor — what is and isn't known

**Known with high confidence:**
- Current product surface (Section 1.2)
- Current strategic frame as published (Section 1.7)
- Atlas content as published (Section 1.5)
- Market data in Section 2 (all sourced May 15 2026, citations available)
- Frontier-lab hiring patterns (Section 2.5 — direct from public JDs)

**Known with medium confidence:**
- The seven-population framing (Section 3.4) — sound but derived from Atlas, not from primary buyer interviews
- The MCP-native reframe (Section 3.3) — strong analytical case, depends on MCP continuing to win as the interop protocol
- Pricing ceilings (Section 3.6) — based on public comps, not on ShipStacked-specific willingness-to-pay data

**Unknown / requires more work:**
- ShipStacked's actual current funnel metrics (visits / signups / claims / hires / paying seats) — these would sharpen every decision
- Buyer-side field signal — has Thomas talked to enough hiring teams to know whether they live on LinkedIn, Wellfound, or recruiter agents?
- Codex Skills marketplace launch timing — "emerging" per OpenAI but no date confirmed
- Whether Atlas controlled vocabulary would be adopted if published as such

**Deliberately out of scope of this brief:**
- Code-level decisions (these come after strategic identity is locked)
- Specific 30-item beacon roadmap from `HANDOVER_STEP6_ROLLOUT.md` (deferred until strategic frame is locked)
- Fundraising shape (different conversation; pricing identity precedes it)

---

## 7. The one paragraph to give the advisor first

If the advisor only reads one paragraph before engaging:

> ShipStacked is live. V1 is a working proof-of-work hiring platform for AI-native builders, $199/mo hiring seats, 10+ hires made, Atlas v0.3 published, and the foundational primitives (API, llms.txt, claim flow) already in place. The strategic question for V2 is not what to build but what kind of company ShipStacked is. Three candidate shapes: a vibe-coder hiring marketplace (current, $50–150M ceiling), the full Atlas labor layer (broader but slow to monetize), or — the framing the founder is converging on — an MCP-native node at the surface where the agentic economy actually transacts ($500M–$2B ceiling, dependent on MCP continuing to win). The pricing fork (marketplace vs infrastructure vs hybrid) is the most important unresolved decision because it determines every downstream build choice. The founder is a solo operator running this from Mallorca, builds with Claude Code, has direct contact with Noah Kagan as independent validation of the original gut, and has 77 days until EU AI Act enforcement (Aug 2 2026) creates structural demand for the compliance-layer populations the Atlas already maps.

---

*End of brief. Sources for all market data in Section 2 are public, accessed May 15 2026, available on request.*
