# Phase 8 §C/D/E — How It Works + FAQ + Pricing (combined draft)

Three pages, one commit. Operator reads, flags anything off, terminal Claude ships. Same brand palette as homepage: builder blue `#0071e3`, team purple `#6c63ff`, agent cyan `#06b6d4`, hiring amber `#bf7e00`.

All three pages use the same shell pattern as the homepage (server components, inline styles, `<a href>` for navigation, no client-side data fetches).

---

## §C — `/how-it-works`

### Page metadata

Title: `How ShipStacked works`
Description: `Sign up, publish work, get classified, get found. The mechanics behind the four-pillar proof-of-work registry.`
Canonical URL: `https://shipstacked.com/how-it-works`

### Section 1 — Hero

**How ShipStacked works**

ShipStacked is built around one mechanic: the artifact of work is the credential. You publish what you shipped — a repo, a deployment, a document, an outcome — and the platform classifies it, verifies what it can, and makes it discoverable by humans and by agents.

Here's what that looks like for each of the four customer types.

### Section 2 — For builders

**For builders** (blue accent)

You sign up at `/join` Card 1 with an email and password. Free. Takes about 60 seconds.

You build a profile — what you do, where you're based, what tools you use. You can connect your GitHub for additional signal.

You publish proof of work. Paste a URL — a deployed app, a repo, a published document, anything with an artifact. ShipStacked extracts what it can (title, outcome, host, timestamps) and classifies the work against the Atlas role taxonomy. You confirm or correct the classification.

Your profile becomes machine-discoverable at `/u/<username>`. Buyers can find you. Buyer-agents can find you. The work is in JSON-LD, the Atlas roles are queryable, the proof is verified at the highest level the artifact supports.

You can also let an agent post on your behalf. Generate an agent:rw API key and your agent fills your profile, posts your builds, and keeps your work current.

### Section 3 — For teams

**For teams** (purple accent)

You sign up at `/join` Card 2 with your team name and a URL slug. Free.

You build the team profile — services offered, location, team size. Existing builders on the platform can link themselves to your team via their own profile edit page; you can also see them in your team's edit surface.

Your team page renders at `/team/<slug>`. Aggregate receipts across your team surface there. The team is discoverable as a single entity with its own Atlas role coverage based on the work your members have published.

Buyers searching by capability or by team services find you. Agencies, studios, and consultancies use this surface to show collective proof of work rather than individual practitioners hiding inside an opaque "we do AI" website.

### Section 4 — For agents

**For agents** (cyan accent)

There are two ways to onboard an agent.

The first is signup: a human registers the agent at `/join` Card 3 with a name, slug, provider (Claude, OpenAI, Cursor, Gemini, custom), optional model, and a list of capabilities. The agent gets a public profile at `/agent/<slug>`.

The second is programmatic registration via `/auth.md`. The agent reads the auth.md surface, runs the OTP flow, claims a scoped API key, and starts acting on its principal's behalf.

Either way, the agent gets:
- A discoverable profile (capability discovery for the network)
- A scoped API key (`agent:rw`)
- Full V1 REST API access (search, post receipts, manage profile)
- Participation in `/talent?type=agent` — other agents can find this agent the same way buyers find builders

Every agent on ShipStacked acts on behalf of a principal — its owner by default, or a team the owner admins.

### Section 5 — For buyers

**For buyers** (amber accent)

You sign up free at `/join` Card 4 if you only want to hire. If you already have a Builder, Team, or Agent account, you toggle Hiring Access on from your dashboard — same effect, $199 a month, cancel anytime.

You search `/talent` directly, filtered by Atlas cluster, capability, location, or recency. The search is SQL-keyed against verified work, not free-text against profiles.

You contact builders, teams, and agents directly from their profile pages. No platform commission. No bidding marketplace. You see what they shipped, you reach out, you make a deal.

You can run a buyer-agent. Generate a `buyer:rw` API key and give it to your hiring agent (Claude, an internal tool, anything that can read `/.well-known/agent-card.json`). It queries `/api/v1/talent/search` on your behalf and returns matches based on Atlas-keyed capability.

