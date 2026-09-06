// READ-ONLY. Given the candidate TEST set (entity ids + profile usernames),
// enumerate every dependent row so a scoped, entity-first delete order can be
// written. NO WRITES. Step 1 of the 2026-09-06 test-data cleanup.
//   node --env-file=.env.local --experimental-strip-types scripts/v2/audit-test-data-deps.ts
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(url, key)

// --- candidate test set (usernames = profiles.username) --------------------
const TEST_USERNAMES = [
  // Group A — early flow tests (Apr), published=false, oxleethomas+ aliases, no entity
  'builder1test701', 'jamesbond244', 'johnchambers73', 'johnlee544', 'peterjones152',
  'oxleethomasagentox598', 'jennypeterson224',
  // Group B — Jun/Jul signup-flow tests, entity-backed
  'samtestbuilder892', 'samv2testbuilder440', 'manualtestinvitenew2302', 'saratestbuilder665',
  'marcusavela372', 'priyanandakumar130', 'danielokonkwotest902', 'elenamarchetti944',
  'sofiareyes486', 'oxleethomasinvitee1667', 'tomjones681', 'marcusreyes698',
]
const TEST_ENTITY_SLUGS = [
  'test-studio-phase4', 'test-agency-collective', 'meridian-ai-collective', 'cobalt-systems',
  'helix-labs', 'cortex-ai-studio',            // teams
  'test-agent-phase5',                          // agent
  'meridian-legal-group', 'northwind-ventures', // buyer orgs
]

const all = async (t: string, cols = '*') => ((await admin.from(t).select(cols)).data ?? []) as any[]
const profiles = await all('profiles')
const entities = await all('entities')

const testProfiles = profiles.filter(p => TEST_USERNAMES.includes(p.username))
const humanTestEntityIds = testProfiles.map(p => p.entity_id).filter(Boolean)
const nonHumanTestEntities = entities.filter(e => TEST_ENTITY_SLUGS.includes(e.slug))
const ALL_TEST_ENTITY_IDS = [...humanTestEntityIds, ...nonHumanTestEntities.map(e => e.id)]
const TEST_PROFILE_IDS = testProfiles.map(p => p.id)
const TEST_EMAILS = testProfiles.map(p => p.email)

console.log(`candidate test profiles: ${testProfiles.length} (of ${profiles.length})`)
console.log(`candidate test entities: ${ALL_TEST_ENTITY_IDS.length} (${humanTestEntityIds.length} human + ${nonHumanTestEntities.length} team/agent/org) of ${entities.length}`)
console.log(`REAL profiles remaining: ${profiles.length - testProfiles.length}`)
const realPublished = profiles.filter(p => !TEST_USERNAMES.includes(p.username) && p.published)
console.log(`REAL published profiles (the protected cohort): ${realPublished.length}`)
console.log(`REAL entities remaining: ${entities.length - ALL_TEST_ENTITY_IDS.length}`)

const posts = await all('posts', 'id,profile_id,title')
const receipts = await all('proof_receipts', 'id,slug,subject_id,on_behalf_of_id,title')
const testPostIds = posts.filter(p => TEST_PROFILE_IDS.includes(p.profile_id)).map(p => p.id)
const testReceiptIds = receipts.filter(r => ALL_TEST_ENTITY_IDS.includes(r.subject_id)).map(r => r.id)
const comments = await all('post_comments', 'id,post_id,author_email')
const testCommentIds = comments.filter(c => testPostIds.includes(c.post_id) || TEST_EMAILS.includes(c.author_email)).map(c => c.id)

const rows = async (t: string, col: string, vals: any[], cols = '*') => {
  if (!vals.length) return []
  const { data, error } = await admin.from(t).select(cols).in(col, vals)
  if (error) { console.log(`  ERR ${t}.${col}: ${error.message}`); return [] }
  return data ?? []
}

const report: [string, string, any[]][] = []
const add = async (label: string, t: string, col: string, vals: any[], cols = '*') =>
  report.push([label, t, await rows(t, col, vals, cols)])

