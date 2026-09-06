// READ-ONLY test-data inventory (2026-09-06 cleanup, Step 1).
// Dumps every human profile, entity, team, agent, org + their dependents so the
// test set can be separated from the 38 real builders. NO WRITES.
//   node --env-file=.env.local --experimental-strip-types scripts/v2/audit-test-data.ts
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(url, key)

const all = async (t: string, cols = '*', order?: string) => {
  const q = admin.from(t).select(cols)
  if (order) q.order(order)
  const { data, error } = await q
  if (error) { console.log(`ERR ${t}: ${error.message}`); return [] as any[] }
  return (data ?? []) as any[]
}

const profiles = await all('profiles', '*', 'created_at')
const entities = await all('entities', '*', 'created_at')
const teams = await all('team_profiles', '*', 'created_at')
const agents = await all('agent_profiles', '*', 'created_at')
const teamAdmins = await all('team_admins')
const subs = await all('subscriptions', '*', 'created_at')
const apiKeys = await all('api_keys', 'id,profile_id,email,key_prefix,name,created_at,scope')
const invites = await all('invites')
const convos = await all('conversations')
const msgs = await all('messages')
const posts = await all('posts', 'id,profile_id,title,created_at')
const projects = await all('projects', 'id,profile_id,title,created_at')
const skills = await all('skills', 'id,profile_id,name')
const receipts = await all('proof_receipts', 'id,slug,subject_id,on_behalf_of_id,title,issued_at')
const gh = await all('github_data', 'id,profile_id,github_username')
const enrich = await all('enrichment_runs', 'id,entity_id,status,started_at')
const saved = await all('saved_profiles')
const comments = await all('post_comments', 'id,post_id,author_email,author_name,created_at')
const commentLikes = await all('comment_likes')
const sar = await all('subject_atlas_roles')
const verif = await all('verification_events', 'id,receipt_id,level')
const ingest = await all('ingestion_log', 'id,receipt_id,source,created_at')

const entById = new Map(entities.map(e => [e.id, e]))
const cnt = (rows: any[], k: string, v: any) => rows.filter(r => r[k] === v).length

console.log(`### PROFILES (${profiles.length}) — human rows`)
console.log('idx | username | full_name | email | published | verified | created | entity_id | team_entity_id | posts | projects | skills | receipts(subject) | gh | apikeys | views')
profiles.forEach((p, i) => {
  const eid = p.entity_id
  const rc = receipts.filter(r => r.subject_id === eid).length
  console.log([
    i + 1, p.username, p.full_name, p.email, p.published, p.verified,
    (p.created_at ?? '').slice(0, 10), eid ?? '-', p.team_entity_id ?? '-',
    cnt(posts, 'profile_id', p.id), cnt(projects, 'profile_id', p.id),
    cnt(skills, 'profile_id', p.id), rc,
    cnt(gh, 'profile_id', p.id), cnt(apiKeys, 'profile_id', p.id), p.profile_views ?? 0,
  ].join(' | '))
})

console.log(`\n### PROFILES — links/proof detail`)
profiles.forEach((p, i) => {
  console.log(`${i + 1} | ${p.username} | gh=${p.github_url ?? '-'} | x=${p.x_url ?? '-'} | li=${p.linkedin_url ?? '-'} | web=${p.website_url ?? '-'} | ghconn=${p.github_connected} | prof=${p.primary_profession ?? '-'} | loc=${p.location ?? '-'} | bio=${(p.bio ?? '').slice(0, 60).replace(/\n/g, ' ')}`)
})

console.log(`\n### ENTITIES (${entities.length})`)
console.log('id | kind | slug | display_name | profile_id | owner_user_id | created')
entities.forEach(e => console.log([e.id, e.kind, e.slug, e.display_name, e.profile_id ?? '-', e.owner_user_id ?? '-', (e.created_at ?? '').slice(0, 10)].join(' | ')))

console.log(`\n### TEAM_PROFILES (${teams.length})`)
teams.forEach(t => {
  const e = entById.get(t.entity_id)
  console.log([`entity=${t.entity_id}`, `kind=${e?.kind}`, `slug=${e?.slug}`, `name=${t.team_name}`, `published=${t.published}`, `verified=${t.verified}`, `offers_services=${t.offers_services}`, `hires=${t.hires}`, `contact=${t.contact_email ?? '-'}`, `web=${t.website_url ?? '-'}`, `created=${(t.created_at ?? '').slice(0, 10)}`, `tagline=${(t.tagline ?? '').slice(0, 50)}`].join(' | '))
})

console.log(`\n### AGENT_PROFILES (${agents.length})`)
agents.forEach(a => {
  const e = entById.get(a.entity_id)
  console.log([`entity=${a.entity_id}`, `slug=${e?.slug}`, `name=${a.agent_name}`, `provider=${a.provider}`, `model=${a.model}`, `principal=${a.principal_entity_id ?? '-'}`, `published=${a.published}`, `contact=${a.contact_email ?? '-'}`, `created=${(a.created_at ?? '').slice(0, 10)}`].join(' | '))
})

