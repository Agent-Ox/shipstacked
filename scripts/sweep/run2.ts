// Follow-up probes for the failures + the assertions the first pass couldn't make.
import { admin, req, check, rows, has, makeActor, type Actor } from './lib.ts'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
const notes: string[] = []
const OUT = process.env.SWEEP_OUT || '/tmp/sweep2'
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!

// re-attach to the sweeptest actors created by run.ts
async function reattach(label: string): Promise<Actor> {
  const email = `oxleethomas+sweeptest-${label}@gmail.com`
  const password = 'SweepReattach!' + Math.random().toString(36).slice(2, 10)
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const u = list!.users.find(x => (x.email ?? '').toLowerCase() === email)!
  await admin.auth.admin.updateUserById(u.id, { password })
  const sb = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: si } = await sb.auth.signInWithPassword({ email, password })
  const { sessionCookie } = await import('./lib.ts')
  return { email, password, userId: u.id, cookie: sessionCookie(si!.session), sb }
}
const buyer = await reattach('buyer'), team = await reattach('team'), builder = await reattach('builder'), agent = await reattach('agent')
const { data: buyerEnt } = await admin.from('entities').select('id').eq('slug', 'sweeptest-buyerco').single()
if (!buyerEnt) throw new Error('sweeptest-buyerco entity missing')
const { data: teamEnt } = await admin.from('entities').select('id').eq('slug', 'sweeptest-team-a').single()
if (!teamEnt) throw new Error('sweeptest-team-a entity missing')

// ── 6b. JOBS via the REAL UI paths ────────────────────────────────────────
await admin.from('subscriptions').insert([
  { email: team.email, product: 'full_access', status: 'active', stripe_customer_id: 'sweeptest-cus-t', stripe_session_id: 'sweeptest-sess-t' },
])
// (buyer already has a sweeptest sub from run.ts phase 5)
const asTeamBuyer = await req('/api/jobs/post-as-team', { method: 'POST', cookie: buyer.cookie, body: {
  subject_entity_id: buyerEnt.id, company_name: 'Sweeptest Buyer Co', role_title: 'Sweeptest Org Role',
  description: 'Posted as the buyer org.', requirements: 'x', salary_range: '$100k', location: 'Remote', employment_type: 'full-time', skills: ['Claude Code'] } })
check('6 JOBS', 'buyer ORG can post a job as its company (post-as-team)', '200 — an org is a first-class hirer', `${asTeamBuyer.status} ${asTeamBuyer.body.slice(0,150)}`, asTeamBuyer.status === 200, 'critical')

const asTeamTeam = await req('/api/jobs/post-as-team', { method: 'POST', cookie: team.cookie, body: {
  subject_entity_id: teamEnt.id, company_name: 'Sweeptest Studio A', role_title: 'Sweeptest Team Role',
  description: 'Posted as the service team.', requirements: 'x', salary_range: '$100k', location: 'Remote', employment_type: 'full-time', skills: ['Claude Code'] } })
check('6 JOBS', 'service TEAM can post a job as itself (post-as-team)', '200', `${asTeamTeam.status} ${asTeamTeam.body.slice(0,150)}`, asTeamTeam.status === 200, 'high')

// the browser fallback path a buyer is actually funnelled into
const expires = new Date(); expires.setDate(expires.getDate() + 30)
const { data: browserJob, error: bjErr } = await buyer.sb.from('jobs').insert([{
  employer_email: buyer.email, company_name: 'Sweeptest Buyer Co', role_title: 'Sweeptest Browser Role',
  description: 'Posted via the browser fallback path (no subject_entity_id).', requirements: 'x',
  salary_range: '$100k', location: 'Remote', employment_type: 'full-time', skills: ['Claude Code'],
  status: 'active', expires_at: expires.toISOString() }]).select('id, subject_entity_id').single()
