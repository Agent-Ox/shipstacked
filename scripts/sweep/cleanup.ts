// Scoped teardown of ALL sweeptest-* data. Entity-first, same method as the
// 2026-09-06 test-data cleanup. Backs up before deleting.
import { admin } from './lib.ts'
import { writeFileSync } from 'node:fs'
const OUT = process.env.SWEEP_OUT || '/tmp/sweepclean'
const EXECUTE = process.argv.includes('--execute')
const n = async (t: string) => (await admin.from(t).select('*', { count: 'exact', head: true })).count ?? 0

const pre = { profiles: await n('profiles'), entities: await n('entities'), realPublished: 0,
  jobs: await n('jobs'), conversations: await n('conversations'), messages: await n('messages'),
  subscriptions: await n('subscriptions'), team_profiles: await n('team_profiles'), agent_profiles: await n('agent_profiles'),
  proof_receipts: await n('proof_receipts'), skills: await n('skills'), api_keys: await n('api_keys') }
const { data: allProfiles } = await admin.from('profiles').select('id,username,email,published')
const sweepProfiles = allProfiles!.filter(p => p.username?.startsWith('sweeptest') || (p.email ?? '').includes('sweeptest'))
const realPublishedPre = allProfiles!.filter(p => p.published && !p.username?.startsWith('sweeptest') && !(p.email ?? '').includes('sweeptest'))
pre.realPublished = realPublishedPre.length
const { data: allEntities } = await admin.from('entities').select('id,slug,kind,profile_id')
const sweepEntities = allEntities!.filter(e => e.slug?.startsWith('sweeptest') || sweepProfiles.some(p => p.id === e.profile_id))
const PIDS = sweepProfiles.map(p => p.id), EIDS = sweepEntities.map(e => e.id)
const { data: allSubs } = await admin.from('subscriptions').select('id,email')
const SUBS = allSubs!.filter(s => (s.email ?? '').includes('sweeptest')).map(s => s.id)
const { data: allJobs } = await admin.from('jobs').select('id,role_title,employer_email,subject_entity_id')
const JOBS = allJobs!.filter(j => (j.role_title ?? '').toLowerCase().startsWith('sweeptest') || (j.employer_email ?? '').includes('sweeptest') || EIDS.includes(j.subject_entity_id)).map(j => j.id)
const { data: allConv } = await admin.from('conversations').select('id,employer_email,builder_profile_id,subject_entity_id')
const CONV = allConv!.filter(c => (c.employer_email ?? '').includes('sweeptest') || PIDS.includes(c.builder_profile_id!) || EIDS.includes(c.subject_entity_id!)).map(c => c.id)
const { data: allRec } = await admin.from('proof_receipts').select('id,subject_id')
const RECS = allRec!.filter(r => EIDS.includes(r.subject_id)).map(r => r.id)
const { data: allKeys } = await admin.from('api_keys').select('id,profile_id,email')
const KEYS = allKeys!.filter(k => PIDS.includes(k.profile_id!) || (k.email ?? '').includes('sweeptest')).map(k => k.id)
const { data: au } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
const AUTH = au!.users.filter(u => (u.email ?? '').includes('sweeptest'))

console.log(`sweeptest profiles=${PIDS.length} entities=${EIDS.length} subs=${SUBS.length} jobs=${JOBS.length} convs=${CONV.length} receipts=${RECS.length} keys=${KEYS.length} auth=${AUTH.length}`)
console.log(`REAL published (pre) = ${pre.realPublished}`)
for (const u of AUTH) if (!(u.email ?? '').includes('sweeptest')) throw new Error('GUARD: non-sweeptest auth user in delete set')
for (const p of sweepProfiles) if (!p.username?.startsWith('sweeptest') && !(p.email ?? '').includes('sweeptest')) throw new Error('GUARD: non-sweeptest profile in delete set')

const inq = async (t: string, col: string, vals: any[]) => vals.length ? ((await admin.from(t).select('*').in(col, vals)).data ?? []) : []
const backup = { profiles: sweepProfiles, entities: sweepEntities,
  jobs: await inq('jobs','id',JOBS), conversations: await inq('conversations','id',CONV),
  messages: await inq('messages','conversation_id',CONV), subscriptions: await inq('subscriptions','id',SUBS),
  proof_receipts: await inq('proof_receipts','id',RECS), api_keys: await inq('api_keys','id',KEYS),
  team_profiles: await inq('team_profiles','entity_id',EIDS), agent_profiles: await inq('agent_profiles','entity_id',EIDS),
  auth: AUTH.map(u => ({ id: u.id, email: u.email })) }
