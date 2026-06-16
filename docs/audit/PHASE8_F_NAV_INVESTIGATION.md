# Phase 8 §F — Navigation investigation + map + fix

**Three stages: Investigate → Diagnose → Fix.** No code changes until investigation + diagnosis complete and architect-Claude approves the fix scope.

The operator has reported "big nav issues depending on role and page." Specific symptoms not yet characterized. Goal of this phase: produce a concrete matrix of nav behavior across roles × pages × auth states, identify the actual bugs, then fix surgically.

**Constraint to honor throughout:** session cookies and auth state must not be disrupted by any nav change. Logged-in users staying logged in. Buyer Mode subscribers retaining buyer access. Agent-mode (`?agent=1` legacy param) handled gracefully.

---

## §A — Stage 1: Investigation (READ-ONLY)

Five investigations. Stop after each block, report findings, architect-Claude reviews.

### §A.1 — Read NavBar + FooterBar source

Read in full:
- `src/app/components/NavBar.tsx`
- `src/app/components/FooterBar.tsx`

Report:
- Complete props interface for each
- All branching logic (logged in/out, role detection, page detection)
- All hardcoded links (with destinations)
- Any anchor links (`#how`, etc.) vs. real route links (`/talent`, etc.)
- Any role detection logic — how does it know if user is Builder vs. Buyer vs. has Hiring Access vs. Team admin?
- Any client-side state — `useState`, `useEffect`, fetches
- Any cookie/session reads — how is auth state determined?
- Any conditional rendering based on URL/path
- Mobile hamburger menu logic — what's different from desktop?

### §A.2 — Map all role/auth states a user can be in

ShipStacked's auth model has multiple dimensions. The full matrix:

**Authentication:**
- Anonymous (no session)
- Authenticated (has session)

**Profile types** (after auth, what role does the user have):
- No profile (signed up but never published — operator's current state)
- Builder profile (`profiles` row, kind='human' entity)
- Team admin (member of `team_admins` for at least one team)
- Team-linked builder (`profiles.team_entity_id` set, not necessarily admin)
- Agent owner (owns at least one `kind='agent'` entity)

**Buyer status** (orthogonal to profile types):
- No Hiring Access (no active Stripe subscription)
- Has Hiring Access (active `full_access` subscription)

**A single user can be:** authenticated + builder + team admin + has Hiring Access — all simultaneously. NavBar needs to handle this combinatorial space.

For each combination, document: what should the nav show? What should the footer show?

Report this as a matrix. Don't write code — just enumerate states and proposed nav shape per state.

### §A.3 — Map all pages that render NavBar

The NavBar is in `layout.tsx`, so it renders on every route. But different pages have different nav requirements.

Categorize pages by their nav needs:

**Public marketing pages (no profile-dependent nav):**
- `/` (homepage)
- `/how-it-works`, `/faq`, `/pricing` (Phase 8 new)
- `/atlas`, `/atlas/roles/[id]`
- `/api-docs`, `/auth.md`
- `/login`, `/join`

**Profile pages (public-facing but may show "edit" nav for owner):**
- `/u/[username]`
- `/team/[slug]`
- `/agent/[slug]`
- `/feed`, `/feed/[id]`
- `/talent`

**Authenticated user dashboards:**
- `/dashboard` (Builder)
- `/team/[slug]/edit` (Team admin)
- `/agent/[slug]/edit` (Agent owner)
- `/hirer` or similar Buyer dashboard
- Account settings (wherever those live)

**Functional surfaces:**
- `/paste/review` (mid-paste flow)
- `/api/*` (no nav)

For each category, document expected nav shape.

### §A.4 — Identify the actual symptoms

The operator says "big nav issues." Specific failures need to be enumerated, not assumed. Run these checks on prod (curl / browser inspection if possible):

1. **Anonymous user on homepage** — what nav links appear? What does clicking each do?
2. **Anonymous user on `/talent`** — same.
3. **Logged-in user (with profile) on homepage** — what changes from anonymous?
4. **Logged-in user without profile (operator's state) on `/dashboard`** — what nav appears? Is there hamburger weirdness?
5. **Logged-in user on a profile page they don't own (e.g. `/u/someone-else`)** — does nav show correct CTAs?
6. **Logged-in user on their own profile page** — does nav surface edit access correctly?
7. **Hamburger menu on mobile** — does it open/close cleanly across roles? Does it close on link click? Does it close on backdrop click? Does it close on escape?
8. **Active page indicator** — does the current page highlight in nav? Is the highlighting correct across roles?
9. **Login persistence** — after sign-in, does nav update without a page reload, or only after navigation?
10. **Sign-out flow** — does signing out clean up nav state correctly? Or does stale auth linger?

Document each finding. "It's broken" isn't enough — describe what specifically happens vs. what should happen.

### §A.5 — Footer audit

Same investigation for FooterBar:
- What links exist?
- Are any of them anchor-based (`#how`)?
- Do any link to routes that don't exist (404)?
- Are the Phase 8 new pages (`/how-it-works`, `/faq`, `/pricing`) linked?
- Is the footer different per role / auth state? Should it be?

Report the full footer link list + any 404s + any missing references.

---

## §B — Stage 2: Diagnosis

After §A reports come in, architect-Claude classifies each finding into one of:

**Bug class A — State bug:** auth state is determined incorrectly (e.g., stale cookie, missing useEffect, server/client hydration mismatch). High-priority to fix; affects multiple pages.

**Bug class B — Route bug:** a nav link points to a wrong destination, or a route that doesn't exist. Surgical fix per link.

**Bug class C — Conditional rendering bug:** nav branch logic is wrong (e.g., "if user has profile, show X" but the check is broken). Affects a specific role/page combination.

**Bug class D — Design/UX issue:** behavior is technically correct but unclear or surprising (e.g., hamburger doesn't close on navigation, no active page indicator). Polish-class.

**Bug class E — Missing feature:** something that should exist doesn't (e.g., logged-in user can't access their own profile from the nav).

For each finding, architect-Claude assigns the class, severity (P0/P1/P2), and proposes a specific fix or defers.

---

## §C — Stage 3: Fix

Based on §B classifications, architect-Claude drafts the fix scope. Could be:

- One small NavBar refactor (if findings are all class B + D)
- A NavBar+FooterBar rewrite (if findings reveal structural issues)
- An auth-state derivation refactor (if class A bugs surface — e.g., role detection moves from NavBar to a shared hook)

Whatever the scope, the fix follows the standard rhythm: surgical edits, tsc/build gates, paste-back any DDL (unlikely needed), seed-and-verify where useful, commit per the established Phase 7/8 pattern.

The fix MUST preserve:
- All existing session cookies (don't reset auth on deploy)
- All `buyer:rw` subscriptions (don't change how Buyer Mode is detected)
- All API key scopes (don't break `agent:rw` / `team:rw` flows)
- The Phase 5 `/dashboard?agent=1` → `/join` redirect (verified clean in Phase 7 §A.5)

---

## §D — What's NOT in scope

- Adding new pages (Phase 8 §C/D/E already shipped them; §F just wires nav to existing routes)
- Major visual redesign of nav (color, type — keep existing)
- Adding new auth states (no new roles, no new subscription tiers)
- Hamburger animation polish beyond functional correctness
- Search functionality in nav (deferred)
- User-customizable nav (deferred)

End of §F plan.