### Section 6 — Atlas in 60 seconds

**Atlas in 60 seconds**

Atlas is ShipStacked's role taxonomy — a structured vocabulary for AI-native practitioner capabilities. Roles are grouped into seven clusters (A through G), each with a defined scope.

Atlas roles are crosswalked against established occupational vocabularies: ISCO-08, SOC 2018, O*NET, and EU AI Act Annex III. So a practitioner classified under Atlas A4 here is discoverable to external systems using those vocabularies too.

Why this matters: it means "AI engineer" or "ML practitioner" isn't a free-text claim on a profile. It's a structured classification against a taxonomy that other systems can read. Buyer-agents querying ShipStacked don't need to interpret natural language — they query roles directly.

Atlas is queryable at `/atlas`. Individual roles live at `/atlas/roles/<id>` — for example, `/atlas/roles/A4`. Each role page shows the practitioners working in that role across all three customer types.

[Explore the Atlas →](/atlas)

### Section 7 — Closing CTA

**Get started**

→ [Sign up free](/join)
→ [Browse the talent network](/talent)
→ [Read the API surface](/api-docs)

---

## §D — `/faq`

### Page metadata

Title: `FAQ — ShipStacked`
Description: `Common questions about the proof-of-work registry, four customer types, Atlas classification, and pricing.`
Canonical URL: `https://shipstacked.com/faq`

### Page header

**Frequently asked questions**

Plain answers. If something here isn't clear, message us.

### Section 1 — General

**What is ShipStacked?**

A proof-of-work hiring platform built for AI-native work. Builders, teams, and agents publish what they've shipped. Buyers find them by what they've actually built. Agents on either side handle discovery and outreach.

**How is this different from LinkedIn?**

LinkedIn shows what people claim about themselves. ShipStacked shows what people have actually shipped, classified against a structured role taxonomy. Your work history is queryable; on LinkedIn it's free-text on a profile that anyone can write anything on.

**How is this different from Upwork?**

Upwork is a bidding marketplace. Lowest bidder wins, race-to-the-bottom on price, opaque on quality. ShipStacked has no bidding and no commission. Buyers see verified work, contact practitioners directly, and make their own deals.

**Is this a job board?**

No. There are no job postings to apply to. Buyers see practitioners and reach out. Practitioners see who's hiring through inbound contact. The match is capability-keyed, not application-driven.

**What does "verified work" mean?**

When you publish proof of work, ShipStacked checks what it can about the artifact. Was the URL reachable? Did the page exist when claimed? Was the deployment live? Each receipt gets a verification level — L1 means the artifact was confirmed at the time of publication. Higher verification levels are roadmapped for stronger forms of proof.

### Section 2 — For builders, teams, and agents

**How do I get listed?**

Sign up free at [/join](/join). Choose Builder (Card 1), Team (Card 2), or Agent (Card 3). Fill in your profile, publish proof of work, you're listed.

**What counts as proof of work?**

Any shipped artifact with a URL. A deployed app. A live document. A published repo. A blog post. A demo video. A screenshot of an outcome. ShipStacked tries to extract what it can; you fill in the rest.

**Do I have to pay?**

No. Builders, teams, and agents are free forever. You only pay if you also want to hire — that adds Hiring Access for $199 a month.

**Can my agent post on my behalf?**

Yes. Generate an `agent:rw` (or `builder:rw`, or `team:rw`) API key from your dashboard. Give it to your agent along with the system prompt from the auth.md surface. The agent fills your profile, posts your builds, and keeps your work current. Same principle for teams and registered agents.

### Section 3 — For buyers

**How do I find someone?**

Browse [/talent](/talent). Filter by Atlas cluster, capability, location, verification status, or recency. The search is keyed against verified work, not free-text against profiles.

**What does Hiring Access get me?**

Unlimited search across the full network of builders, teams, and registered agents. Direct contact with practitioners. Atlas-keyed filtering at full depth. A `buyer:rw` API key for running your own buyer-agent if you build one.

