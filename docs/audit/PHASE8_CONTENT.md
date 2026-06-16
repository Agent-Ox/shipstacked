# Phase 8 — Content pass

**Discovery + execution diff plan.** Ship the marketing surface that backs outreach: homepage with clear value prop, How It Works explainer, FAQ, public pricing page. Hybrid voice — plainspoken for human visitors, technical depth for the AI-buyer ICP and agent-onboarding surface.

**Locked decisions:**
- **Scope:** Homepage + How It Works + FAQ + Pricing (no blog, no docs, no comparison pages)
- **Voice:** Hybrid — operator-to-operator for buyers/builders/teams, technical/architectural for agents and the technical-buyer surface
- **Execution:** Architect-Claude drafts all copy, operator reviews and flags voice issues, terminal Claude ships. Operator does NOT write from scratch.

**What Phase 8 ships:**

1. **`/` (homepage)** — Replaces whatever's there now. Hero + value prop + four-pillar overview + CTA per visitor type. Single-page-app feel, all content above-the-fold-plus-one-scroll.

2. **`/how-it-works`** — The mechanics. For each pillar: signup → publish → get discovered. Explainer of receipts, Atlas roles, agent-discoverable surface. ~600 words.

3. **`/faq`** — Anticipated questions: what is this, how is it different from LinkedIn/Upwork, what's verified work, what does Atlas mean, what do agents do, what does it cost. ~15 Q&As.

4. **`/pricing`** — Public pricing page. Stripe products already wired; Phase 8 surfaces them as a real page.

5. **Footer + nav updates** — Every page links to the others. Footer carries About / How It Works / FAQ / Pricing.

**What Phase 8 does NOT do:**
- No /about page (homepage carries the "what is this" weight)
- No blog scaffolding
- No comparison pages (LinkedIn vs ShipStacked etc.)
- No docs site (auth.md already serves the technical docs role)
- No SEO meta-optimization beyond what JSON-LD already provides
- No image generation / illustrations beyond what existing OG cards provide

**Scope estimate:** 6-10 hours, one session.

**Files (estimated):**
- NEW: 3-4 (`src/app/how-it-works/page.tsx`, `src/app/faq/page.tsx`, `src/app/pricing/page.tsx`, possibly a shared marketing footer component)
- Modified: 2-4 (`src/app/page.tsx` homepage rewrite, possibly the global layout for nav updates)

---

## §A — Pre-flight reads

1. **Read `src/app/page.tsx`** — current homepage, full file. Phase 8 rewrites this.
2. **Read `src/app/layout.tsx`** — global layout, confirm where nav lives.
3. **Check for existing nav component** — `grep -rn "ShipStacked" src/app/ --include="*.tsx" | grep -i "nav\|header"`
4. **Check Stripe products on prod** — confirm what pricing tiers actually exist. Either via Stripe Dashboard or via the existing checkout code in Phase 2.
5. **Check for existing `/pricing`, `/how-it-works`, `/faq`, `/about` routes** — `ls src/app/pricing src/app/how-it-works src/app/faq src/app/about 2>/dev/null`

After reads, report findings and confirm pricing tiers. Then architect-Claude drafts copy block by block.

---

## §B — Block 1: Homepage rewrite

Architect-Claude drafts the full homepage copy in a single block. Operator reads, flags anything off, terminal Claude implements.

**Homepage structure (single scroll):**

```
[Hero]
  Headline: <short, sharp, operator voice>
  Subhead: <one sentence>
  Two CTAs: "Ship your first proof" | "Hire from the network"

[The wedge — three lines]
  - Builders post the work they actually ship.
  - Buyers find practitioners with verified receipts.
  - Agents handle discovery and outreach.

[Four pillars — small cards]
  Builder | Team | Agent | Buyer
  One line each + "Sign up →" link

[Why this exists]
  ~150 words explaining the gap: LinkedIn is performance, Upwork is bidding, GitHub is code-only.
  ShipStacked is shipped-work + receipts + Atlas classification.

[The technical depth — for ICP buyers]
  ~120 words: AgentCard at /.well-known/agent-card.json, Atlas crosswalks 
  (ISCO-08, SOC 2018, O*NET), machine-readable JSON-LD, V1 REST API.
  Link to /how-it-works for the full explainer.

[CTA strip at bottom]
  "Ready to ship?" — Sign up
  "Looking to hire?" — /talent
  "Building an agent?" — /auth.md
```

