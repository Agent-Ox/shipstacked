# Live test-data inventory — 2026-09-06 (Step 1, READ-ONLY)

Phase 1 discovery for the test-data cleanup. **No rows were mutated.** This doc
enumerates every row in the live production DB, splits it TEST vs REAL, names the
protected real cohort, and drafts the exact entity-first delete order for Phase 2.

Method: same as the batch5 sweep / inquiry purge / buyer-test cleanup — inventory
first, protect the real builder cohort by explicit list, delete children before
parents, verify the real count unchanged before and after.

Evidence scripts (both read-only, committed with this doc):
- `scripts/v2/audit-test-data.ts` — full row dump of every human/entity/team/agent/org + dependents
- `scripts/v2/audit-test-data-deps.ts` — dependent enumeration for the candidate test set

Run: `node --env-file=.env.local --experimental-strip-types scripts/v2/audit-test-data.ts`

---

## 0. Headline numbers

| | count |
|---|---|
| `profiles` (human rows) | 80 |
| → TEST (delete) | **19** |
| → REAL, published (PROTECTED) | **40** |
| → REAL, unpublished (leave alone) | 21 |
| `entities` | 60 |
| → TEST (delete) | **20** (11 human + 6 team + 1 agent + 2 org) |
| → REAL | 40 |
| `team_profiles` | 8 → **all 8 TEST** (6 teams + 2 buyer orgs) |
| `agent_profiles` | 1 → **1 TEST** |
| `subscriptions` | 19 → **all 19 TEST** (every row is an `oxleethomas*` address) |

### ⚠️ FLAG 1 — the invariant is 40 now, not 38

The 2026-07-07 handoff records "38 real builders". The live count of REAL published
builders is **40**. The two extra are genuine organic signups that arrived *after*
the handoff was written:

- `kushalshrestha612` — Kushal Shrestha, k***@niyalo.com, entity 76, signed up **2026-07-11**
  (GitHub `Kuu44`, x `kuu44_`, site niyalo.com, 1 receipt, 2 enrichment runs)
- `ryansingh907` — Ryan Singh, r***@gmail.com, entity 77, signed up **2026-08-19**
  (GitHub `Ryan97singh`, x `Ryan97Singh`, 2 receipts, 1 enrichment run)

Both are non-`oxleethomas` addresses with organic GitHub/X/site proof and machine-generated
receipts. They are REAL. **The post-cleanup assertion is therefore `REAL published = 40`,
not 38.** If the architect expects 38, that expectation is stale by two organic signups,
not evidence of contamination.

---

## 1. PROTECTED — the 40 real published builders

These rows and every dependent they own (posts, projects, skills, receipts,
verification_events, ingestion_log, github_data, api_keys, entities) are the
invariant. Nothing in Phase 2 touches any of them.