**Can I cancel anytime?**

Yes. Cancel from your account settings. No prorated refunds on the current month; you keep access until the period ends.

**Are the receipts actually verified?**

At the time of publication, yes — at L1 (artifact confirmed). What this means in practice: when someone publishes "I shipped X at URL Y," the platform checks that URL Y existed and matched the claim at publication time. It doesn't mean the practitioner did all the work alone, or that the work was their best work, or any other subjective quality claim. You evaluate the practitioner; ShipStacked evaluates the artifact.

### Section 4 — For technical buyers and agent developers

**What's at `/.well-known/agent-card.json`?**

The AgentCard. It declares the skills ShipStacked publishes — currently ten skills covering profile fetch, search, build posting, Atlas role lookup, and more. Any agent that reads AgentCards can discover and call ShipStacked's surface programmatically. Public, no auth required to read.

**How does `agent:rw` scope work?**

API keys are scoped. `builder:rw` lets a key act on a builder profile. `buyer:rw` lets a key run searches and contact practitioners (requires active Hiring Access). `team:rw` lets a key manage a team profile. `agent:rw` lets a key manage a registered agent. All scopes have rate limits.

**Where's the API documentation?**

`/api-docs` for the human-readable docs. `/auth.md` for the agent-protocol docs (machine-resolvable, machine-readable, what an agent reads to onboard programmatically).

**What's Atlas and why does it matter for matching?**

Atlas is the role taxonomy ShipStacked uses to classify shipped work. Instead of free-text skills ("React developer," "AI engineer"), each receipt gets one or more Atlas role IDs (`A4`, `B3`, etc.). Matching engines query against these structured role IDs, not against natural language. This means an agent searching "find me practitioners shipping work in Atlas cluster A" gets a deterministic SQL-keyed result, not a fuzzy embedding search.

### Section 5 — Closing

**Something else?**

If your question isn't here, the answer is probably "yes, it works, here's the link." Try `/talent`, `/atlas`, `/api-docs`, or `/auth.md`. Or [sign up](/join) and look around.

---

## §E — `/pricing`

### Page metadata

Title: `Pricing — ShipStacked`
Description: `Free for builders, teams, and agents. $199/month for Hiring Access. No commission, cancel anytime.`
Canonical URL: `https://shipstacked.com/pricing`

### Section 1 — Hero

**Pricing**

Sign up free. Pay only when you hire. No commission on what you do here.

### Section 2 — The two cards

Two-column grid, equal weight visually. On mobile, stack vertically.

**Card 1: Free** (blue/purple/cyan accent — neutral, "for everyone who publishes")

**Free forever**

For builders, teams, and registered agents.

What you get:
- Public profile at `/u/<username>`, `/team/<slug>`, or `/agent/<slug>`
- Unlimited proof-of-work publishing
- Atlas role classification on every published receipt
- Machine-readable JSON-LD on every profile
- Full V1 REST API access (rate-limited)
- Inbound contact from buyers
- Discoverability in the talent network

What you don't get:
- Outbound search (no Hiring Access without subscription)
- Buyer-agent API scope

→ [Sign up free](/join)

**Card 2: Hiring Access** (amber accent)

**Hiring Access — $199/month**

Add to any account. Cancel anytime.

What you get:
- Unlimited search across builders, teams, and registered agents
- Direct contact with any practitioner on the network
- Atlas-keyed filtering at full depth
- `buyer:rw` API key for buyer-agents
- Cross-pillar discovery (one search, all three customer types)

What you don't get:
- A separate profile (your existing Builder/Team/Agent profile stays as-is)
- Any platform commission on hires (zero)

→ [Get Hiring Access](/join)

### Section 3 — How it works

**How billing works**

1. Sign up free at [/join](/join). Choose Builder, Team, Agent, or Buyer-only.
2. From your dashboard, toggle Hiring Access on.
3. Stripe handles checkout. You're a subscriber immediately.
4. Cancel anytime from your account settings. Access continues until the current period ends.

No prorated refunds. No annual commitment. No tiers. No upsells.

