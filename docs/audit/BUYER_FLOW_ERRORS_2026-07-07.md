# Buyer/hirer signup flow — diagnosis (2026-07-07)

HEAD `c5b0481` (prod). Diagnosis of the reported "critical errors" in `/api/join/buyer → /hirer`.

## VERDICT — the signup flow itself is HEALTHY; the real defect is downstream
End-to-end reproduction (authed, real session, against **production**) shows the buyer signup
and `/hirer` both **succeed**. The DB writes are complete; nothing 500s. The genuine,
reproducible defect is: **a buyer's org is minted `published=false` with no publish path for a
non-subscribed buyer, so their company page `/team/<slug>` (and the `/company/<slug>` redirect
target) 404s for every viewer except the logged-in owner.**

> **One-line root cause:** buyer signup → `/hirer` works (verified 200/200 in prod); buyer orgs
> are created `published=false` and a no-sub buyer gets `BuyerOnlyEmptyState` (no company form),
> so the org can never be published and its `/team/<slug>` public page 404s for all non-owners.

---

## 1. REPRODUCE — signup + /hirer both 200 in production (authed, real session)
Created a test buyer with a password, signed in for a real session, built the supabase-ssr auth
cookie, and hit **production**:

**`POST https://shipstacked.com/api/join/buyer`** `{"company_name":"Repro Legal Group","slug":"repro-legal-group"}`
```
HTTP 200
{"entity_id":74,"slug":"repro-legal-group","display_name":"Repro Legal Group","was_created":true}
```
**`GET https://shipstacked.com/hirer`** (authed buyer, no subscription):
```
HTTP 200   → renders BuyerOnlyEmptyState  (body markers: "Browse talent", "Hirer dashboard", "Welcome to ShipStacked")
```
Direct DB reproduction of the exact insert sequence (`findOrCreateOrgEntity` → `team_profiles`
insert → `team_admins` insert) with a fresh user also **succeeded at every step** (entity `kind=org`
id, team_profiles OK, team_admins OK). **No signup error is reproducible.** (Repro users/entities
#74 cleaned up.)

## 2. `findOrCreateOrgEntity` (src/lib/entities.ts:481) — CORRECT
Inserts `kind: 'org'` explicitly and handles idempotency + 23505 slug conflict:
```ts
const row = {
  external_id: entityExternalId(),
  kind: 'org' as const,
  display_name: cleanName,
  slug,
  owner_user_id: user.id,
};
// ...insert → on 23505 rethrow with code (route maps to 409); else return {entity, was_created:true}
```
No hardcoded `'human'`/`'team'`; it does not assume a kind. Not the bug.

## 3. `entities.kind` CHECK constraint — ALLOWS 'org'
- Live table kinds: `{human:49, team:6, agent:1, org:1}` — a `kind='org'` row (Meridian #71)
  exists, so the constraint permits it (Postgres CHECK is enforced on all rows).
- Probe insert of an invalid kind → rejected: `violates check constraint "entities_kind_check"
  | code=23514`. So the constraint is present and correct: it allows org, rejects garbage.
- **NOTE (possible earlier cause, now resolved):** the *original* migration constraint was
  `kind in ('human','operator','fleet','agent')` — it did NOT include `'org'` or `'team'`. It was
  later widened (via the Dashboard) to include them. **If the operator hit the error earlier today
  before that widening, `findOrCreateOrgEntity` would have thrown a 23514 → the buyer route's outer
  catch returns `500 {"error": "..."}`.** That is the most likely historical trigger — but it is
  **already fixed** (org rows exist + insert works now). Cannot be re-triggered on current prod.

## 4. `/hirer` render — WORKS; no dangling 5d-1 refs
`hirer/page.tsx` for a no-sub buyer:
```ts
if (!sub) {
  const { data: ownsOrg } = await supabase.from('entities')
    .select('id').eq('owner_user_id', user.id).eq('kind', 'org').limit(1).maybeSingle()
  if (ownsOrg) return <BuyerOnlyEmptyState email={user.email!} />   // ← Meridian buyer lands here
  redirect('/hirers#pricing')
}
```
Verified: `/hirer` → 200, renders `BuyerOnlyEmptyState`. **`HirerDashboardClient` is NOT rendered
for the buyer** (it only renders for *subscribed* hirers, past the `!sub` gate). It has no dangling
reference to the 5d-1-removed compat write — `createClient` is still used (logo upload etc.),
`slugify` was removed cleanly, and only comments mention `employer_profiles`. tsc+build are green.
So 5d-1 did not break the buyer's `/hirer`.

## 5. Client handler `handleBuyerSubmit` (join/page.tsx:372) — CORRECT
POSTs `/api/join/buyer` with `{company_name, slug: deriveSignupSlug(name)}`, throws `data.error`
on `!res.ok`, then fire-and-forgets `/api/welcome` (wrapped in try/catch), then `setView('buyer-2')`.
It does **not** depend on the response body shape (`entity_id`/`slug`/etc. are ignored), so a shape
change wouldn't break it. Meridian returned 200 → handler proceeded normally.

## 6. The 3 real signups today — buyer's *signup* is NOT the broken one
| signup | entity | profile | subscription | signup result |
|---|---|---|---|---|
| Marcus Reyes (builder) | `human #69` | ✓ `marcusreyes698` | active `full_access` | ✅ complete |
| Cortex AI Studio (team) | `team #70` | — | active `full_access` | ✅ complete |
| **Meridian Legal Group (buyer)** | **`org #71`** (team_profiles ✓ + team_admins ✓) | — | **none** | ✅ **DB complete** |
All three signups wrote their rows successfully. The buyer's org is fully formed. So the buyer
**signup** is not the broken step.

---

## THE ACTUAL DEFECT — buyer's company page 404s, with no publish path
`/team/<buyer-org-slug>` (org #74 "repro-legal-group", `published=false`, same as Meridian #71):
```
authed-owner → HTTP 200   (owner-preview banner)
unauth       → HTTP 404
/company/repro-legal-group → 307 redirect → /team/repro-legal-group → 404   (5d-1 redirect-stub)
```
So the buyer's company page is **invisible to everyone except the logged-in owner** — logged-out
visitors, other users, and any link (from a posted job, a message thread, the sitemap) → **404**.

**And the buyer can't fix it:** a no-sub buyer gets `BuyerOnlyEmptyState`, which has **no company
form and no publish control** (just "Browse talent" / "Build Feed" / "Atlas" cards + the Full
Access CTA). The company-profile form + publish toggle live in `HirerDashboardClient`, which only
renders **after** the `!sub` gate — i.e., only for **subscribed** hirers. So a buyer who hasn't
paid can never publish their org, and its `/team/<slug>` stays 404 for the public indefinitely.

### Why this is newly-critical (5a + 5d-1 interaction)
- **5a** made `/team/<slug>` the canonical org page with a hard published gate (Invariant #2:
  unpublished → 404 for non-owners).
- **5d-1** turned `/company/<slug>` into a pure redirect-stub to `/team/<slug>`, removing the old
  `employer_profiles`-backed render fallback.
- **Buyer signup** mints the org `published=false` (`api/join/buyer:140`).
- **No-sub buyers** get `BuyerOnlyEmptyState` (no publish path).
Combined: a buyer creates a company that has **no viewable public page and no way to publish it**.
This was flagged as an open risk in `CAP_STAGE_5_MAP` ("the published gate hides fresh buyer orgs
— product call needed") and in the 5a review; it has now surfaced as the operator-visible defect.

---

## FIX DIRECTIONS (for the operator to choose — not applied here)
1. **Auto-publish buyer orgs at signup** — set `published: true` in `api/join/buyer` (and
   `ensureOrgRows`). Simplest; the org page renders immediately. (Decide: should a bare buyer org
   with default name be public? Maybe gate on having filled a company name.)
2. **Give no-sub buyers the company form** — render the company-profile editor (or a slimmed
   version) inside `BuyerOnlyEmptyState`, so a buyer can fill + publish their org before paying.
3. **Soft-gate `/team` for hiring orgs** — let a hiring org's page render (a lightweight hiring
   lens) even when `published=false`, instead of 404. (Changes the Invariant-#2 gate for
   `kind='org'` — needs care.)
4. **Confirm/resolve the constraint history (§3)** — verify the `entities_kind_check` widening is
   permanent in prod (it is, empirically) so the historical 23514 path can't recur.

Recommended: **(1) + (2)** — publish the org on signup AND let the buyer edit/publish it without a
subscription, so "create company → view company" works for a free buyer.

## Method
Read `api/join/buyer`, `entities.ts:findOrCreateOrgEntity`, `hirer/page.tsx`,
`HirerDashboardClient.tsx`, `join/page.tsx:handleBuyerSubmit`, `BuyerOnlyEmptyState.tsx`. Live DB:
entity kinds + constraint probe, today's signups + subscriptions, org-row completeness. HTTP repro
against production with a real signed-in session (built the supabase-ssr auth cookie): POST
`/api/join/buyer` (200), GET `/hirer` (200), GET `/team/<slug>` authed-owner (200) vs unauth (404).
All repro users/entities (#74, test buyers) cleaned up after. No source or real data mutated.