| # | username | name | email | entity | joined |
|---|---|---|---|---|---|
| 1 | olalekanridwanullah197 | Olalekan Ridwanullah | r***@gmail.com | 14 | 2026-04-08 |
| 2 | murtazazaidi476 | Murtaza Zaidi | z***@gmail.com | 32 | 2026-04-08 |
| 3 | sunnyzheng606 | Sunny Zheng | z***@foxmail.com | 5 | 2026-04-08 |
| 4 | vinodkrishnabanda657 | vinod krishna banda | b***@gmail.com | 13 | 2026-04-10 |
| 5 | hamzaahmad151 | Hamza Ahmad | o***@gmail.com | 28 | 2026-04-11 |
| 6 | ifioksundayuboh72 | Ifiok Sunday Uboh | h***@gmail.com | 15 | 2026-04-13 |
| 7 | sumitdongardive9 | Sumit Dongardive | s***@gmail.com | 9 | 2026-04-13 |
| 8 | joedias995 | Joe Dias | y***@gmail.com | 8 | 2026-04-14 |
| 9 | chidinmaekegbu274 | Chidinma Ekegbu | m***@gmail.com | 63 | 2026-04-14 |
| 10 | aniketaslaliya801 | Aniket Aslaliya | a***@gmail.com | 4 | 2026-04-14 |
| 11 | vikrantsharma339 | Vikrant Sharma | i***@gmail.com | 38 | 2026-04-14 |
| 12 | aaronwilkins714 | Aaron Wilkins | a***@gmail.com | 64 | 2026-04-14 |
| 13 | michaelcrafter806 | Michael Crafter | m***@gmail.com | 65 | 2026-04-14 |
| 14 | pawelborkar997 | Pawel Borkar | p***@duck.com | 33 | 2026-04-14 |
| 15 | shashankpoola164 | Shashank poola | s***@gmail.com | 36 | 2026-04-14 |
| 16 | avikbhanja723 | Avik Bhanja | a***@gmail.com | 17 | 2026-04-15 |
| 17 | hugovermot492 | hugo vermot | c***@gmail.com | 29 | 2026-04-15 |
| 18 | anubhavnegi237 | anubhavnegi | a***@gmail.com | 26 | 2026-04-15 |
| 19 | nnekaewalu847 | Nneka Ewalu | n***@gmail.com | 20 | 2026-04-15 |
| 20 | justusferdinandaugus652 | Justus Ferdinand August | j***@ai-vaerk.de | 31 | 2026-04-15 |
| 21 | celestinokariuki456 | Celestino Kariuki | c***@strathmore.edu | 12 | 2026-04-16 |
| 22 | anantdhavale962 | Anant Dhavale | a***@gmail.com | 18 | 2026-04-17 |
| 23 | sayande727 | Sayan De | s***@gmail.com | 35 | 2026-04-17 |
| 24 | janwinum9 | Jan Winum | w***@winum.dk | 16 | 2026-04-18 |
| 25 | danielendara157 | Daniel Endara | d***@gmail.com | 62 | 2026-04-18 |
| 26 | aramideramadan392 | Aramide Ramadan | a***@gmail.com | 27 | 2026-04-18 |
| 27 | jovanpanetie230 | Jovan Panetie | j***@gmail.com | 30 | 2026-04-19 |
| 28 | pramodhavg491 | Pramodh AVG | h***@gmail.com | 34 | 2026-04-19 |
| 29 | emanuelcovelli123 | Emanuel Covelli | e***@gmail.com | 19 | 2026-04-20 |
| 30 | abhishekarjun819 | Abhishek Arjun | a***@gmail.com | 66 | 2026-04-22 |
| 31 | yuki448 | Yuki | y***@gmail.com | 11 | 2026-04-22 |
| 32 | chimaobiekwe708 | Chimaobi Ekwe | m***@gmail.com | 67 | 2026-04-23 |
| 33 | khairulanwar932 | Khairul Anwar | k***@gmail.com | 7 | 2026-04-23 |
| 34 | brysonstarling649 | Bryson Starling | b***@gmail.com | 68 | 2026-04-24 |
| 35 | taegyujeong211 | Taegyu Jeong | t***@gmail.com | 37 | 2026-04-28 |
| 36 | eluwaemekamichael740 | Emeka Michael Eluwa | j***@yahoo.com | 6 | 2026-04-30 |
| 37 | ryangrant144 | Ryan Grant | r***@icloud.com | 10 | 2026-04-30 |
| 38 | andreaschristodoulou643 | Andreas Christodoulou | a***@andreascy.com | 21 | 2026-05-05 |
| 39 | kushalshrestha612 | Kushal Shrestha | k***@niyalo.com | 76 | 2026-07-11 |
| 40 | ryansingh907 | Ryan Singh | r***@gmail.com | 77 | 2026-08-19 |

Rows 9, 12, 13, 30, 32, 34 are the URL-less cohort from handoff item 6 — real, just unenriched.

### Also protected: 21 REAL but unpublished humans

