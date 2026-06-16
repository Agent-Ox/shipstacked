<!-- Phase 7 §E (2026-06-16): original CRON_SECRET value rotated + redacted; historical context only. -->
# SHIPSTACKED — FULL SESSION HANDOVER

**Date of handover:** May 12, 2026
**Last commit:** `a251208` (3 commits ahead of origin/main, not pushed)
**Founder:** Thomas Oxlee
**Currently embedded as:** the AI integration operator at a regulated EU business under AI Act exposure (legal practice in Spain — anonymous in all public-facing content)

---

## HOW TO USE THIS DOCUMENT

If you are a new Claude instance reading this: this is the full operational context for shipstacked.com. Read it end to end before doing anything. Do not skip sections. The strategy, the build state, the reasoning, and the locked decisions are all in here. If you find yourself wanting to revisit a decision, check the "Locked decisions" section first — if it's locked, don't relitigate.

If you are Thomas Oxlee reading this: this is the handover to bring future Claude up to speed. Paste this in at the start of a new session before asking for any work.

---

## PART 1 — STRATEGIC CONTEXT

### What shipstacked is becoming

shipstacked is the **classification and discovery layer for the labor market of the agentic economy**. Specifically: the place where domain practitioners, AI specialists, operators, and compliance leads doing real agentic-economy work are classified, discovered, and routed to companies that need them — without LinkedIn taxonomies, without CVs, without traditional recruiting friction.

It is not (any longer) positioned as a marketplace. The 6-week launch reframes it as **a high-touch service business with a content moat (the Atlas), with a marketplace component running underneath**.

### Why the reframe happened

shipstacked launched ~4 weeks ago as a marketplace ("$199/month for employers to browse verified builders"). Limited traction — 100 people know, 60 signed up, 22 verified builders, 10 talented killers. Demand-side challenges with marketplace SaaS pricing in this segment.

The reframe emerged from realizing:

1. **The labor surface is much larger than just "AI-native builders / vibe coders."** It includes Forward Deployed Engineers, Deployment Strategists, Agent System Integrators, AI Operations Engineers, Prompt and Context Engineers, AI Evaluations Engineers, the full compliance layer (audit/risk/incident response/data provenance/vulnerable user protection), alignment researchers, RLHF specialists, vertical AI specialists (healthcare/legal/finance/defense/manufacturing), Cluster F operators (solo to boutique agent operators), AND domain practitioners who have integrated AI deeply into their primary professional work (lawyers, doctors, accountants, etc.).

2. **The hiring marketplaces are a graveyard.** AngelList Talent, Hired, Vettery, Toptal, Andela, Lemon.io, A.Team, Worksome, Braintrust, Contra all struggled. The successful ones (Toptal, Mercor) won by being radically opinionated about ONE specific kind of supply.

