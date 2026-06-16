// Read-only checks for the direction call (Check 1 + 3b + 3c). No writes.
//   node --env-file=.env.local --experimental-strip-types scripts/v2/audit-direction.ts
import { createClient } from '@supabase/supabase-js'
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const cnt = async (t: string, col: string, val: any) =>
  (await a.from(t).select('id', { count: 'exact', head: true }).eq(col, val)).count ?? 0

// ---- CHECK 1: 9 published-unlinked profiles ----
console.log('=== CHECK 1 — published + entity_id IS NULL ===')
const { data: unlinked } = await a.from('profiles')
  .select('id, username, created_at, user_id, verified, github_url')
  .eq('published', true).is('entity_id', null).order('created_at')
for (const p of unlinked ?? []) {
  const posts = await cnt('posts', 'profile_id', p.id)
  const projects = await cnt('projects', 'profile_id', p.id)
  console.log(`${(p.username||'').padEnd(24)} created=${(p.created_at||'').slice(0,10)} user_id=${p.user_id ? 'set' : 'NULL'} verified=${p.verified} posts=${posts} projects=${projects} gh=${p.github_url ? 'y' : '-'}`)
}
console.log(`(total unlinked: ${(unlinked ?? []).length})`)

// ---- CHECK 3b: atlas_confidence distribution across public receipts ----
console.log('\n=== 3b — atlas_confidence distribution (public receipts) ===')
const { data: recs } = await a.from('proof_receipts').select('atlas_confidence, atlas_inferred').eq('visibility', 'public')
const confs = (recs ?? []).map(r => r.atlas_confidence).filter((c): c is number => typeof c === 'number').sort((x, y) => x - y)
const buckets: Record<string, number> = { '<0.4': 0, '0.4-0.5': 0, '0.5-0.7': 0, '0.7-0.9': 0, '>=0.9': 0 }
for (const c of confs) {
  if (c < 0.4) buckets['<0.4']++; else if (c < 0.5) buckets['0.4-0.5']++; else if (c < 0.7) buckets['0.5-0.7']++; else if (c < 0.9) buckets['0.7-0.9']++; else buckets['>=0.9']++
}
const med = confs.length ? confs[Math.floor(confs.length / 2)] : 0
console.log(`n=${confs.length} min=${confs[0]} median=${med} max=${confs[confs.length-1]}`)
console.log('buckets:', buckets)
console.log(`receipts that would gain a confirmed role at threshold >=0.7: ${confs.filter(c => c >= 0.7).length}; >=0.5: ${confs.filter(c => c >= 0.5).length}`)

// ---- CHECK 3c: published-41 scan for junk ----
console.log('\n=== 3c — published profiles scan (junk hunt) ===')
const { data: pubs } = await a.from('profiles')
  .select('id, username, full_name, created_at, entity_id, verified, bio').eq('published', true).order('created_at')
for (const p of pubs ?? []) {
  const posts = await cnt('posts', 'profile_id', p.id)
  const suspicious = /test|bot|demo|asdf|qwer|xxx/i.test(p.username || '') || !p.full_name || (p.full_name || '').length < 3 || !p.bio
  console.log(`${suspicious ? '⚠️' : '  '} ${(p.username||'').padEnd(24)} name="${(p.full_name||'').slice(0,22)}" posts=${posts} ent=${p.entity_id ?? 'null'} created=${(p.created_at||'').slice(0,10)}`)
}
console.log('')