writeFileSync(`${OUT}-backup.json`, JSON.stringify(backup, null, 2))
if (!EXECUTE) { console.log('DRY RUN — re-run with --execute'); process.exit(0) }

const del = async (t: string, col: string, vals: any[]) => {
  if (!vals.length) { console.log(`  skip ${t}`); return }
  const { error, count } = await admin.from(t).delete({ count: 'exact' }).in(col, vals)
  if (error) throw new Error(`${t}: ${error.message}`)
  console.log(`  deleted ${count} from ${t}`)
}
console.log('=== DELETING sweeptest-* ===')
await del('messages', 'conversation_id', CONV)
await del('conversations', 'id', CONV)
await del('applications', 'job_id', JOBS)
await del('jobs', 'id', JOBS)
await del('subscriptions', 'id', SUBS)
await del('api_keys', 'id', KEYS)
await del('saved_profiles', 'profile_id', PIDS)
await del('verification_events', 'receipt_id', RECS)
await del('ingestion_log', 'receipt_id', RECS)
await del('proof_receipts', 'id', RECS)
await del('enrichment_runs', 'entity_id', EIDS)
await del('skills', 'profile_id', PIDS)
await del('projects', 'profile_id', PIDS)
await del('posts', 'profile_id', PIDS)
await del('github_data', 'profile_id', PIDS)
await del('invites', 'team_entity_id', EIDS)
await del('team_admins', 'team_entity_id', EIDS)
await del('team_profiles', 'entity_id', EIDS)
await del('agent_profiles', 'entity_id', EIDS)
if (PIDS.length) { const { count } = await admin.from('profiles').update({ entity_id: null, team_entity_id: null }, { count: 'exact' }).in('id', PIDS); console.log(`  nulled FKs on ${count} profiles`) }
await del('entities', 'id', EIDS)
await del('profiles', 'id', PIDS)
let ad = 0
for (const u of AUTH) { const { error } = await admin.auth.admin.deleteUser(u.id); if (!error) ad++ }
console.log(`  deleted ${ad} auth users`)

// ── VERIFY ────────────────────────────────────────────────────────────────
const { data: post } = await admin.from('profiles').select('id,username,email,published')
const realPost = post!.filter(p => p.published)
const leftovers: string[] = []
for (const [t, col] of [['profiles','username'],['entities','slug']] as const) {
  const { data } = await admin.from(t).select(`${col}`).ilike(col, 'sweeptest%')
  if (data?.length) leftovers.push(`${t}: ${JSON.stringify(data)}`)
}
for (const t of ['subscriptions','jobs','conversations'] as const) {
  const { data } = await admin.from(t).select('*')
  const hit = (data ?? []).filter((r: any) => JSON.stringify(r).toLowerCase().includes('sweeptest'))
  if (hit.length) leftovers.push(`${t}: ${hit.length} rows still reference sweeptest`)
}
const { data: au2 } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
const authLeft = au2!.users.filter(u => (u.email ?? '').includes('sweeptest'))
if (authLeft.length) leftovers.push(`auth: ${authLeft.map(u=>u.email).join(', ')}`)

const post_ = { profiles: await n('profiles'), entities: await n('entities'), realPublished: realPost.length,
  jobs: await n('jobs'), conversations: await n('conversations'), messages: await n('messages'),
  subscriptions: await n('subscriptions'), team_profiles: await n('team_profiles'), agent_profiles: await n('agent_profiles'),
  proof_receipts: await n('proof_receipts'), skills: await n('skills'), api_keys: await n('api_keys') }
console.log('\n=== BEFORE / AFTER ===')
for (const k of Object.keys(pre)) console.log(`${k.padEnd(18)} ${String((pre as any)[k]).padStart(5)} -> ${String((post_ as any)[k]).padStart(5)}`)
console.log(`\nREAL PUBLISHED BUILDERS: ${pre.realPublished} -> ${post_.realPublished}  ${post_.realPublished === 40 ? '✓ 40 INTACT' : '✗✗ MISMATCH'}`)
console.log(`sweeptest leftovers: ${leftovers.length ? leftovers.join(' | ') : 'NONE ✓'}`)
writeFileSync(`${OUT}-verify.json`, JSON.stringify({ pre, post: post_, leftovers, realPublishedUsernames: realPost.map(p=>p.username).sort() }, null, 2))
process.exit(post_.realPublished === 40 && leftovers.length === 0 ? 0 : 1)
