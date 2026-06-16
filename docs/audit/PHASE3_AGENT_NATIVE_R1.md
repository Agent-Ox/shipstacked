# Phase 3 — Agent-Native Foundation (R1)

**Supersedes PHASE3_AGENT_NATIVE.md.** Revised after §A pre-flight surfaced two architectural blockers:
1. The AgentCard is already A2A v1.0 + brand-free + read-only by deliberate design (Beacon 2 data-publisher stance). Original §F would have broken `verify-agent-card.ts` and violated the read-only invariant.
2. MCP server is Posture-α read-only public-data by deliberate design (BEACON_5). Original §H would have added write tools that violate this stance.

**Resolved architecture: two-surface model.**

| Surface | Auth | Purpose |
|---|---|---|
| `/.well-known/agent-card.json` + `/api/mcp` | None (public read) | Anonymous data discovery. Any agent can browse ShipStacked without registering. |
| `/auth.md` + `/api/v1/*` | Bearer `sk_ss_*` API key + scope | Authenticated read + write on behalf of a user. Buyer-side or builder-side. |

Phase 3 ships:
- **Auth.md user-claimed OTP flow** for open agent registration.
- **6 new buyer-side V1 REST endpoints** for talent search, builder fetch, messages, jobs, saved-profiles, scope introspection.
- **Scope model** via additive `api_keys.scope` column.
- **`<ConnectAnAgent>` shared component** on Solo + Buyer dashboards.
- **One AgentCard metadata field** pointing at `/auth.md` for write-surface discoverability — preserves brand-free + read-only invariants.

**Dropped from original plan:**
- §F AgentCard structural rewrite. Card stays as-is.
- §H MCP write tools. MCP stays Posture-α.

**Scope estimate revised:** ~8-12 hours focused work across 2-3 sessions.

---

## §A — Pre-flight findings (recap, already done by terminal Claude)

Terminal Claude completed §A and reported. Authoritative facts for this revision:

- **A.1 AgentCard:** Built via `src/lib/agent-card/builder.ts`; route is thin shell at `src/app/.well-known/agent-card.json/route.ts`. Already A2A v1.0 (`protocolVersion: '1.0.0'`, camelCase). 8 read-only fetch skills. Brand-free. Disclaimer-bearing. `metadata['shipstacked:cardKind'] = 'data-publisher'`. Version `0.1.0`. Enforced by `scripts/v2/verify-agent-card.ts`.
- **A.2 MCP server:** `src/app/api/mcp/route.ts` dispatches to `src/lib/mcp/server.ts`. Posture α — read-only, public data, no rate limit (BEACON_5). 4 tools: `get-atlas-role`, `list-atlas-roles`, `get-collection`, `get-builder`. Card metadata declares `readOnly: true, toolCount: 4`.
- **A.3 `authenticateApiKey`:** Returns `{ ok: true, auth: { profile, email, keyId } } | { ok: false, status, error }`. Does NOT include scope yet. All existing `/api/v1/*` callers consume `auth.profile` + `auth.keyId`.
- **A.4 V1 route shape:** `authenticateApiKey → rateLimit(auth.keyId) → work → apiOk/apiError`. New routes mirror exactly.
- **A.6 `api_keys` schema:** Columns are `id, profile_id, key_hash, key_prefix, name, email, last_used_at, created_at`. NO `scope`, NO `key_hint`, NO `created_by`. Phase 3 ADDs `scope` column. The original plan's writes to `key_hint`/`created_by` must use `key_prefix`/`name` instead.
- **A.6 `agent_registrations`:** Does NOT exist. Phase 3 CREATEs.
- **A.6 `saved_profiles`:** Already EXISTS with columns `id, employer_email, profile_id, created_at`. Reuse — DO NOT create a new table. `/api/v1/saved-profiles` wraps this existing schema.
- **A.7 AGENTS.md:** Repo-coding-agent convention, not a web endpoint. Already exists at repo root for terminal Claude's guidance. Drop the "publish at a URL" idea — it misapplies the standard.
- **A.8 Hirer dashboard:** `src/app/hirer/HirerDashboardClient.tsx` is client component with `{email, renewsString, jobs, hirerProfile, applications}` props. `<ConnectAnAgent>` slot fits after the jobs section.
- **A.9 Formula E ranking:** `getRankedBuilders(limit?)` returns `{ ranked, belowThreshold }` of `RankedBuilder` objects with `atlasClusters, eventTypes, quality_score, verified`. `/talent` applies filters in JS via `facets.ts`. `/api/v1/talent/search` wraps `getRankedBuilders()` + reuses those filters. For per-builder Atlas roles + receipt aggregates, the wrapper does a secondary query batched across the result set.

All findings folded into this revision.

---

## §B — Architecture overview

### B.1 — Two-surface model

**Public data surface (no auth, no scope, no rate limit):**
- `/.well-known/agent-card.json` — A2A v1.0 AgentCard, declares the public read API + MCP endpoint. Brand-free, data-publisher posture.
- `/api/mcp` — MCP server with 4 read tools (`get-builder`, `get-atlas-role`, `list-atlas-roles`, `get-collection`).
- Public REST endpoints (existing pattern at `/api/atlas/*`, `/api/profiles/*`).

**Authenticated action surface (bearer key + scope check):**
- `/auth.md` — Markdown protocol description for agents.
- `/.well-known/oauth-protected-resource` — RFC 9728 PRM.
- `/.well-known/oauth-authorization-server` — OAuth AS metadata with `agent_auth` block.
- `/api/agent/auth/claim` — start OTP flow.
- `/api/agent/auth/claim/complete` — exchange OTP for scoped API key.
- `/api/v1/me` — builder reads own profile (existing).
- `/api/v1/profile` — builder updates own profile (existing).
- `/api/v1/builds` — builder posts builds (existing).
- `/api/v1/talent/search` — buyer searches ranked talent (NEW).
- `/api/v1/builders/<username>` — any-scope deep-fetch builder (NEW).
- `/api/v1/messages` — list + send (NEW for bearer auth; cookie-session version stays at `/api/messages`).
- `/api/v1/jobs` — post (NEW).
- `/api/v1/saved-profiles` — list + save (NEW; wraps existing `saved_profiles` table).
- `/api/v1/me/scope` — introspect what this key can do (NEW).

### B.2 — Scope model

`api_keys.scope` (new column, default `'builder:rw'`):

| Scope | Reads | Writes |
|---|---|---|
| `builder:rw` | own profile, own builds, own messages | own profile, own builds, send own messages |
| `buyer:rw` | talent search, builder profiles, own messages, own jobs, own saves | send messages, post jobs, save profiles |
| `agent:rw` | own profile, own builds, principal's profile (read-only) | own profile, own builds |

Each `/api/v1/*` endpoint declares required scope; mismatch returns 403.

### B.3 — Auth.md flow (user-claimed OTP)