console.log(`\n### TEAM_ADMINS (${teamAdmins.length})`)
teamAdmins.forEach(t => console.log([`team_entity=${t.team_entity_id}`, `slug=${entById.get(t.team_entity_id)?.slug ?? '?'}`, `user=${t.user_id}`, `role=${t.role}`, (t.created_at ?? '').slice(0, 10)].join(' | ')))

console.log(`\n### SUBSCRIPTIONS (${subs.length})`)
subs.forEach(s => console.log([s.id, s.email, s.product, s.status, `cust=${s.stripe_customer_id ?? '-'}`, `sub=${s.stripe_subscription_id ?? '-'}`, (s.created_at ?? '').slice(0, 10)].join(' | ')))

console.log(`\n### API_KEYS (${apiKeys.length})`)
apiKeys.forEach(k => console.log([k.id, `profile=${k.profile_id ?? '-'}`, k.email, k.key_prefix, k.name, k.scope, (k.created_at ?? '').slice(0, 10)].join(' | ')))

console.log(`\n### INVITES (${invites.length})`)
invites.forEach(i => console.log([i.id, i.invitee_email, `team_entity=${i.team_entity_id}`, `slug=${entById.get(i.team_entity_id)?.slug ?? '?'}`, i.status, (i.created_at ?? '').slice(0, 10)].join(' | ')))

console.log(`\n### CONVERSATIONS (${convos.length}) + MESSAGES (${msgs.length})`)
convos.forEach(c => console.log([c.id, `employer=${c.employer_email}`, `builder_profile=${c.builder_profile_id}`, `subject_entity=${c.subject_entity_id ?? '-'}`, `type=${c.conversation_type}`, `msgs=${cnt(msgs, 'conversation_id', c.id)}`, (c.created_at ?? '').slice(0, 10)].join(' | ')))

console.log(`\n### SAVED_PROFILES (${saved.length})`)
saved.forEach(s => console.log([s.id, s.employer_email, `profile=${s.profile_id}`].join(' | ')))

console.log(`\n### POST_COMMENTS (${comments.length}) / LIKES (${commentLikes.length})`)
comments.forEach(c => console.log([c.id, `post=${c.post_id}`, c.author_email, c.author_name, (c.created_at ?? '').slice(0, 10)].join(' | ')))
commentLikes.forEach(l => console.log([`like ${l.id}`, `comment=${l.comment_id}`, l.user_email].join(' | ')))

console.log(`\n### RECEIPTS by subject_id`)
const bySub = new Map<string, number>()
receipts.forEach(r => bySub.set(r.subject_id, (bySub.get(r.subject_id) ?? 0) + 1))
for (const [sid, n] of [...bySub.entries()].sort((a, b) => b[1] - a[1])) {
  const e = entById.get(sid)
  console.log(`${String(n).padStart(4)}  subject=${sid}  slug=${e?.slug ?? 'ORPHAN'}  kind=${e?.kind ?? '?'}`)
}
console.log(`receipts total=${receipts.length}  on_behalf_of set=${receipts.filter(r => r.on_behalf_of_id).length}`)

console.log(`\n### SUBJECT_ATLAS_ROLES (${sar.length}) by subject`)
const bySar = new Map<string, number>()
sar.forEach(r => bySar.set(r.subject_slug, (bySar.get(r.subject_slug) ?? 0) + 1))
for (const [s, n] of [...bySar.entries()].sort()) console.log(`${String(n).padStart(4)}  ${s}`)

console.log(`\n### ENRICHMENT_RUNS (${enrich.length}) by entity`)
const byEnr = new Map<string, number>()
enrich.forEach(r => byEnr.set(r.entity_id, (byEnr.get(r.entity_id) ?? 0) + 1))
for (const [e, n] of byEnr) console.log(`${String(n).padStart(3)}  entity=${e} slug=${entById.get(e)?.slug ?? 'ORPHAN'}`)

console.log(`\n### INTEGRITY`)
console.log(`profiles without entity_id: ${profiles.filter(p => !p.entity_id).length}`)
console.log(`entities kind counts: ${JSON.stringify(entities.reduce((a: any, e) => (a[e.kind] = (a[e.kind] ?? 0) + 1, a), {}))}`)
console.log(`entities(kind=human) without profile_id: ${entities.filter(e => e.kind === 'human' && !e.profile_id).length}`)
console.log(`entities not referenced by any profile/team/agent: ${entities.filter(e => !profiles.some(p => p.entity_id === e.id) && !teams.some(t => t.entity_id === e.id) && !agents.some(a => a.entity_id === e.id)).map(e => `${e.id}:${e.kind}:${e.slug}`).join(', ') || 'none'}`)
console.log(`receipts with subject not in entities: ${receipts.filter(r => !entById.has(r.subject_id)).length}`)
console.log(`verification_events=${verif.length} ingestion_log=${ingest.length}`)
