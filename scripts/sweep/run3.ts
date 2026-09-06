import { admin, req, check, rows, has } from './lib.ts'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
const notes: string[] = []
const OUT = process.env.SWEEP_OUT || '/tmp/sweep3'
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!
async function reattach(label: string) {
  const email = `oxleethomas+sweeptest-${label}@gmail.com`
  const password = 'SweepR3!' + Math.random().toString(36).slice(2, 10)
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const u = list!.users.find(x => (x.email ?? '').toLowerCase() === email)!
  await admin.auth.admin.updateUserById(u.id, { password })
  const sb = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: si } = await sb.auth.signInWithPassword({ email, password })
  const { sessionCookie } = await import('./lib.ts')
  return { email, userId: u.id, cookie: sessionCookie(si!.session), sb }
}
const builder = await reattach('builder'), buyer = await reattach('buyer'), team = await reattach('team')

// ── Is the whole rate-limited v1 API 500ing? ──────────────────────────────
const k = await req('/api/keys', { method: 'POST', cookie: builder.cookie, body: { name: 'sweeptest-key4', scope: 'builder:rw' } })
const key = k.json?.key ?? k.json?.raw ?? k.json?.api_key
const H = { Authorization: `Bearer ${key}` }
const rateLimited = ['/api/v1/me', '/api/v1/talent/search?q=claude', '/api/v1/builders/sweeptestbuilder1', '/api/v1/agent/sweeptest-agent-a', '/api/v1/team/sweeptest-team-a', '/api/v1/jobs', '/api/v1/builds']
for (const p of rateLimited) {
  const r = await req(p, { headers: H })
  check('API v1', `GET ${p} with a valid key`, 'not 500 (200/403/404 are all fine)', `${r.status} ${r.body.slice(0,110)}`, r.status !== 500, 'critical')
}
const noKey = await req('/api/v1/me')
check('API v1', 'GET /api/v1/me with NO key', '401', String(noKey.status), noKey.status === 401, 'medium')
const badKey = await req('/api/v1/me', { headers: { Authorization: 'Bearer sk_ss_deadbeefdeadbeef' } })
check('API v1', 'GET /api/v1/me with an INVALID key', '401, never 500', String(badKey.status), badKey.status === 401, 'high')
// MCP (also public agent surface)
const mcp = await req('/api/mcp', { method: 'POST', body: { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'sweep', version: '1' } } }, headers: { Accept: 'application/json, text/event-stream' } })
check('API v1', 'POST /api/mcp initialize (public agent front door)', '200', `${mcp.status}`, mcp.status === 200, 'high')

// ── messaging identity resolution, via the API the page actually calls ────
const mb = await req('/api/messages', { cookie: builder.cookie })
const convs = mb.json?.conversations ?? mb.json?.data ?? []
notes.push(`GET /api/messages as builder → ${mb.status}; ${Array.isArray(convs) ? convs.length : '?'} conversation(s); first = ${JSON.stringify(Array.isArray(convs) ? convs[0] : mb.json).slice(0, 420)}`)
const first: any = Array.isArray(convs) ? convs[0] : null
const hirerName = first?.hirer_name ?? first?.employer_name ?? first?.company_name ?? first?.team_name ?? first?.hirer?.name
check('7 MESSAGING', 'builder inbox API resolves the hirer to a company identity', 'a company/team name, not a bare email', `resolved=${JSON.stringify(hirerName)} employer_email=${JSON.stringify(first?.employer_email)}`, !!hirerName && hirerName !== first?.employer_email, 'high')
const th = await req(`/api/messages?as=team&entity=${(await admin.from('entities').select('id').eq('slug','sweeptest-team-a').single()).data!.id}`, { cookie: team.cookie })
check('7 MESSAGING', 'team shared inbox lists (?as=team&entity=)', '200', `${th.status} ${th.body.slice(0,120)}`, th.status === 200, 'high')

// ── does the hirer/org publish gate hide an unpublished hirer? ────────────
const buyerEnt = (await admin.from('entities').select('id').eq('slug','sweeptest-buyerco').single()).data!
await admin.from('team_profiles').update({ published: false }).eq('entity_id', buyerEnt.id)
const mb2 = await req('/api/messages', { cookie: builder.cookie })
const c2: any = (mb2.json?.conversations ?? [])[0]
notes.push(`With the hirer org UNPUBLISHED, builder inbox first conversation = ${JSON.stringify(c2).slice(0,300)}`)
await admin.from('team_profiles').update({ published: true }).eq('entity_id', buyerEnt.id)

// ── org hiring lens: does /team/<slug> render Open roles at all? ──────────
const teamJobShown = await req('/team/sweeptest-team-a')
check('6 JOBS', 'service team page renders its own posted role (hiring lens works for kind=team)', '"Sweeptest Team Role" on the page', has(teamJobShown.body, 'Sweeptest Team Role') ? 'shown' : 'NOT SHOWN', has(teamJobShown.body, 'Sweeptest Team Role'), 'high')

// ── feed post CTA is paywall-only ────────────────────────────────────────
const feed = await req('/feed')
const fj = await req('/api/feed')
notes.push(`/feed → ${feed.status}; /api/feed → ${fj.status}`)
const { data: anyPost } = await admin.from('posts').select('id').limit(1).maybeSingle()
if (anyPost) {
  const fp = await req(`/feed/${anyPost.id}`)
  const ctaPaywalled = has(fp.body, '199') || has(fp.body, 'Full Access')
  check('5 PAYWALL', 'feed post CTA is paywall-framed', 'CTA mentions Full Access / $199', ctaPaywalled ? 'paywalled CTA' : 'NO PAYWALL CTA', ctaPaywalled, 'medium')
}
writeFileSync(`${OUT}-rows.json`, JSON.stringify({ rows, notes }, null, 2))
console.log(`\n===== RUN3: ${rows.filter(r=>r.pass).length}/${rows.length} PASS =====`)
console.log('NOTES:\n' + notes.map(n => ' - ' + n).join('\n'))