**Implementation:** single page.tsx with inline JSX, follows existing brand palette (cyan-accent for agents, purple for teams, etc.). No new components.

---

## §C — Block 2: How It Works

**Page structure:**

```
[Hero] "How ShipStacked works"
  One-sentence intro: receipts + classification + discovery.

[For builders]
  - Sign up (Card 1)
  - Paste shipped work; we classify against Atlas; you confirm or correct
  - Your /u/<username> page becomes machine-discoverable
  - Buyers find you by capability, not keyword
  
[For teams]
  - Card 2 signup; team profile + member linking
  - Aggregate receipts across the team
  - Buyers discover teams by services + Atlas role

[For agents]
  - Card 3 signup OR auth.md OTP flow
  - agent:rw API key
  - GET /api/v1/agent, POST /api/v1/builds, all V1 endpoints
  - Your agent participates in /talent?type=agent

[For buyers]
  - Card 4 signup + Stripe subscription
  - Search /talent or /api/v1/talent/search
  - Filter by Atlas cluster/role, verified-only, recent activity
  - Contact builders/teams/agents directly

[Atlas in 60 seconds]
  ~100 words: what Atlas is (a taxonomy of AI-native practitioner roles), 
  why it matters (machine-readable competency, not free-text skills), 
  the seven clusters, link to /atlas.

[CTA]
  Sign up + view the network
```

---

## §D — Block 3: FAQ

**~15 Q&As across three groups.** Plain answers, no marketing fluff.

```
General
  - What is ShipStacked?
  - How is this different from LinkedIn?
  - How is this different from Upwork?
  - Is this a job board?
  - What does "verified work" mean?

For builders
  - How do I get listed?
  - What counts as proof of work?
  - Do I need to pay?
  - Can my agent post on my behalf?

For buyers
  - How do I find someone?
  - What does a subscription get me?
  - Can I cancel anytime?
  - Are the receipts actually verified?

For agents (technical buyer / agent developer)
  - What's at /.well-known/agent-card.json?
  - How does agent:rw scope work?
  - Where's the API documentation?
  - What's Atlas and why does it matter for matching?
```

---

## §E — Block 4: Pricing

**Public pricing page.** §A.4 discovery determines exact tier shape; Phase 8 copy describes them plainly.

Likely structure (refined after §A):
```
[Hero] "Pricing"
  One line on the value model.

[Free tier — builders/teams/agents]
  - Sign up free
  - Publish receipts
  - Get discovered by buyers
  - Use the V1 API (rate-limited)
  - "Free forever" — link to signup

[Paid tier — buyers]
  - $X/month
  - Search the network
  - Contact builders/teams/agents
  - Atlas-keyed filtering
  - "Subscribe →" — link to checkout

[Enterprise / agency tier — if exists]
  - Custom

[FAQ snippet]
  - Why is it free for builders?
  - Why is it paid for buyers?
  - Refund policy.
```

---

## §F — Block 5: Footer + nav

Every page should link to the others. Header has logo + Talent + Pricing + Sign up. Footer has full sitemap: How It Works / FAQ / Pricing / API docs (auth.md) / Atlas.

Implementation: either a shared component (`src/app/components/SiteFooter.tsx`) or inline in each page. Architect picks based on existing patterns from §A.

---

## §G — Block 6: Final validation + ship

- npx tsc --noEmit
- npm run build (all 4 new routes register)
- verify-agent-card.ts on localhost (no regressions)
- Visual check: dev server up, curl each page, confirm content renders + no broken links
- Stage, commit, push, post-deploy verify

---

## §H — Decisions locked

- Hybrid voice (plainspoken visible surfaces; technical depth where ICP expects it)
- Architect drafts all copy; operator reacts; terminal Claude ships
- Four new pages only (homepage rewrite + 3 new)
- Existing brand palette (no new colors)
- Inline JSX, minimal new components
- No new images / illustrations / video

## §I — Deferred

- Blog scaffolding
- About page (homepage carries the weight)
- Comparison pages
- SEO meta beyond JSON-LD
- Docs site (auth.md serves)
- Image generation

End of Phase 8 plan.
