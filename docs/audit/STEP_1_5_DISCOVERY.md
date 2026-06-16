# Step 1.5 — CRON_SECRET Extraction + Rotation — DISCOVERY (Phase 1)

**Author:** Claude (Opus 4.7, 1M context) — read-only discovery
**Date:** 2026-05-17
**Spec:** `docs/v2/STEP_1_5_CRON_SECRET_SPEC.md` §4
**Status:** Phase 1 complete. STOP. Awaiting explicit Section H approval. Two §6 escalations surfaced — both reported, neither acted on.
**Governing principles (Spec §0, §3, §6):** rotation is the load-bearing deliverable (extraction alone is theater because the previously hardcoded value is already in public git history); fail-closed always; NO secret value (old or any new value) is written into any committed file — neither this discovery doc, nor a spec, nor a commit message, nor source.
**Method:** read-only. Read the nudge route in full. Grepped the repo for callers (`x-cron-secret` header, `hire-confirm/nudge` path) and scheduler configs (`vercel.json`, `.github/`). Scoped OTHER-secret scan (per §4.5) — locations only, not fixed. No DB queries, no repo files modified except this report.

---

## ⚠️ TWO §6 ESCALATIONS SURFACED IN PHASE 1 — REPORTED, NOT ACTED ON

### Escalation #1 — The previously hardcoded value lives in TWO files, not one

Per Spec §6: *"The secret is checked in more than one place / more than one file (scope assumption breaks — report, get a revised plan)."* The spec's scope assumption was one file (`nudge/route.ts:6`). Reality (verified by grep):

| File:line | Role | Side |
|---|---|---|
| `src/app/api/hire-confirm/nudge/route.ts:6` | Server-side definition + check (the literal compared against incoming header) | **server** |
| `src/app/admin/AdminActions.tsx:15` | Client-side `fetch` that POSTs the literal in the `x-cron-secret` header | **client** |

The value is **checked** in one place (the route) but **embedded** in two files. Rotation logic must address both — and the client-side surface is structurally awkward to rotate cleanly (a `NEXT_PUBLIC_*` env var inlines into the client JS bundle at build time, which is the same exposure shape as a hardcoded literal). See §B and §H-DECISION below for the three honest options and the recommendation.

**Additional exposure surface implied by Escalation #1:** the literal is exposed via TWO surfaces, not one — (1) public git history (the spec's premise), AND (2) the production admin-page JS bundle served to authenticated admin sessions. Both surfaces are closed by a single server-side rotation (since the value becomes dead authentication everywhere).

### Escalation #2 — Other hardcoded credentials found incidentally (per §6 — locations only, NOT fixed in this spec)

Per Spec §6: *"Other hardcoded secrets are found anywhere — list locations ONLY, do not fix, flag as their own future cycle."* The scoped grep surfaced two OTHER hardcoded-credential literals in verification scripts:

| File:line | Variable | Notes |
|---|---|---|
| `scripts/v2/verify-step-6.ts:31` | `TEST_PASSWORD` | Test-harness password for the V2 Step 6 verify script. |
| `scripts/v2/verify-step-7.ts:26` | `TEST_PASSWORD` | Test-harness password for the V2 Step 7 verify script. |

**NOT fixed in this spec.** Their own future micro-cycle if relevant (depending on whether the test users they reference exist in prod, and whether the scripts are still part of any CI/manual-verify loop). Logged here as required by §6.

---

## SECTION A — The current auth logic in the nudge route (no literal printed)

Read of `src/app/api/hire-confirm/nudge/route.ts` (full file, 115 lines):

- Line 6 defines `const CRON_SECRET = <the previously hardcoded value>` — a top-of-module constant.
- Line 8 declares `POST(req: Request)`.
- Line 10 reads the incoming request's `x-cron-secret` header: `const secret = req.headers.get('x-cron-secret')`.
- Line 11 does a strict-inequality string comparison: `if (secret !== CRON_SECRET) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }`. On mismatch (which includes the no-header case — `req.headers.get` returns `null` when absent, and `null !== <string>` is true) → **401 Unauthorized**.
- On match → the handler proceeds: creates a Supabase admin client, queries `conversations` table filtered to >14 days old + non-null `employer_email`, inserts `hire_confirmations` rows for any conversation without one, and sends two `resend.emails.send` calls (builder + employer "did you make a hire?" reminders).
- Returns `{ nudged: <count> }` JSON on success.

