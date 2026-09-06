import { admin, req, check, rows } from './lib.ts'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
const notes: string[] = []
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!
async function reattach(label: string) {
  const email = `oxleethomas+sweeptest-${label}@gmail.com`
  const password = 'SweepR4!' + Math.random().toString(36).slice(2, 10)
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const u = list!.users.find(x => (x.email ?? '').toLowerCase() === email)!
  await admin.auth.admin.updateUserById(u.id, { password })
  const sb = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: si } = await sb.auth.signInWithPassword({ email, password })
  const { sessionCookie } = await import('./lib.ts')
  return { email, userId: u.id, cookie: sessionCookie(si!.session), sb }
}
const builder = await reattach('builder')
const buyerEnt = (await admin.from('entities').select('id').eq('slug','sweeptest-buyerco').single()).data!

const pub = await req('/api/messages', { cookie: builder.cookie })
const c1: any = (pub.json?.conversations ?? [])[0]
check('7 MESSAGING', 'builder inbox resolves hirer identity via team_profiles (employer_profile)', 'employer_profile.company_name present', `employer_profile=${JSON.stringify(c1?.employer_profile)}`, !!c1?.employer_profile?.company_name, 'high')
await admin.from('team_profiles').update({ published: false }).eq('entity_id', buyerEnt.id)
const unp = await req('/api/messages', { cookie: builder.cookie })
const c2: any = (unp.json?.conversations ?? [])[0]
check('7 MESSAGING', 'published gate hides an UNPUBLISHED hirer identity', 'employer_profile absent/null when org is unpublished', `employer_profile=${JSON.stringify(c2?.employer_profile)}`, !c2?.employer_profile?.company_name, 'medium')
await admin.from('team_profiles').update({ published: true }).eq('entity_id', buyerEnt.id)

// enrichment: is it only the classifier that fails, or the whole run?
const { data: runs } = await admin.from('enrichment_runs').select('*').order('started_at', { ascending: false }).limit(3)
notes.push(`enrichment_runs (latest 3): ${JSON.stringify((runs??[]).map((r:any)=>({status:r.status, receipts:r.receipts_written, failures:r.failures})))}`)
const { count: totalReceipts } = await admin.from('proof_receipts').select('*', { count:'exact', head:true })
notes.push(`proof_receipts total right now: ${totalReceipts}`)
writeFileSync((process.env.SWEEP_OUT||'/tmp/sweep4')+'-rows.json', JSON.stringify({ rows, notes }, null, 2))
console.log(`\n===== RUN4: ${rows.filter(r=>r.pass).length}/${rows.length} PASS =====`)
console.log('NOTES:\n' + notes.map(n=>' - '+n).join('\n'))