Real third-party signups that never published. Not Thomas's aliases, not test data,
already hidden everywhere by the published-gate (AGENTS.md invariant #2). **Leave.**

kingfaithful627, abigaeljepkoech889, ziongonet588, yahiaouaziz101, joshuaakpan325,
abdulkhaliq110, leeonjohn868, dikshasharma313, emmanuelwordsworth796, ayushgairola711,
**test456**, **paddybot130**, alexandernqn203, pradhumansinhpadhiya122, irfankhan711,
peacesunday748, slava671, hypermemetic261, **hyy922**, umarfarooq2, biditraj818

(The three bolded are ambiguity items — see §5.)

---

## 2. THE TEST SET — what Phase 2 deletes

### 2a. TEST humans — 19 profiles

**Group A — April flow tests (7).** All `oxleethomas+` aliases, `published=false`,
no entity, pre-date the entity merge.

| username | name | email | dependents |
|---|---|---|---|
| builder1test701 | Builder 1 Test | oxleethomas+builder1@gmail.com | 1 project, 68 skills |
| jamesbond244 | James Bond | oxleethomas+builder2@gmail.com | 1 project, 68 skills |
| johnchambers73 | John Chambers | oxleethomas+builder3@gmail.com | 1 post, 1 project, 68 skills, 1 github_data, 1 api_key, 1 saved_profile ref |
| johnlee544 | John Lee | oxleethomas+builder4@gmail.com | 1 project, 62 skills |
| peterjones152 | Peter Jones | oxleethomas+builder5@gmail.com | 1 project, 63 skills |
| oxleethomasagentox598 | Maya Okonkwo | oxleethomas+agent-ox@gmail.com | 3 posts, 1 project, 13 skills, 1 api_key, owns the commented post, 4 comments, 1 like |
| jennypeterson224 | Jenny Peterson | oxleethomas+jennypeterson@gmail.com | 3 posts, 1 project, 10 skills, 1 github_data, 1 api_key, 9 comments, 2 saved_profile refs |

**Group B — Jun/Jul signup-flow tests (12).** Entity-backed; these are the repeated
signup restarts described by Thomas.

| username | name | email | entity | dependents |
|---|---|---|---|---|
| samtestbuilder892 | Sam Test-Builder | oxleethomas+st-builder-20260617@gmail.com | 49 | 1 post, 2 receipts, 1 enrichment run, team_entity_id→39 |
| samv2testbuilder440 | Sam V2 Test-Builder | oxleethomas+st-builder-v2-20260620@gmail.com | 50 | 1 post, 2 receipts, 1 github_data, 1 enrichment run, 1 canceled sub |
| manualtestinvitenew2302 | *(blank)* | manualtest-invite-new-20260621@example.com | 51 | team_entity_id→39, invite #1 |
| saratestbuilder665 | Sara Testbuilder | oxleethomas+st-builder-20260622@gmail.com | 52 | 1 post, 13 skills, 2 receipts, 1 enrichment run |
| marcusavela372 | Marcus Avela | oxleethomas+st-bld-0622a@gmail.com | 53 | 1 project, 19 skills, 3 receipts, 1 github_data, 3 enrichment runs |
| priyanandakumar130 | Priya Nandakumar | oxleethomas+st-bld-0622b@gmail.com | 54 | 1 project, 11 skills, 3 receipts, 1 github_data, 2 enrichment runs, 1 canceled sub |
| danielokonkwotest902 | Daniel Okonkwo Test | oxleethomas+st-bld-0622c@gmail.com | 55 | 1 project, 10 skills, 2 receipts, 1 github_data, 1 enrichment run |
| elenamarchetti944 | Elena Marchetti | oxleethomas+st-builder-final@gmail.com | 56 | 1 project, 3 receipts, 1 github_data, 2 enrichment runs, 1 canceled sub |
| sofiareyes486 | Sofia Reyes | oxleethomas+st-loginfix-0623@gmail.com | 57 | 1 project, 24 skills, 1 failed enrichment run, 1 canceled sub |
| oxleethomasinvitee1667 | Team Mate Test | oxleethomas+invitee1@gmail.com | 60 | 12 skills, 1 receipt, 1 github_data, 1 enrichment run, team_entity_id→59, invite #6 |
| tomjones681 | Tom Jones | oxleethomas+helix@gmail.com | *(none)* | 1 project, 12 skills, team_entity_id→61, 1 canceled sub |
| marcusreyes698 | Marcus Reyes | oxleethomas+solo-dev1@gmail.com | 69 | 1 project, 13 skills, 2 receipts, 1 enrichment run, 1 canceled sub |

`marcusreyes698` is the BUILDER signup test from the handoff; `tomjones681` is the
human behind the helix-labs TEAM test.

### 2b. TEST teams — 6 entities (all of `team_profiles` with kind='team')

| entity | slug | name | contact | created |
|---|---|---|---|---|
| 39 | test-studio-phase4 | Test Studio Phase4 | oxleethomas@gmail.com | 2026-06-10 |
| 48 | test-agency-collective | Test Agency Collective | oxleethomas+teamtest@gmail.com | 2026-06-19 |
| 58 | meridian-ai-collective | Meridian AI Collective | oxleethomas+st-team-0623@gmail.com | 2026-06-23 |
| 59 | cobalt-systems | Cobalt Systems | oxleethomas+st-team-final2@gmail.com | 2026-06-24 |
| 61 | helix-labs | Helix Labs | oxleethomas+helix@gmail.com | 2026-07-06 |
| 70 | cortex-ai-studio | Cortex AI Studio | oxleethomas+team-test8@gmail.com | 2026-07-08 |

Every one carries an `oxleethomas*` contact address. Matches Thomas's list exactly.
Dependents: 6 team_profiles rows, 6 team_admins rows, 3 invites, receipts on 39 (1),
58 (4), 61 (2), enrichment run on 61.

### 2c. TEST agents — 1

| entity | slug | name | provider/model | created |
|---|---|---|---|---|
| 40 | test-agent-phase5 | Test Agent Phase5 | claude / claude-opus-4-7 | 2026-06-16 |

Owned by the same auth user as team 39. 1 agent_profiles row, 1 receipt.
`principal_entity_id` is null, so no back-reference to untangle.

### 2d. TEST buyer orgs — 2

| entity | slug | name | published | created |
|---|---|---|---|---|
| 71 | meridian-legal-group | Meridian Legal Group | false | 2026-07-08 |
| **75** | **northwind-ventures** | **Northwind Ventures** | false | 2026-07-08 |

Thomas named only #71. **#75 is a second buyer org** created the same day — same
shape (kind='org', unpublished, one team_admins row), and it is the `subject_entity_id`
on the single test conversation. Read as the second pass of the same buyer test.
See ambiguity §5.4 — needs an explicit yes.

### 2e. Non-FK test rows (keyed by email, no parent)

- **`subscriptions` — all 19 rows.** Every row is an `oxleethomas*` address; there is
  not a single non-Thomas subscription in the table. 8 canceled (the Jun/Jul Stripe
  test runs), **11 still `status='active'`** — the April `+employer*` / `+employ*`
  batch plus two `stripe_customer_id='test'` rows. Those 11 actively (a) grant Full
  Access to those addresses and (b) inflate `/admin` MRR, which computes
  `activeSubscriptions.length * 199` (`src/app/admin/page.tsx:55`) — currently a fake
  $2,189 MRR. Deleting all 19 zeroes it honestly.
- **`saved_profiles` — 3 rows**, all `oxleethomas+employ*`, all pointing at Group A
  test profiles. No real builder is saved by anyone.
- **`invites` — 5 rows**, all test: #1/#3 → team 39, #6 → team 59, #4 (revoked) and
  #5 (pending) have `team_entity_id=NULL` and `oxleethomas*` invitee addresses so
  they are NOT reachable via the entity join — delete them by id explicitly.
- **`conversations` — the only row in the table** (`36115e53…`): employer
  `oxleethomas+hirer-test7@gmail.com`, `subject_entity_id=75`, 0 messages.
  **Blast-radius note:** its `builder_profile_id` is `dd263826…` = **ryangrant144, a
  REAL builder**. Deleting the conversation row removes the test artefact and touches
  nothing on Ryan's profile. This is the only place test data points at a real row.

---

## 3. Delete tally

| table | rows deleted | note |
|---|---|---|
| comment_likes | 1 | |
| post_comments | 13 | all on one test post, all test authors |
| verification_events | 26 | children of the 28 test receipts |
| ingestion_log | 26 | children of the 28 test receipts |
| proof_receipts | 28 | subject_id ∈ test entities; `on_behalf_of_id` unused (0 rows) |
| posts | 10 | |
| projects | 14 | |
| skills | 503 | Group A carries ~68 each |
| github_data | 8 | |
| api_keys | 3 | johnchambers73, agent-ox, jennypeterson only — the other 45 keys belong to REAL users |
| saved_profiles | 3 | |
| enrichment_runs | 15 | runs on entities 76/77 are REAL — excluded |
| invites | 5 | 3 by entity + 2 orphan-team by id |
| team_admins | 8 | |
| team_profiles | 8 | 6 teams + 2 orgs → table ends **empty** |
| agent_profiles | 1 | → table ends **empty** |
| conversations | 1 | → table ends empty |
| subscriptions | 19 | → table ends empty |
| entities | 20 | 60 → 40 |
| profiles | 19 | 80 → 61 |

Untouched by construction: `applications`, `jobs`, `attestations`, `collection_memberships`,
`consent_tokens`, `collections`, `messages`, `project_inquiries`, `hire_confirmations`,
`agent_registrations`, `stripe_events`, `atlas_roles`, `capability_vocab`,
`capabilities_vocab`, `capability_atlas_crosswalk` (0 test rows in each).

`subject_atlas_roles` is a **VIEW** over `proof_receipts`
(`supabase/migrations/20260616125219_subject_atlas_roles_view.sql`) — it drops from
124 → ~90 rows on its own. Nothing to delete.

---

## 4. Entity-first delete order (Phase 2 plan — NOT YET RUN)

`ON DELETE` actions are not recorded in `supabase/migrations/` for the pre-merge
tables (only `agent_profiles.entity_id` is documented CASCADE), so Phase 2 must
**delete children explicitly and never rely on cascade**. There is also a mutual FK —
`profiles.entity_id → entities.id` *and* `entities.profile_id → profiles.id` — which
is why step 0 is an UPDATE, not a DELETE.

```
STEP 0  (UPDATE, no deletes)
  profiles SET entity_id = NULL, team_entity_id = NULL   WHERE id IN (19 test profile ids)
  → breaks the profiles→entities arm of the mutual FK before entities go

STEP 1  leaves
  comment_likes      WHERE comment_id IN (13 test comment ids)
  post_comments      WHERE id IN (13 test comment ids)
  verification_events WHERE receipt_id IN (28 test receipt ids)
  ingestion_log      WHERE receipt_id IN (28 test receipt ids)

STEP 2  profile-owned + entity-owned children
  proof_receipts     WHERE id IN (28 test receipt ids)
  posts              WHERE profile_id IN (19)
  projects           WHERE profile_id IN (19)
  skills             WHERE profile_id IN (19)
  github_data        WHERE profile_id IN (19)
  api_keys           WHERE profile_id IN (19)
  saved_profiles     WHERE id IN (3 test ids)
  enrichment_runs    WHERE entity_id IN (20 test entity ids)
  invites            WHERE id IN (1,3,4,5,6)
  conversations      WHERE id = '36115e53-…'      (0 messages, no children)
  team_admins        WHERE team_entity_id IN (20)
  team_profiles      WHERE entity_id IN (20)
  agent_profiles     WHERE entity_id IN (20)

STEP 3  entities
  entities           WHERE id IN (39,40,48,49,50,51,52,53,54,55,56,57,58,59,60,61,69,70,71,75)

STEP 4  profiles
  profiles           WHERE id IN (19 test profile ids)

STEP 5  email-keyed, no FK
  subscriptions      WHERE id IN (all 19)

STEP 6  (SEPARATE DECISION — see §5.6)
  auth.users deletion, if approved
```

**Verification gates (same as prior sweeps):**
- BEFORE: assert `profiles WHERE published=true AND username NOT IN (test set)` = **40**;
  snapshot every table count.
- AFTER: re-assert **40**; assert the 40 usernames are byte-identical to §1;
  assert `entities` = 40 and every remaining entity's `slug` still equals its
  `profile.username` (AGENTS.md invariant #1); assert receipts for the 40 unchanged.
- Then `npm run build` + `node --experimental-strip-types scripts/v2/verify-agent-card.ts --base https://shipstacked.com`.

**Reversal:** deletes are not revertible by `git revert`. Phase 2 must dump every
row it is about to delete to a JSON file first (`docs/audit/…-deleted-rows.json` or
an untracked local dump) so the set is reconstructable. Recommend the dump be written
and confirmed non-empty before the first DELETE fires.

---

## 5. Ambiguities — Thomas's call, nothing proceeds without an answer

**5.1 `test456` / full_name "test" / i***@gmail.com** — username and name both
say test, but the address is a third-party gmail, not an `oxleethomas+` alias, and it
owns 2 api_keys. Reads as a real person who named themselves "test".
→ **Recommend LEAVE** (unpublished, already invisible).

**5.2 `paddybot130` / Paddy Bot** — an autonomous-agent persona, self-described as
"created by Brian Gilligan", with a real X and LinkedIn and 1 post. Third-party, not
Thomas. → **Recommend LEAVE.**

**5.3 `hyy922` / h***@qq.com, bio "hahhha"** — junk, but a third-party junk
signup, not a flow test. → **Recommend LEAVE** (delete only if Thomas wants junk swept
too, which is a different job from this one).

**5.4 `northwind-ventures` (org 75)** — the second buyer org, not named in Thomas's
list. Same day, same shape, unpublished, and the subject of the one test conversation.
→ **Recommend DELETE, needs explicit yes.** If it stays, the conversation row must
stay too (it FKs to it).

**5.5 `subscriptions` — delete all 19, including the 11 `active` ones?**
All 19 are Thomas's addresses. The 11 active ones grant Full Access to those aliases
and fake $2,189 MRR on `/admin`. → **Recommend DELETE all 19.** Note the Stripe-side
customers/subscriptions are a separate system; deleting these DB rows does not cancel
anything at Stripe (the 8 canceled ones are already canceled there).

**5.6 `auth.users` — out of scope by default, needs a decision.**
148 auth users exist. Of them:
- **19** correspond exactly to the 19 test profiles being deleted.
- **18** more are `oxleethomas+…` accounts with *no* profile row (`+hirer-test7`,
  `+hirer-test8`, `+team-test8`, `+st-team-final2`, `+st-team-0623`, `+teamtest`,
  `+shipstacked`, `+employ123/321/678`, `+employer1/8/888/987/999`, `+ox`, `+admin`,
  and `oxleethomas@gmail.com` itself — **that last one is Thomas's own login, never delete it**).
- **2** are `step6-verify@shipstacked.test` / `step7-verify@shipstacked.test` (verify-script accounts).
- **50** are real third-party people who created an auth account but never built a
  profile. **Real leads — leave.**

Deleting a profile does not delete its auth user; the leftover can still log in and
land on an empty dashboard. → **Recommend: delete the 19 test-profile auth users +
the 17 profile-less `oxleethomas+` aliases (excluding `oxleethomas@gmail.com`), leave
the 2 `.test` verify accounts and all 50 real ones.** Requires an explicit yes because
it is irreversible and Thomas may want to reuse the aliases for the remaining tests
(agent signup, payment path).

**5.7 Side effect worth stating plainly.** After Phase 2, `team_profiles` and
`agent_profiles` are **empty tables**. Every team/agent-shaped public surface —
the team pages, the agent surface, the team/agent slots on the 77 capability pages,
and any team/agent nodes in the machine surfaces — renders with zero rows until a
real team or agent signs up. That is correct (all 8 teams and the 1 agent are Thomas's
tests) but it is a visible change to production, not a silent one.

**5.8 No code references any test slug.** Grepped `src/` and `scripts/` for all 9 test
entity slugs and the test usernames: the only hits are inside this cleanup's own audit
script. Nothing hardcodes a test row, so no code change accompanies the deletion.

---

## 6. Step-1 status

Read-only. Zero rows mutated. Awaiting: architect byte-review of this inventory +
Thomas's answers to §5.1–5.6, then the Phase-2 go for the scoped deletion.

---

## 7. PII note

`Agent-Ox/shipstacked` is a **public** repo (`"visibility": "public"` per the GitHub
API). Third-party email addresses are therefore masked throughout this document
(`r***@gmail.com`). The unmasked addresses are available from the live DB via the
read-only scripts above; they are not committed. Thomas's own `oxleethomas+…`
aliases are left intact because §5.6 needs them to be actionable. Full names and
usernames are already public on the site and are unmasked.
