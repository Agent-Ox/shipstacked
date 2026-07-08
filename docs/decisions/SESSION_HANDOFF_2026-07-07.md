# ShipStacked — Session Handoff (2026-07-07)
Resume point after the build-complete + front-door-testing session.

## CURRENT STATE
- origin/main HEAD: 0d9feaf (buyer-org publish/edit fix, live Production, deployment 5358271975)
- Working tree clean, no open review branches (only main + phase-9-part-1-pillar-dashboard)
- Verify HEAD + clean tree at resume.

## WHAT'S COMPLETE (all live Production)
- The ENTIRE build is done — both arcs:
  - Capability spine + GEO: Stages A/B1/B2/B3/C/D1/E/F (de-teaser, vocab 77 entries, crosswalk 52, 77 capability pages, teams/agents on them, capability filter, machine-surface coverage)
  - Org-unification + front door: D2a (Full Access relabel), D2b-1 (client retired + inquiry backdoor killed), D2b-2/D2b-3 (signup + homepage reframed to 3 identities + Full Access add-on, coherent everywhere), Cap-Stage 5 (5a org page, 5b jobs re-key, 5c messaging re-key, 5d employer_profiles migrated + table dropped)
  - Loose end closed: dead skills.capability_slug column dropped
- Database clean: all test residue swept (batch5, inquiry, buyer test data), 38 real builders intact
- Stripe product renamed to "Full Access" (operator did, out-of-repo)

## FRONT-DOOR TESTING (in progress — where we stopped)
Testing the rebuilt signup flows as real users. Status:
- ✅ BUILDER signup (Marcus Reyes) — tested, works. Profile created, on capability pages.
- ✅ TEAM signup (Cortex AI Studio) — tested (services added post-signup in dashboard).
- ⚠️ HIRER/BUYER signup (Meridian Legal Group, org #71) — tested, found + FIXED critical bugs:
  - Buyer org edit page + /api/v1/team gated on kind='team' → 404'd buyer orgs → FIXED (0d9feaf, widened to team,org). Buyer orgs can now publish/edit their company page. NavBar labels "Your company".
  - NEEDS RE-TEST: confirm the buyer publish chain works end-to-end (nav "Your company" → edit → publish → public /team page renders, not 404).
- ⬜ AGENT signup — NOT yet tested.
- ⬜ Full Access PAYMENT path — not yet run (paywall → pay → contact unlocks). MUST confirm checkout uses the $1 TEST price, not $199, before Thomas pays.

## OPEN ITEMS / KNOWN ISSUES (none blocking, all noted)
1. [COSMETIC, deferred] A Full-Access BUILDER sees "Hirer dashboard" in nav → /hirer. Works, but mislabels a networking builder as a hirer. Fix later (rename label, or route builders to their dashboard w/ search unlocked).
2. [COPY, open question] The "$199/mo" at the hiring entry — Thomas flagged it made him expect to pay at signup (flow is free-to-start, pay-when-you-contact). Awaiting Thomas's read on whether it's an expectation/copy issue. Flow is correct; copy may need clarity.
3. [NAV GAP, noted] The 77 capability pages (/talent/[slug]) have almost NO in-app navigation — discoverable by crawlers/sitemap but a logged-in user must type the URL. The capability FILTER on /talent filters in place but doesn't link to the standalone pages. Recommended future fix: make builder skill-chips link to /talent/[slug]; possibly a capability index/browse page.
4. [POLISH, deferred] The team-edit FORM is service-team-shaped (leads with "services") — for a buyer org doing employer-branding it should de-emphasize services + read as a company page. Body copy still says "team" in places (e.g. "Publish team →"). Cosmetic, on a working flow.
5. [PRE-LAUNCH] Flip Stripe $1 test price → $199 before real launch.
6. [GROWTH, not eng] 5 URL-less real builders (abhishek/bryson/chidinma/chimaobi/michael) — entities minted, need a URL to enrich = re-engagement nudge.

## NEXT STEPS (on resume)
1. Re-test the buyer publish chain (confirm 0d9feaf fixed it).
2. Confirm Stripe checkout = $1 test price, then run the Full Access payment path (paywall → pay → contact).
3. Test AGENT signup.
4. Resolve the "$199 framing" copy question.
5. Then: GTM (the product is built + tested) OR the deferred polish items.

## WORKING RULES (unchanged, hard)
- Byte-review actual pushed bytes before every merge. Verify SHA exists before reasoning about any commit.
- No "probably"; diagnose from live/cat/grep, never recall. Make the architectural call + defend; product/positioning = Thomas's.
- 38 real builders are the invariant — non-destructive/additive only.
- DB DDL via Supabase Dashboard SQL (Thomas runs); additive/nullable + reversal.
- Long tc output → write to a file, architect reads via raw GitHub (inline paste doesn't reach architect). Architect's curl to shipstacked.com is edge-blocked → deploy smokes via tc/deployments API.
- Review flow: tc commits local main → pushes review/* → architect byte-reads raw → merge.