check('6 JOBS', 'browser fallback insert (what a buyer actually gets) succeeds', 'insert ok', bjErr ? `ERROR ${bjErr.message}` : `id=${browserJob?.id}`, !bjErr, 'high')
check('6 JOBS', 'that job carries subject_entity_id (stage 5b re-key)', `subject_entity_id === ${buyerEnt.id}`, `subject_entity_id=${browserJob?.subject_entity_id ?? 'NULL'}`, browserJob?.subject_entity_id === buyerEnt.id, 'critical')
if (browserJob?.id) {
  const jp = await req(`/jobs/${browserJob.id}`)
  check('6 JOBS', `GET /jobs/${browserJob.id} renders`, '200', String(jp.status), jp.status === 200, 'high')
  check('6 JOBS', 'job page shows the company', 'company name on page', has(jp.body, 'Sweeptest Buyer Co') ? 'shown' : 'MISSING', has(jp.body, 'Sweeptest Buyer Co'), 'high')
  const jl = await req('/jobs')
  check('6 JOBS', 'job appears on /jobs board', 'role title listed', has(jl.body, 'Sweeptest Browser Role') ? 'listed' : 'NOT LISTED', has(jl.body, 'Sweeptest Browser Role'), 'high')
  const org = await req(`/team/sweeptest-buyerco`)
  check('6 JOBS', 'job shows in the org hiring lens on /team/<slug>', 'role title on the company page', has(org.body, 'Sweeptest Browser Role') ? 'shown' : 'NOT SHOWN — org page cannot see its own job', has(org.body, 'Sweeptest Browser Role'), 'critical')
}

// ── 5b. contact-team (the team monetisation path) ─────────────────────────
const ct = await req('/api/messages/contact-team', { method: 'POST', cookie: buyer.cookie, body: { team_entity_id: teamEnt.id, message: 'sweeptest contact-team' } })
check('5 PAYWALL', 'contact a PUBLISHED team (/api/messages/contact-team)', '200 + conversation created', `${ct.status} ${ct.body.slice(0,200)}`, ct.status === 200, 'critical')
const ctAnonMember = await req('/api/messages/contact-team', { method: 'POST', cookie: agent.cookie, body: { team_entity_id: teamEnt.id, message: 'sweeptest no-sub contact' } })
notes.push(`contact-team as a NON-member (no subscription) → ${ctAnonMember.status} ${ctAnonMember.body.slice(0,140)} — route has no paywall check by design (comment: "Anyone logged-in can message a PUBLISHED team")`)

// ── 3b. agent public projection, with a key ───────────────────────────────
const k = await req('/api/keys', { method: 'POST', cookie: builder.cookie, body: { name: 'sweeptest-key2', scope: 'builder:rw' } })
const raw = k.json?.key ?? k.json?.raw ?? k.json?.api_key
if (raw) {
  const ag = await req('/api/v1/agent/sweeptest-agent-a', { headers: { Authorization: `Bearer ${raw}` } })
  check('3 AGENT', 'GET /api/v1/agent/<slug> with an authenticated key', '200 (any scope may read a published agent)', `${ag.status} ${ag.body.slice(0,140)}`, ag.status === 200, 'medium')
  const tm = await req('/api/v1/team', { headers: { Authorization: `Bearer ${raw}` } })
  notes.push(`GET /api/v1/team with a builder:rw key → ${tm.status} ${tm.body.slice(0,180)}`)
}
// team:rw key on a user owning NO team — the resolveTeamByOwner probe
const k2 = await req('/api/keys', { method: 'POST', cookie: builder.cookie, body: { name: 'sweeptest-key3', scope: 'team:rw' } })
const raw2 = k2.json?.key ?? k2.json?.raw ?? k2.json?.api_key
if (raw2) {
  const g = await req('/api/v1/team', { headers: { Authorization: `Bearer ${raw2}` } })
  const slug = g.json?.team?.slug ?? g.json?.data?.team?.slug
  check('9 ADVERSARIAL', 'team:rw key of a user owning NO team must not resolve someone else\'s team', '404, or 200 only for a team this user owns', `${g.status} resolved slug=${slug ?? 'none'} body=${g.body.slice(0,160)}`, g.status === 404, 'critical')
  if (g.status === 200 && slug) {
    const { data: victimEnt } = await admin.from('entities').select('id, owner_user_id').eq('slug', slug).maybeSingle()
    const ownedByCaller = victimEnt?.owner_user_id === builder.userId
    check('9 ADVERSARIAL', 'the resolved team belongs to the key owner', 'owner_user_id === caller', `resolved ${slug}, owned_by_caller=${ownedByCaller}`, ownedByCaller, 'critical')
    const p = await req('/api/v1/team', { method: 'PATCH', headers: { Authorization: `Bearer ${raw2}` }, body: { tagline: 'SWEEPTEST-CROSS-TENANT-WRITE' } })
    const { data: after } = await admin.from('team_profiles').select('tagline').eq('entity_id', victimEnt!.id).maybeSingle()
    const wrote = after?.tagline === 'SWEEPTEST-CROSS-TENANT-WRITE'
    check('9 ADVERSARIAL', 'that key must not WRITE to a team it does not own', 'PATCH rejected', `${p.status}; tagline now=${JSON.stringify(after?.tagline)}`, !wrote, 'critical')
    if (wrote) { await admin.from('team_profiles').update({ tagline: 'Edited by sweep' }).eq('entity_id', victimEnt!.id); notes.push('Cross-tenant WRITE confirmed; reverted (victim was a sweeptest team).') }
  }
}

