<!-- Phase 7 §E (2026-06-16): original CRON_SECRET value rotated + redacted; historical context only. -->
# SHIPSTACKED HANDOVER — STEP 4 ADDENDUM

**Date:** May 12, 2026 (late evening, continuation of same day as original handover)
**Status:** Step 4 (/claim flow) complete and verified end-to-end. Five commits ahead of origin/main. Not pushed.
**Use this alongside:** `SHIPSTACKED_HANDOVER.md` (original) and `ATLAS_V0.3_FULL.md` — both in user's Downloads folder.

---

## What this document is

The original handover archived after Step 3 (the `/hire` flow). This addendum documents everything built and decided since, so a fresh Claude session can pick up exactly where this one left off.

**TL;DR**: Both intake flows (`/hire` for companies, `/claim` for practitioners) are now built, tested, and committed locally. End-to-end verified: form → API → Supabase row → 2 Resend emails → success page. Nothing is pushed to production yet. Next session resumes at **Step 5 — the `/atlas` page**.

---

## Commit log — current state of repo

Working directory: `/Users/thomasoxlee/shipstacked`
Branch: `main`, 5 commits ahead of `origin/main`, NOT pushed
Working tree: clean

```
09ba2fe feat(intakes): add claim API route for practitioner role-claims
eefca0e feat(hire): add symptom-based hire intake form UI
a251208 feat(intakes): add hire API route with rate limiting and emails
2fbe9dc refactor: rename /hire post-confirmation flow to /hire-confirm
de976ef chore: clean up loose root scripts, track post-jobs-x.js
```

The two new commits added since the original handover was archived:

**Commit 09ba2fe** — the claim API route:
- New file `src/app/api/intakes/claim/route.ts`
- Validates 15 fields against `public.claim_submissions` schema
- Rate-limited 3/email/24h via existing `src/lib/rateLimit.ts` helper
- Inserts row with arrays intact (`atlas_roles`, `verticals`, `engagement_modes` as `text[]`)
- Hardcoded `ATLAS_ROLE_LABELS` const maps all 35 Atlas codes (A1-A7, B1-B4, C1-C9, D1-D5, E1-E4, F1-F5) to human-readable labels — used in notification email subject + body. The same map is **duplicated** in `ClaimForm.tsx` (tech debt — see below).
- Fires 2 parallel Resend emails: auto-response ("You're in the Atlas") + structured notification with all submitted fields
- HTML-escapes all user input
- Verified via curl: 200 + DB row + 2 emails on valid; 400 with no side effects on invalid

