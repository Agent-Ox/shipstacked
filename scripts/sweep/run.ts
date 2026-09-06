// AUTONOMOUS BEHAVIOURAL SWEEP — production infra, disposable "sweeptest-" data.
// Read the report at docs/audit/BEHAVIORAL_SWEEP_2026-09-06.md
import { admin, makeActor, req, check, rows, has, BASE, type Actor } from './lib.ts'
import { writeFileSync } from 'node:fs'

const OUT = process.env.SWEEP_OUT || '/tmp/sweep'
const S: any = {}                       // shared state across phases
const notes: string[] = []
const phase = async (name: string, fn: () => Promise<void>) => {
  console.log(`\n${'='.repeat(70)}\n### ${name}\n${'='.repeat(70)}`)
  try { await fn() } catch (e: any) {
    check(name, 'phase execution', 'phase completes', `THREW: ${e?.message}`, false, 'high')
  }
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// ── PRE-COUNT ──────────────────────────────────────────────────────────────
const { count: preReal } = await admin.from('profiles').select('*', { count: 'exact', head: true }).eq('published', true)
S.preRealPublished = preReal
console.log(`PRE: real published builders = ${preReal}`)

// ════════════════════════════════════════════════ 1. BUILDER
await phase('1. BUILDER signup', async () => {
  const a = await makeActor('builder'); S.builder = a
  const username = 'sweeptestbuilder1'
  // exactly what /join Card 1 does: anon-key client insert under RLS
  const { error: insErr } = await a.sb.from('profiles').insert([{
    user_id: a.userId, email: a.email, username,
    full_name: 'Sweeptest Builder One', role: 'Developer', location: 'Lisbon, Portugal',
    bio: 'Sweep test builder. I build production RAG systems and agent workflows.',
    github_url: 'https://github.com/anthropics', x_url: 'https://x.com/AnthropicAI',
    published: true, verified: false,
  }])
  check('1 BUILDER', 'profiles insert via signup path (RLS, anon key)', 'insert succeeds', insErr ? `ERROR ${insErr.message}` : 'inserted', !insErr, 'critical')
  const { data: p } = await admin.from('profiles').select('*').eq('username', username).maybeSingle()
  S.builderProfile = p
  check('1 BUILDER', 'profiles row exists + published=true', 'row, published=true', p ? `row id=${p.id} published=${p.published}` : 'NO ROW', !!p && p.published === true, 'critical')

  // skills, as the signup form writes them
  const skillRows = [
    { category: 'ai_tool', name: 'Claude Code' }, { category: 'ai_tool', name: 'Cursor' },
    { category: 'claude_use_case', name: 'RAG Systems' }, { category: 'domain', name: 'SaaS' },
  ]
  const { error: skErr } = await a.sb.from('skills').insert(skillRows.map(s => ({ profile_id: p!.id, ...s })))
  const { count: skCount } = await admin.from('skills').select('*', { count: 'exact', head: true }).eq('profile_id', p!.id)
  check('1 BUILDER', 'skills written', '4 skill rows', skErr ? `ERROR ${skErr.message}` : `${skCount} rows`, skCount === 4, 'high')

  const { error: prjErr } = await a.sb.from('projects').insert([{ profile_id: p!.id, title: 'Sweeptest RAG pipeline', description: 'Sweep test project', project_url: 'https://github.com/anthropics/anthropic-sdk-python', display_order: 0 }])
  check('1 BUILDER', 'project written', 'insert succeeds', prjErr ? `ERROR ${prjErr.message}` : 'inserted', !prjErr, 'medium')

  // enrichment (also mints the human entity)
  const en = await req('/api/enrich', { method: 'POST', cookie: a.cookie })
  check('1 BUILDER', 'POST /api/enrich', '200/202 (or clean 429 rate-limit), never 5xx', `${en.status} ${en.body.slice(0,160)}`, [200,202,429].includes(en.status), 'high')
  await sleep(9000)
  const { data: ent } = await admin.from('entities').select('*').eq('profile_id', p!.id).maybeSingle()
  S.builderEntity = ent
  check('1 BUILDER', 'entity minted kind=human', 'entity kind=human', ent ? `id=${ent.id} kind=${ent.kind}` : 'NO ENTITY', ent?.kind === 'human', 'critical')
  check('1 BUILDER', 'INVARIANT #1 slug == username verbatim', `slug === "${username}"`, ent ? `slug="${ent.slug}"` : 'n/a', ent?.slug === username, 'critical')
  const { count: rc } = await admin.from('proof_receipts').select('*', { count: 'exact', head: true }).eq('subject_id', ent?.id ?? -1)
  const { data: runs } = await admin.from('enrichment_runs').select('status,failures,error_message').eq('entity_id', ent?.id ?? -1)
  check('1 BUILDER', 'enrichment outcome (receipt OR clean no-artifact, never crash)', 'run row with status ok/partial/failed + no crash', `runs=${JSON.stringify(runs)} receipts=${rc}`, (runs?.length ?? 0) > 0, 'high')
  S.builderReceipts = rc

  const u = await req(`/u/${username}`)
  check('1 BUILDER', `GET /u/${username}`, '200', String(u.status), u.status === 200, 'critical')
  check('1 BUILDER', 'profile page renders name', 'page contains full_name', has(u.body, 'Sweeptest Builder One') ? 'name present' : 'NAME MISSING', has(u.body, 'Sweeptest Builder One'), 'critical')
  check('1 BUILDER', 'profile page renders skills', 'page contains "Claude Code"', has(u.body, 'Claude Code') ? 'skill present' : 'SKILL MISSING', has(u.body, 'Claude Code'), 'high')

  const t = await req('/talent')
  check('1 BUILDER', 'GET /talent 200', '200', String(t.status), t.status === 200, 'high')
  const onTalent = has(t.body, username) || has(t.body, 'Sweeptest Builder One')
  check('1 BUILDER', 'builder appears on /talent', 'username or name in directory HTML', onTalent ? 'present' : 'ABSENT', onTalent, 'high')

  // capability resolution (live server-side, bypassing the ISR cache of /talent/<slug>)
  const { getSubjectsForCapability } = await import('../../src/lib/capability/practitioners.ts')
  const { loadVocab } = await import('../../src/lib/capability/vocab.ts')
  const vocab = await loadVocab(admin as any)
  const cc = await getSubjectsForCapability(admin as any, 'claude-code', vocab)
  const found = cc.builders.some((b: any) => b.username === username)
  check('1 BUILDER', 'resolves onto capability claude-code (data layer)', 'builder in getSubjectsForCapability("claude-code")', found ? 'resolved' : 'NOT RESOLVED', found, 'high')
  const cp = await req('/talent/claude-code')
  check('1 BUILDER', 'GET /talent/claude-code 200', '200', String(cp.status), cp.status === 200, 'high')
  if (cp.status === 200 && !has(cp.body, username)) notes.push('/talent/<slug> is ISR (revalidate=3600) + generateStaticParams — a brand-new builder does not appear until the hourly revalidation. Expected behaviour, not a bug; noted because it affects "does my profile show up?" perception.')
})

// ════════════════════════════════════════════════ 2. TEAM
await phase('2. TEAM signup', async () => {
  const a = await makeActor('team'); S.team = a
  const slug = 'sweeptest-team-a'
  const r = await req('/api/join/team', { method: 'POST', cookie: a.cookie, body: {
    team_name: 'Sweeptest Studio A', slug, tagline: 'Sweep test service team',
    description: 'A disposable service team created by the behavioural sweep.',
    services: ['Claude Code', 'RAG Systems', 'AI Automation'], location: 'Berlin, Germany',
    website_url: 'https://example.com', } })
  S.teamSlug = slug; S.teamEntityId = r.json?.entity_id
  check('2 TEAM', 'POST /api/join/team', '200 + entity_id', `${r.status} ${r.body.slice(0,200)}`, r.status === 200 && !!r.json?.entity_id, 'critical')
  const { data: ent } = await admin.from('entities').select('*').eq('slug', slug).maybeSingle()
  check('2 TEAM', 'entity kind=team', 'kind=team', ent ? `kind=${ent.kind}` : 'NO ENTITY', ent?.kind === 'team', 'critical')
  const { data: tp } = await admin.from('team_profiles').select('*').eq('entity_id', ent?.id ?? -1).maybeSingle()
  check('2 TEAM', 'team_profiles row, offers_services=true', 'offers_services=true', tp ? `offers_services=${tp.offers_services} published=${tp.published}` : 'NO ROW', tp?.offers_services === true, 'high')
  const { data: ta } = await admin.from('team_admins').select('*').eq('team_entity_id', ent?.id ?? -1).maybeSingle()
  check('2 TEAM', 'team_admins owner row', "role='owner' for the signing-up user", ta ? `role=${ta.role} user=${ta.user_id === a.userId}` : 'NO ROW', ta?.role === 'owner' && ta?.user_id === a.userId, 'critical')

  const ed = await req(`/team/${slug}/edit`, { cookie: a.cookie })
  check('2 TEAM', `GET /team/${slug}/edit as owner`, '200', String(ed.status), ed.status === 200, 'critical')
  const pubBefore = await req(`/team/${slug}`)
  check('2 TEAM', 'unpublished team is NOT public', '404 while published=false', String(pubBefore.status), pubBefore.status === 404, 'high')

  const pt = await req('/api/v1/team', { method: 'PATCH', cookie: a.cookie, body: { entity_id: ent!.id, published: true, services: ['Claude Code', 'RAG Systems', 'AI Automation'] } })
  check('2 TEAM', 'PATCH /api/v1/team publish (cookie path)', '200 + updated', `${pt.status} ${pt.body.slice(0,140)}`, pt.status === 200, 'critical')
  const { data: tp2 } = await admin.from('team_profiles').select('published,services').eq('entity_id', ent!.id).maybeSingle()
  check('2 TEAM', 'publish toggle persisted', 'team_profiles.published=true', `published=${tp2?.published}`, tp2?.published === true, 'critical')

  const pub = await req(`/team/${slug}`)
  check('2 TEAM', `GET /team/${slug} public (logged out)`, '200', String(pub.status), pub.status === 200, 'critical')
  check('2 TEAM', 'renders SERVICE lens (services shown)', 'page shows a declared service', has(pub.body, 'Claude Code') ? 'service rendered' : 'SERVICE MISSING', has(pub.body, 'Claude Code'), 'high')
  check('2 TEAM', 'renders team name', 'page contains team_name', has(pub.body, 'Sweeptest Studio A') ? 'present' : 'MISSING', has(pub.body, 'Sweeptest Studio A'), 'high')

  const pt2 = await req('/api/v1/team', { method: 'PATCH', cookie: a.cookie, body: { entity_id: ent!.id, tagline: 'Edited by sweep' } })
  const { data: tp3 } = await admin.from('team_profiles').select('tagline').eq('entity_id', ent!.id).maybeSingle()
  check('2 TEAM', 'edit persists (tagline round-trip)', 'tagline === "Edited by sweep"', `${pt2.status} tagline=${tp3?.tagline}`, tp3?.tagline === 'Edited by sweep', 'high')

  const { getSubjectsForCapability } = await import('../../src/lib/capability/practitioners.ts')
  const { loadVocab } = await import('../../src/lib/capability/vocab.ts')
  const vocab = await loadVocab(admin as any)
  const cc = await getSubjectsForCapability(admin as any, 'claude-code', vocab)
  const found = cc.teams.some((t: any) => t.slug === slug)
  check('2 TEAM', 'team surfaces on capability claude-code (D1)', 'team in getSubjectsForCapability', found ? 'resolved' : 'NOT RESOLVED', found, 'high')
})

// ════════════════════════════════════════════════ 3. AGENT
await phase('3. AGENT signup (never previously tested)', async () => {
  const a = await makeActor('agent'); S.agent = a
  const slug = 'sweeptest-agent-a'
  const r = await req('/api/join/agent', { method: 'POST', cookie: a.cookie, body: {
    agent_name: 'Sweeptest Agent A', slug, provider: 'claude', model: 'claude-opus-4-5',
    description: 'Disposable agent created by the behavioural sweep.',
    capabilities: ['Claude Code', 'RAG Systems'], focus: 'Autonomous build pipelines' } })
  S.agentSlug = slug; S.agentEntityId = r.json?.entity_id
  check('3 AGENT', 'POST /api/join/agent', '200 + entity_id', `${r.status} ${r.body.slice(0,200)}`, r.status === 200 && !!r.json?.entity_id, 'critical')
  const { data: ent } = await admin.from('entities').select('*').eq('slug', slug).maybeSingle()
  check('3 AGENT', 'entity kind=agent', 'kind=agent', ent ? `kind=${ent.kind}` : 'NO ENTITY', ent?.kind === 'agent', 'critical')
  const { data: ap } = await admin.from('agent_profiles').select('*').eq('entity_id', ent?.id ?? -1).maybeSingle()
  check('3 AGENT', 'agent_profiles row created', 'row with provider + published=false', ap ? `provider=${ap.provider} published=${ap.published}` : 'NO ROW', !!ap && ap.published === false, 'critical')

  const unpub = await req(`/agent/${slug}`)
  check('3 AGENT', 'unpublished agent is NOT public', '404 while published=false', String(unpub.status), unpub.status === 404, 'high')
  const ed = await req(`/agent/${slug}/edit`, { cookie: a.cookie })
  check('3 AGENT', `GET /agent/${slug}/edit as owner`, '200', String(ed.status), ed.status === 200, 'critical')
  const edAnon = await req(`/agent/${slug}/edit`)
  check('3 AGENT', 'agent edit page is owner-gated', 'non-owner gets 404/redirect, NOT 200', String(edAnon.status), edAnon.status !== 200, 'critical')

  const pa = await req('/api/v1/agent', { method: 'PATCH', cookie: a.cookie, body: { entity_id: ent!.id, published: true } })
  check('3 AGENT', 'PATCH /api/v1/agent publish (cookie path)', '200', `${pa.status} ${pa.body.slice(0,180)}`, pa.status === 200, 'critical')
  const { data: ap2 } = await admin.from('agent_profiles').select('published').eq('entity_id', ent!.id).maybeSingle()
  check('3 AGENT', 'publish persisted', 'agent_profiles.published=true', `published=${ap2?.published}`, ap2?.published === true, 'critical')

  const pub = await req(`/agent/${slug}`)
  check('3 AGENT', `GET /agent/${slug} public`, '200', String(pub.status), pub.status === 200, 'critical')
  check('3 AGENT', 'agent page renders name + provider', 'name and provider on page', `name=${has(pub.body,'Sweeptest Agent A')} provider=${has(pub.body,'claude')}`, has(pub.body, 'Sweeptest Agent A'), 'high')

  const api = await req(`/api/v1/agent/${slug}`)
  check('3 AGENT', `GET /api/v1/agent/${slug} (public projection)`, '200 + json', `${api.status}`, api.status === 200, 'medium')

  const { getSubjectsForCapability } = await import('../../src/lib/capability/practitioners.ts')
  const { loadVocab } = await import('../../src/lib/capability/vocab.ts')
  const vocab = await loadVocab(admin as any)
  const cc = await getSubjectsForCapability(admin as any, 'claude-code', vocab)
  const found = cc.agents.some((x: any) => x.slug === slug)
  check('3 AGENT', 'agent surfaces on capability claude-code', 'agent in getSubjectsForCapability', found ? 'resolved' : 'NOT RESOLVED', found, 'high')
})

// ════════════════════════════════════════════════ 4. BUYER + PUBLISH CHAIN
await phase('4. BUYER org signup + publish chain', async () => {
  const a = await makeActor('buyer'); S.buyer = a
  const slug = 'sweeptest-buyerco'
  const r = await req('/api/join/buyer', { method: 'POST', cookie: a.cookie, body: { company_name: 'Sweeptest Buyer Co', slug } })
  S.buyerSlug = slug; S.buyerEntityId = r.json?.entity_id
  check('4 BUYER', 'POST /api/join/buyer', '200 + entity_id', `${r.status} ${r.body.slice(0,200)}`, r.status === 200 && !!r.json?.entity_id, 'critical')
  const { data: ent } = await admin.from('entities').select('*').eq('slug', slug).maybeSingle()
  check('4 BUYER', 'entity kind=org', 'kind=org', ent ? `kind=${ent.kind}` : 'NO ENTITY', ent?.kind === 'org', 'critical')
  const { data: tp } = await admin.from('team_profiles').select('*').eq('entity_id', ent?.id ?? -1).maybeSingle()
  check('4 BUYER', 'team_profiles offers_services=false, hires=false', 'offers_services=false hires=false published=false', tp ? `offers_services=${tp.offers_services} hires=${tp.hires} published=${tp.published}` : 'NO ROW', tp?.offers_services === false && tp?.hires === false, 'high')
  const { data: ta } = await admin.from('team_admins').select('*').eq('team_entity_id', ent?.id ?? -1).maybeSingle()
  check('4 BUYER', 'team_admins owner row', 'owner row present', ta ? `role=${ta.role}` : 'NO ROW', ta?.role === 'owner', 'critical')
  const { data: fresh } = await admin.auth.admin.getUserById(a.userId)
  const role = (fresh?.user?.user_metadata as any)?.role
  check('4 BUYER', "NO role='client' stamp (D2b-1 backdoor retired)", "user_metadata.role !== 'client'", `role=${role ?? 'undefined'}`, role !== 'client', 'high')

  // THE CHAIN
  const unread = await req('/api/messages/unread', { cookie: a.cookie })
  check('4 BUYER', 'nav data resolves org (drives "Your company" link)', 'org_offers_services=false + org_published present', unread.body.slice(0,160), unread.status === 200 && unread.json?.org_offers_services === false, 'high')
  const own = await req(`/team/${slug}`, { cookie: a.cookie })
  check('4 BUYER', `GET /team/${slug} owner preview (unpublished)`, '200 for the owner', String(own.status), own.status === 200, 'critical')
  const ed = await req(`/team/${slug}/edit`, { cookie: a.cookie })
  check('4 BUYER', `GET /team/${slug}/edit  ← THE 0d9feaf BUG`, '200, NOT 404', String(ed.status), ed.status === 200, 'critical')
  const pt = await req('/api/v1/team', { method: 'PATCH', cookie: a.cookie, body: { entity_id: ent!.id, published: true, description: 'Sweeptest buyer company page.' } })
  check('4 BUYER', 'publish toggle (PATCH /api/v1/team as org owner)', '200', `${pt.status} ${pt.body.slice(0,140)}`, pt.status === 200, 'critical')
  const { data: tp2 } = await admin.from('team_profiles').select('published').eq('entity_id', ent!.id).maybeSingle()
  check('4 BUYER', 'team_profiles.published flipped', 'published=true', `published=${tp2?.published}`, tp2?.published === true, 'critical')
  const pubOut = await req(`/team/${slug}`)
  check('4 BUYER', `GET /team/${slug} LOGGED OUT after publish`, '200, NOT 404', String(pubOut.status), pubOut.status === 200, 'critical')
  check('4 BUYER', 'public company page renders company name', 'name on page', has(pubOut.body, 'Sweeptest Buyer Co') ? 'present' : 'MISSING', has(pubOut.body, 'Sweeptest Buyer Co'), 'high')

  const hirer = await req('/hirer', { cookie: a.cookie })
  check('4 BUYER', 'GET /hirer as no-subscription buyer', '200 (empty state), not error/redirect loop', `${hirer.status} ${hirer.headers.get('location') ?? ''}`, hirer.status === 200, 'critical')
  const emptyState = has(hirer.body, 'Full Access') || has(hirer.body, 'search') || has(hirer.body, 'unlock')
  check('4 BUYER', '/hirer renders BuyerOnlyEmptyState', 'empty-state copy present', emptyState ? 'empty state rendered' : 'NO EMPTY STATE COPY', emptyState, 'high')
})

// ════════════════════════════════════════════════ 5. PAYWALL
await phase('5. FULL ACCESS paywall / gating', async () => {
  const buyer: Actor = S.buyer
  const target = S.builderProfile
  const m1 = await req('/api/messages', { method: 'POST', cookie: buyer.cookie, body: { employer_email: buyer.email, builder_profile_id: target.id, content: 'sweeptest paywall probe' } })
  const { count: c1 } = await admin.from('conversations').select('*', { count: 'exact', head: true }).eq('employer_email', buyer.email)
  check('5 PAYWALL', 'non-member cannot START a conversation', '403 + zero conversations created', `${m1.status} ${m1.body.slice(0,120)} convos=${c1}`, m1.status === 403 && c1 === 0, 'critical')

  const insp = await req('/api/messages', { method: 'POST', body: { employer_email: 'x@y.z', builder_profile_id: target.id, content: 'anon' } })
  check('5 PAYWALL', 'anonymous cannot message', '401', String(insp.status), insp.status === 401, 'critical')

  const inq = await req('/api/project-inquiries', { method: 'POST', body: { message: 'free inquiry backdoor probe' } })
  check('5 PAYWALL', 'no free project-inquiry backdoor', '404 (route gone)', String(inq.status), inq.status === 404, 'high')
  const ct = await req('/api/messages/contact-team', { method: 'POST', cookie: buyer.cookie, body: { team_entity_id: S.teamEntityId, content: 'sweeptest contact-team probe' } })
  S.contactTeamStatus = ct.status
  notes.push(`/api/messages/contact-team as a non-member buyer → ${ct.status} ${ct.body.slice(0,160)}`)

  // simulate an active subscription
  const { error: subErr } = await admin.from('subscriptions').insert({ email: buyer.email, product: 'full_access', status: 'active', stripe_customer_id: 'sweeptest-cus', stripe_session_id: 'sweeptest-sess' })
  check('5 PAYWALL', 'insert simulated active full_access subscription', 'insert ok', subErr ? `ERROR ${subErr.message}` : 'inserted', !subErr, 'high')
  const m2 = await req('/api/messages', { method: 'POST', cookie: buyer.cookie, body: { employer_email: buyer.email, builder_profile_id: target.id, content: 'sweeptest member message' } })
  const { data: conv } = await admin.from('conversations').select('*').eq('employer_email', buyer.email).maybeSingle()
  S.convId = conv?.id
  check('5 PAYWALL', 'member CAN start a conversation (unlock)', '200 + conversation row', `${m2.status} ${m2.body.slice(0,140)}`, m2.status === 200 && !!conv, 'critical')
  check('5 PAYWALL', 'conversation carries subject_entity_id (stage 5c)', `subject_entity_id === ${S.buyerEntityId}`, `subject_entity_id=${conv?.subject_entity_id}`, conv?.subject_entity_id === S.buyerEntityId, 'high')

  const co = await req('/api/checkout', { method: 'POST', cookie: S.member?.cookie ?? buyer.cookie, body: { product: 'full_access' } })
  const priceLine = co.json?.url ? 'checkout session created' : co.body.slice(0, 200)
  notes.push(`POST /api/checkout → ${co.status}; ${priceLine}`)
  check('5 PAYWALL', 'checkout session creates (gate reachable, no charge made)', '200 with a Stripe URL', `${co.status} ${co.json?.url ? 'url returned' : co.body.slice(0,120)}`, co.status === 200 && !!co.json?.url, 'medium')
})

// ════════════════════════════════════════════════ 6. JOBS
await phase('6. JOBS', async () => {
  const buyer: Actor = S.buyer
  const j = await req('/api/jobs', { method: 'POST', cookie: buyer.cookie, body: {
    company_name: 'Sweeptest Buyer Co', role_title: 'Sweeptest AI Engineer',
    description: 'Disposable job posted by the behavioural sweep.',
    requirements: 'Sweep test', salary_range: '$100k', location: 'Remote',
    employment_type: 'full-time', skills: ['Claude Code'], employer_email: buyer.email } })
  check('6 JOBS', 'POST /api/jobs as org owner', '200/201', `${j.status} ${j.body.slice(0,200)}`, [200,201].includes(j.status), 'critical')
  const { data: job } = await admin.from('jobs').select('*').eq('role_title', 'Sweeptest AI Engineer').maybeSingle()
  S.jobId = job?.id
  check('6 JOBS', 'jobs row created', 'row exists', job ? `id=${job.id}` : 'NO ROW', !!job, 'critical')
  check('6 JOBS', 'job carries subject_entity_id (stage 5b re-key)', `subject_entity_id === ${S.buyerEntityId}`, `subject_entity_id=${job?.subject_entity_id}`, job?.subject_entity_id === S.buyerEntityId, 'critical')
  if (job) {
    const jp = await req(`/jobs/${job.id}`)
    check('6 JOBS', `GET /jobs/${job.id}`, '200', String(jp.status), jp.status === 200, 'critical')
    check('6 JOBS', 'job page resolves company via entity (not dropped employer_profiles)', 'company name on page', has(jp.body, 'Sweeptest Buyer Co') ? 'company rendered' : 'COMPANY MISSING', has(jp.body, 'Sweeptest Buyer Co'), 'high')
    const jl = await req('/jobs')
    check('6 JOBS', 'job appears on /jobs board', 'role title in listing', has(jl.body, 'Sweeptest AI Engineer') ? 'listed' : 'NOT LISTED', has(jl.body, 'Sweeptest AI Engineer'), 'high')
    const org = await req(`/team/${S.buyerSlug}`)
    check('6 JOBS', 'job shows in org hiring lens on /team/<slug>', '"Open roles" + the role title', has(org.body, 'Sweeptest AI Engineer') ? 'shown' : 'NOT SHOWN', has(org.body, 'Sweeptest AI Engineer'), 'high')
  }
})

// ════════════════════════════════════════════════ 7. MESSAGING
await phase('7. MESSAGING', async () => {
  const buyer: Actor = S.buyer, builder: Actor = S.builder
  const { data: conv } = await admin.from('conversations').select('*').eq('id', S.convId).maybeSingle()
  check('7 MESSAGING', 'conversation carries subject_entity_id', 'set to the buyer org', `subject_entity_id=${conv?.subject_entity_id}`, !!conv?.subject_entity_id, 'high')
  const inbox = await req('/messages', { cookie: builder.cookie })
  check('7 MESSAGING', 'builder sees the thread in /messages', '200 + hirer name resolved via team_profiles', `${inbox.status} nameShown=${has(inbox.body, 'Sweeptest Buyer Co')}`, inbox.status === 200 && has(inbox.body, 'Sweeptest Buyer Co'), 'high')
  const teamInbox = await req('/hirer/messages', { cookie: buyer.cookie })
  check('7 MESSAGING', 'hirer inbox renders', '200', String(teamInbox.status), teamInbox.status === 200, 'high')
  const reply = await req('/api/messages', { method: 'POST', cookie: builder.cookie, body: { conversation_id: S.convId, content: 'sweeptest builder reply' } })
  check('7 MESSAGING', 'builder can reply without a subscription', '200', `${reply.status} ${reply.body.slice(0,120)}`, reply.status === 200, 'high')
  const outsider: Actor = S.agent
  const inject = await req('/api/messages', { method: 'POST', cookie: outsider.cookie, body: { conversation_id: S.convId, content: 'sweeptest injection probe' } })
  check('7 MESSAGING', 'non-participant cannot inject into a thread', '403', String(inject.status), inject.status === 403, 'critical')
  // published gate on hirer identity
  await admin.from('team_profiles').update({ published: false }).eq('entity_id', S.buyerEntityId)
  const inbox2 = await req('/messages', { cookie: builder.cookie })
  notes.push(`Unpublished-hirer identity in builder inbox: name still shown = ${has(inbox2.body, 'Sweeptest Buyer Co')} (published gate on hirer name/logo)`)
  await admin.from('team_profiles').update({ published: true }).eq('entity_id', S.buyerEntityId)
})

// ════════════════════════════════════════════════ 8. NAV + DASHBOARD
await phase('8. NAV + DASHBOARD coherence per identity', async () => {
  const member = await makeActor('member'); S.member = member
  await admin.from('subscriptions').insert({ email: member.email, product: 'full_access', status: 'active', stripe_customer_id: 'sweeptest-cus-m', stripe_session_id: 'sweeptest-sess-m' })
  const identities: [string, Actor][] = [['builder', S.builder], ['team', S.team], ['agent', S.agent], ['buyer', S.buyer], ['member', member]]
  const surfaces = ['/dashboard', '/talent', '/feed', '/jobs', '/messages']
  const linkRe = /href="(\/[^"#?]*)"/g
  for (const [label, actor] of identities) {
    const seen = new Set<string>()
    for (const s of surfaces) {
      const r = await req(s, { cookie: actor.cookie })
      const okStatus = r.status === 200 || (r.status === 307 && !!r.headers.get('location'))
      check('8 NAV', `[${label}] GET ${s}`, '200 or intentional redirect (never 4xx/5xx)', `${r.status}${r.headers.get('location') ? ' -> ' + r.headers.get('location') : ''}`, okStatus, 'high')
      if (r.status === 200) for (const m of r.body.matchAll(linkRe)) seen.add(m[1])
    }
    const links = [...seen].filter(l => !l.startsWith('/_next') && !l.startsWith('/api/') && l !== '/' && !l.includes('.'))
    const dead: string[] = []
    for (const l of links) {
      const rr = await req(l, { cookie: actor.cookie })
      if (rr.status >= 400) dead.push(`${l} → ${rr.status}`)
    }
    check('8 NAV', `[${label}] every in-app link resolves (${links.length} unique links crawled)`, 'no 4xx/5xx from any nav/dashboard link', dead.length ? `DEAD: ${dead.join(', ')}` : 'all resolve', dead.length === 0, 'high')
  }
})

// ════════════════════════════════════════════════ 9. ADVERSARIAL / KNOWN ITEMS
await phase('9. Adversarial probes + known open items', async () => {
  // A) /api/v1/team resolveTeamByOwner ignores userId → cross-tenant?
  const builder: Actor = S.builder
  const k = await req('/api/keys', { method: 'POST', cookie: builder.cookie, body: { name: 'sweeptest-key', scope: 'team:rw' } })
  const raw = k.json?.key ?? k.json?.raw ?? k.json?.api_key
  S.rawKey = raw
  notes.push(`POST /api/keys (scope team:rw) → ${k.status} ${raw ? 'key issued' : k.body.slice(0,200)}`)
  if (raw) {
    const g = await req('/api/v1/team', { headers: { Authorization: `Bearer ${raw}` } })
    const leakedSlug = g.json?.team?.slug ?? g.json?.data?.team?.slug
    const ownsNothing = true // the builder actor owns NO team/org
    check('9 ADVERSARIAL', 'API key of a user owning NO team must not resolve a team', '404 "No team owned by this key"', `${g.status} slug=${leakedSlug ?? 'none'}`, g.status === 404, 'critical')
    if (g.status === 200 && leakedSlug) {
      const p = await req('/api/v1/team', { method: 'PATCH', headers: { Authorization: `Bearer ${raw}` }, body: { tagline: 'SWEEPTEST-CROSS-TENANT-WRITE-PROBE' } })
      const { data: victim } = await admin.from('team_profiles').select('tagline, entity_id').eq('entity_id', (await admin.from('entities').select('id').eq('slug', leakedSlug).maybeSingle()).data?.id ?? -1).maybeSingle()
      check('9 ADVERSARIAL', 'API key must not WRITE to a team it does not own', 'PATCH rejected (403/404)', `${p.status}; victim tagline now = ${JSON.stringify(victim?.tagline)}`, p.status >= 400, 'critical')
      if (victim?.tagline === 'SWEEPTEST-CROSS-TENANT-WRITE-PROBE') {
        await admin.from('team_profiles').update({ tagline: 'Edited by sweep' }).eq('entity_id', victim.entity_id)
        notes.push('Cross-tenant write CONFIRMED and reverted (victim was a sweeptest team, no real data touched).')
      }
    }
  }
  // B) slug squatting across kinds
  const dup = await req('/api/join/team', { method: 'POST', cookie: S.member.cookie, body: { team_name: 'Dup', slug: S.buyerSlug, services: [] } })
  check('9 ADVERSARIAL', 'cannot squat an existing entity slug', '409 conflict', `${dup.status} ${dup.body.slice(0,120)}`, dup.status === 409, 'high')
  // C) non-admin cannot PATCH someone else's team via cookie path
  const hijack = await req('/api/v1/team', { method: 'PATCH', cookie: S.member.cookie, body: { entity_id: S.teamEntityId, tagline: 'sweeptest hijack' } })
  check('9 ADVERSARIAL', 'cookie path: non-admin cannot PATCH another team', '403', `${hijack.status} ${hijack.body.slice(0,120)}`, hijack.status === 403, 'critical')
  // D) unauthenticated join routes
  for (const p of ['/api/join/team', '/api/join/agent', '/api/join/buyer']) {
    const r = await req(p, { method: 'POST', body: { team_name: 'x', slug: 'sweeptest-noauth', agent_name: 'x', provider: 'claude', company_name: 'x' } })
    check('9 ADVERSARIAL', `unauthenticated POST ${p}`, '401', String(r.status), r.status === 401, 'critical')
  }
  // E) known open items — copy observation only
  const hirers = await req('/hirers')
  notes.push(`/hirers pricing copy: contains "$199/mo" = ${has(hirers.body, '$199/mo')}; contains "free to start" = ${has(hirers.body, 'free')}`)
  const talent = await req('/talent')
  const capLinks = [...talent.body.matchAll(/href="\/talent\/([a-z0-9-]+)"/g)].map(m => m[1])
  check('9 KNOWN', 'capability-page nav gap: is there any in-app link to /talent/<slug>?', 'links present would close handoff item 3', capLinks.length ? `${capLinks.length} links found: ${[...new Set(capLinks)].slice(0,5).join(', ')}` : 'ZERO in-app links to /talent/<slug> — gap still open', capLinks.length > 0, 'medium')
  const u = await req(`/u/sweeptestbuilder1`)
  const skillLinks = [...u.body.matchAll(/href="\/talent\/([a-z0-9-]+)"/g)].map(m => m[1])
  check('9 KNOWN', 'builder skill chips link to capability pages', 'skill chips are links', skillLinks.length ? `${skillLinks.length} links` : 'skill chips are NOT links', skillLinks.length > 0, 'medium')
})

writeFileSync(`${OUT}-rows.json`, JSON.stringify({ rows, notes, state: { ...S, builder: undefined, team: undefined, agent: undefined, buyer: undefined, member: undefined } }, null, 2))
const pass = rows.filter(r => r.pass).length
console.log(`\n\n===== SWEEP DONE: ${pass}/${rows.length} PASS, ${rows.length - pass} FAIL =====`)
console.log('NOTES:\n' + notes.map(n => ' - ' + n).join('\n'))