1. Agent calls `POST /api/agent/auth/claim` with `{email, scope, agent_provider, agent_name}`.
2. ShipStacked emails the user a 6-digit OTP, returns `claim_token` to agent.
3. Agent prompts user for OTP, calls `POST /api/agent/auth/claim/complete` with `{claim_token, otp_code}`.
4. On match: ShipStacked mints/looks-up auth user, creates entity + profile if new, mints scoped `sk_ss_*` key, returns to agent.
5. Agent uses key on `/api/v1/*` endpoints.

**The `agent-verified` ID-JAG flow is deferred to Phase 8** — requires provider trust list infrastructure (Anthropic/OpenAI/Cursor JWKS verification, jti replay protection).

### B.4 — AgentCard update (minimal)

The card structure does NOT change. The data-publisher posture, A2A v1.0 compliance, brand-free invariant, and 8 read-only fetch skills all stay.

**ONE additive change:** the `metadata` object gets a new key:
```ts
metadata['shipstacked:agentAuth'] = `${SITE}/auth.md`
```

That's it. Lets agents that discover ShipStacked via the AgentCard find the write surface in one hop, without violating any invariant.

`verify-agent-card.ts` needs to be updated to recognize (not require) this metadata field. Add a non-required assertion: if present, must be a string matching `/^https:\/\/.+\/auth\.md$/`.

### B.5 — MCP server (unchanged)

MCP stays Posture-α read-only. No write tools. No new tools in Phase 3. The MCP endpoint is announced via the AgentCard's existing `metadata['shipstacked:mcpEndpoint']`. Write actions are routed exclusively through `/api/v1/*` with bearer auth.

---

## §C — Block 1: Auth.md discovery endpoints

### C.1 — `/.well-known/oauth-protected-resource`

Path: `src/app/.well-known/oauth-protected-resource/route.ts` (new).

```ts
import { NextResponse } from 'next/server'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'

export async function GET() {
  return NextResponse.json({
    resource: `${SITE}/api/v1/`,
    resource_name: 'ShipStacked',
    resource_logo_uri: `${SITE}/icon.png`,
    authorization_servers: [`${SITE}/`],
    scopes_supported: ['builder:rw', 'buyer:rw', 'agent:rw'],
    bearer_methods_supported: ['header'],
  }, {
    headers: { 'Cache-Control': 'public, max-age=300' },
  })
}
```

### C.2 — `/.well-known/oauth-authorization-server`

Path: `src/app/.well-known/oauth-authorization-server/route.ts` (new).

```ts
import { NextResponse } from 'next/server'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'

export async function GET() {
  return NextResponse.json({
    issuer: SITE,
    authorization_endpoint: `${SITE}/login`,
    token_endpoint: `${SITE}/api/agent/auth/claim/complete`,
    agent_auth: {
      auth_md_uri: `${SITE}/auth.md`,
      flows_supported: ['user_claimed'],
      claim_endpoint: `${SITE}/api/agent/auth/claim`,
      claim_complete_endpoint: `${SITE}/api/agent/auth/claim/complete`,
      scopes_supported: ['builder:rw', 'buyer:rw'],
      claim_token_ttl_seconds: 86400,
      otp_length: 6,
      otp_ttl_seconds: 600,
    },
  }, {
    headers: { 'Cache-Control': 'public, max-age=300' },
  })
}
```

### C.3 — `/auth.md`

Path: `src/app/auth.md/route.ts` (new).

```ts
import { NextResponse } from 'next/server'

const AUTH_MD = `# ShipStacked Agent Registration

