// Read-only ground-truth DB audit (Section 8 + entity/atlas/money state).
//   node --env-file=.env.local --experimental-strip-types scripts/v2/audit-ground-truth.ts

import { createClient } from '@supabase/supabase-js'
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const count = async (t: string, q?: (x: any) => any) => {
  let query = a.from(t).select('*', { count: 'exact', head: true })
  if (q) query = q(query)
  const { count: c, error } = await query
  return error ? `ERR(${error.message.slice(0,40)})` : c
}

// DB-access smoke test
const { error: smoke } = await a.from('profiles').select('id', { head: true, count: 'exact' })
console.log('DB ACCESS (service role):', smoke ? `FAILED — ${smoke.message}` : 'OK')

console.log('\n--- PROFILES ---')
console.log('total:', await count('profiles'))
console.log('published=true:', await count('profiles', q => q.eq('published', true)))
console.log('published + entity_id set:', await count('profiles', q => q.eq('published', true).not('entity_id', 'is', null)))

console.log('\n--- SUBSCRIPTIONS (by product · status) ---')
const { data: subs } = await a.from('subscriptions').select('product, status')
const subTally: Record<string, number> = {}
for (const s of subs ?? []) subTally[`${s.product} · ${s.status}`] = (subTally[`${s.product} · ${s.status}`] ?? 0) + 1
console.log(subTally, 'TOTAL', (subs ?? []).length)

console.log('\n--- PROOF RECEIPTS (public) ---')
const { data: recs } = await a.from('proof_receipts').select('verification_level, atlas_inferred, atlas_confirmed, visibility')
const pub = (recs ?? []).filter(r => r.visibility === 'public')
const l1 = pub.filter(r => r.verification_level === 'L1_artifact_confirmed').length
const l0 = pub.filter(r => r.verification_level === 'L0_claimed').length
const otherLvl = pub.filter(r => !['L1_artifact_confirmed','L0_claimed'].includes(r.verification_level)).length
const withInferred = pub.filter(r => Array.isArray(r.atlas_inferred) && r.atlas_inferred.length > 0).length
const withConfirmed = pub.filter(r => Array.isArray(r.atlas_confirmed) && r.atlas_confirmed.length > 0).length
console.log(`total(all visibility): ${(recs ?? []).length} | public: ${pub.length} | L1: ${l1} | L0: ${l0} | other-level: ${otherLvl}`)
console.log(`public w/ atlas_inferred: ${withInferred} | public w/ atlas_confirmed: ${withConfirmed}`)

console.log('\n--- ENTITIES (by kind) ---')
const { data: ents } = await a.from('entities').select('kind')
const entTally: Record<string, number> = {}
for (const e of ents ?? []) entTally[e.kind] = (entTally[e.kind] ?? 0) + 1
console.log(entTally, 'TOTAL', (ents ?? []).length)

console.log('\n--- ENGAGEMENT / OTHER TABLES ---')
console.log('posts:', await count('posts'))
console.log('projects:', await count('projects'))
console.log('conversations:', await count('conversations'))
console.log('messages:', await count('messages'))
console.log('project_inquiries:', await count('project_inquiries'))
console.log('jobs (all):', await count('jobs'), '| active:', await count('jobs', q => q.eq('status', 'active')))
console.log('applications:', await count('applications'))
console.log('employer_profiles:', await count('employer_profiles'))
console.log('saved_profiles:', await count('saved_profiles'))
console.log('api_keys (agent Card 3):', await count('api_keys'))
console.log('stripe_events (idempotency):', await count('stripe_events'))
console.log('verification_events:', await count('verification_events'))
console.log('attestations:', await count('attestations'))

console.log('\n--- TEST / JUNK signals ---')
const { data: junk } = await a.from('profiles').select('username, published, entity_id').or('username.ilike.%test%,username.ilike.%bot%,username.ilike.%demo%')
console.log('username ~ test/bot/demo:', (junk ?? []).map(j => `${j.username}(pub=${j.published})`).join(', ') || 'none')
console.log('')
