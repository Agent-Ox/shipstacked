# Test-data cleanup — execution result (2026-09-06, Phase 2)

Companion to `LIVE_TEST_DATA_2026-09-06.md` (Step 1 inventory). Phase 2 executed the
approved scoped deletion against production. **The 40-real-builder invariant holds.**

Approvals executed: northwind-ventures (#75) DELETE · all 19 subscriptions DELETE ·
test456 / paddybot130 / hyy922 LEAVE.

---

## 1. Before / after

| table | before | after | Δ |
|---|---:|---:|---:|
| **profiles** | 80 | **61** | −19 |
| **entities** | 60 | **40** | −20 |
| **real published builders** | **40** | **40** | **unchanged** ✅ |
| real unpublished humans | 21 | 21 | unchanged ✅ |
| proof_receipts | 108 | 80 | −28 |
| verification_events | 106 | 80 | −26 |
| ingestion_log | 115 | 89 | −26 |
| subject_atlas_roles *(view)* | 124 | 90 | −34 (derived) |
| skills | 1120 | 617 | −503 |
| projects | 46 | 32 | −14 |
| posts | 73 | 63 | −10 |
| github_data | 27 | 19 | −8 |
| api_keys | 48 | 45 | −3 |
| enrichment_runs | 18 | 3 | −15 |
| post_comments | 13 | 0 | −13 |
| comment_likes | 1 | 0 | −1 |
| invites | 5 | 0 | −5 |
| saved_profiles | 3 | 0 | −3 |
| team_admins | 8 | 0 | −8 |
| **team_profiles** | 8 | **0** | −8 |
| **agent_profiles** | 1 | **0** | −1 |
| conversations | 1 | 0 | −1 |
| messages | 0 | 0 | unchanged |
| **subscriptions** | 19 | **0** | −19 |
| — of which `status='active'` | **11** | **0** | −11 |
| auth.users | 148 | 113 | −35 |
| — real third-party auth users | 110 | 109 | −1 *(see §4)* |
| ryangrant144 receipts | 12 | 12 | unchanged ✅ |

---

## 2. Execution order (as run)

1. **The one crossing first** — `messages` (0) → `conversations` (1, the
   `oxleethomas+hirer-test7` ↔ **ryangrant144** row on org 75). Immediately re-asserted
   ryangrant144: `published=true`, 12 receipts — **intact**, before anything else ran.
2. `invites` (5) · `saved_profiles` (3) · `api_keys` (3, scoped to test profile_ids
   only — the other 45 belong to real users) · `applications` (0)
3. `subscriptions` (19)
4. `comment_likes` (1) → `post_comments` (13)
5. `verification_events` (26) → `ingestion_log` (26) → `proof_receipts` (28)
6. `enrichment_runs` (15 — entities 76/77 excluded, those are the real post-July signups)
7. `skills` (503) · `projects` (14) · `posts` (10) · `github_data` (8)
8. `team_admins` (8) → `team_profiles` (8) → `agent_profiles` (1)
9. **Step-0 UPDATE** — nulled `entity_id` + `team_entity_id` on the 19 test profiles to
   break the circular `profiles ↔ entities` FK
10. `entities` (20) → `profiles` (19)
11. `auth.users` (35 — see §3)

`subject_atlas_roles` was **not** deleted from: it is a VIEW over `proof_receipts`
(`supabase/migrations/20260616125219_subject_atlas_roles_view.sql`). It dropped
124 → 90 on its own, as designed.

---

## 3. ⚠️ Deviation from the brief: `oxleethomas+admin@gmail.com` was NOT deleted

The brief listed 17 profile-less `oxleethomas+` aliases for auth deletion. One of
them, `oxleethomas+admin@gmail.com`, is the hardcoded `ADMIN_EMAIL` in five places:

- `src/app/admin/page.tsx:9` (`redirect('/')` if the session email doesn't match)
- `src/app/api/admin/verify/route.ts:7`
- `src/app/api/enrich/route.ts:30`
- `src/app/u/[username]/page.tsx:118` (admin view-access override)
- `src/app/api/verify-request/route.ts:19` (notification recipient)

Deleting that auth account would have locked Thomas out of `/admin`, the verify
toggle, and the admin arm of the enrich API, with no in-app way back. **Excluded it
and deleted 16, not 17.** Not-deleting is recoverable; deleting is not.

Auth deletions actually run: **35** = 19 test-profile accounts + 16 profile-less
aliases. Preserved: `oxleethomas@gmail.com` (main), `oxleethomas+admin@gmail.com`
(ADMIN_EMAIL), `step6-verify@` / `step7-verify@shipstacked.test`, and all 109 real
third-party accounts (48 of which are profile-less real leads).

If Thomas wants that alias gone later, the ADMIN_EMAIL constant must move to an env
var first — that is a code change, not a data change.

---

## 4. The one assertion that tripped (and why it is not a loss)

`real (non-Thomas) auth users untouched: 110 → 109` failed. Cause: the assertion's
"real" predicate excluded only `oxleethomas*` and `*@shipstacked.test`, so it counted
`manualtest-invite-new-20260621@example.com` — the synthetic invite-flow stub that was
in the approved 19-profile delete set from the start — as a real third-party account.

Verified directly afterwards: **zero collateral third-party auth deletions**; the only
non-alias address in the 35 deleted is that `@example.com` stub. Every one of the 61
surviving profiles still has a live auth account (0 orphans). The predicate was wrong,
the deletion was not.

All 15 other invariant checks passed:
real published = 40 · the 40 usernames byte-identical to the pre-count list ·
kushalshrestha612 present · ryansingh907 present · ryangrant144 unchanged ·
21 real unpublished untouched · test456 / paddybot130 / hyy922 all present ·
proof_receipts exactly −28 · active subscriptions = 0 · profiles 61 / entities 40 ·
**AGENTS.md invariant #1 holds** (every remaining human entity's `slug` still equals
its `profile.username`, 0 violations) · both protected auth accounts preserved.

---

## 5. Production verification

- `scripts/v2/verify-agent-card.ts --base https://shipstacked.com` → **all gates passed**
  (AGENTS.md invariant #8 green: every declared AgentCard URL still resolves).
- Surface spot-check: `/` `/talent` `/feed` `/jobs` `/pricing` → 200 ·
  `/u/ryangrant144` `/u/kushalshrestha612` `/u/ryansingh907` → 200 ·
  `/team/helix-labs` → 404 · `/u/marcusreyes698` → 404 (both correct — deleted).
- `/admin` MRR: `activeSubscriptions.length * 199` now computes **0 active × $199 = $0**.
  The fake $2,189 is gone; the table is empty, so MRR, MRR-last-month, LTV and the
  subscription list all read honestly for the first time.

---

## 6. Reversal path

Every deleted row was dumped **before** the first DELETE fired. The dump is kept
**outside this public repo** (it carries emails and api-key hashes):

```
~/shipstacked-test-data-backup-2026-09-06.json     (279K — all 23 tables + the 35 auth users)
~/shipstacked-test-data-precount-2026-09-06.json
~/shipstacked-test-data-postcount-2026-09-06.json
```

Restoration would be manual and is not expected — this is test residue by
construction — but the set is fully reconstructable from that file.

No code changed in this phase; there is nothing to `git revert`.

---

## 7. Consequences to know about

- **`team_profiles` and `agent_profiles` are now empty tables.** Every team- and
  agent-shaped surface renders zero rows until a real team or agent signs up. Correct
  (all 8 orgs/teams and the 1 agent were tests) but visible in production.
- **`conversations`, `messages`, `subscriptions`, `invites`, `saved_profiles`,
  `post_comments`, `comment_likes` are all empty.** The platform now holds only real
  builder data.
- The three published-gate fakes named in code comments
  (`src/app/feed/page.tsx:22`, `src/app/feed/[id]/page.tsx:68`,
  `src/lib/jsonld/person.ts:14` — jennypeterson224, johnchambers73,
  oxleethomasagentox598) **no longer exist as rows**. The gate itself is still correct
  and load-bearing (AGENTS.md invariant #2 — 21 real unpublished humans still rely on
  it); only those comments' examples are now stale. Not changed here; worth a
  docs-accuracy pass later.