**Commit eefca0e** — the claim UI (three files):
- `src/app/claim/page.tsx` — server component, dark hero ("FOR PRACTITIONERS" / "Claim your role.") + form section + Atlas preview block. Mobile-responsive via clamp().
- `src/app/claim/ClaimForm.tsx` — client component with 9 sections, 15 fields, character counter, multi-select Atlas role grid grouped by cluster, conditional domain-practitioner reveal, error display with `role="alert"`, redirects to `/claim/thanks` on success.
- `src/app/claim/thanks/page.tsx` — server component confirmation page with compass icon (distinguishing it from `/hire/thanks`' checkmark) and "what happens next" promise list.

---

## Supabase schema state

Two intake tables now live in production Supabase (Studio access required, RLS-protected, service role only).

**`public.hire_intakes`** (from original handover):
- 18 columns, status default 'new', RLS enabled with no policies
- Indexes on `created_at desc` + `status`

**`public.claim_submissions`** (NEW this session):
- 24 columns:
  - Identity: id, created_at, name, email, location, linkedin_url, github_url, twitter_url, website_url
  - Classification: `atlas_roles text[]` (required, ≥1), `verticals text[]` (optional), `domain_practitioner bool`, `domain_field text`
  - Work: `proof_of_work text` (100-3000 chars, required), `engagement_modes text[]` (required, ≥1), `comp_expectation text`, `notes text`
  - Operational: status default 'new' (enum: new/reviewed/vetting/routable/declined/duplicate), thomas_notes, vetted_at, `routable bool default false` (flips to true ONLY after manual vetting)
  - Meta: user_agent, referrer
- RLS enabled, no policies (service role only)
- GIN indexes on `atlas_roles` and `verticals` for array-based routing queries

The `routable` flag is the key vetting mechanism. Raw claims land with `routable=false` and only flip to `true` after Thomas's manual review (public proof review + 30-min call + reference check, 60-75 min per practitioner — the vetting workflow from the original handover).

---

## End-to-end test record

Both flows tested in browser with real data and verified:

**`/hire` flow** (already verified in original handover session):
- Page renders, form submits, API returns 200, Supabase row created, 2 Resend dispatches fired, browser redirects to `/hire/thanks`

**`/claim` flow** (verified this session):
- Visual: page renders correctly with hero, form, Atlas preview
- Functional: filled form with realistic test data → "Claim my role" → 200 OK → redirect to `/claim/thanks`
- Supabase: row created with all arrays intact (`atlas_roles: {A1,A6,F1}`, `verticals: {legal,financial_services}`, `engagement_modes: {fractional,operator}`)
- Resend: both dispatches fired (auto-response + notification)

**One real bug surfaced and resolved**: The proof_of_work textarea initially appeared stuck at `0/3000 — need at least 100 more` regardless of input. Diagnosis: code wiring was correct (Claude Code walked all 5 candidate causes and ruled each out). Root cause: stale dev server cache. **Fix**: hard refresh (Cmd+Shift+R). Worth noting for future debugging — when state appears not to update despite correct code, check dev server cache first before assuming a real bug.

---

## Styling cleanup pass — completed but unverified

After Step 4 was functionally complete, a React console warning appeared during interaction: *"Removing a style property during rerender (borderColor) when a conflicting property is set (border) can lead to styling bugs."*

Two cleanup passes applied:

1. **Border shorthand → longhand** in both `ClaimForm.tsx` (s.checkCard) and `HireIntakeForm.tsx` (s.radioLabel) — replaced `border: '1px solid #d4d4d8'` with explicit `borderWidth/Style/Color` longhand.

2. **Margin shorthand → longhand** for the latent (single-render but anti-pattern) conflicts:
   - `s.groupHeading` (ClaimForm): `margin: '2.75rem 0 1rem'` → longhand
   - `s.checkboxInput` (ClaimForm): `margin: 0` → longhand
   - `s.fieldset` (BOTH files): `margin: 0` → longhand

Claude Code's final audit confirmed no remaining shorthand/longhand mixes in either file.

**Status of this cleanup**: Applied to files but **NOT committed yet**, and **NOT verified in browser**. The chat ran out of bandwidth before we could confirm the React warning was gone after the styling fixes. Next session needs to:

1. Run `git status` and `git diff` to inspect uncommitted styling changes
2. Hard-refresh `/claim` and `/hire` in browser
3. Open DevTools Console and interact with checkbox-cards / radio-cards
4. Confirm React warning is gone
5. If clean → commit the styling fixes as a small follow-up commit
6. If warnings persist → diagnose further

The expected commit message:

```
fix(forms): convert border + margin shorthands to longhand

Eliminates React warning about shorthand/longhand style conflicts
during rerender. Affects checkbox-card and radio-card patterns plus
fieldset/groupHeading/checkboxInput margins.

- src/app/claim/ClaimForm.tsx: s.checkCard border, s.groupHeading
  margin, s.checkboxInput margin, s.fieldset margin → all longhand
- src/app/hire/HireIntakeForm.tsx: s.radioLabel border, s.fieldset
  margin → all longhand

No visual change. Pure DOM-level fix.
```

---

## Live URLs (local dev only — not deployed)

`http://localhost:3000/hire` — symptom-based hire intake form
`http://localhost:3000/hire/thanks` — hire confirmation page
`http://localhost:3000/claim` — practitioner role-claim form
`http://localhost:3000/claim/thanks` — claim confirmation page

These are all served by the local Next.js dev server (`npm run dev` from `/Users/thomasoxlee/shipstacked`). The site at production `shipstacked.com` does NOT yet have any of these surfaces — they only become live after the eventual `git push origin main` to trigger Vercel deploy.

Nothing on the homepage, navbar, or footer links to either `/hire` or `/claim` yet. The routes are reachable only by direct URL. This is intentional — homepage integration happens in Step 7.

---

## Tech debt logged this session — NOT for next session unless explicitly addressed

1. **`ATLAS_ROLE_LABELS` duplicated** in both `src/app/api/intakes/claim/route.ts` AND `src/app/claim/ClaimForm.tsx`. Should extract to `src/lib/atlas-roles.ts` as single source of truth. Both copies must stay in sync until then.

2. **Heading hierarchy issue in ClaimForm**: All section headings inside `<ClaimForm>` are `<h2>` elements, but they nest under the page's own `<h1>` ("Claim your role.") AND the page's other `<h2>` ("Haven't read the Atlas yet?"). Technically these should be `<h3>` for proper hierarchy. Not blocking — semantic-only issue.

3. **Tech debt from original handover (still parked)**: duplicate `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `.env.local`; hardcoded `CRON_SECRET='<ROTATED_CRON_SECRET_REDACTED>'` in `src/app/api/hire-confirm/nudge/route.ts`; `src/app/api/inquiry/route.ts` lacks HTML escaping; Next.js 16 middleware deprecation warning (rename `src/middleware.ts` to `src/proxy.ts` eventually).

---

## What comes next — the resume sequence

After the styling cleanup commit (above), the remaining steps from the original handover are:

**Step 5 — `/atlas` page** (largest single remaining piece)
- Server-rendered long-form page rendering the full Atlas v0.3 content
- Content source: `ATLAS_V0.3_FULL.md` (80KB, 827 lines, in user's Downloads folder — should be moved to `src/content/atlas-v03.md` in repo first)
- Pattern: similar to existing `/api-docs` page — server component, sectioned long-form, anchor links per section
- Sticky CTAs for `/hire` and `/claim`
- JSON-LD structured data for SEO
- Add `llms.txt` at site root pointing to the Atlas
- This is the single largest content rendering job remaining. Estimate 60-90 min focused work.

**Step 6 — `/admin/intakes` view**
- Server-rendered admin page, admin-gated (same auth pattern as existing `/admin/candidates`)
- Table view of both `hire_intakes` and `claim_submissions`
- Status update controls per row
- Filter by status, claimable, etc.
- This is where Thomas does his vetting workflow

**Step 7 — Homepage + nav + footer integration**
- Add Atlas link to NavBar (between "How it works" and "Build Feed" in unauthenticated section)
- Add Atlas link to FooterBar
- Add new Atlas section on homepage between manifesto and build feed preview
- Adjust hero — keep builder primary CTA, add secondary "Tell me what's broken" linking to `/hire`
- Decision pending from Thomas: keep / replace / remove the "10+ hires made" badge

**Step 8 — Pre-deploy**
- Add `INTAKE_NOTIFY_EMAIL=hello@shipstacked.com` to Vercel env vars (CRITICAL — currently only in local `.env.local`; deploy will fail to send notifications without this)
- Smoke test all routes locally
- `git push origin main` — triggers Vercel deploy
- Verify production deploy
- Smoke test on production URL
- This is the moment the new surfaces become live

---

## Files in user's Downloads (durable failsafe)

1. `SHIPSTACKED_HANDOVER.md` (39KB, 680 lines) — original handover
2. `ATLAS_V0.3_FULL.md` (80KB, 827 lines) — canonical Atlas v0.3 content for `/atlas` rendering
3. `HANDOVER_ADDENDUM_STEP4.md` (this file) — what changed during the Step 4 session

Together these three files contain everything a fresh Claude session needs to resume work.

---

## Strategic context (unchanged from original handover — re-anchoring for new session)

All locked decisions from the original handover remain in force. Brief re-anchor:

- shipstacked = classification and discovery layer for agentic-economy labor market (NOT a marketplace)
- Three supply populations: specialists (employed), operators (fleet runners), agent system integrators (transferable delivery) + compliance buyers + vertical specialists + domain-practitioner-with-AI segment
- Author byline: Thomas Oxlee personally. Bio: "Currently embedded as the AI integration operator at a regulated EU business under AI Act exposure." Spanish legal practice anonymous always.
- Revenue ladder: $1,500 (diagnosis+shortlist) / $5,000 (placed engagement) / $25,000 (embedded A5 transfer-of-ownership). Builders free always.
- Voice: practitioner-direct, sharp, NOT analyst-reference.
- 6-week launch campaign locked (Monday May 18 = anchor post + Gergely send. See original handover for full schedule.)
- Five-rooms-per-week distribution discipline for six weeks.
- 60-75 min per intake on first 10 replies — diagnosis is the product.

---

## Critical operational constraints (LOCKED — never change without revisiting)

- Builders FREE always
- Never cold-email from `shipstacked.com` domain
- 5,000 CSV passive supply only, never directly emailed
- Spanish legal practice anonymous always — "regulated EU business under AI Act exposure"
- Thomas writes Monday anchor post + every Friday field report personally (voice cannot be faked)
- Claude drafts structural/fight posts, named-send templates, technical builds
- One step at a time in Claude Code (Thomas pushed back on multi-command batching multiple times)
- 60-75 min per intake on first 10 replies — diagnosis is the product
- Five rooms per week distribution discipline for 6 weeks

---

## How to start the next session

Best opening message to a fresh Claude:

> "I'm Thomas Oxlee, founder of shipstacked.com. Continuing work from previous Claude sessions. Three handover docs in my Downloads folder:
>
> 1. `SHIPSTACKED_HANDOVER.md` — original handover with full strategy + Atlas v0.3 + first 3 commits
> 2. `ATLAS_V0.3_FULL.md` — the canonical Atlas v0.3 content
> 3. `HANDOVER_ADDENDUM_STEP4.md` — what we built in the last session (commits 4 and 5: the `/claim` flow)
>
> Read all three before responding. Then confirm you understand:
> - Where the repo is and what state it's in
> - What's been built and what's left (Step 5, 6, 7, 8)
> - The strategic frame and locked decisions
> - The styling cleanup that needs verification + commit before moving to Step 5
>
> Once you've read everything, walk me through the next move."

That gives the new Claude full context, the docs to read, and a clear first action to confirm orientation.

---

— End of addendum —