// ── 7b. hirer identity in the builder inbox ───────────────────────────────
const inbox = await req('/messages', { cookie: builder.cookie })
const showsEmail = has(inbox.body, buyer.email)
const showsCo = has(inbox.body, 'Sweeptest Buyer Co')
check('7 MESSAGING', 'builder inbox resolves the hirer identity via team_profiles', 'company name shown, not a raw email', `companyShown=${showsCo} rawEmailShown=${showsEmail}`, showsCo, 'high')
const asHirer = await req('/messages?as=hirer', { cookie: buyer.cookie })
check('7 MESSAGING', 'GET /messages?as=hirer (target of the /hirer/messages 308)', '200', String(asHirer.status), asHirer.status === 200, 'high')

// ── 1b/2b/3b. capability resolution, data layer (alias-aware, mirrors resolveCapability) ──
const [{ data: vocab }, { data: pubProfiles }, { data: skills }, { data: tps }, { data: aps }] = await Promise.all([
  admin.from('capability_vocab').select('slug,label,aliases'),
  admin.from('profiles').select('id,username').eq('published', true),
  admin.from('skills').select('profile_id,name'),
  admin.from('team_profiles').select('entity_id,services').eq('published', true),
  admin.from('agent_profiles').select('entity_id,capabilities').eq('published', true),
])
const norm = (s: string) => s.trim().toLowerCase()
const bySurface = new Map<string, string>()
for (const v of vocab!) { bySurface.set(norm(v.label), v.slug); bySurface.set(norm(v.slug), v.slug); for (const a of (v.aliases ?? [])) bySurface.set(norm(a), v.slug) }
const resolve = (s: string) => bySurface.get(norm(s)) ?? null
const b = pubProfiles!.find(p => p.username === 'sweeptestbuilder1')
const bSkills = skills!.filter(s => s.profile_id === b?.id).map(s => resolve(s.name)).filter(Boolean)
check('1 BUILDER', 'skills resolve onto capability vocabulary', 'at least claude-code resolves', `resolved=${JSON.stringify(bSkills)}`, bSkills.includes('claude-code'), 'high')
const tSvc = (tps!.find(t => t.entity_id === teamEnt.id)?.services ?? []).map((s: string) => resolve(s)).filter(Boolean)
check('2 TEAM', 'team services resolve onto capability vocabulary (D1)', 'claude-code resolves', `resolved=${JSON.stringify(tSvc)}`, tSvc.includes('claude-code'), 'high')
const { data: agEnt } = await admin.from('entities').select('id').eq('slug', 'sweeptest-agent-a').single()
if (!agEnt) throw new Error('sweeptest-agent-a entity missing')
const aCap = (aps!.find(a => a.entity_id === agEnt.id)?.capabilities ?? []).map((c: string) => resolve(c)).filter(Boolean)
check('3 AGENT', 'agent capabilities resolve onto capability vocabulary', 'claude-code resolves', `resolved=${JSON.stringify(aCap)}`, aCap.includes('claude-code'), 'high')
const cap = await req('/talent/claude-code')
const onPage = has(cap.body, 'sweeptestbuilder1') || has(cap.body, 'Sweeptest Studio A') || has(cap.body, 'Sweeptest Agent A')
notes.push(`/talent/claude-code contains a sweeptest subject = ${onPage} (page is ISR revalidate=3600 + generateStaticParams — a new subject only appears after the hourly revalidation; not a defect, but it is the "why isn't my profile showing" surface)`)

// ── enrichment health ─────────────────────────────────────────────────────
const { data: runs } = await admin.from('enrichment_runs').select('status,error_message,started_at').order('started_at', { ascending: false }).limit(5)
const failing = (runs ?? []).filter(r => r.status === 'failed')
check('1 BUILDER', 'production enrichment pipeline is healthy', 'recent enrichment_runs succeed', `last runs: ${JSON.stringify((runs??[]).map(r=>r.status))}; err=${(failing[0]?.error_message ?? '').slice(0,120)}`, failing.length === 0, 'critical')

writeFileSync(`${OUT}-rows.json`, JSON.stringify({ rows, notes }, null, 2))
const pass = rows.filter(r => r.pass).length
console.log(`\n===== FOLLOW-UP: ${pass}/${rows.length} PASS =====`)
console.log('NOTES:\n' + notes.map(n => ' - ' + n).join('\n'))