**Behavior summary:** stateless POST; header-based shared-secret auth (constant-time-comparison NOT used — see §G.1); on auth fail returns 401; on auth pass executes a small batch of email-sending side-effects against rows matching a time filter.

**The exact minimal fail-closed extraction edit:**

```ts
// Line 6 — current:
const CRON_SECRET = <previously hardcoded value>

// Line 6 — proposed:
const CRON_SECRET = process.env.CRON_SECRET
```

```ts
// Lines 10-13 — current:
const secret = req.headers.get('x-cron-secret')
if (secret !== CRON_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// Lines 10-13 — proposed (FAIL-CLOSED):
const secret = req.headers.get('x-cron-secret')
if (!CRON_SECRET || !secret || secret !== CRON_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

The added guard `!CRON_SECRET` makes the unset/empty-env case explicitly DENY. (Strictly the `secret !== CRON_SECRET` would already deny when `CRON_SECRET` is `undefined` — because `<string> !== undefined` is true — but stating the unset check explicitly is the conservative, less-clever, audit-friendly pattern.)

---

## SECTION B — The caller(s)

### B.1 What was searched

Grepped the entire repo for: `hire-confirm/nudge`, `x-cron-secret`, `X-Cron-Secret`. Searched for scheduler configurations: `vercel.json`, `.github/`, any `cron*` or `scheduler*` file.

### B.2 What was found

| Caller | Sends `x-cron-secret`? | Notes |
|---|---|---|
| **`src/app/admin/AdminActions.tsx:15`** (client React component) | YES — sends the previously hardcoded literal | The "Trigger hire nudge emails" button on `/admin`. The button POSTs to `/api/hire-confirm/nudge` with the secret in the header. |
| **`vercel.json` Vercel cron config** | — | **Does NOT exist** (file is absent from the repo). No Vercel cron schedule points at this endpoint. |
| **`.github/workflows/*` GitHub Actions** | — | **`.github/` does NOT exist.** No GH Actions exist at all. |
| **Any other internal `fetch`** | — | None found beyond AdminActions.tsx. |
| **External scheduler / dashboard cron** | UNKNOWN | Cannot inspect read-only from terminal. **Thomas should confirm:** if anything external (e.g. an Upstash QStash job, a separate cron service, or a Vercel-dashboard-side cron not in `vercel.json`) currently invokes this endpoint, it would also need the new value. **Most likely none exists** (no `vercel.json` cron + the endpoint is dormant since shipping). |

### B.3 Implication for rotation

- The ONLY caller-with-secret found in the repo is the admin UI client component.
- No external/repo-side scheduler config to update.
- The admin UI's secret is structurally awkward to rotate cleanly (see §H-DECISION below).
- If an external scheduler exists (Thomas-confirmable), it gets the new value via Thomas's manual update — terminal Claude cannot enumerate Vercel-dashboard-side configs or external accounts.

### B.4 The architectural mismatch this surfaces

The admin route at `/admin` is already server-component-gated to a single email (`src/app/admin/page.tsx:7` defines `ADMIN_EMAIL`; lines 11-12 do `if (!user || user.email !== ADMIN_EMAIL) redirect('/')`). An admin user clicking the nudge button is already proven to be the admin. The shared-secret header pattern was designed for an *external* cron caller; using it from the admin UI is redundant with the route gate.

**This means: the secret was never doing meaningful work on the admin-UI call path** — the admin route gate already authenticates the admin user. The secret was only load-bearing for the imagined (but absent) external cron call. This is contextual background; it does NOT change Step 1.5's scope (extract+rotate the credential, don't refactor the architecture), but it's relevant to the rotation-options enumeration below.

---

## SECTION C — The fail-closed code change (exact)

The full diff Step 1.5 Phase 2 would apply to `src/app/api/hire-confirm/nudge/route.ts`:

```diff
-const CRON_SECRET = <previously hardcoded value>
+const CRON_SECRET = process.env.CRON_SECRET

 export async function POST(req: Request) {
   // Verify cron secret
   const secret = req.headers.get('x-cron-secret')
-  if (secret !== CRON_SECRET) {
+  if (!CRON_SECRET || !secret || secret !== CRON_SECRET) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
   }
```

Fail-closed guarantees:
- `!CRON_SECRET` covers: env var **unset** (`undefined`), env var set to **empty string** (`""`). Both → 401.
- `!secret` covers: incoming request has **no** `x-cron-secret` header (`null`), or header present but empty (`""`). Both → 401.
- `secret !== CRON_SECRET` covers: incoming header value **doesn't match** the env. → 401.

There is no fallback literal. There is no "if no secret configured, skip the check." There is no `process.env.CRON_SECRET || <fallback>`. Unset env = endpoint denies all calls.

The proposed change is also **the minimum to satisfy fail-closed** — no other lines of the route are touched (no behavior change beyond the credential-source change).

---

## SECTION D — Safe rotation sequence + verification curl shapes (no values)

### D.1 The sequence (in this order)

1. **Thomas (in Vercel dashboard, NOT terminal Claude):** add a new `CRON_SECRET` environment variable to the production environment of the `shipstacked` project. Use a fresh value (Phase 2 hand-off will provide an exact value via transient chat for Thomas to paste; the value is NEVER written into any file, commit, or this doc). Save → triggers a Vercel redeploy of the existing code.
2. **Terminal Claude:** apply the §C code edit (extract to `process.env.CRON_SECRET` + fail-closed). Commit + push (no secret value in commit). Vercel auto-deploys the new code; the env var from step 1 is now both *available* AND *required* by the running code.
3. **§H-DECISION-dependent step** — update the admin UI caller per the chosen option (see §H-DECISION).
4. **Verification curls** (no secret values; only HTTP status codes shown):
   - **Verify NEW secret is accepted** (Thomas runs this with the new value, locally or via a temp curl — terminal Claude does not receive the value):
     ```
     curl -s -o /dev/null -w "%{http_code}\n" \
       -X POST https://shipstacked.com/api/hire-confirm/nudge \
       -H 'Content-Type: application/json' \
       -H 'x-cron-secret: <NEW_VALUE>' \
       -d '{}'
     # Expected: 200  (proves the new value authorizes)
     ```
   - **Verify PREVIOUSLY HARDCODED value is REJECTED** (this IS the rotation-real proof — terminal Claude can run this since the old value is already in public git history, no new exposure created by sending it once for verification):
     ```
     curl -s -o /dev/null -w "%{http_code}\n" \
       -X POST https://shipstacked.com/api/hire-confirm/nudge \
       -H 'Content-Type: application/json' \
       -H 'x-cron-secret: <PREVIOUSLY_HARDCODED_VALUE>' \
       -d '{}'
     # Expected: 401  (proves the historically exposed value is dead)
     ```
   - **Verify no-header is REJECTED** (fail-closed proof from the input side):
     ```
     curl -s -o /dev/null -w "%{http_code}\n" \
       -X POST https://shipstacked.com/api/hire-confirm/nudge \
       -H 'Content-Type: application/json' \
       -d '{}'
     # Expected: 401  (no secret → denied)
     ```

The OLD-value-rejected response is the load-bearing rotation proof. Without it, rotation is unverified.

### D.2 What this sequence does NOT do

- Does NOT temporarily allow both old and new values (we're not running an overlap window — the dormant nature of the endpoint makes a clean cutover safe).
- Does NOT touch git history.
- Does NOT execute any DB mutation.
- Does NOT change the route's authorized-path behavior (the email-send loop is byte-unchanged).

---

## SECTION E — Other-secret scan (scoped per §4.5; §6 escalation reported above)

Confirmed scope: the only edit in this file is the credential-source change. No other secret literal in `src/app/api/hire-confirm/nudge/route.ts`.

Out-of-file findings from the scoped grep (per §6 — locations ONLY, not fixed): see Escalation #2 above. Two `TEST_PASSWORD` literals in `scripts/v2/verify-step-6.ts:31` and `scripts/v2/verify-step-7.ts:26`. Their own future cycles if and when warranted.

---

## SECTION F — Scope confirmation: exactly this one credential

Phase 2 (when approved) modifies exactly these source files:
- `src/app/api/hire-confirm/nudge/route.ts` (the §C edit — 2 lines changed).
- **(§H-DECISION-dependent)** `src/app/admin/AdminActions.tsx` — the client-side caller's secret handling. Three options enumerated in §H-DECISION; smallest-scope option does NOT modify this file.

Files explicitly NOT touched (regardless of §H-DECISION):
- The hire-confirm feature itself (the route's email-send logic, the `hire_confirmations` table, the HTML page at `/hire-confirm`, the admin UI's surrounding-the-button layout) — Phase B disposition is separate, still pending.
- `thomasoxlee198` (Phase B item F.1 from Tier 4 — leave-as-is recommendation stands).
- Any of the OTHER-secret findings (Escalation #2 — their own cycles).
- All Beacon 1–5 / V2 / Collections / Atlas / MCP source modules.
- `src/lib/jsonld/person.ts` (Beacon 1 byte-unchanged invariant — would extend to 8th commit running on Step 1.5 ship).
- `src/middleware.ts`, `AGENTS.md`, `CLAUDE.md`.

No production data is mutated. No DB query is run in Phase 2.

---

## SECTION G — Surprises / findings

### G.1 The route uses **non-constant-time string comparison** for the secret check (`!==`)

`secret !== CRON_SECRET` is a JavaScript `!==` comparison — short-circuits at the first non-matching character, theoretically leaking secret bits via response-time side channel. The standard secure comparison uses `crypto.timingSafeEqual()` or equivalent.

**For the scope of Step 1.5: do NOT change this.** The spec is exactly one credential, rotate, fail-closed. Timing-safety is a separate hardening item (a §G/G2-style "found, not fixed, own future cycle"). For practical risk in *this* setting: the endpoint is dormant + the table is empty + rate-limit on guessing a high-entropy secret over the network would take infeasible time even with a perfect oracle. Flagging it here as a finding so it doesn't get lost; the file edit in Step 1.5 §C deliberately preserves the existing comparison shape (just changes the value source).

### G.2 The admin UI surface adds a second exposure of the literal beyond git history

Detailed in Escalation #1. The literal is present in the production admin-page JS bundle served to authenticated admin sessions (extractable via browser devtools by anyone who can render `/admin`). The rotation closes BOTH surfaces in one move (the value becomes dead authentication everywhere — git history AND any client bundle copy).

### G.3 The endpoint is genuinely dormant — clean cutover is safe

`/api/hire-confirm/nudge` has no scheduler invocation. The only triggered-call path is the admin button. The `hire_confirmations` table is empty (verified in Tier 4 §D.2 — 0 rows / 0 confirmed). A clean cutover (old value stops working the moment new code deploys) has effectively zero functional impact: even an in-flight admin button click during deploy that 401s is recoverable by clicking again post-deploy (with the new value if the admin UI is rotated too, or with a documented graceful break per §H-DECISION).

---

## SECTION H — Proposed Phase 2 change list

**Section H approval is for Step 1.5 ONLY.** Phase B items (thomasoxlee198, hire-confirm feature disposition) remain pending separate decisions; Step 1.5 does not touch them.

### **H-DECISION — Handling the admin UI client-side caller (Escalation #1)**

> The same literal lives at `AdminActions.tsx:15`. Choose ONE for Phase 2:
>
> - **Option A (recommended) — Rotate server-side only; let the admin UI button visibly break (returns 401)**
>   - Modifies ONLY `src/app/api/hire-confirm/nudge/route.ts` (the §C edit).
>   - The admin button continues to POST the previously-hardcoded literal. Server rejects it with 401. Button displays the existing error path: `"Error triggering nudge"`.
>   - Pros: minimum scope. Strictly aligns with Spec §2 ("exactly this one credential"). Rotation is complete; the OLD value is dead everywhere. F.2 hire-confirm-feature disposition remains pending and the broken button visibly surfaces F.2 to whoever opens `/admin` (only Thomas). Zero risk of accidentally re-exposing the new value via the client bundle.
>   - Cons: the admin UI button stops working. Practical impact: zero (button currently nudges 0 conversations because table is empty + filter excludes most). It's an admin-only button only Thomas sees.
>
> - **Option B — Rotate server-side AND remove the secret from AdminActions; rely on the existing admin route gate**
>   - Modifies BOTH files. AdminActions.tsx drops the `x-cron-secret` header (or sends a recognized "no-secret-from-admin-UI" pattern). Server route adds: if request has a valid admin session (`user.email === ADMIN_EMAIL`) → allow without the secret; else require the env secret. This preserves the dual call-path (internal admin click + future external cron) without rotating-into-a-leak on the client side.
>   - Pros: admin button keeps working. Architecturally cleaner (admin UI uses the admin gate it's already behind).
>   - Cons: bigger scope. Touches the admin UI AND adds session-based auth to the route — modifies "the hire-confirm feature itself" which Spec §2 excludes ("any change to the hire-confirm *feature* itself"). Arguably a Phase B disposition item.
>
> - **Option C (FORBIDDEN, listed for completeness) — Rotate both files with a NEW literal in AdminActions.tsx**
>   - Theater per Spec §3 — the new literal would be in committed source. SAME exposure. Per Spec §6 explicitly forbidden. **DO NOT CHOOSE.** Listed only so the rejection is on the record.
>
> **Recommendation: Option A.** Smallest scope, fully satisfies Spec §2/§3, the breakage is harmless and itself a useful pointer toward F.2. If Thomas wants Option B (preserve admin button), that's a defensible larger-scope choice but should be acknowledged as touching the hire-confirm feature.

### H1 — (Thomas, in Vercel dashboard) Set `CRON_SECRET` env var

Terminal Claude provides the exact value in the Phase 2 chat hand-off (never in a committed file). Thomas pastes it into Vercel → Settings → Environment Variables → Add → name `CRON_SECRET`, value `<from chat>`, environment `Production` (and `Preview` + `Development` if Thomas wants parity). Save.

Recommended value source: a cryptographically random string (terminal Claude can generate one in chat without committing it). Suggested shape: 32+ bytes base64url (`openssl rand -base64 32` style). Thomas can also paste a value of his own choosing.

### H2 — Apply the §C code edit to `src/app/api/hire-confirm/nudge/route.ts`

Exactly the diff in §C. Two lines changed (line 6 + lines 10-13). No other modifications to the file. No new imports needed.

### H3 — (Option A only — DEFAULT) skip; admin UI rotation deliberately deferred

If Option A is chosen, `AdminActions.tsx` is NOT modified. The button visibly breaks (401) post-deploy. Document the deliberate-break in the commit message and link to F.2 (hire-confirm feature disposition is the eventual fix).

(If Option B is chosen: H3 becomes "modify both files per Option B"; spec scope expanded; record clearly.)

### H4 — Verification (before declaring done)

Three curls per §D.1, plus the standard gate:

- New value POST → **200 expected** (proves new credential authorizes; Thomas runs this since terminal Claude doesn't have the value).
- Previously-hardcoded-value POST → **401 expected** (the load-bearing rotation proof — terminal Claude runs this; the value is already public history, so sending it once for verification creates no new exposure).
- No-header POST → **401 expected** (fail-closed proof).
- Working-tree grep for the literal in source: returns nothing (`grep -rE "<literal>" src/` empty).
- `tsc --noEmit` clean. `npm run build` clean.
- `git status`: only `src/app/api/hire-confirm/nudge/route.ts` modified (under Option A). No other tracked source touched.
- `src/lib/jsonld/person.ts` byte-unchanged (8th commit running).
- 5 prior-tier prod regressions intact + `/api/mcp` POST initialize 200.
- `npm publish` NOT run (still — Beacon 4 package remains publish-ready unpublished).
- Update `docs/audit/TIER_4_RECONCILIATION.md` F.3 → RESOLVED with the closing commit ref (no secret values in the update).

### H5 — Commit + push + report

Commit message documents (no secret values anywhere):
- Credential extracted to `process.env.CRON_SECRET` with explicit fail-closed guard (`!CRON_SECRET || !secret || secret !== CRON_SECRET`).
- Value was ROTATED (state that rotation occurred; the previously-hardcoded value is now rejected on prod by HTTP 401).
- Why rotation, not history-rewrite: rotation makes the historical value worthless without destroying every clone/fork.
- §H-DECISION-dependent: under Option A, admin button visibly breaks (deliberate; links to F.2); under Option B, admin UI keeps working (scope expanded; documented).
- Two §6 escalations from Phase 1 (Escalation #1 on dual-file embedment, Escalation #2 on two TEST_PASSWORD literals in verify scripts) — both reported in this commit's discovery doc reference, NOT fixed.
- §G.1 non-constant-time comparison preserved unchanged (separate hardening item; flagged, not fixed).
- Scope: exactly this one credential. F.1 / F.2 pending separate decisions.
- `git revert` reverses the code edit; the env rotation is reversed manually in Vercel if ever needed BUT reverting the rotation would re-open the exposure and is documented NOT-recommended.

### H6 — Explicit non-goals

- ❌ Does NOT rewrite git history.
- ❌ Does NOT print any secret value (old or new) into any committed file.
- ❌ Does NOT touch the hire-confirm feature itself (the email-send logic, the table, the HTML page, the admin UI's button-display surface).
- ❌ Does NOT touch thomasoxlee198 (Phase B F.1).
- ❌ Does NOT fix the two `TEST_PASSWORD` literals (Escalation #2 — their own cycles).
- ❌ Does NOT change the non-constant-time comparison (§G.1 — separate hardening item).
- ❌ Does NOT modify any Beacon 1–5 / V2 / Collections / Atlas / MCP source.
- ❌ Does NOT run `npm publish`.
- ❌ Does NOT add the cron-secret to any client-bundled `NEXT_PUBLIC_*` env var (would re-leak via the JS bundle — same shape as a hardcoded literal).

---

## Sources verified during this discovery

- **`src/app/api/hire-confirm/nudge/route.ts`** read in full (115 lines). Auth logic at lines 6, 8-13.
- **`src/app/admin/AdminActions.tsx`** read in full (40 lines). Header send at line 15.
- **`src/app/admin/page.tsx`** lines 7, 11-12 — `ADMIN_EMAIL` constant + server-component email check.
- **`src/middleware.ts`** line 99 — `/admin` in `authRequired`.
- **`vercel.json`** — does NOT exist (verified by `ls`).
- **`.github/`** — does NOT exist (verified by `ls`).
- **OTHER-secret scan** — `grep -rnE "(const|let|var)\s+[A-Z_]*(SECRET|TOKEN|KEY|PASSWORD)[A-Z_]*\s*=\s*['\"][^'\"]{6,}['\"]"` against `src/` and `scripts/` — two `TEST_PASSWORD` literals in `scripts/v2/verify-step-{6,7}.ts` (Escalation #2).
- **Caller search** — grep for `hire-confirm/nudge` and `x-cron-secret`/`X-Cron-Secret` across `src/` and `scripts/` — only `AdminActions.tsx:15` (and the route itself at `route.ts:10`).

---

*End of Phase 1 discovery. STOP. Awaiting Thomas's review of:*
- *H-DECISION on Admin UI rotation handling (Option A recommended — server-side rotate only; admin button visibly breaks).*
- *Section H change list (Phase 2 items, item-by-item or as-a-whole approval).*
- *Acknowledgement of both §6 escalations (the dual-file embedment + the two OTHER `TEST_PASSWORD` literals — neither acted on).*

*Before Phase 2.*
