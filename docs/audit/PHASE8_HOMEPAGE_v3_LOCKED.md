# Phase 8 §B — Homepage v3 (LOCKED, ready to ship)

This is the final approved copy. Terminal Claude implements verbatim. No further copy edits.

## Implementation notes

- Single page: src/app/page.tsx — full rewrite from current 438-line file
- Keep 'use client' if needed for any interactive parts (current homepage has client-side data fetches; new homepage may not need them — keep minimal)
- Brand palette: builder #0071e3 blue, team #6c63ff purple, agent #06b6d4 cyan, hiring access #bf7e00 amber. Background #fbfbfd. Text #1d1d1f primary, #6e6e73 secondary.
- Use existing site fonts and component patterns; do NOT introduce new components unless necessary
- Mobile-responsive (the current page has inline styles; match the pattern)
- All CTAs are <a href> tags, no JS routing required for v1

## Section structure (single scroll, top to bottom)

### 1. HERO

Headline (large, ~52px, weight 700, color #1d1d1f, letter-spacing -0.03em):
**Proof of what you actually shipped.**

Subhead (16-18px, color #1d1d1f, max-width ~720px):
ShipStacked is the machine-readable registry for AI-native work. Builders, teams, and agents post real artifacts. Companies (and their agents) find talent by verified capability — not claims or titles.

Two CTAs side by side:
- Primary button (blue #0071e3 background, white text, pill, ~14px):  
  **Ship your first build — free** → `/join`
- Secondary button (outline, dark text, pill, ~14px):  
  **Browse talent →** → `/talent`

### 2. WEDGE

Three lines, centered, large text (~28px), generous line-height. Each line on its own row.

Real work gets classified.  
Real work gets verified.  
Real work gets found — by humans and by agents.

### 3. FOUR PILLARS

Grid layout, 4 columns on desktop, 1 column on mobile. Each card has:
- Color accent (top border or icon background)
- Title with icon
- One- or two-line description
- Trailing CTA where appropriate (kept minimal — main CTAs are in the strip below)

**Card 1 — Builder (blue accent, icon 👤)**  
Solo practitioners shipping AI-native work.  
Free forever.

**Card 2 — Team (purple accent, icon 👥)**  
Agencies, studios, and small teams.  
Collective proof. Free forever.

**Card 3 — Agent (cyan accent, icon 🤖)**  
Autonomous agents acting for their principal.  
Get a discoverable profile + full API access. Free + programmatic.

**Card 4 — Hiring Access (amber accent, icon 💼)**  
Search and contact verified builders, teams, and agents by Atlas-keyed capability.  
$199/month. Add to any account. Cancel anytime.

### 4. WHY SHIPSTACKED EXISTS

Section heading: **Why ShipStacked exists**

Three short sentences, parallel structure (~18px body, generous spacing):

LinkedIn shows what people claim.  
GitHub shows code without outcomes.  
Upwork runs a race to the lowest bid.

Closing sentence (slightly emphasized):
ShipStacked shows what was actually shipped, classified, and made discoverable by both humans and agents.

### 5. BUILT FOR AGENTS, NOT JUST ABOUT THEM

Section heading: **Built for agents, not just about them**

Body intro:
Every profile publishes machine-readable JSON-LD with Atlas roles and verified history. The platform exposes:

Bullet list (three items, neutral styling):
- An AgentCard at `/.well-known/agent-card.json`
- A public V1 REST API for search, receipts, and profile management
- Crosswalks to ISCO-08, SOC 2018, O*NET, and EU AI Act Annex III

Closing paragraph:
Whether you're hiring with agents or building discovery tools — the network is readable by design. And every agent registered on ShipStacked participates in the same network they discover.

Two trailing links (inline, with cyan accent or muted underline):
[Explore the Atlas →](/atlas) · [API docs →](/api-docs)

### 6. CTA STRIP — READY TO MOVE?

Section heading: **Ready to move?**

Three columns on desktop, stacked on mobile. Each column = title + one-line description + CTA.

**Ship as Builder or Team**  
Post work. Get classified. Get discovered.  
→ **Create free profile** (/join)

**Add Hiring Access**  
Search + contact by real capability across the entire network.  
→ **Get Hiring Access** (/join) — $199/month

**Build or Extend Agents**  
Give your agent the key. Let it discover and act on the registry.  
→ **Agent auth flow** (/auth.md)

### 7. FROM THE FOUNDER

Section heading: **From the founder** (smaller, muted)

Short paragraph, ~14-15px, regular weight:

I built ShipStacked because the old hiring signals are broken for AI-native work. This is intentional and moving fast. The Build Feed and Atlas are already live. If you're shipping real production AI work, you belong here.

Trailing CTA (muted):
**Join free →** (/join)

---

## What NOT to do

- Do NOT keep the current homepage's two-sided "Builder + Hirer" framing — that predates the four-pillar architecture
- Do NOT keep the Manifesto section from the current page (replaced by the Why + Built for Agents sections)
- Do NOT keep the Founder Story section verbatim (replaced by the much shorter "From the founder" block)
- Do NOT add testimonials, social proof, or stats — none exist yet, don't fake them
- Do NOT add images beyond brand-consistent icons (emoji are fine: 👤 👥 🤖 💼)
- Do NOT keep the current page's client-side feed/builder fetches unless they were essential — homepage is now static marketing, not a live feed surface

## Validation

After implementation:
- npx tsc --noEmit (exit 0)
- npm run build (exit 0 — / route registers, no build errors)
- Start dev server, curl http://localhost:3000 → confirm 200 + all section headings present
- node --experimental-strip-types scripts/v2/verify-agent-card.ts --base http://localhost:3000 → exit 0 (no regression)
- Stop dev server

## Ship

Stage src/app/page.tsx (the only modified file unless layout/nav also touched).
Commit message:

```
Phase 8 §B: Homepage rewrite to four-pillar architecture

Replaces the pre-Phase-4 two-sided (Builder + Hirer) homepage with the
four-pillar customer-type architecture as actually shipped on prod.

Copy authored by external copywriter through three iterations; final
v3 locked by operator. Architect-Claude reviewed for architecture/
wedge/voice consistency.

Shipped:
- Hero: "Proof of what you actually shipped."
- Wedge: three-line classified/verified/found rhythm
- Four pillars: Builder (blue), Team (purple), Agent (cyan),
  Hiring Access (amber)
- "Why ShipStacked exists" — competitive context (LinkedIn / GitHub /
  Upwork)
- "Built for agents, not just about them" — AgentCard + V1 API +
  Atlas crosswalks; agent reflexivity ("every agent registered on
  ShipStacked participates in the same network they discover")
- CTA strip: ship / hire / agent
- Founder section — graceful, no overshare

Pricing model clarification baked into the new Hiring Access pillar:
$199/month is a toggle on any account, not a separate signup type.
Lowers signup friction (everyone free), positions paid surface as a
feature add.

Did NOT change:
- Brand palette
- Existing nav/footer (Phase 8 §F will revisit if needed)
- Any other route

Discovery + plan: docs/audit/PHASE8_CONTENT.md.

Co-Authored-By: Claude <noreply@anthropic.com>
```

Push, post-deploy verify (`curl -s https://shipstacked.com | grep "Proof of what you actually shipped"` → match), report back.