### Section 4 — Common questions

**Why is it free for builders, teams, and agents?**

The platform's value is the network. Builders, teams, and agents publishing work IS the platform. Charging supply for the privilege of being discoverable kills the registry. Buyers pay because Hiring Access is the surface that converts attention into money.

**Why is it $199 a month?**

Because that's roughly what it costs to keep the lights on per active buyer, with a margin for the work of running a registry. Not a teaser, not a loss-leader, not a "starting at" — it's the price.

**Can I get a refund?**

Cancel anytime and you stop being billed at the end of the current period. No mid-period refunds. If the platform genuinely failed for you, message us.

**Is there an enterprise tier?**

No. Same price for everyone. If you need something the standard tier doesn't cover, message us before assuming.

**What about agencies hiring?**

Agencies operate as Teams on ShipStacked (free profile). When they want to hire — for subcontractors, freelancers, or staffing — they add Hiring Access to the same account. $199 a month, same as anyone else.

### Section 5 — Closing CTA

**Ready?**

→ [Sign up free](/join) — Builder, Team, Agent, or Buyer-only
→ [Browse talent first](/talent) — see what's published before signing up

---

## Implementation notes for terminal Claude

All three pages are server components with inline styles, mirroring the homepage's pattern. Each lives at:

- `src/app/how-it-works/page.tsx`
- `src/app/faq/page.tsx`
- `src/app/pricing/page.tsx`

Each needs:
- Title + meta description (use Next.js `Metadata` export)
- The content above, rendered as semantic HTML (h1, h2, h3, p, ul/li, a)
- Brand palette consistent with homepage
- Mobile-responsive (single-column on narrow viewports)
- Each page should have nav back to `/` somewhere reachable (the global NavBar already handles this — no per-page nav needed)
- Footer (global FooterBar) already linked from layout — no per-page footer

Visual chrome: similar feel to `/atlas` and `/u/<username>` server-rendered pages — clean, generous whitespace, no marketing flourishes.

For pricing, the two cards should be visually distinct: Free card uses a neutral border, Hiring Access card uses the amber accent. The "$199/month" should be large and prominent on the Hiring Access card.

CTAs throughout link to `/join` (signup), `/talent` (browse), `/atlas` (Atlas explorer), `/api-docs` (technical docs), `/auth.md` (agent protocol).

## Validation

After implementation:
- `npx tsc --noEmit` (exit 0)
- `npm run build` (exit 0; the three new routes register)
- Start dev server, curl each:
  - `curl -s http://localhost:3000/how-it-works | grep "How ShipStacked works"`
  - `curl -s http://localhost:3000/faq | grep "Frequently asked questions"`
  - `curl -s http://localhost:3000/pricing | grep "Hiring Access"`
- `verify-agent-card.ts` against localhost (no regression)
- Stop dev server

## Ship

One commit covers all three pages. Commit message:

```
Phase 8 §C/D/E: How It Works + FAQ + Pricing pages

Adds three supporting pages backing the homepage's CTAs:

- /how-it-works — mechanics per customer type (Builder, Team,
  Agent, Buyer) + Atlas in 60 seconds.
- /faq — five sections of plain-spoken Q&A across general,
  supply-side (builders/teams/agents), demand-side (buyers),
  and technical buyer / agent developer audiences.
- /pricing — two cards (Free forever / Hiring Access $199/mo),
  billing mechanics, common questions.

Copy authored by architect-Claude. No external copywriter pass
on these pages (mechanical exposition, less voice-dependent
than the homepage).

All three are server components, inline-styled, brand palette
consistent with Phase 8 §B homepage. Mobile-responsive.

Did NOT change:
- Homepage (already shipped in Phase 8 §B)
- Nav or footer (global components, already link to these
  routes via FooterBar; Phase 8 §F revisits if needed)
- Any other route

Discovery + plan: docs/audit/PHASE8_CONTENT.md.

Co-Authored-By: Claude <noreply@anthropic.com>
```

Push, post-deploy verify with curls against prod, report back.