3. **The most accessible supply pool is "talent hiding in plain sight"** — practitioners doing the work but classified as something else (LinkedIn says "Senior Engineer" when they're actually doing A2/A6 FDE work). This is 10x larger than the engineering-credentialed pool and structurally easier to engage through recognition-first messaging.

4. **The domain-practitioner-with-AI segment is even larger** — ~1.5-3M practitioners globally (lawyers, doctors, CPAs, architects, financial advisors with deep AI integration) who are invisible to AI labor markets because they're classified by profession. They want recognition for the AI integration they've built. They're the highest-LTV customer because OTHER practitioners in their domain want to hire them specifically.

5. **The frontier labs cannot solve the labor problem alone.** OpenAI literally acquired Tomoro (150-person UK consultancy) on May 11, 2026 to staff its $10B Deployment Company because they couldn't hire 150 FDEs through normal channels. Anthropic's parallel $1.5B venture with Blackstone has the same labor bottleneck. The classification + matching infrastructure doesn't exist. shipstacked builds it.

### The market context (verified in this session)

- **ManpowerGroup 2026 Talent Shortage Survey** (39,000+ employers, 41 countries): For the first time in survey history, AI skills are the #1 hardest to find globally. AI Model & Application Development (20%) and AI Literacy (19%) lead the global shortage rankings.
- **Bain estimate:** Half of 1.3M US AI jobs may go unfilled by 2027.
- **Forrester:** 75% of organizations attempting to build AI agents in-house will fail.
- **RAND:** 80% of AI projects fail to deliver business value.
- **MIT:** 95% of GenAI pilots never reach production.
- **OpenAI Deployment Company:** Launched May 11 2026, $10B venture, $4B+ raised, partners with TPG/Brookfield/Bain Capital/SoftBank, **acquired Tomoro** (150 FDEs + Deployment Specialists) on same day.
- **Anthropic + Blackstone:** $1.5B venture announced May 4 2026 with Hellman & Friedman and Goldman Sachs. Focus on PE portfolio companies. Both ventures are fundamentally FDE-deployment vehicles.
- **EU AI Act:** Annex III high-risk obligations enforce August 2 2026. Recruitment systems are explicitly Annex III high-risk — relevant to shipstacked itself.
- **Cursor (Anysphere):** 60 employees, $2B ARR, ~$29.3B valuation, possibly $60B xAI acquisition pending. The operator pattern at scaleup scale.
- **Mercor:** $1B annualized revenue, $10B valuation, 300K-contractor network, $1.5M+ daily disbursements. Dominates RLHF supply.
- **WEF Future of Jobs 2025:** AI-flavored roles among fastest-growing. 86% of employers expect AI to transform business by 2030. WEF taxonomy is MUCH coarser than the Atlas.
- **ISCO-08, SOC 2018, ESCO, O*NET:** All structurally 2-3 years behind reality. Most Atlas roles do not have dedicated codes. The Atlas is positioned as the practitioner-defined taxonomy that exists because the official ones don't yet.
- **ISO 42001 (Dec 2023) + NIST AI RMF (Jan 2023):** Define some compliance roles. The Atlas Part III is more granular than either.

---

## PART 2 — THE ATLAS

### Atlas v0.3 — current canonical version

Atlas v0.3 is fully drafted (in this conversation, multiple lengthy outputs). Six parts:

**Part I — The Workforce (28 specialist roles, 5 clusters)**
- Cluster A: Implementation & Deployment
  - A1 AI Integration Operator (Partial automation 🟡)
  - A2 Forward Deployed Engineer (Resistant 🔴) — distinguish between frontier-lab-scale and mid-market-accessible
  - A3 AI Deployment Triage Specialist (Resistant 🔴)
  - A4 Agent Workflow Implementer (Partial 🟡)
  - A5 Agent System Integrator (Resistant 🔴) — the transferable-ownership role
  - **A6 Deployment Strategist (Resistant 🔴)** — paired with A2, ex-Palantir "Echo" role
  - **A7 Partner / Channel Solutions Architect (Resistant 🔴)** — partner ecosystem layer
- Cluster B: Reliability & Operations
  - B1 AI Operations Engineer (Collapsible 🟢)
  - B2 Agent Reliability Engineer (Collapsible 🟢)
  - B3 AI Cost & Capacity Operator (Collapsible 🟢)
  - **B4 AI Inference & Model Serving Reliability Engineer (Partial 🟡)** — infrastructure-layer
- Cluster C: Governance/Risk/Compliance (summary; full treatment in Part III)
  - C1 AI Audit & Conformity Lead, C2 AI Risk & Policy Analyst, C3 Model & Vendor Governance Manager, C4 AI Agent Steward
- Cluster D: Design & Architecture
  - D1 AI Workflow Designer, D2 Agent System Architect, **D3 Prompt and Context Engineer (renamed v0.3)**, D4 Human-AI Handoff Designer, **D5 AI Evaluations Engineer (new v0.3)**
- Cluster E: Translation & Enablement
  - E1 AI Implementation Lead, E2 AI Enablement Trainer, E3 AI Translator, E4 Fractional Head of AI

**Part II — The Operators (5 operator types)**
- F1 Solo Agent Operator
- F2 Boutique Agent Operator
- F3 Vertical Agent Operator
- F4 Function Agent Operator
- F5 Integration Agent Operator
- Plus "Founding Engineer at AI-native company" polymath archetype

**Part III — The Compliance Layer (3 sub-clusters reflecting frontier-lab organization)**
- C-Research (Frontier Red Team flavor): C2 Risk & Policy, C6 Red Team Lead split into Autonomy/Cyber/Emerging Risks
- C-Operations (Safeguards flavor): C5 AI Incident Responder, C8 AI Procurement & Vendor Risk + Anthropic Safeguards Red Team
- C-External (Trust & Safety flavor): C7 Data Provenance, C9 Vulnerable User Protection + PVT Coordinator

**Part IV — Alignment & Interpretability Research (NEW v0.3)**
- Alignment Researcher, Interpretability Researcher, Model Behavior Researcher, Safety Evaluation Researcher
- Connected to Anthropic Fellows (May/July 2026 cohorts), MATS, Redwood Residency, ARC pipelines
- $200M+ in safety grants flowing through these in 2026

**Part V — Model Training & RLHF (NEW v0.3)**
- Three tiers: mass-market RLHF contractors ($25/hr), domain-expert RLHF specialists ($85+/hr, Mercor's core), AI quality auditors ($120K+ FTE)
- Described for completeness; shipstacked doesn't compete here (Mercor dominates)
- Adjacent opportunity: domain-expert RLHF specialists overlap with shipstacked's vertical-specialist supply

**Part VI — Industry Vertical AI Specialists (NEW v0.3)**
- Healthcare AI Engineer (640K positions, 36.8% CAGR)
- Manufacturing AI Engineer (620K positions)
- Financial Services AI Engineer (470K positions, $400K+ TC at hedge funds)
- Defense/Government AI Engineer (security clearance gating)
- Legal AI Engineer
- Distinct supply pool: domain practitioners who learned AI, NOT AI practitioners who learned a domain
- 30-50% comp premium over generalists per market data

### v0.4 planned additions (next major Atlas iteration)

1. **Domain practitioner with integrated AI** as explicit supply category (lawyers/doctors/accountants/etc. with deep AI integration). Pool: ~1.5-3M globally. Highest-LTV customer because OTHER practitioners in the same domain want to hire them.
2. **ISCO-08 / SOC 2018 / O*NET crosswalk** per role, with explicit gaps flagged
3. **EU AI Act Annex III + ISO 42001 mapping** for Part III compliance roles
4. **Expanded Levels.fyi-anchored compensation data** per role per location per company
5. **Acquisition-as-talent-supply pattern** as named mechanism (Tomoro is the first example; more coming)
6. **Three-layer venture structure** (lab + direct-employed FDEs + Big-3 consulting partner channel) for the ventures
7. **Expanded named companies per vertical** in Part VI
8. **Expanded alignment research depth** in Part IV (specific lab program structures)

### Atlas authoring decisions (LOCKED)

- **Author byline:** Thomas Oxlee personally, not shipstacked anonymously. Bio: *"Currently embedded as the AI integration operator at a regulated EU business under AI Act exposure."*
- **Voice:** Practitioner-direct, opinionated, sharp where truth demands. NOT analyst-reference.
- **Foreword opens:** "CVs were invented in the 15th century."
- **Legal practice anonymity:** Always anonymous in all public-facing content. Phrasing: "regulated EU business under AI Act exposure." Never name the firm, the city specifics, or any identifying details.
- **Granularity is the differentiator:** WEF says "AI Specialist," Atlas says 28 specific specialist roles + Cluster F operators + Part III compliance + Part IV research + Part V RLHF + Part VI vertical specialists.

---

## PART 3 — LOCKED DECISIONS (DO NOT RELITIGATE)

These are decisions made across multiple sessions. They are settled. Future sessions should treat these as constraints, not as open questions.

### Positioning & business model
1. shipstacked = classification and discovery layer for the agentic-economy labor market
2. Three populations of supply: specialists (employed), operators (run agent fleets), agent system integrators (transferable delivery). Plus the compliance buyer. Plus the vertical specialist. Plus the domain practitioner with AI.
3. Atlas is upstream artifact; site is downstream commercial surface. Both ship.
4. **Additive reframe over full repositioning.** Keep what works on the existing site (Build Feed, Velocity Score, Builder API, /talent directory, $199/mo employer subscription). Add new surfaces (/atlas, /hire, /claim, /admin/intakes). Don't destroy the existing builder community.
5. The placement business ($1,500 / $5,000 / $25,000 ladder) is the primary near-term revenue line, not the $199/mo subscription.
6. The domain-practitioner-with-AI segment is folded in 100% as a distinct supply category.
7. "Hiding in plain sight" targeted outreach to named practitioners inside named firms is the primary supply-acquisition mechanism.

### Pricing model (LOCKED)
- **Builders free, always.** Non-negotiable.
- **Hiring intake placement ladder:**
  - $1,500 — symptom-to-shortlist (diagnosis + 3-5 vetted candidates + written summary)
  - $5,000 — placed engagement (full broker, 2-4 weeks of shepherding through close)
  - $25,000 — embedded transfer-of-ownership project (Thomas leads A5-flavored delivery)
- **$199/month employer subscription** stays as secondary surface, not primary CTA.

### Voice and tone (LOCKED)
- Practitioner-direct, opinionated, sharp
- NOT analyst-reference
- Honest about what shipstacked is and isn't
- Honest about probabilities and risks
- No marketing language. No "amazing." No "revolutionary." No "disruptive."
- The Atlas reads like Patrick McKenzie / patio11 on Stripe. Field reports from inside the work.

### Anonymity (LOCKED)
- The Spanish legal practice is anonymous in all public content
- Standard phrasing: "currently embedded as the AI integration operator at a regulated EU business under AI Act exposure"
- Tweet-length variant: "Building shipstacked.com. Embedded operator inside an EU regulated business under AI Act exposure."
- Never name the firm, the partners, the specific city, or any client identifying details

### Outreach protocols (LOCKED)
- **Never cold-email from the shipstacked.com domain.** Use a personal email or sister domain.
- **5,000 CSV is passive supply only.** Never directly emailed.
- **Event-driven outreach, not campaign-driven.** Specific value to specific people based on their actual published work.
- **Pre-created profiles** (if any) need privacy notice, one-click delete, /data-sources page.
- **EU AI Act August 2 2026 deadline.** Recruitment systems are Annex III high-risk — shipstacked's own classification work touches this.

### Site structure decisions (LOCKED)
- Three primary doors emerging: /build (specialists + operators), /comply (compliance), /research (alignment/evals/RLHF) — v2 problem, not launch
- Plus vertical sub-doors /healthcare, /legal, /finance, /defense, /manufacturing — v2 problem
- For launch, the additive changes are: /atlas, /hire, /claim, /admin/intakes, plus homepage/nav/footer tweaks
- /hire route was originally a post-hire confirmation flow. Renamed to /hire-confirm. /hire is now free for the new symptom intake form.

### Probability assessment (acknowledged, locked as honest baseline)
- 55% chance of generating some revenue (sub-$10K, 1-3 placements) in next 90 days
- 25% chance of $50K+ revenue in next 6 months
- 12% chance of $250K+ ARR in next 12 months
- 8-15% chance of full-time self-sustaining business in 24 months
- 3-5% chance of venture-scale outcome ($10M+ ARR or strategic acquisition)
- Floor estimates IF Thomas executes 5 rooms per week for 6 weeks without quitting

---

## PART 4 — THE 6-WEEK LAUNCH CAMPAIGN

### Pre-launch week (in progress as of May 12)

**Supply-side work (priority 1):**
- Audit existing 44 builders, classify against Atlas roles, identify 8-15 immediately routable
- Build target firm list (80-150 firms across 6 tiers, with 3-8 named practitioners each = 240-1,200 individuals)
- Start outreach to ex-Palantir Deployment Strategists (~100-300 globally on LinkedIn)
- Identify named decision-makers at target customer companies

**Site build (Step-by-step, in progress):**
- ✅ Step 1: Cleanup (committed)
- ✅ Step 2: Rename /hire → /hire-confirm (committed)
- ⚠️ Step 3: /hire symptom intake form
  - ✅ 3a: Supabase hire_intakes table created
  - ✅ 3b: INTAKE_NOTIFY_EMAIL env var set locally
  - ✅ 3c: API route built and committed (a251208)
  - ⏳ 3d: Build /hire/thanks success page
  - ⏳ 3e: Build /hire/HireIntakeForm.tsx client component
  - ⏳ 3f: Build /hire/page.tsx wrapper
  - ⏳ 3g: Test locally
  - ⏳ 3h: Commit UI work
- ⏳ Step 4: /claim form (new Supabase table, page, API)
- ⏳ Step 5: /atlas long-form page
- ⏳ Step 6: /admin/intakes view
- ⏳ Step 7: Homepage + nav + footer adjustments
- ⏳ Step 8: Pre-deploy checks, push, deploy

### Week 1 (May 18-22): Land position

**Monday anchor post:** Thomas writes. Field report from inside the practice. 1,500 words. Twitter thread + LinkedIn long-form + Substack. End with Atlas link. *Thomas writes this himself — Claude cannot fake practitioner voice on insider content.*

**Tuesday named send #1:** Gergely Orosz (Pragmatic Engineer). Angle: Built on his FDE piece, found the Deployment Strategist gap.

**Wednesday fight post:** "LinkedIn says one role; Anthropic posts 14." Claude drafts, Thomas approves.

**Thursday named send #2:** swyx (Latent Space). Angle: operator economy as fourth labor population.

**Friday field report.** Thomas writes weekly thereafter, indefinitely.

### Week 2 (May 25-29): Atlas publishing event

- **Monday:** Show HN — "I read 1,000+ AI lab JDs and built a taxonomy of the work."
- **Tuesday:** LinkedIn long-form Atlas distribution (enterprise/hiring-leader frame)
- **Wednesday:** Twitter long thread (25-30 tweets, most viral Atlas pieces)
- **Thursday named send #3:** Bloomberry author (their 1,000-FDE-jobs analysis)
- **Friday field report**

### Week 3 (June 1-5): Operator-economy ecosystem

- **Monday:** Operator-types post (Atlas Part II)
- **Tuesday named send #4:** Sahil Lavingia
- **Wednesday:** Indie Hackers pivot post (honest meta)
- **Thursday:** Reply day (high-signal engagement)
- **Friday field report**

### Week 4 (June 8-12): Compliance audience

- **Monday:** EU AI Act compliance post (Atlas Part III). AI Act enforces in ~8 weeks at this point.
- **Tuesday named send #5:** AI policy journalist (Madhumita Murgia FT, Anna Tong Reuters, or Politico Europe AI desk)
- **Wednesday:** ISO 42001 cross-reference post
- **Thursday:** Compliance LinkedIn engagement
- **Friday field report**

### Week 5 (June 15-19): Strategic / investor audience

- **Monday:** Strategic post on OpenAI Deployment Company structural analysis
- **Tuesday named send #6:** Strategic investor (Olivia Moore a16z, Packy McCormick, Nathan Benaich, Elad Gil, Sarah Wang)
- **Wednesday:** Podcast pitch round (Latent Space, Cognitive Revolution, No Priors, Lenny's, 20VC)
- **Thursday:** Strategic discourse engagement
- **Friday field report**

### Week 6 (June 22-26): Synthesis + commercial conversion

- **Monday:** Meta-honest pivot post — "What 6 weeks of shipping the Atlas taught me"
- **Tuesday:** Atlas v0.4 announcement
- **Wednesday:** Commercial conversion event — "Taking 5 paid engagements this quarter"
- **Thursday:** Second podcast push
- **Friday field report (launch series finale)**

### Realistic outcome targets at end of week 6

**Floor (campaign worked):**
- 500+ Substack subscribers, 2,000+ Twitter, 50+ LinkedIn follows from new audience
- 20-40 inbound hiring form submissions
- 30-60 builder/practitioner claims
- 3-5 paid engagements signed ($15-40K revenue)
- 1 podcast appearance booked
- 1 named press mention or citation
- Direct response from at least 2 of 6 named sends
- Supply pool of 80-150 vetted practitioners across Atlas roles

**Ceiling (overperformed):**
- 2,000+ Substack, 10,000+ Twitter, 100+ inbound, 200+ claims
- 8-15 paid engagements ($60-120K revenue)
- 2-3 podcast appearances
- Multiple press mentions
- Direct strategic outreach from frontier labs or PE/VC

---

## PART 5 — SUPPLY MECHANICS

### The supply problem (the critical one)

OpenAI couldn't find 150 FDEs and had to acquire Tomoro on May 11. The frontier-lab credentialed band is closed to shipstacked.

**What's accessible:**

1. **Cluster C compliance (highest margin)** — 30-80 practitioners over 6 months. EU concentration is shipstacked's geographic advantage.
2. **Cluster A1, A2-mid-market, A4, A5, A6-non-Palantir** — 50-150 practitioners. Largest pool.
3. **Cluster F operators** — 30-60. Engagement (brokerage), not placement.
4. **E1, E3, E4** — 20-40 senior translators / implementation leads / fractional execs.
5. **D1, D2, D3 mid-tier, D4** — 20-40 design/architecture.
6. **Part VI Legal AI + Healthcare AI** — 15-30 vertical specialists, EU concentrated.
7. **B1, B2, B3** — 15-30 ops/reliability.

**Plus domain-practitioner-with-AI segment** (~1.5-3M globally; access through targeted outreach to professional firms and associations).

**Total realistic accessible supply over 6 months: 180-420 vetted practitioners.**

### The "hiding in plain sight" mechanism (primary supply strategy)

**Target firm list** (80-150 firms across 6 tiers):
- Tier 1: AI-flavored consultancies not yet acquired (Faculty AI, Mind Foundry, similar UK/EU 50-200 person firms)
- Tier 2: Big-4 AI practices and McKinsey QuantumBlack / BCG X / Bain Vector
- Tier 3: Enterprise SaaS customer-success engineering teams (Snowflake, Databricks, Confluent, Datadog, MongoDB, Salesforce, ServiceNow, Workday, etc.)
- Tier 4: AI-native scaleups under 200 people (below Cursor/Anysphere fame)
- Tier 5: Regulated EU businesses with internal AI teams (Santander, BBVA, Telefonica, Allianz, Novartis, etc.)
- Tier 6: AI agencies/integrators in adjacent geographies (Madrid, Barcelona, Tel Aviv, Krakow, etc.)

**Plus for domain-practitioner segment:**
- Law firms, hospital systems, accounting firms, architecture practices, financial advisory firms
- Professional associations (ABA, AMA, AICPA, RIBA, RICS)
- Conference programs (Legalweek, HIMSS, AICPA ENGAGE, etc.) as discovery surface

**Per firm:** identify 3-8 named practitioners doing AI integration work, classified as generic engineers / consultants / domain practitioners. Total: 240-1,200 named individuals.

**Outreach message:** Recognition-first, not opportunity-first. Names a specific Atlas role that fits their actual work. Frames Atlas as labor taxonomy not recruitment platform. References frontier labs for credibility transfer. Two clear asks: read the Atlas (free), claim role (bounded, no obligation). Signs with Thomas's positioning (signals "one of us" not "recruiter").

**Realistic conversion:** 30-50% open Atlas, 10-20% engage, 5-15% claim role. Net 12-180 practitioners added to supply pool.

### Vetting workflow (per claimed practitioner)
1. Review public proof of work (15 min)
2. 30-min discovery call
3. One reference check (15-30 min)

Total: 60-75 min per practitioner. Required before adding to routable pool.

---

## PART 6 — REVENUE FLOW

### When someone fills the /hire form

1. Submit writes to Supabase `hire_intakes` table
2. Auto-response fires via Resend within 60 seconds — confirms receipt, sets 24-hour expectation, links to Atlas
3. Notification fires to `hello@shipstacked.com` (Thomas reads here)
4. Submission appears in `/admin/intakes` view (not yet built)

### Within 24 hours, Thomas:

1. **Reads the symptom (5 min)** — classifies against Atlas roles
2. **Decides whether to serve it (5 min)** — three outcomes: can serve / can serve but small / cannot serve, refer honestly
3. **Identifies 2-3 specific humans (15-30 min)** — from existing platform → direct network → public proof of work → targeted outbound
4. **Writes the reply (20-30 min)** — diagnosis + 3 named humans with proof links + engagement proposal at appropriate tier

Total: 45-75 min per intake. **Thomas committed to doing this for the first 10 intakes.**

### Reply email structure
- Greeting
- Diagnosis paragraph (Atlas role classification + scope)
- 3 named humans with one-liner + link + plausible engagement
- "If you want me to intro any of them, reply with which one(s)"
- Engagement offer matching budget tier
- Calendar offer

### After they reply (3 branches)
- A: Wants intros → double-opt-in style, you make intros, stay reachable
- B: Wants you to run engagement → quote tier, agree scope in writing, Stripe invoice, deliver
- C: Silence → one follow-up at 7 days, then close

### After placements close (compounding moat)
- 30-day check-in with both sides
- Document in private log (which becomes proprietary IP after 30+ placements)

### What's deliberately NOT built
- Two-sided messaging on platform
- Bidding/marketplace mechanism  
- Calendly integration
- Heavy CRM
- Pricing page (pricing emerges from diagnosis reply)
- ATS
- Algorithmic matching
- Public talent directory with paywall (the existing $199 surface stays but isn't the primary CTA)

---

## PART 7 — BUILD STATE AS OF MAY 12, 2026

### Repo state

- Branch: `main`
- 3 commits ahead of `origin/main` (not pushed)
- Working tree clean
- Last commit: `a251208`

### Commit history (this session)
1. `de976ef` — `chore: remove dead root scripts, track scripts/ automation`
   - Deleted 20 loose .js patch scripts
   - Tracked `scripts/post-jobs-x.js` (auto-tweets new jobs)
   - Added `scripts/posted-jobs-state.json` to .gitignore
2. `2fbe9dc` — `refactor: rename /hire post-hire confirmation flow to /hire-confirm`
   - Moved 4 files: `/hire/confirmed/page.tsx` → `/hire-confirm/page.tsx`, `/api/hire/{confirm,count,nudge}/*` → `/api/hire-confirm/...`
   - Updated all internal references
   - Updated `src/app/page.tsx` to fetch from `/api/hire-confirm/count`
   - Updated `src/app/admin/AdminActions.tsx` to use `/api/hire-confirm/nudge`
3. `a251208` — `feat(intakes): add hire intake API route + extend rateLimit helper`
   - Extended `src/lib/rateLimit.ts` with optional windowSeconds / maxRequests params (defaults preserve existing behavior)
   - New `src/app/api/intakes/hire/route.ts` — POST handler with validation, rate limit (3 per email per 24h), Supabase insert (service role), two parallel Resend emails (auto-response + notification)
   - HTML escaping on all user input in outbound emails
   - Email failures don't fail the request (DB row is source of truth)
   - Generic public error messages (no field-level leakage)

### Verified working
- ✅ `/api/intakes/hire` POST returns 200 with valid input
- ✅ Returns 400 with invalid input (e.g., short symptom)
- ✅ Supabase row created
- ✅ Both Resend emails fire (verified in Resend dashboard)
- ✅ Notification arrived at `hello@shipstacked.com`
- ⚠️ Auto-response to `ox@agentagous.com` — Resend confirms dispatch, inbox not yet set up for verification

### Supabase tables

**Existing (untouched):**
- profiles, skills, projects, posts, post_likes, post_comments
- employer_profiles, jobs, applications, conversations, messages, saved_profiles
- hire_confirmations (post-hire flow, used by /hire-confirm)
- api_keys, candidates, candidate_outreach_log
- github_data, plus various

**Added this session:**
- `hire_intakes` — 18 columns. RLS enabled with NO policies (service role only access). Schema:
  ```sql
  id uuid pk default gen_random_uuid()
  created_at timestamptz not null default now()
  symptom text not null
  prior_role_title text
  urgency text not null check in (this_month, this_quarter, within_6_months, exploring)
  budget text not null check in (under_50k, 50k_200k, 200k_500k, 500k_plus, discuss)
  email text not null
  name text not null
  company text not null
  role text not null
  linkedin_url text
  status text not null default 'new' check in (new, triaged, responded, closed_won, closed_lost)
  thomas_response_at timestamptz
  thomas_notes text
  outcome text
  user_agent text
  referrer text
  ```
- Indexes: `created_at desc`, `status`

**Still to be created:**
- `claim_submissions` — for the /claim form (Step 4)
- `practitioner_targets` — for admin-side target list (or fold into existing `candidates`)

### Environment variables

**Existing in `.env.local`:**
```
STRIPE_SECRET_KEY (duplicated — cleanup tech debt)
STRIPE_WEBHOOK_SECRET (duplicated — cleanup tech debt)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
RESEND_API_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
NEXT_PUBLIC_SITE_URL
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
X_SHIPSTACKED_API_KEY
X_SHIPSTACKED_API_SECRET
X_SHIPSTACKED_BEARER_TOKEN
X_SHIPSTACKED_ACCESS_TOKEN
X_SHIPSTACKED_ACCESS_TOKEN_SECRET
RESEND_SEGMENT_BUILDERS
RESEND_SEGMENT_EMPLOYERS
RESEND_SEGMENT_CLIENTS
```

**Added this session:**
```
INTAKE_NOTIFY_EMAIL=hello@shipstacked.com
```

**NOTE: `INTAKE_NOTIFY_EMAIL` must be added to Vercel before any deploy.**

### Git identity (locked for this repo)
- `user.name`: Thomas Oxlee
- `user.email`: `ox@agentagous.com`
- Set repo-local (not --global)
- Inbox for ox@agentagous.com not yet accessible — email forwarding pending

### Codebase tech debt (parked, NOT for tonight)
1. Duplicate `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `.env.local`
2. Hardcoded `CRON_SECRET = '<ROTATED_CRON_SECRET_REDACTED>'` in `src/app/api/hire-confirm/nudge/route.ts` — should be `process.env.CRON_SECRET`
3. `src/app/api/inquiry/route.ts` lacks HTML escaping in outbound emails (the new intake route DOES escape, set the pattern)
4. Next.js 16 `middleware` deprecation warning — needs rename to `proxy` at some point (file currently at `src/middleware.ts`)
5. External cron scheduling (if any) for `/api/hire-confirm/nudge` needs URL update in whichever external system schedules it. Verify in Vercel dashboard → Crons tab and Upstash console. If nothing's there, dormant nudge has zero impact.

### Stack confirmed
- Next.js 16.2.1 (Turbopack default in dev)
- React 19.2.4
- Tailwind 4 (with `@tailwindcss/postcss`)
- TypeScript 5
- Supabase (with `@supabase/ssr` for SSR, `@supabase/supabase-js` for service role)
- Anthropic SDK 0.82.0
- Resend 6.9.4
- Stripe 21.0.1
- Upstash Redis 1.37.0 (for rate limiting)
- `@vercel/og` for OG image generation
- twitter-api-v2 1.29.0 (for `scripts/post-jobs-x.js`)

### File structure
- `src/app/` — App Router routes
- `src/app/components/` — NavBar, FooterBar, BuilderMap, Scout
- `src/app/api/` — API routes (including new `/api/intakes/hire/route.ts`)
- `src/lib/` — apiAuth, supabase (browser), supabase-server (SSR), types, rateLimit, autoVerify, user, xPost
- `src/middleware.ts` — auth + role routing (deprecated in Next 16, rename to proxy later)

### Important conventions
- AGENTS.md says: "This is NOT the Next.js you know. This version has breaking changes." Read `node_modules/next/dist/docs/` before assuming patterns.
- Inline styles using design tokens (--accent: #0071e3, --bg, --text, etc.). Not Tailwind classes for most pages.
- Service role Supabase client for admin routes (RLS bypass)
- Browser client (`createClient` from `@/lib/supabase`) for client-side auth-aware code
- Server SSR client (`createServerSupabaseClient` from `@/lib/supabase-server`) for protected pages

---

## PART 8 — RESUME SEQUENCE (FOR NEXT SESSION)

### Pick up immediately at Step 3d

In order:

**Step 3d:** Build `src/app/hire/thanks/page.tsx` — simple confirmation page. Heading: "Got it. Talk soon." Body explaining the three things they'll hear back. Link to /atlas (will 404 until Step 5).

**Step 3e:** Build `src/app/hire/HireIntakeForm.tsx` — client component with all 5 fields, useState for everything, POST to `/api/intakes/hire` on submit, redirect to `/hire/thanks` on success, inline error on failure.

**Step 3f:** Build `src/app/hire/page.tsx` — server component wrapper. Metadata (title, description, canonical). Dark hero (gradient like /api-docs) with eyebrow "FOR HIRING TEAMS", h1 "Tell me what's broken.", sub explaining the diagnosis. White card below containing `<HireIntakeForm />`.

**Step 3g:** Test in browser. Submit valid → land on /hire/thanks + Supabase row + 2 Resend emails. Submit invalid → see inline error.

**Step 3h:** Commit Step 3 UI work.

**Step 4:** /claim form — mirror /hire structure but for practitioners claiming Atlas roles.
- New Supabase table `claim_submissions`
- API at `/api/intakes/claim`
- Page at `/claim/page.tsx`
- Form component
- Success page at `/claim/thanks`

**Step 5:** /atlas page — the long-form Atlas v0.3 content rendered as web. The Atlas content is in this conversation history. Storage: probably as a Markdown file in `src/content/atlas-v03.md` and rendered via a markdown renderer, OR as a TS data structure. Anchor links per part. Sticky CTAs for /hire and /claim. JSON-LD structured data. llms.txt at site root pointing to it.

**Step 6:** /admin/intakes view — server-rendered table of hire_intakes and claim_submissions. Status update controls. Notes field. Admin-gated like `/admin/candidates` (check user email against `ADMIN_EMAIL` constant).

**Step 7:** Homepage + nav + footer adjustments
- Add "Atlas" link to NavBar (in unauthenticated homepage section)
- Add "Atlas" to FooterBar
- Add new Atlas section on homepage (between manifesto and build feed preview)
- Adjust hero — keep builder primary CTA, add secondary "Tell me what's broken" linking to /hire
- Replace or remove "10+ hires made" badge (decide when we get there)

**Step 8:** Pre-deploy
- Add `INTAKE_NOTIFY_EMAIL=hello@shipstacked.com` to Vercel env vars
- Smoke test all new routes
- `git push origin main`
- Verify deploy
- Smoke test prod

### Distribution begins
After Step 8 ships, the 6-week campaign starts Monday May 18. Thomas writes the anchor post Sunday May 17. Claude drafts named-send templates customized to specific recipients in the meantime.

---

## PART 9 — OPERATIONAL REMINDERS

### Thomas's commitments (LOCKED)
1. 60-75 min per intake on first 10 replies — diagnosis is the product
2. 5 rooms per week distribution discipline for 6 weeks
3. Weekly Friday field reports from inside the legal practice (anonymous)
4. 8-12 hours per week supply-side work (named outreach to target firms)
5. Will write the Monday anchor post personally + every Friday field report personally — voice cannot be faked

### Claude's role (LOCKED)
- Research depth and execution clarity, not strategic invention
- Draft structural/fight posts and named-send copy templates
- Build technical artifacts (forms, pages, APIs)
- Honest assessments — no sugar coating
- Default to additions to the plan, not rewrites
- When the plan needs to change, flag explicitly: "This challenges decision X — revisit or hold?"
- Treat locked decisions as constraints, not open questions

### Communication patterns Thomas pushed back on
- Pre-empting too many steps (give one step at a time, wait for completion)
- Treating every question as a rewrite signal (most are adjustments inside existing frame)
- Restructuring instead of admitting gaps (be direct: "you're right, here's the gap, here's the small adjustment")
- Over-batching prompts to Claude Code (one focused task at a time)

### Risk tolerance signals from Thomas
- High — willing to publicly post about the pivot, publicly admit shipstacked v1 didn't work
- Will lean into Spain/EU positioning but knows global English-language is the bigger play
- Spain audience is a drop in the ocean and behind frontier-lab reality
- Spanish VCs notice you because the global market notices you first
- Comfortable being publicly imperfect; not comfortable being publicly inaccurate

### Things Claude should NOT do
- Suggest fundraising as a near-term priority (it isn't)
- Propose feature builds outside the launch scope (Stripe Connect, advanced ATS, two-sided messaging, etc.) — those are post-launch
- Re-litigate the marketplace vs. service-business decision
- Push for content production that requires faking practitioner voice
- Lose the existing builder community in pursuit of the new positioning (additive reframe, not full repositioning)
- Run multiple commands at once when Thomas asks for step-by-step

---

## PART 10 — KEY URLS AND RESOURCES

- Live site: https://shipstacked.com
- Project root local: `/Users/thomasoxlee/shipstacked`
- Supabase Studio: https://supabase.com/dashboard (project: shipstacked)
- Resend dashboard: https://resend.com/emails
- Vercel dashboard: https://vercel.com/dashboard (project: shipstacked)
- Stripe dashboard: https://dashboard.stripe.com
- GitHub repo: presumed under `thomasoxlee/shipstacked` (need confirmation)
- Spanish legal practice: ANONYMOUS — never named, never identified
- Thomas X handle: @thomasoxlee (and @ShipStacked for company)

## PART 11 — DISTRIBUTION TARGETS (named sends, in priority order)

1. **Gergely Orosz (Pragmatic Engineer)** — FDE piece is canonical. Angle: Deployment Strategist (Echo) pattern propagating from Palantir to Anthropic/OpenAI/Salesforce.

2. **swyx (Latent Space, AI Engineer Summit)** — Angle: operator economy as fourth labor population. Cluster F focus.

3. **Bloomberry author** — Built on their 1,000-FDE-jobs analysis. Vertical share growing from 21% to 35-40%.

4. **Sahil Lavingia** — Operator economy. Cluster F resonates with his Gumroad audience.

5. **AI policy/compliance journalist** — Most likely targets: Madhumita Murgia (FT, already covers EU AI Act), Anna Tong (Reuters), Cat Zakrzewski (WaPo), Politico Europe AI desk. Angle: EU AI Act 12 weeks out, operating inside regulated EU deployment.

6. **Strategic investor** — Most likely: Olivia Moore (a16z, covers AI labor and operator economy), Packy McCormick (Not Boring, strategic frame), Nathan Benaich (State of AI Report), Sarah Wang (a16z), Elad Gil.

### Podcasts (week 5 pitch round)
- Latent Space (swyx — pre-warmed by week 1 send)
- Cognitive Revolution (Nathan Labenz)
- No Priors (Sarah Guo / Elad Gil)
- Lenny's Newsletter podcast (operator economy angle)
- 20VC (Harry Stebbings — operator economy + AI labor)
- Acquired (long-shot, right hook)

### Domain experts to engage (post-launch)
- Pieter Levels (operator)
- Danny Postma (operator)
- Sarah Chen (operator)
- Maor Shlomo (operator — Base44 sold to Wix for $80M)
- Bug0 founder (boutique operator with "Outcome-as-a-Service")

---

## CLOSING NOTE FOR THE NEXT SESSION

This is a real business with real momentum. Three commits in tonight, working API, verified email delivery. The legal practice deployment is producing real field signal. The market timing is unprecedented (OpenAI Deployment Company launched literally today). The Atlas v0.3 is the strongest single document on this labor market.

The work remaining is execution, not strategy. The strategy is locked. The build sequence is locked. The 6-week campaign is locked.

Resume at Step 3d.

— End of handover —