ShipStacked supports the [auth.md](https://workos.com/auth-md) open protocol for agent registration. Any AI agent — Claude, Cursor, ChatGPT, or custom — can register on behalf of a user without a browser-based signup form.

## Two surfaces

1. **Public data surface** — anonymous, no auth. AgentCard at \`/.well-known/agent-card.json\` and MCP at \`/api/mcp\`. Use this to discover ShipStacked's data without registering anything.

2. **Action surface** — authenticated via scoped API key. Use this to act on behalf of a user (search talent, message builders, post jobs, post builds, manage profile).

## Flow: User Claimed (OTP)

The agent POSTs to \`/api/agent/auth/claim\` with the user's email and desired scope. ShipStacked emails the user a 6-digit code. The agent prompts the user for the code, then POSTs it back via \`/api/agent/auth/claim/complete\`. The agent receives a scoped API key.

### Endpoints

- \`POST /api/agent/auth/claim\` — trigger OTP email, return claim_token
- \`POST /api/agent/auth/claim/complete\` — submit OTP + claim_token, return api_key

### Scopes

- \`builder:rw\` — manage own builder profile, post builds, read/write own messages
- \`buyer:rw\` — search talent, message builders, post jobs, manage shortlist

## Action endpoints

Once registered with a scoped key, the agent calls REST endpoints at \`/api/v1/*\`:

**builder:rw**
- \`GET /api/v1/me\` — own profile
- \`PATCH /api/v1/profile\` — update own profile
- \`POST /api/v1/builds\` — post a build
- \`GET /api/v1/builds\` — own recent builds

**buyer:rw**
- \`GET /api/v1/talent/search\` — ranked builder directory
- \`GET /api/v1/builders/<username>\` — deep-fetch a candidate
- \`GET /api/v1/messages\` / \`POST /api/v1/messages\` — own conversations
- \`POST /api/v1/jobs\` — post a job
- \`GET /api/v1/saved-profiles\` / \`POST /api/v1/saved-profiles\` — shortlist

**any scope**
- \`GET /api/v1/me/scope\` — introspect current key's permissions

Full machine-readable catalog at \`/api-docs\`.

## Trust model

API keys are scoped, revocable. The user can revoke at any time from their dashboard. Keys are presented as \`Authorization: Bearer sk_ss_*\` headers.

## On the roadmap

- OAuth Dynamic Client Registration (replaces bearer keys for agent-registered flows)
- Agent-verified ID-JAG flow (trusted-provider attestation)
- A2A peer-to-peer agent delegation
- AP2 (Universal Commerce Protocol) for hire-confirmation transactions

---

Contact: ox@agentagous.com
`

export async function GET() {
  return new NextResponse(AUTH_MD, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
```

### C.4 — Validate

```bash
npx tsc --noEmit
curl http://localhost:3000/.well-known/oauth-protected-resource | jq
curl http://localhost:3000/.well-known/oauth-authorization-server | jq
curl http://localhost:3000/auth.md
```

All return 200 with expected JSON/Markdown. tsc exit 0.

---

## §D — Block 2: DDL (operator-paste via Dashboard SQL Editor)

### D.1 — Forward

```sql
BEGIN;

-- agent_registrations table (does NOT exist per §A.6 — safe CREATE)
CREATE TABLE public.agent_registrations (
  id BIGSERIAL PRIMARY KEY,
  claim_token_hash TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  requested_scope TEXT NOT NULL,
  agent_provider TEXT NULL,
  agent_name TEXT NULL,
  otp_code_hash TEXT NULL,
  otp_sent_at TIMESTAMPTZ NULL,
  otp_attempts INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  api_key_id BIGINT NULL REFERENCES public.api_keys(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_agent_registrations_email ON public.agent_registrations(email);
CREATE INDEX idx_agent_registrations_expires ON public.agent_registrations(expires_at) WHERE status = 'pending';

-- api_keys.scope column (does NOT exist per §A.6 — safe ADD)
ALTER TABLE public.api_keys ADD COLUMN scope TEXT NOT NULL DEFAULT 'builder:rw';
CREATE INDEX idx_api_keys_scope ON public.api_keys(scope);

-- saved_profiles EXISTS already per §A.6 — DO NOT CREATE. No DDL change needed for §G.7.

COMMIT;
```

### D.2 — Verification

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'agent_registrations'
ORDER BY ordinal_position;
-- Expect 13 columns.

SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'api_keys' AND column_name = 'scope';
-- Expect 1 row.

SELECT COUNT(*) FROM public.api_keys WHERE scope = 'builder:rw';
-- Expect = total api_keys count (all rows backfilled to default).
```

### D.3 — Reversal

```sql
BEGIN;
DROP TABLE IF EXISTS public.agent_registrations;
ALTER TABLE public.api_keys DROP COLUMN IF EXISTS scope;
COMMIT;
```

---

## §E — Block 3: Auth.md OTP flow API

### E.1 — `POST /api/agent/auth/claim`

Path: `src/app/api/agent/auth/claim/route.ts` (new).

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'node:crypto'
import { Resend } from 'resend'

const SCOPES_ALLOWED = ['builder:rw', 'buyer:rw'] as const

function generateClaimToken(): string {
  const bytes = randomBytes(20)
  const base62 = bytes.toString('base64url').replace(/[-_]/g, '').slice(0, 25)
  return `clm_${base62}`
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

export async function POST(req: Request) {
  let body: { email?: string; scope?: string; agent_provider?: string; agent_name?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const email = body.email?.trim().toLowerCase()
  const scope = body.scope?.trim()
  if (!email || !scope) return NextResponse.json({ error: 'email and scope required' }, { status: 400 })
  if (!SCOPES_ALLOWED.includes(scope as any)) {
    return NextResponse.json({ error: `Invalid scope. Allowed: ${SCOPES_ALLOWED.join(', ')}` }, { status: 400 })
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: recentClaims } = await admin
    .from('agent_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', oneHourAgo)
  if ((recentClaims ?? 0) >= 3) {
    return NextResponse.json({ error: 'Too many recent claim attempts. Try again in an hour.' }, { status: 429 })
  }

  const claimToken = generateClaimToken()
  const otp = generateOtp()
  const claimTokenHash = sha256(claimToken)
  const otpHash = sha256(otp)

  const { data: row, error } = await admin
    .from('agent_registrations')
    .insert({
      claim_token_hash: claimTokenHash,
      email,
      requested_scope: scope,
      agent_provider: body.agent_provider ?? null,
      agent_name: body.agent_name ?? null,
      otp_code_hash: otpHash,
      otp_sent_at: new Date().toISOString(),
      status: 'pending',
    })
    .select('expires_at')
    .single()

  if (error || !row) {
    return NextResponse.json({ error: 'Registration insert failed' }, { status: 500 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY!)
  await resend.emails.send({
    from: 'ShipStacked <noreply@shipstacked.com>',
    to: email,
    subject: `Agent registration code: ${otp}`,
    html: `
      <p>An AI agent has requested access to ShipStacked on your behalf.</p>
      <p><strong>Agent provider:</strong> ${body.agent_provider ?? 'unknown'}</p>
      <p><strong>Agent name:</strong> ${body.agent_name ?? 'unknown'}</p>
      <p><strong>Requested scope:</strong> ${scope}</p>
      <p>Your confirmation code is: <strong>${otp}</strong></p>
      <p>This code expires in 10 minutes. Share it only with the agent that initiated this request.</p>
      <p>If you did not initiate this, ignore this email — no account changes will be made.</p>
    `,
  })

  return NextResponse.json({
    claim_token: claimToken,
    expires_at: row.expires_at,
    otp_sent_to_email: true,
    next_endpoint: '/api/agent/auth/claim/complete',
  })
}
```

### E.2 — `POST /api/agent/auth/claim/complete`

Path: `src/app/api/agent/auth/claim/complete/route.ts` (new).

**Important: api_keys columns are `key_prefix` and `name` (NOT `key_hint` or `created_by`).** Insert uses correct columns per §A.6.

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'node:crypto'
import { findOrCreateHumanEntity } from '@/lib/entities'

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

function generateApiKey(): string {
  const bytes = randomBytes(24).toString('base64url').replace(/[-_]/g, '')
  return `sk_ss_${bytes.slice(0, 32)}`
}

export async function POST(req: Request) {
  let body: { claim_token?: string; otp_code?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const claimToken = body.claim_token?.trim()
  const otpCode = body.otp_code?.trim()
  if (!claimToken || !otpCode) return NextResponse.json({ error: 'claim_token and otp_code required' }, { status: 400 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const claimTokenHash = sha256(claimToken)
  const otpHash = sha256(otpCode)

  const { data: reg } = await admin
    .from('agent_registrations')
    .select('*')
    .eq('claim_token_hash', claimTokenHash)
    .eq('status', 'pending')
    .maybeSingle()
  if (!reg) return NextResponse.json({ error: 'Invalid or used claim token' }, { status: 404 })

  if (new Date(reg.expires_at) < new Date()) {
    await admin.from('agent_registrations').update({ status: 'expired' }).eq('id', reg.id)
    return NextResponse.json({ error: 'Claim token expired' }, { status: 410 })
  }
  if (reg.otp_attempts >= 5) {
    await admin.from('agent_registrations').update({ status: 'failed' }).eq('id', reg.id)
    return NextResponse.json({ error: 'Too many OTP attempts. Restart the claim flow.' }, { status: 410 })
  }
  if (reg.otp_code_hash !== otpHash) {
    await admin.from('agent_registrations').update({ otp_attempts: reg.otp_attempts + 1 }).eq('id', reg.id)
    return NextResponse.json({ error: 'OTP code incorrect' }, { status: 401 })
  }

  // OTP correct. Mint or look up auth user, entity, profile.
  const { data: userByEmail } = await admin.auth.admin.listUsers()
  let authUser = userByEmail?.users.find(u => u.email === reg.email)
  if (!authUser) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: reg.email,
      email_confirm: true,
      user_metadata: { created_via: 'agent_registration', agent_provider: reg.agent_provider },
    })
    if (createErr || !created.user) {
      return NextResponse.json({ error: `Auth user creation failed: ${createErr?.message}` }, { status: 500 })
    }
    authUser = created.user
  }

  try {
    await findOrCreateHumanEntity(admin, authUser)
  } catch (err) {
    return NextResponse.json({ error: 'Entity creation failed' }, { status: 500 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('user_id', authUser.id)
    .maybeSingle()
  if (!profile) {
    return NextResponse.json({ error: 'Profile row missing post-entity-create' }, { status: 500 })
  }

  const rawKey = generateApiKey()
  const keyHash = sha256(rawKey)
  const keyPrefix = rawKey.slice(0, 11)  // 'sk_ss_' + 5 chars — matches existing key_prefix convention

  // NOTE: api_keys real columns are id, profile_id, key_hash, key_prefix, name, email, last_used_at, created_at, scope (post-§D)
  const { data: keyRow, error: keyErr } = await admin
    .from('api_keys')
    .insert({
      profile_id: profile.id,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: reg.agent_name ?? 'Agent-registered key',
      email: reg.email,
      scope: reg.requested_scope,
    })
    .select('id')
    .single()
  if (keyErr || !keyRow) {
    return NextResponse.json({ error: `API key insert failed: ${keyErr?.message}` }, { status: 500 })
  }

  await admin
    .from('agent_registrations')
    .update({ status: 'completed', api_key_id: keyRow.id, completed_at: new Date().toISOString() })
    .eq('id', reg.id)

  return NextResponse.json({
    api_key: rawKey,
    scope: reg.requested_scope,
    key_id: keyRow.id,
    key_prefix: keyPrefix,
    expires_at: null,
  })
}
```

### E.3 — Validate

```bash
npx tsc --noEmit
```

Manual local smoke test (terminal Claude can run if dev server is up, but operator OTP via Resend may require real email — defer if needed):

```bash
curl -X POST http://localhost:3000/api/agent/auth/claim \
  -H "Content-Type: application/json" \
  -d '{"email":"ox@agentagous.com","scope":"buyer:rw","agent_provider":"claude","agent_name":"Test"}'

# Operator gets OTP from email, then:
curl -X POST http://localhost:3000/api/agent/auth/claim/complete \
  -H "Content-Type: application/json" \
  -d '{"claim_token":"clm_...","otp_code":"123456"}'
```

---

## §F — Block 4: AgentCard metadata pointer

### F.1 — Pre-edit read
Already done in §A.1. AgentCard is built in `src/lib/agent-card/builder.ts`.

### F.2 — Add `shipstacked:agentAuth` to metadata

Find the `metadata` object in `src/lib/agent-card/builder.ts`. Add a single new key:

```ts
metadata: {
  // ... existing entries (shipstacked:cardKind, shipstacked:mcpEndpoint, shipstacked:beacons, etc.) ...
  'shipstacked:agentAuth': `${SITE}/auth.md`,
}
```

No other changes to the card.

### F.3 — Update `verify-agent-card.ts`

The verify script enforces metadata invariants. Add ONE new check:

```ts
// If shipstacked:agentAuth is present, it MUST be a string matching /auth.md$/
if (card.metadata['shipstacked:agentAuth'] !== undefined) {
  const v = card.metadata['shipstacked:agentAuth']
  if (typeof v !== 'string' || !/^https?:\/\/.+\/auth\.md$/.test(v)) {
    throw new Error(`shipstacked:agentAuth must be a URL ending in /auth.md, got: ${v}`)
  }
}
```

After Phase 3 ships, this becomes required (assert presence). For Phase 3 itself: presence is REQUIRED post-deploy. Add the assertion now:

```ts
if (!card.metadata['shipstacked:agentAuth']) {
  throw new Error('Card metadata must include shipstacked:agentAuth pointer to /auth.md')
}
if (!/^https?:\/\/.+\/auth\.md$/.test(card.metadata['shipstacked:agentAuth'])) {
  throw new Error('shipstacked:agentAuth must be a URL ending in /auth.md')
}
```

### F.4 — Validate

```bash
npx tsc --noEmit
node --experimental-strip-types scripts/v2/verify-agent-card.ts --base http://localhost:3000
```

Both exit 0. The card's structure is otherwise unchanged — brand-free, 8 fetch skills, data-publisher posture, all preserved.

---

## §G — Block 5: V1 API buyer endpoints

### G.1 — Extend `authenticateApiKey` (additive, backward-compatible)

In `src/lib/apiAuth.ts`:

**1. Extend the `api_keys` select to include `scope`:**

Find the existing select. Add `scope` to the column list. The query result type gains a `scope` field.

**2. Extend the `ApiAuthSuccess` shape additively — keep `profile`, `email`, `keyId` exactly as they are; add `scope`:**

```ts
export type ApiAuthSuccess = {
  ok: true
  auth: {
    profile: { id: string; user_id: string | null; username: string; ... }  // unchanged
    email: string | null   // unchanged
    keyId: number          // unchanged
    scope: 'builder:rw' | 'buyer:rw' | 'agent:rw'   // NEW
  }
}
```

All existing callers (`/api/v1/me`, `/profile`, `/builds`, `/avatar`) keep working unchanged. They just ignore the new `scope` field.

**3. Add `requireScope` helper:**

```ts
import { NextResponse } from 'next/server'

export function requireScope(
  auth: ApiAuthSuccess['auth'],
  allowed: ReadonlyArray<'builder:rw' | 'buyer:rw' | 'agent:rw'>
): NextResponse | null {
  if (!allowed.includes(auth.scope)) {
    return NextResponse.json(
      { error: `Insufficient scope. Required: ${allowed.join(' or ')}, got: ${auth.scope}` },
      { status: 403 }
    )
  }
  return null
}
```

Usage in any new V1 route:
```ts
const apiAuth = await authenticateApiKey(req)
if (!apiAuth.ok) return apiError(apiAuth.status, apiAuth.error)
const scopeErr = requireScope(apiAuth.auth, ['buyer:rw'])
if (scopeErr) return scopeErr
// ... proceed ...
```

### G.2 — `GET /api/v1/talent/search`

Path: `src/app/api/v1/talent/search/route.ts` (new).

Query params: `cluster`, `role` (comma-separated allowed), `shipped` (artifact tag), `limit` (default 20, max 100), `offset` (default 0).

```ts
import { authenticateApiKey, apiError, apiOk, requireScope } from '@/lib/apiAuth'
import { getRankedBuilders } from '@/lib/ranking/get-ranked-builders'
import { bucketsForEvents } from '@/lib/ranking/facets'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  const apiAuth = await authenticateApiKey(req)
  if (!apiAuth.ok) return apiError(apiAuth.status, apiAuth.error)
  const scopeErr = requireScope(apiAuth.auth, ['buyer:rw'])
  if (scopeErr) return scopeErr

  const url = new URL(req.url)
  const cluster = url.searchParams.get('cluster')?.trim() || null
  const rolesParam = url.searchParams.get('role')?.trim() || null
  const shipped = url.searchParams.get('shipped')?.trim() || null
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)

  const roles = rolesParam ? rolesParam.split(',').map(s => s.trim()).filter(Boolean) : null

  // Reuse the canonical ranking helper. Get a wide window, then filter.
  const { ranked } = await getRankedBuilders(limit * 4 + offset)

  // Apply filters in JS, mirroring /talent's facets.ts behavior.
  let filtered = ranked
  if (cluster) {
    filtered = filtered.filter(b => Array.isArray(b.atlasClusters) && b.atlasClusters.includes(cluster))
  }
  if (roles && roles.length > 0) {
    filtered = filtered.filter(b => {
      const builderRoles = [...(b.atlasRolesConfirmed ?? []), ...(b.atlasRolesInferred ?? [])]
      return roles.some(r => builderRoles.includes(r))
    })
  }
  if (shipped) {
    filtered = filtered.filter(b => {
      const buckets = bucketsForEvents(b.eventTypes ?? [])
      return buckets.includes(shipped)
    })
  }

  const total = filtered.length
  const page = filtered.slice(offset, offset + limit)

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Secondary aggregate query: per-builder L1 count, distinct hosts, last_shipped.
  // Batched by entity_id IN (...) to avoid N+1.
  const entityIds = page.map(b => b.entityId).filter((id): id is number => typeof id === 'number')
  let powByEntity: Record<number, { l1_receipts: number; distinct_hosts: number; last_shipped: string | null }> = {}
  if (entityIds.length > 0) {
    const { data: receipts } = await admin
      .from('proof_receipts')
      .select('subject_id, verification_level, artifacts, issued_at')
      .in('subject_id', entityIds)
      .eq('visibility', 'public')
    for (const eid of entityIds) {
      powByEntity[eid] = { l1_receipts: 0, distinct_hosts: 0, last_shipped: null }
    }
    const hostsByEntity: Record<number, Set<string>> = {}
    for (const r of (receipts || [])) {
      const eid = r.subject_id as number
      if (!powByEntity[eid]) continue
      if (r.verification_level === 'L1_artifact_confirmed') {
        powByEntity[eid].l1_receipts++
        const arts = Array.isArray(r.artifacts) ? r.artifacts : []
        const url0 = (arts[0]?.url as string | undefined)
        if (url0) {
          try {
            const host = new URL(url0).hostname
            if (!hostsByEntity[eid]) hostsByEntity[eid] = new Set()
            hostsByEntity[eid].add(host)
          } catch { /* skip */ }
        }
      }
      if (r.issued_at && (!powByEntity[eid].last_shipped || r.issued_at > powByEntity[eid].last_shipped!)) {
        powByEntity[eid].last_shipped = r.issued_at
      }
    }
    for (const eid of Object.keys(hostsByEntity)) {
      powByEntity[Number(eid)].distinct_hosts = hostsByEntity[Number(eid)].size
    }
  }

  return apiOk({
    results: page.map(b => ({
      username: b.username,
      full_name: b.full_name,
      role: b.role,
      location: b.location,
      atlas_clusters: b.atlasClusters ?? [],
      atlas_roles_confirmed: b.atlasRolesConfirmed ?? [],
      atlas_roles_inferred: b.atlasRolesInferred ?? [],
      proof_of_work: b.entityId ? powByEntity[b.entityId] : { l1_receipts: 0, distinct_hosts: 0, last_shipped: null },
      quality_score: b.quality_score,
      verified: b.verified,
      profile_url: `https://shipstacked.com/u/${b.username}`,
    })),
    total,
    limit,
    offset,
  })
}
```

Note: if `RankedBuilder` doesn't expose `atlasRolesConfirmed`/`atlasRolesInferred`/`entityId`, the wrapper may need a third query to join those. Terminal Claude should view `RankedBuilder` type definition during execution and adapt accordingly. The plan's intent is "ranked + filtered + per-builder PoW aggregates"; the exact join points depend on what `getRankedBuilders` already exposes.

### G.3 — `GET /api/v1/builders/[username]`

Path: `src/app/api/v1/builders/[username]/route.ts` (new).

Returns the same shape as `/api/v1/me` but for an arbitrary public profile. Visibility: only `published = true` profiles; 404 otherwise. Allowed scopes: `buyer:rw`, `builder:rw`, `agent:rw` (any authenticated agent can deep-fetch a public profile).

```ts
import { authenticateApiKey, apiError, apiOk, requireScope } from '@/lib/apiAuth'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const apiAuth = await authenticateApiKey(req)
  if (!apiAuth.ok) return apiError(apiAuth.status, apiAuth.error)
  const scopeErr = requireScope(apiAuth.auth, ['buyer:rw', 'builder:rw', 'agent:rw'])
  if (scopeErr) return scopeErr

  const { username } = await ctx.params
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: profile } = await admin
    .from('profiles')
    .select('id, user_id, username, full_name, role, bio, about, location, github_url, x_url, linkedin_url, website_url, verified, primary_profession, seniority, work_type, day_rate, timezone, languages, entity_id, published, avatar_url')
    .eq('username', username)
    .eq('published', true)
    .maybeSingle()
  if (!profile) return apiError(404, 'Builder not found or not published')

  // Skills, projects, recent receipts — same as /me but read-only.
  const [{ data: skills }, { data: projects }] = await Promise.all([
    admin.from('profile_skills').select('category, name').eq('profile_id', profile.id),
    admin.from('profile_projects').select('*').eq('profile_id', profile.id),
  ])

  let receipts: any[] = []
  if (profile.entity_id) {
    const { data } = await admin
      .from('proof_receipts')
      .select('slug, title, description, event_type, atlas_confirmed, atlas_inferred, verification_level, issued_at, artifacts')
      .eq('subject_id', profile.entity_id)
      .eq('visibility', 'public')
      .order('issued_at', { ascending: false })
      .limit(50)
    receipts = data ?? []
  }

  return apiOk({
    builder: {
      username: profile.username,
      full_name: profile.full_name,
      role: profile.role,
      bio: profile.bio,
      about: profile.about,
      location: profile.location,
      github_url: profile.github_url,
      x_url: profile.x_url,
      linkedin_url: profile.linkedin_url,
      website_url: profile.website_url,
      verified: profile.verified,
      primary_profession: profile.primary_profession,
      seniority: profile.seniority,
      work_type: profile.work_type,
      day_rate: profile.day_rate,
      timezone: profile.timezone,
      languages: profile.languages,
      avatar_url: profile.avatar_url,
      profile_url: `https://shipstacked.com/u/${profile.username}`,
      skills: skills ?? [],
      projects: projects ?? [],
      recent_receipts: receipts,
    },
  })
}
```

### G.4 — `GET /api/v1/messages` + `POST /api/v1/messages`

Path: `src/app/api/v1/messages/route.ts` (new). Sibling to existing cookie-session `/api/messages` (which stays unchanged).

**GET:** lists buyer's conversations (joined to builder profile + jobs). Requires `buyer:rw` scope.

**POST:** creates/appends a conversation. Input:
```json
{ "to_username": "alice", "body": "...", "job_id": null }
```

Reuses logic from `/api/messages` (per existing route — terminal Claude reads it during execution). Sender email comes from `apiAuth.auth.email`. Conversations link by `employer_email` + `builder_profile_id` per existing schema.

### G.5 — `POST /api/v1/jobs`

Path: `src/app/api/v1/jobs/route.ts` (new). Mirrors the existing dashboard job-post handler. Requires `buyer:rw`.

```json
{ "role_title": "...", "company_name": "...", "description": "...", "salary_range": "...", "remote": true, "location": "..." }
```

### G.6 — `GET /api/v1/saved-profiles` + `POST /api/v1/saved-profiles`

Path: `src/app/api/v1/saved-profiles/route.ts` (new).

**The `saved_profiles` table EXISTS already** per §A.6 with columns `id, employer_email, profile_id, created_at`. Reuse — DO NOT create.

**GET:** returns the buyer's saves joined to builder profile preview.
**POST:** `{ "builder_username": "alice", "action": "save" | "unsave" }`. Looks up `profiles.id` by username, inserts/deletes into `saved_profiles` keyed on `(employer_email, profile_id)`.

Requires `buyer:rw`.

### G.7 — `GET /api/v1/me/scope`

Path: `src/app/api/v1/me/scope/route.ts` (new).

```ts
import { authenticateApiKey, apiError, apiOk } from '@/lib/apiAuth'

const CAPABILITIES_BY_SCOPE: Record<string, { can: string[]; cannot: string[] }> = {
  'builder:rw': {
    can: ['fetch-own-profile', 'update-own-profile', 'post-build', 'fetch-own-builds', 'fetch-builder', 'fetch-atlas-role'],
    cannot: ['search-talent', 'post-message', 'post-job', 'save-profile'],
  },
  'buyer:rw': {
    can: ['search-talent', 'fetch-builder', 'fetch-atlas-role', 'post-message', 'fetch-messages', 'post-job', 'save-profile', 'fetch-saved-profiles'],
    cannot: ['post-build', 'update-arbitrary-profile'],
  },
  'agent:rw': {
    can: ['fetch-own-profile', 'update-own-profile', 'post-build', 'fetch-own-builds', 'fetch-builder', 'fetch-atlas-role', 'fetch-principal-profile'],
    cannot: ['search-talent', 'post-message', 'post-job', 'save-profile'],
  },
}

export async function GET(req: Request) {
  const apiAuth = await authenticateApiKey(req)
  if (!apiAuth.ok) return apiError(apiAuth.status, apiAuth.error)

  const caps = CAPABILITIES_BY_SCOPE[apiAuth.auth.scope] ?? { can: [], cannot: [] }

  return apiOk({
    scope: apiAuth.auth.scope,
    profile_username: apiAuth.auth.profile.username,
    key_id: apiAuth.auth.keyId,
    can: caps.can,
    cannot: caps.cannot,
  })
}
```

### G.8 — Validate

```bash
npx tsc --noEmit
npm run build
```

Manual smoke tests (against local dev with manually-generated keys):

```bash
KEY=sk_ss_...   # builder-scoped from /dashboard "Connect an agent"
curl -H "Authorization: Bearer $KEY" http://localhost:3000/api/v1/me/scope | jq
# Expect scope: "builder:rw"

curl -H "Authorization: Bearer $KEY" "http://localhost:3000/api/v1/talent/search?limit=5" | jq
# Expect 403 — builder scope can't search talent.

BUYER_KEY=sk_ss_...   # buyer-scoped, manually generated
curl -H "Authorization: Bearer $BUYER_KEY" "http://localhost:3000/api/v1/talent/search?limit=5" | jq
# Expect 200 with results array.
```

---

## §H — Block 6: ConnectAnAgent UI

### H.1 — Pre-edit reads
- `src/app/dashboard/AgentOnboarding.tsx` (§A.5)
- `src/app/hirer/HirerDashboardClient.tsx` (§A.8)

### H.2 — Generalize `<ConnectAnAgent>` shared component

Path: `src/app/components/ConnectAnAgent.tsx` (new).

```tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import posthog from 'posthog-js'

type Scope = 'builder:rw' | 'buyer:rw'
type Variant = 'solo_dashboard' | 'buyer_dashboard' | 'team_dashboard'

const SYSTEM_PROMPT_BY_SCOPE: Record<Scope, (ctx: { email: string; username?: string }) => string> = {
  'builder:rw': ({ username }) => `You are an AI agent managing the ShipStacked profile ${username ?? '<username>'}.

Authoritative endpoints (Authorization: Bearer <api_key>):
- GET https://shipstacked.com/api/v1/me — fetch current profile state
- PATCH https://shipstacked.com/api/v1/profile — update profile fields
- POST https://shipstacked.com/api/v1/builds — post a shipped build
- GET https://shipstacked.com/api/v1/builds — list recent posts

Your job:
1. Keep the profile current (bio, skills, projects, location).
2. Post builds as they ship. Always include "outcome" and "url" so the build can be verified.
3. Monitor messages and draft replies for review (operator triggers send).

Do not modify the operator's email or password. Do not post elsewhere unless instructed.

Machine-readable capability map: https://shipstacked.com/.well-known/agent-card.json
Auth surface: https://shipstacked.com/auth.md
`,

  'buyer:rw': ({ email }) => `You are an AI agent helping ${email} hire AI-native builders on ShipStacked.

Authoritative endpoints (Authorization: Bearer <api_key>):
- GET https://shipstacked.com/api/v1/talent/search?cluster=X&role=Y&shipped=Z — query ranked builders
- GET https://shipstacked.com/api/v1/builders/<username> — deep-fetch a candidate
- POST https://shipstacked.com/api/v1/messages — message a builder
- POST https://shipstacked.com/api/v1/jobs — post a job
- POST https://shipstacked.com/api/v1/saved-profiles — shortlist a candidate
- GET https://shipstacked.com/api/v1/saved-profiles — review shortlist

Your job:
1. Given hiring criteria, search for matching builders.
2. For each promising candidate, deep-fetch the profile + receipts. Evaluate fit.
3. Build a shortlist via /saved-profiles.
4. Draft outreach messages for review before sending.

Atlas role taxonomy: prefix-letter (A/B/S/...) + digit. See https://shipstacked.com/api/v1/atlas/roles.

Machine-readable capability map: https://shipstacked.com/.well-known/agent-card.json
Auth surface: https://shipstacked.com/auth.md
`,
}

type Props = { scope: Scope; variant: Variant; email: string; username?: string }

type KeyRow = { id: number; key_prefix: string; name: string; scope: string; created_at: string }

export default function ConnectAnAgent({ scope, variant, email, username }: Props) {
  const [keys, setKeys] = useState<KeyRow[]>([])
  const [generating, setGenerating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [justGenerated, setJustGenerated] = useState<{ raw: string; hint: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('api_keys')
          .select('id, key_prefix, name, scope, created_at')
          .eq('email', email)
          .eq('scope', scope)
          .order('created_at', { ascending: false })
        setKeys(data ?? [])
      } finally {
        setLoading(false)
      }
    })()
  }, [email, scope])

  const generateKey = async () => {
    if (generating) return
    setGenerating(true)
    try {
      posthog.capture('api_key_generated', { source: variant, scope })
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName || 'Connected agent', scope }),
      })
      const data = await res.json()
      if (data?.key) {
        setJustGenerated({ raw: data.key, hint: data.key.slice(0, 11) + '…' })
        setKeys(prev => [{ id: data.id, key_prefix: data.key.slice(0, 11), name: newKeyName || 'Connected agent', scope, created_at: new Date().toISOString() }, ...prev])
        setNewKeyName('')
      }
    } finally {
      setGenerating(false)
    }
  }

  const systemPrompt = SYSTEM_PROMPT_BY_SCOPE[scope]({ email, username })
  const isCard = variant !== 'solo_dashboard'  // solo dashboard uses inline; others use card chrome

  // ... render the component with three subsections:
  // 1. "Connect via auth.md" — describes the open flow + shows a config URL
  // 2. "Generate API key manually" — input + button + just-generated key display
  // 3. "Existing keys" — list with prefix/name/created/revoke
  // (Full JSX omitted here; terminal Claude implements based on AgentOnboarding's existing style.)

  return (
    <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem' }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Connect an Agent</p>
      <p style={{ fontSize: 14, color: '#1d1d1f', marginBottom: '1rem', lineHeight: 1.5 }}>
        Let an AI agent {scope === 'builder:rw' ? 'manage your profile and post builds' : 'search talent, message builders, and post jobs'} on your behalf.
      </p>

      <details style={{ marginBottom: '1rem' }}>
        <summary style={{ fontSize: 13, fontWeight: 600, color: '#0071e3', cursor: 'pointer' }}>Option 1: Connect via auth.md (recommended)</summary>
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f5f5f7', borderRadius: 8, fontSize: 12, fontFamily: 'monospace' }}>
          Point your agent at: <code>https://shipstacked.com/auth.md</code><br />
          OAuth metadata: <code>https://shipstacked.com/.well-known/oauth-authorization-server</code><br />
          Requested scope: <code>{scope}</code>
        </div>
        <p style={{ fontSize: 11, color: '#6e6e73', marginTop: '0.5rem' }}>The agent will trigger an OTP code sent to {email}. You confirm; it gets a scoped key automatically.</p>
      </details>

      <details>
        <summary style={{ fontSize: 13, fontWeight: 600, color: '#0071e3', cursor: 'pointer' }}>Option 2: Generate a key manually</summary>
        <div style={{ marginTop: '0.75rem' }}>
          <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Key name (e.g. 'Claude assistant')" style={{ width: '100%', padding: '0.5rem', border: '1px solid #d2d2d7', borderRadius: 8, fontSize: 13, marginBottom: '0.5rem' }} />
          <button onClick={generateKey} disabled={generating} style={{ fontSize: 13, padding: '0.5rem 1rem', background: generating ? '#aeaeb2' : '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer' }}>
            {generating ? 'Generating…' : 'Generate key'}
          </button>
          {justGenerated && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#fff8e1', border: '1px solid #ffc107', borderRadius: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 600, marginBottom: '0.25rem' }}>Copy this key now — it won't be shown again:</p>
              <code style={{ fontSize: 11, wordBreak: 'break-all' }}>{justGenerated.raw}</code>
            </div>
          )}
        </div>
      </details>

      {keys.length > 0 && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid #e0e0e5', paddingTop: '1rem' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Active keys</p>
          {keys.map(k => (
            <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f5f5f7' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#1d1d1f' }}>{k.name}</p>
                <p style={{ fontSize: 11, color: '#6e6e73' }}>{k.key_prefix}… · {k.scope} · created {new Date(k.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <details style={{ marginTop: '1rem' }}>
        <summary style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', cursor: 'pointer' }}>System prompt template for your agent</summary>
        <pre style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#1d1d1f', color: '#f0f0f5', borderRadius: 8, fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>{systemPrompt}</pre>
      </details>
    </div>
  )
}
```

Note: `/api/keys` (existing) must be extended to accept a `scope` parameter in the request body. Phase 1 codebase read mentioned `/api/keys` exists for Card-3 onboarding; terminal Claude reads it during execution and threads the `scope` parameter through. The existing default stays `builder:rw` to preserve Card-3 behavior unless caller specifies otherwise.

### H.3 — Place on dashboards

**Solo builder dashboard** (`src/app/dashboard/BuilderDashboardClient.tsx`):

Replace the existing `<AgentOnboarding>` render (if it's rendered) with `<ConnectAnAgent scope="builder:rw" variant="solo_dashboard" email={email} username={profile.username} />`. If `AgentOnboarding` is still used elsewhere (e.g., Card-3 signup flow at `/dashboard?agent=1`), leave that path untouched.

**Buyer dashboard** (`src/app/hirer/HirerDashboardClient.tsx`):

Add `<ConnectAnAgent scope="buyer:rw" variant="buyer_dashboard" email={email} />` after the jobs section. Terminal Claude views the file and picks the natural slot.

### H.4 — Validate

```bash
npx tsc --noEmit
npm run build
```

Manual: log in to `/dashboard` as a builder → see "Connect an Agent" card with `builder:rw` system prompt. Log in to `/hirer` as a buyer → see "Connect an Agent" card with `buyer:rw` system prompt.

---

## §I — Block 7: Copy + content

### I.1 — `/api-docs` extension

Existing `/api-docs` page documents `/api/v1/me`, `/api/v1/profile`, `/api/v1/builds`. Add the new endpoints with auth.md callout at top of page.

Suggested structure:
- Section: "Auth surface" — points at `/auth.md`, OAuth metadata endpoints.
- Section: "Builder endpoints" (builder:rw) — existing.
- Section: "Buyer endpoints" (buyer:rw) — new: talent/search, builders/<username>, messages, jobs, saved-profiles.
- Section: "Universal endpoints" — me/scope.

### I.2 — Homepage agent-native callout

Add a section (or modify existing copy) on homepage about open agent addressability:

> **Open to any AI agent.**
> ShipStacked publishes an `auth.md`. Your agent — Claude, Cursor, ChatGPT, or custom — can register on your behalf and act through standard endpoints. No bespoke integrations. No vendor lock.

Operator approves final wording at execution time.

### I.3 — `/join` Card 3 copy update

Card 3 (Autonomous Agent) currently has the Phase-1-honest interim copy. Update to reflect the open-protocol play:

> "API-keyed agent identity. Register via the open auth.md protocol or generate keys directly. Post builds, manage your profile, integrate into any agent platform — Claude, Cursor, ChatGPT, custom."

### I.4 — Validate
Visual local check. No tsc gate.

---

## §J — Block 8: Final validation

### J.1 — Gates

```bash
npx tsc --noEmit
npm run build
grep -rni "velocity" src/ --include="*.ts" --include="*.tsx"
node --experimental-strip-types scripts/v2/verify-agent-card.ts --base http://localhost:3000
```

All four exit 0.

### J.2 — Endpoint smoke tests (local)

```bash
# Discovery endpoints (no auth)
curl -s http://localhost:3000/.well-known/oauth-protected-resource | jq
curl -s http://localhost:3000/.well-known/oauth-authorization-server | jq
curl -s http://localhost:3000/auth.md
curl -s http://localhost:3000/.well-known/agent-card.json | jq '.metadata."shipstacked:agentAuth"'
# Expect: "https://shipstacked.com/auth.md" (or http localhost equivalent)

# Manual key path
# 1. Log in to /dashboard
# 2. Click "Connect an Agent" → "Generate key manually"
# 3. Copy key

KEY=sk_ss_...
curl -s -H "Authorization: Bearer $KEY" http://localhost:3000/api/v1/me/scope | jq
# Expect: {"scope":"builder:rw","can":[...],"cannot":[...]}

# Scope-deny test
curl -s -H "Authorization: Bearer $KEY" "http://localhost:3000/api/v1/talent/search?limit=5"
# Expect: {"error":"Insufficient scope. Required: buyer:rw..."}
```

### J.3 — Auth.md OTP flow smoke test (local — operator participates)

```bash
curl -s -X POST http://localhost:3000/api/agent/auth/claim \
  -H "Content-Type: application/json" \
  -d '{"email":"ox@agentagous.com","scope":"buyer:rw","agent_provider":"claude","agent_name":"Phase 3 smoke"}' | jq

# Operator gets OTP from email inbox.
# Operator pastes claim_token and otp_code:
CLAIM_TOKEN=clm_...
OTP=123456

curl -s -X POST http://localhost:3000/api/agent/auth/claim/complete \
  -H "Content-Type: application/json" \
  -d "{\"claim_token\":\"$CLAIM_TOKEN\",\"otp_code\":\"$OTP\"}" | jq

# Use returned key:
BUYER_KEY=sk_ss_...
curl -s -H "Authorization: Bearer $BUYER_KEY" http://localhost:3000/api/v1/me/scope | jq
# Expect: {"scope":"buyer:rw",...}

curl -s -H "Authorization: Bearer $BUYER_KEY" "http://localhost:3000/api/v1/talent/search?limit=3" | jq
# Expect: results array with ranked builders.
```

If operator can't run the OTP test locally (no Resend in dev), this defers to post-deploy smoke test on prod. Record as deferred verification in `docs/decisions/RESUME_HERE.md`.

### J.4 — Report

Same template as prior phases:
- tsc exit code
- build exit code
- grep -rni velocity (full output)
- verify-agent-card.ts exit code
- git status --short
- git diff --stat
- Smoke test outputs (J.2 + J.3 if run)

Stop. Operator approves, then ship.

---

## §K — Block 9: Ship

### K.1 — Commit

```
git add -A src/

git commit -m "Phase 3: agent-native foundation

Two-surface architecture:
- Public data surface (no auth): /.well-known/agent-card.json + /api/mcp stay
  read-only Posture-α with brand-free data-publisher posture. Single additive
  AgentCard metadata field 'shipstacked:agentAuth' points at /auth.md.
- Action surface (bearer key + scope): /auth.md open protocol + /api/v1/*
  authenticated endpoints with scope model.

Shipped:
- auth.md user-claimed OTP flow:
  - /.well-known/oauth-protected-resource (RFC 9728 PRM)
  - /.well-known/oauth-authorization-server (with agent_auth block)
  - /auth.md (Markdown prose)
  - POST /api/agent/auth/claim — trigger OTP email
  - POST /api/agent/auth/claim/complete — exchange OTP for scoped API key
- V1 API buyer endpoints (all gated buyer:rw):
  - GET /api/v1/talent/search (Formula E ranked)
  - GET /api/v1/builders/<username>
  - GET/POST /api/v1/messages
  - POST /api/v1/jobs
  - GET/POST /api/v1/saved-profiles (reuses existing table)
- GET /api/v1/me/scope (any scope) — machine-readable capability map
- API key scope model: builder:rw, buyer:rw, agent:rw via additive api_keys.scope column
- authenticateApiKey returns scope alongside existing fields (backward-compatible)
- requireScope helper for 403 enforcement
- <ConnectAnAgent> shared component (Solo + Buyer dashboards)
  - System-prompt templates per scope
  - Two paths: auth.md (recommended) + manual key gen
- /api/keys extended to accept scope parameter
- /api-docs catalog extended with new endpoints
- Card 3 copy updated to reflect open-protocol play

DDL:
- New agent_registrations table (OTP claim tokens, 24h TTL)
- api_keys.scope column added (default 'builder:rw' backfill)
- saved_profiles table REUSED (already existed)

Did NOT change:
- AgentCard structural shape — stays A2A v1.0 data-publisher with 8 read-only
  fetch skills and brand-free invariant (one metadata field added).
- MCP server — stays Posture-α read-only public-data.
- verify-agent-card.ts now also asserts presence of metadata.shipstacked:agentAuth.

Discovery + diff plan: docs/audit/PHASE3_AGENT_NATIVE_R1.md (untracked
working tree; Phase 7 commits)."

git push origin main
```

### K.2 — Post-push verification

```bash
node --experimental-strip-types scripts/v2/verify-agent-card.ts --base https://shipstacked.com
```

Exit 0.

After Vercel deploy:

```bash
curl -s https://shipstacked.com/.well-known/oauth-protected-resource | jq
curl -s https://shipstacked.com/.well-known/oauth-authorization-server | jq
curl -s https://shipstacked.com/auth.md
curl -s https://shipstacked.com/.well-known/agent-card.json | jq '.metadata."shipstacked:agentAuth"'
```

All return 200 with expected content.

### K.3 — Outstanding verifications (operator manual, deferred)

- End-to-end auth.md OTP flow with real agent
- Buyer-key smoke: search talent → deep-fetch → draft message → post job
- Builder-key 403 on buyer endpoints
- Solo + Buyer dashboard UI for `<ConnectAnAgent>`

Record alongside Phase 1 + 2 outstanding items in `docs/decisions/RESUME_HERE.md`.

---

## §L — Decisions locked (2026-05-26, R1)

- AgentCard structure preserved (A2A v1.0, brand-free, read-only data-publisher). One additive `metadata['shipstacked:agentAuth']` pointer to `/auth.md` only.
- MCP server preserved as Posture-α read-only (no write tools).
- Auth.md user-claimed OTP flow ships in Phase 3.
- Auth.md agent-verified ID-JAG flow deferred to Phase 8.
- `api_keys.scope` column added (additive, default `builder:rw` backfill).
- `authenticateApiKey` extended additively (existing callers unchanged).
- `saved_profiles` table reused (already exists).
- `agent_registrations` table created.
- `<ConnectAnAgent>` shared component on Solo + Buyer dashboards; two paths offered.
- Phase 4 (Team) inherits everything — team API keys, team-scoped V1 endpoints free once team schema lands.

## §M — Deferred (later phases)

- Auth.md agent-verified ID-JAG flow (Phase 8)
- OAuth DCR + signed Agent Cards (Phase 8)
- A2A peer-to-peer agent delegation (Phase 8)
- AP2 (Universal Commerce Protocol) hire confirmations (Phase 9+)
- Team-scoped API keys + team-agent management (Phase 4)
- Agent_profiles + principal_entity_id (Phase 5)
- Atlas wiring proper (Phase 6)
- MCP write tools — explicitly out of scope; the architectural posture is "MCP for public read, REST API for authenticated writes." Reconsider only if A2A defines a write-tools-in-MCP pattern that becomes industry-standard.

End of Phase 3 R1 doc.
