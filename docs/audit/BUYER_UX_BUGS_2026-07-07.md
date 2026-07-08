# Buyer-flow UX bugs — trace (2026-07-07)

HEAD `c5b0481`. The 200/200 API checks missed these because they're **navigation/gate**
inconsistencies, not endpoint failures. Both stem from one root: **5a widened the team _page_
to serve buyer orgs (`kind='org'`), but two dependent surfaces were never updated** — the NavBar
"Your team" link and the `/team/[slug]/edit` gate.

> **One-line root cause:** the buyer org (`kind='org'`, `offers_services=false`, `published=false`)
> is shown NavBar's UNguarded "Your team" → the unpublished org page's owner-preview → whose
> "Publish in your team settings →" links to `/team/<slug>/edit`, which still gates on
> `.eq('kind','team')` and so `notFound()`s a `kind='org'` owner (404).

Confirmed state of the buyer org (#71 Meridian): `team_profiles = {published:false,
offers_services:false, hires:false}`.

---

## BUG A — NavBar shows an UNGUARDED "Your team" link to the unpublished org page

There are **two** NavBar links to `/team/<slug>`, and only one is guarded:

**Guarded (correct) — "View company profile"** (`NavBar.tsx:82-88`):
```ts
// Stage 5d: link the unified org page only when the org is published
// (/team/[slug] 404s otherwise). teamSlug = the owned org; orgPublished
// resolved server-side via /api/messages/unread ...
if (teamSlug && orgPublished) {
  links.push({ label: 'View company profile', href: `/team/${teamSlug}` })
}
```
For the buyer org `orgPublished=false` → this link is **correctly hidden**. The guard works.

**UNguarded (the bug) — "Your team"** (`NavBar.tsx:192-200`, `getIdentityLinks()`):
```ts
const getIdentityLinks = (): { label: string; href: string }[] => {
  if (!navUser) return []
  const links: { label: string; href: string }[] = []
  if (profileUsername && pathname !== `/u/${profileUsername}`) {
    links.push({ label: 'Your builder profile', href: `/u/${profileUsername}` })
  }
  if (teamSlug) {
    links.push({ label: 'Your team', href: `/team/${teamSlug}` })   // ← NO orgPublished / offers_services guard
  }
  ...
```
`teamSlug` is set for **any team_admin** — and a buyer-org owner **is** a team_admin of their
`kind='org'` entity (buyer signup writes a `team_admins` owner row). So the buyer sees
**"Your team" → /team/meridian-legal-group**, unguarded by `orgPublished`. Clicking it lands on
the org page's owner-**preview** (Bug-A symptom: "Preview — not published, visitors see a 404").

**`orgPublished` flow (verified correct, just not applied to this link):**
`getUserState` reads `team_profiles.published` via the service role →
`refs.org_published` (`src/lib/user.ts`) → `/api/messages/unread` returns `org_published` →
NavBar `setOrgPublished`. For org #71 (`published=false`) it resolves **false**. So the guard is
sound; the defect is that "Your team" (`:198`) doesn't use it — it's a **separate, older identity
link** (Phase 8) gated only on `teamSlug`.

Two problems in one link: (1) unguarded → points at an unpublished/preview page; (2) mislabeled
**"Your team"** for a buyer **company** (not a service team).

---

## BUG B — `/team/[slug]/edit` 404s a buyer-org owner (gate excludes `kind='org'`)

`src/app/team/[slug]/edit/page.tsx:27-33`:
```ts
const { data: entity } = await admin
  .from('entities')
  .select('id, slug, display_name')
  .eq('slug', slug)
  .eq('kind', 'team')          // ← ONLY 'team'; a buyer org is kind='org'
  .maybeSingle()
if (!entity) notFound()         // ← kind='org' entity not found → 404
```
The buyer's entity is `kind='org'`, so this lookup returns null → **`notFound()` → 404**. The
ownership check (`team_admins`, `:36-42`) and the profile load never even run — it dies at the
`kind='team'` filter.

**This is the exact inconsistency 5a introduced but didn't finish:** the team _page_ was widened
to serve both kinds — `src/app/team/[slug]/page.tsx:63`:
```ts
.in('kind', ['team', 'org'])   // page serves service teams AND hiring orgs
```
…but the team _edit_ page (and the "Your team" link) were **not** widened. So the page renders for
an org owner, but its edit route rejects them.

---

## THE PREVIEW MESSAGE — shown to the buyer owner, links to the 404ing /edit

`src/app/team/[slug]/page.tsx` published gate (`:122-128`):
```ts
// ── Published gate (Invariant #2). Unpublished teams 404 for everyone EXCEPT
// an admin of that team, who sees a preview. ──
let preview = false
if (!profile.published) {
  if (!user || !viewerIsAdmin) notFound()   // logged-out / non-admin → 404
  preview = true                            // admin of this org → preview
}
```
`viewerIsAdmin` = has a `team_admins` row for this entity (`:112-119`) — **true for the buyer-org
owner**. So the buyer, viewing their own unpublished org page, gets `preview=true` and sees
(`:237-242`):
```tsx
{preview && (
  <div style={{ ... }}>
    <p style={{ ... }}>
      Preview — this team is not yet published. Visitors see a 404.{' '}
      <a href={`/team/${entity.slug}/edit`} ...>Publish in your team settings →</a>
    </p>
  </div>
)}
```
The "Publish in your team settings →" link → `/team/<slug>/edit` → **Bug B (404)**. So the two bugs
chain: the unguarded nav link (A) delivers the buyer to a preview whose only call-to-action (B)
dead-ends.

Copy is also service-team-framed for a buyer: **"your team"**, **"team settings"**.

---

## ROOT QUESTION — what gates each surface today, and should buyer orgs get them at all?

**None of the three surfaces gate on `offers_services`** — they gate on `team_admin` membership or
`kind`. So a buyer org (`offers_services=false`) leaks into the service-team identity/edit UI:

| Surface | Current gate | Buyer org (team_admin, kind='org', offers_services=false, published=false) |
|---|---|---|
| NavBar **"View company profile"** (`:86`) | `teamSlug && orgPublished` | HIDDEN — guard works ✓ |
| NavBar **"Your team"** (`:198`) | `teamSlug` only (⇒ any team_admin) | **SHOWN — Bug A** (unguarded; mislabeled) |
| **`/team/[slug]` page + owner preview** (`:63`, `:125`) | `kind in ('team','org')` + (published OR admin-preview) | SHOWN as owner-preview (page serves org) |
| Preview **"Publish in your team settings →"** (`:241`) | rendered whenever `preview` | SHOWN → links to `/edit` |
| **`/team/[slug]/edit`** (`:31`) | `kind='team'` ONLY | **404 — Bug B** (excludes org) |

**The product answer.** A buyer org and a service team are different animals:
- A **service team** (`offers_services=true`) is a public showcase → belongs at `/team/<slug>`
  with a public page, "Your team" nav, and an edit/publish flow.
- A **buyer org** (`offers_services=false`) is a hiring identity → its home is **`/hirer`**; it
  has no reason to appear as a public "team" or to be "published" as one.

So the coherent options are **either**:
- **(1) Exclude buyer orgs from the team surfaces.** Gate "Your team" (`:198`) and the org page's
  owner-preview/edit affordances on `offers_services` (service-org only). A buyer org's company
  management lives at `/hirer` (the company form / publish there — cf. the prior
  `BUYER_FLOW_ERRORS` audit, which found a no-sub buyer has no publish path there either). This
  keeps `/team` = service teams; buyer orgs never see "your team"/preview/edit. **Cleanest.**
- **(2) Fully include buyer orgs in the team surfaces.** Widen `/team/[slug]/edit:31` to
  `.in('kind',['team','org'])`, guard the "Your team" link on `orgPublished` (or relabel it
  "Your company" and keep it), and let a buyer edit/publish their org page. Requires the edit form
  to make sense for a non-service org (hiring fields, not "services").

Recommended: **(1)** — gate all three team-identity surfaces on `offers_services=true`, route buyer
company management to `/hirer`, and fix the `/hirer` publish path (per `BUYER_FLOW_ERRORS`). This
matches the model (buyer = hiring identity at `/hirer`; team = service showcase at `/team`) and
removes the leak at the source rather than patching each surface. Minimum viable stop-gap if (1)
is too big now: widen `edit/page.tsx:31` to include `'org'` **and** guard/relabel the "Your team"
link — but that still leaves a buyer inside team-framed UI.

## Method
Read `NavBar.tsx` (`getMenuLinks` :82-88, `getIdentityLinks` :192-205), `team/[slug]/edit/page.tsx`
(gate :27-33), `team/[slug]/page.tsx` (kind filter :63, published gate :122-128, preview block
:237-242). Live DB: org #71 `team_profiles` flags (`published:false, offers_services:false`).
Read-only — no source or data mutated.