// leaves first
await add('L1 comment_likes (on test comments)', 'comment_likes', 'comment_id', testCommentIds, 'id,comment_id,user_email')
await add('L1 post_comments (test post or test author)', 'post_comments', 'id', testCommentIds, 'id,post_id,author_email')
await add('L1 verification_events (test receipts)', 'verification_events', 'receipt_id', testReceiptIds, 'id,receipt_id,level')
await add('L1 ingestion_log (test receipts)', 'ingestion_log', 'receipt_id', testReceiptIds, 'id,receipt_id,source')
await add('L2 proof_receipts (subject = test entity)', 'proof_receipts', 'id', testReceiptIds, 'id,slug,subject_id')
await add('L2 posts (test profiles)', 'posts', 'profile_id', TEST_PROFILE_IDS, 'id,profile_id,title')
await add('L2 projects (test profiles)', 'projects', 'profile_id', TEST_PROFILE_IDS, 'id,profile_id,title')
await add('L2 skills (test profiles)', 'skills', 'profile_id', TEST_PROFILE_IDS, 'id,profile_id')
await add('L2 github_data (test profiles)', 'github_data', 'profile_id', TEST_PROFILE_IDS, 'id,profile_id,github_username')
await add('L2 api_keys (test profiles)', 'api_keys', 'profile_id', TEST_PROFILE_IDS, 'id,profile_id,email,key_prefix')
await add('L2 saved_profiles (saving a test profile)', 'saved_profiles', 'profile_id', TEST_PROFILE_IDS, 'id,employer_email,profile_id')
await add('L2 enrichment_runs (test entities)', 'enrichment_runs', 'entity_id', ALL_TEST_ENTITY_IDS, 'id,entity_id,status')
await add('L2 invites (test team entities)', 'invites', 'team_entity_id', ALL_TEST_ENTITY_IDS, 'id,invitee_email,team_entity_id,status')
await add('L2 team_admins (test entities)', 'team_admins', 'team_entity_id', ALL_TEST_ENTITY_IDS, 'id,team_entity_id,user_id')
await add('L2 team_profiles (test entities)', 'team_profiles', 'entity_id', ALL_TEST_ENTITY_IDS, 'id,entity_id,team_name')
await add('L2 agent_profiles (test entities)', 'agent_profiles', 'entity_id', ALL_TEST_ENTITY_IDS, 'id,entity_id,agent_name')
await add('L2 conversations (subject = test entity)', 'conversations', 'subject_entity_id', ALL_TEST_ENTITY_IDS, 'id,employer_email,builder_profile_id,subject_entity_id')
await add('L2 conversations (builder = test profile)', 'conversations', 'builder_profile_id', TEST_PROFILE_IDS, 'id,employer_email,builder_profile_id')
await add('L2 collection_memberships (test profiles)', 'collection_memberships', 'profile_id', TEST_PROFILE_IDS, 'id,profile_id,collection_slug')
await add('L2 consent_tokens (test profiles)', 'consent_tokens', 'profile_id', TEST_PROFILE_IDS, 'token,profile_id')
await add('L2 applications (test profiles)', 'applications', 'profile_id', TEST_PROFILE_IDS, 'id,profile_id')
await add('L2 jobs (subject = test entity)', 'jobs', 'subject_entity_id', ALL_TEST_ENTITY_IDS, 'id,subject_entity_id,role_title')
await add('L2 attestations (attestor = test entity)', 'attestations', 'attestor_id', ALL_TEST_ENTITY_IDS, 'id,attestor_id')
await add('L2 proof_receipts (on_behalf_of = test entity)', 'proof_receipts', 'on_behalf_of_id', ALL_TEST_ENTITY_IDS, 'id,on_behalf_of_id')
await add('L3 profiles.team_entity_id -> test entity', 'profiles', 'team_entity_id', ALL_TEST_ENTITY_IDS, 'id,username,team_entity_id')
await add('L3 entities (the test entities)', 'entities', 'id', ALL_TEST_ENTITY_IDS, 'id,kind,slug,profile_id')
await add('L4 profiles (the test humans)', 'profiles', 'id', TEST_PROFILE_IDS, 'id,username,email,entity_id')

for (const [label, t, r] of report) {
  console.log(`\n### ${label} — ${r.length} row(s)`)
  r.forEach(x => console.log('  ' + JSON.stringify(x)))
}

// subscriptions are keyed by email only (no FK)
const subs = await all('subscriptions')
console.log(`\n### subscriptions — ${subs.length} total; oxleethomas-owned: ${subs.filter(s => s.email.includes('oxleethomas')).length}; NON-oxleethomas: ${subs.filter(s => !s.email.includes('oxleethomas')).length}`)
subs.filter(s => !s.email.includes('oxleethomas')).forEach(s => console.log('  NON-TEST? ' + JSON.stringify(s)))
console.log(`  active oxleethomas subs (grant Full Access + inflate admin MRR): ${subs.filter(s => s.email.includes('oxleethomas') && s.status === 'active').length}`)

// blast-radius check: any REAL row that references a test entity/profile
console.log(`\n### BLAST-RADIUS — real rows pointing at test data`)
const realProfileIds = profiles.filter(p => !TEST_PROFILE_IDS.includes(p.id)).map(p => p.id)
const convosAll = await all('conversations')
convosAll.filter(c => realProfileIds.includes(c.builder_profile_id) && ALL_TEST_ENTITY_IDS.includes(c.subject_entity_id))
  .forEach(c => console.log(`  conversation ${c.id}: REAL builder ${profiles.find(p => p.id === c.builder_profile_id)?.username} <- test entity ${c.subject_entity_id}`))
const savedAll = await all('saved_profiles')
savedAll.filter(s => realProfileIds.includes(s.profile_id)).forEach(s => console.log(`  saved_profile ${s.id}: employer ${s.employer_email} -> REAL profile ${profiles.find(p => p.id === s.profile_id)?.username}`))
profiles.filter(p => !TEST_PROFILE_IDS.includes(p.id) && ALL_TEST_ENTITY_IDS.includes(p.team_entity_id))
  .forEach(p => console.log(`  REAL profile ${p.username} has team_entity_id=${p.team_entity_id} (test team)`))
const agentsAll = await all('agent_profiles')
agentsAll.filter(a => a.principal_entity_id && ALL_TEST_ENTITY_IDS.includes(a.principal_entity_id))
  .forEach(a => console.log(`  agent ${a.agent_name} principal_entity_id=${a.principal_entity_id} (test)`))

// auth users behind the test rows
console.log(`\n### AUTH USERS behind test rows (owner_user_id on test entities)`)
const testEnts = entities.filter(e => ALL_TEST_ENTITY_IDS.includes(e.id))
console.log(`  distinct owner_user_id on test entities: ${new Set(testEnts.map(e => e.owner_user_id).filter(Boolean)).size}`)
console.log(`  test profiles with user_id set: ${testProfiles.filter(p => p.user_id).length}`)
