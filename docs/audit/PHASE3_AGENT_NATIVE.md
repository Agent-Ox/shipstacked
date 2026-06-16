# Phase 3 — Agent-Native Foundation

**Discovery + execution diff plan in one doc.** For architect-Claude review (this draft), then terminal Claude execution.

**Locked by operator on 2026-05-26 after research pass:**
- Adopt WorkOS `auth.md` open protocol for agent registration (user-claimed OTP path in v1; agent-verified ID-JAG deferred to Phase 8).
- Crosswalk `/.well-known/agent-card.json` to A2A v1.0 `AgentCard` schema.
- OAuth DCR upgrade for write-tool auth deferred to Phase 8; v1 stays on bearer `sk_ss_` API keys.
- Position against Leonar/Draup via three differentiators: receipt-verified work (not claimed profiles), open-protocol addressability (not vendor-locked), active-intent supply (not scraped passives).

**Phase 3's job:** make ShipStacked addressable from any agent — Claude, Cursor, ChatGPT, custom — without bespoke integrations. Every customer type gets an agent gateway. Buyer-side gets the closest-to-revenue agent surface (talent search, message, evaluate).

**Scope estimate:** ~12-16 hours of focused work across 3-4 sessions. Largest phase by surface area shipped.

**Files touched (estimated count):**
- NEW: 6-8 files (`/auth.md` page, `/api/agent/auth/*` routes, `/api/v1/talent/search`, `/api/v1/builders/[username]`, `/api/v1/messages`, `/api/v1/jobs`, `/api/v1/saved-profiles`, dashboard "Connect an agent" sections)
- Modified: 8-10 files (existing AgentCard, MCP server, `authenticateApiKey`, dashboards, AgentOnboarding)
- DDL: 1 new table (`agent_registrations`), 1 column add (`api_keys.scope`)

---

## §A — Pre-flight reads required before any code

Terminal Claude executes these reads BEFORE any block. Stop on any FROM-string mismatch or unexpected file content.

1. **Current AgentCard structure** — paste verbatim `src/app/.well-known/agent-card.json/route.ts` or wherever the AgentCard route lives. The codebase read mentioned it; need exact content to crosswalk.
2. **Current MCP server tools** — paste verbatim `src/app/api/mcp/route.ts` (read-only tools today: `get-builder`, `get-atlas-role`, `get-collection`). Need to extend with write tools.
3. **`authenticateApiKey` current contract** — paste verbatim `src/lib/apiAuth.ts`. The discriminated union `ApiAuthResult` needs extension for scopes.
4. **Existing `/api/v1/*` route shapes** — paste verbatim:
   - `src/app/api/v1/me/route.ts`
   - `src/app/api/v1/profile/route.ts`
   - `src/app/api/v1/builds/route.ts`
   New routes follow the same shape.
5. **AgentOnboarding component** — paste verbatim `src/app/dashboard/AgentOnboarding.tsx`. Phase 3 generalizes this into a shared `<ConnectAnAgent>` component placed on Solo + Buyer + future Team dashboards.
6. **`api_keys` table schema** — terminal Claude runs:
   ```
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'api_keys'
   ORDER BY ordinal_position;
   ```
   Confirm: does `api_keys.scope` exist already, or do we add it?
7. **AGENTS.md research** — terminal Claude does one web_search for `"AGENTS.md" Linux Foundation Agentic AI Foundation 2026` and reports findings. Decide whether to publish an AGENTS.md alongside agent-card.json. Probably yes — it's the third LF agent metadata standard (alongside MCP and A2A).
8. **Hirer dashboard** — paste verbatim `src/app/hirer/HirerDashboardClient.tsx` lines 1-100 (imports + main render). Need to identify the slot for `<ConnectAnAgent>` placement on the buyer dashboard.
9. **Talent directory query** — paste verbatim `src/app/talent/page.tsx` ranking + filter logic. `/api/v1/talent/search` needs to mirror the same Formula E ranking and not invent a new one.

After all 9 reads, proceed. **Stop and report if anything is materially different from what this doc assumes.**

---

## §B — Architecture overview

### B.1 — The four registration paths

After Phase 3, four ways exist to put an entity into ShipStacked:

1. **Manual signup (existing).** Human visits `/join`, picks Card 1/2/3/4. UX stays. Card 2 (Team) still ships unchanged in this phase — Phase 4 builds team flow proper.
2. **Auth.md user-claimed (new in Phase 3).** Agent POSTs to `/api/agent/auth/claim` with the user's email + agent's scope request. ShipStacked emails a 6-digit OTP to the user. Agent submits the OTP via `/api/agent/auth/claim/complete`. ShipStacked mints an `auth.users` row (if email is new) + a `kind='human'` entity + an `api_keys` row scoped to the agent's grants. Returns the API key to the agent.
3. **Auth.md agent-verified (Phase 8 — NOT in Phase 3).** Trusted-provider ID-JAG flow. Defer.
4. **Operator-generated key (existing AgentOnboarding flow).** Solo/Card-3 path stays. Slot for it on Solo + Buyer dashboards is widened in Phase 3.

### B.2 — The agent's view of ShipStacked after Phase 3

Once registered, an agent (regardless of registration path) authenticates via `Authorization: Bearer sk_ss_*` and has access to:

**MCP server (extended) at `/api/mcp`:**
- Read tools (existing): `get-builder`, `get-atlas-role`, `get-collection`
- Read tools (new): `search-talent`, `get-conversations`, `get-saved-profiles`
- Write tools (new): `post-message`, `post-job`, `save-profile`
- All gated by API key scope (buyer keys can write messages/jobs/saves; builder keys can only read).

**V1 REST API at `/api/v1`:**

Builder-scoped (existing):
- `GET /me`, `PATCH /profile`, `POST /builds`, `GET /builds`, `POST /avatar`

Buyer-scoped (new in Phase 3):
- `GET /talent/search?cluster=X&shipped=Y&limit=N` — Formula E ranked builders, filterable
- `GET /builders/<username>` — deep-fetch builder profile + receipts + atlas roles
- `GET /messages` — list buyer's conversations
- `POST /messages` — send message to a builder (or follow up in existing conversation)
- `GET /jobs` — list buyer's posted jobs
- `POST /jobs` — post a new job
- `GET /saved-profiles` / `POST /saved-profiles` — manage shortlist

Universal (new):
- `GET /me/scope` — what this key can do (machine-readable scope description)

### B.3 — Auth.md endpoints

Per WorkOS spec:
- `GET /.well-known/oauth-protected-resource` — PRM document, points at `auth.md`
- `GET /.well-known/oauth-authorization-server` — AS metadata with `agent_auth` block
- `GET /auth.md` — Markdown prose summary for human-readable agent onboarding
- `POST /api/agent/auth/claim` — trigger OTP email, return claim token
- `POST /api/agent/auth/claim/complete` — submit OTP + claim token, return API key

### B.4 — A2A AgentCard crosswalk

Current AgentCard (per codebase read, shape TBD on §A.1):
```json
{ "skills": [{"id":"fetch-builder-profile","name":"...","description":"...","example":"..."}], ... }
```

Target A2A v1.0 schema:
```json
{
  "name": "ShipStacked",
  "description": "...",
  "version": "0.3.0",
  "supported_interfaces": [
    {"protocol_binding": "REST", "url": "https://shipstacked.com/api/v1"},
    {"protocol_binding": "MCP", "url": "https://shipstacked.com/api/mcp"}
  ],
  "capabilities": { "streaming": false, "extended_agent_card": false },
  "default_input_modes": ["application/json"],
  "default_output_modes": ["application/json"],
  "skills": [ /* existing skills, restructured to A2A's AgentSkill shape */ ],
  "icon_url": "https://shipstacked.com/icon.png"
}
```

**Crosswalk task:** map existing skill objects to A2A's `AgentSkill` schema (`id`, `name`, `description`, `tags`, `examples`, `input_modes`, `output_modes`, `security_requirements`). Add `supported_interfaces`, `capabilities`, `default_input_modes`, `default_output_modes` at root.

### B.5 — Scope model

`api_keys.scope` (new column, default `'builder:rw'`):

| Scope value | Read | Write | Holder |
|---|---|---|---|
| `builder:rw` | own profile, own builds, own messages | own profile, own builds, own messages | Solo/Card-1 owner OR their agent |
| `buyer:rw` | talent search, builder profiles, own messages, own jobs, own saves | own messages, own jobs, own saves | Buyer owner OR their agent |
| `agent:rw` | own profile, own builds, principal's profile (read-only) | own profile, own builds | Card-3 agent (existing path) |
| `team:rw` | (Phase 4) | (Phase 4) | (Phase 4) |

`authenticateApiKey` extended to return scope alongside profile. Each `/api/v1/*` endpoint declares which scope it requires. Mismatch → 403.

### B.6 — DDL

```sql
-- New table: agent_registrations
CREATE TABLE public.agent_registrations (
  id BIGSERIAL PRIMARY KEY,
  claim_token_hash TEXT NOT NULL UNIQUE,       -- SHA-256 of clm_ + 25-char base62
  email TEXT NOT NULL,                          -- target user's email
  requested_scope TEXT NOT NULL,                -- 'builder:rw' | 'buyer:rw' | etc.
  agent_provider TEXT NULL,                     -- 'anthropic' | 'openai' | 'cursor' | self-reported
  agent_name TEXT NULL,                         -- agent's self-description
  otp_code_hash TEXT NULL,                      -- SHA-256 of the 6-digit OTP
  otp_sent_at TIMESTAMPTZ NULL,
  otp_attempts INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',       -- 'pending' | 'completed' | 'expired' | 'failed'
  api_key_id BIGINT NULL REFERENCES public.api_keys(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_agent_registrations_email ON public.agent_registrations(email);
CREATE INDEX idx_agent_registrations_expires ON public.agent_registrations(expires_at) WHERE status = 'pending';

-- Column add to api_keys (conditional on §A.6 read showing it doesn't exist)
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'builder:rw';

CREATE INDEX IF NOT EXISTS idx_api_keys_scope ON public.api_keys(scope);
```

Operator-paste via Dashboard SQL Editor. Reversal: `DROP TABLE agent_registrations; ALTER TABLE api_keys DROP COLUMN scope;`.

---

## §C — Block 1: Auth.md endpoints

### C.1 — Pre-edit reads
Already covered in §A.

### C.2 — Create `/.well-known/oauth-protected-resource`

Path: `src/app/.well-known/oauth-protected-resource/route.ts` (new file).

```ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    resource: 'https://shipstacked.com/api/v1/',
    resource_name: 'ShipStacked',
    resource_logo_uri: 'https://shipstacked.com/icon.png',
    authorization_servers: ['https://shipstacked.com/'],
    scopes_supported: ['builder:rw', 'buyer:rw', 'agent:rw'],
    bearer_methods_supported: ['header'],
  }, {
    headers: { 'Cache-Control': 'public, max-age=300' },
  })
}
```

### C.3 — Create `/.well-known/oauth-authorization-server`

Path: `src/app/.well-known/oauth-authorization-server/route.ts` (new file).

```ts
import { NextResponse } from 'next/server'

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'
  return NextResponse.json({
    issuer: siteUrl,
    // Standard OAuth fields, mostly empty since we don't do full OAuth in Phase 3:
    authorization_endpoint: `${siteUrl}/login`,
    token_endpoint: `${siteUrl}/api/agent/auth/claim/complete`,
    // The auth.md agent_auth block:
    agent_auth: {
      auth_md_uri: `${siteUrl}/auth.md`,
      flows_supported: ['user_claimed'],
      // 'agent_verified' deferred to Phase 8.
      claim_endpoint: `${siteUrl}/api/agent/auth/claim`,
      claim_complete_endpoint: `${siteUrl}/api/agent/auth/claim/complete`,
      scopes_supported: ['builder:rw', 'buyer:rw'],
      claim_token_ttl_seconds: 86400,  // 24h
      otp_length: 6,
      otp_ttl_seconds: 600,             // 10min
    },
  }, {
    headers: { 'Cache-Control': 'public, max-age=300' },
  })
}
```

### C.4 — Create `/auth.md`

Path: `src/app/auth.md/route.ts` (new file). Returns Markdown content with `Content-Type: text/markdown`.

```ts
import { NextResponse } from 'next/server'

const AUTH_MD = `# ShipStacked Agent Registration

ShipStacked supports the [auth.md](https://workos.com/auth-md) open protocol for agent registration. Any AI agent — Claude, Cursor, ChatGPT, or custom — can register on behalf of a user without a browser-based signup form.

## Flow: User Claimed (OTP)

The agent POSTs to \`/api/agent/auth/claim\` with the user's email and desired scope. ShipStacked emails the user a 6-digit code. The agent prompts the user for the code, then POSTs it back via \`/api/agent/auth/claim/complete\`. The agent receives a scoped API key.

### Endpoints

- \`POST /api/agent/auth/claim\` — trigger OTP email, return claim_token
- \`POST /api/agent/auth/claim/complete\` — submit OTP + claim_token, return api_key

### Scopes

- \`builder:rw\` — manage own builder profile, post builds, read/write own messages
- \`buyer:rw\` — search talent, message builders, post jobs, manage shortlist

## Discovery

Machine-readable metadata at:
- \`/.well-known/oauth-protected-resource\` (RFC 9728 PRM)
- \`/.well-known/oauth-authorization-server\` (with \`agent_auth\` block)
- \`/.well-known/agent-card.json\` (A2A v1.0 AgentCard)

## Trust model

API keys are scoped, expirable, revocable. The user can revoke at any time from their dashboard. Keys are presented as \`Authorization: Bearer sk_ss_*\` headers.

## OAuth DCR upgrade

Bearer API keys are the v1 mechanism. OAuth Dynamic Client Registration upgrade is on the roadmap (post-launch).

## Agent Verified flow

The ID-JAG-based agent-verified flow (trusted-provider attestation) is on the roadmap. v1 ships user-claimed OTP only.

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

### C.5 — Validate
```
npx tsc --noEmit
curl http://localhost:3000/.well-known/oauth-protected-resource
curl http://localhost:3000/.well-known/oauth-authorization-server
curl http://localhost:3000/auth.md
```
All three return 200 with expected JSON/Markdown. tsc exit 0.

---

## §D — Block 2: DDL

### D.1 — Operator-paste SQL

```sql
BEGIN;

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

-- Conditional: only run if §A.6 confirms api_keys.scope does NOT exist
ALTER TABLE public.api_keys ADD COLUMN scope TEXT NOT NULL DEFAULT 'builder:rw';
CREATE INDEX idx_api_keys_scope ON public.api_keys(scope);

-- Backfill: existing keys get builder:rw by default. Agent-flow keys (those with agent_provider set elsewhere) get re-scoped manually if needed.

COMMIT;
```

### D.2 — Verification

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'agent_registrations'
ORDER BY ordinal_position;

SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'api_keys' AND column_name = 'scope';

SELECT COUNT(*) FROM public.api_keys WHERE scope = 'builder:rw';
```

Expected: `agent_registrations` shows 13 columns; `api_keys.scope` exists; backfill count matches `SELECT COUNT(*) FROM api_keys`.

### D.3 — Reversal

```sql
BEGIN;
DROP TABLE IF EXISTS public.agent_registrations;
ALTER TABLE public.api_keys DROP COLUMN IF EXISTS scope;
COMMIT;
```

---

## §E — Block 3: Auth.md OTP flow API

### E.1 — Create `POST /api/agent/auth/claim`

Path: `src/app/api/agent/auth/claim/route.ts` (new).

Inputs (JSON body):
```json
{
  "email": "user@example.com",
  "scope": "builder:rw" | "buyer:rw",
  "agent_provider": "anthropic" | "openai" | "cursor" | "custom",
  "agent_name": "My Builder Assistant"
}
```

Outputs (200):
```json
{
  "claim_token": "clm_<25-char base62>",
  "expires_at": "2026-05-27T15:00:00Z",
  "otp_sent_to_email": true,
  "next_endpoint": "/api/agent/auth/claim/complete"
}
```

Errors:
- 400 if email/scope missing or scope invalid
- 429 if rate-limit hit (>3 claims/hour per email)

Implementation outline:
```ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'node:crypto'
import { Resend } from 'resend'  // existing dep per codebase read

const SCOPES_ALLOWED = ['builder:rw', 'buyer:rw'] as const

function generateClaimToken(): string {
  // clm_ + 25 chars base62
  const bytes = randomBytes(20)
  const base62 = bytes.toString('base64url').replace(/[-_]/g, '').slice(0, 25)
  return `clm_${base62}`
}

function generateOtp(): string {
  // 6-digit numeric
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

  // Rate-limit: max 3 pending claims per email per hour
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

  // Send OTP email via Resend (existing infra per codebase read)
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

### E.2 — Create `POST /api/agent/auth/claim/complete`

Path: `src/app/api/agent/auth/claim/complete/route.ts` (new).

Inputs (JSON body):
```json
{
  "claim_token": "clm_...",
  "otp_code": "123456"
}
```

Outputs (200):
```json
{
  "api_key": "sk_ss_...",
  "scope": "builder:rw",
  "key_id": 42,
  "key_hint": "sk_ss_abcd...wxyz",
  "expires_at": null
}
```

Errors:
- 400 if claim_token or otp_code missing
- 404 if claim_token not found
- 410 if registration expired or otp_attempts >= 5
- 401 if OTP doesn't match
- 500 on internal failures (e.g. entity creation)

Implementation outline:
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

  // OTP correct. Now mint or look up the auth user, entity, and API key.
  // Step 1: ensure auth.users row exists for this email.
  const { data: userByEmail } = await admin.auth.admin.listUsers()
  let authUser = userByEmail?.users.find(u => u.email === reg.email)
  if (!authUser) {
    // Create new auth user with no password; user must sign in via magic link later if they want manual access.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: reg.email,
      email_confirm: true,  // skip email-confirm since we just confirmed via OTP
      user_metadata: { created_via: 'agent_registration', agent_provider: reg.agent_provider },
    })
    if (createErr || !created.user) {
      return NextResponse.json({ error: `Auth user creation failed: ${createErr?.message}` }, { status: 500 })
    }
    authUser = created.user
  }

  // Step 2: ensure entity exists for this user.
  try {
    await findOrCreateHumanEntity(admin, authUser)
  } catch (err) {
    return NextResponse.json({ error: 'Entity creation failed' }, { status: 500 })
  }

  // Step 3: ensure profile row exists (entity-link contract requires it).
  // findOrCreateHumanEntity creates the profile via its existing flow; verify it landed.
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('user_id', authUser.id)
    .maybeSingle()
  if (!profile) {
    return NextResponse.json({ error: 'Profile row missing post-entity-create' }, { status: 500 })
  }

  // Step 4: mint API key scoped per the registration's requested_scope.
  const rawKey = generateApiKey()
  const keyHash = sha256(rawKey)
  const keyHint = `${rawKey.slice(0, 11)}…${rawKey.slice(-4)}`

  const { data: keyRow, error: keyErr } = await admin
    .from('api_keys')
    .insert({
      profile_id: profile.id,
      key_hash: keyHash,
      key_hint: keyHint,
      scope: reg.requested_scope,
      created_by: 'agent_registration',
      name: reg.agent_name ?? 'Agent-registered key',
    })
    .select('id')
    .single()
  if (keyErr || !keyRow) {
    return NextResponse.json({ error: 'API key insert failed' }, { status: 500 })
  }

  // Step 5: mark registration completed.
  await admin
    .from('agent_registrations')
    .update({ status: 'completed', api_key_id: keyRow.id, completed_at: new Date().toISOString() })
    .eq('id', reg.id)

  return NextResponse.json({
    api_key: rawKey,
    scope: reg.requested_scope,
    key_id: keyRow.id,
    key_hint: keyHint,
    expires_at: null,
  })
}
```

### E.3 — Validate

```
npx tsc --noEmit
```

Manual local smoke test (terminal Claude can run if dev server is up):

```bash
# Trigger claim
curl -X POST http://localhost:3000/api/agent/auth/claim \
  -H "Content-Type: application/json" \
  -d '{"email":"test+phase3@shipstacked.com","scope":"builder:rw","agent_provider":"claude","agent_name":"Test agent"}'

# Operator picks up OTP from email or DB:
# SELECT otp_code_hash FROM agent_registrations ORDER BY created_at DESC LIMIT 1;
# (Can't reverse hash; operator gets OTP from email in real test.)

# Complete claim
curl -X POST http://localhost:3000/api/agent/auth/claim/complete \
  -H "Content-Type: application/json" \
  -d '{"claim_token":"clm_...","otp_code":"123456"}'

# Use returned key:
curl http://localhost:3000/api/v1/me -H "Authorization: Bearer sk_ss_..."
```

---

## §F — Block 4: A2A AgentCard crosswalk

### F.1 — Pre-edit read
Already covered in §A.1.

### F.2 — Restructure the existing AgentCard route

Whatever `src/app/.well-known/agent-card.json/route.ts` currently returns, restructure to A2A v1.0 schema. Preserve all existing skills; remap their fields.

Target JSON (paste-ready, fill skills from current file):

```ts
import { NextResponse } from 'next/server'

const SITE = 'https://shipstacked.com'

const AGENT_CARD = {
  name: 'ShipStacked',
  description: 'Agent-discoverable hiring infrastructure for AI-native builders, teams, and buyers. Receipt-verified shipped work; open-protocol addressable via auth.md and A2A.',
  version: '0.3.0',
  icon_url: `${SITE}/icon.png`,

  supported_interfaces: [
    { protocol_binding: 'REST', url: `${SITE}/api/v1` },
    { protocol_binding: 'MCP', url: `${SITE}/api/mcp` },
  ],

  capabilities: {
    streaming: false,
    extended_agent_card: false,
  },

  default_input_modes: ['application/json'],
  default_output_modes: ['application/json'],

  // Authentication requirements: documented separately at /auth.md and the OAuth metadata endpoints.
  // A2A v1.0 AgentCard does not have a required auth field at root, but skills can declare security_requirements.

  skills: [
    {
      id: 'fetch-builder-profile',
      name: 'Fetch builder profile',
      description: 'Retrieve a verified AI builder profile by username, including receipts and atlas roles.',
      tags: ['hiring', 'profile', 'builder'],
      examples: ['GET /api/v1/builders/alice'],
      input_modes: ['application/json'],
      output_modes: ['application/json'],
      security_requirements: [{ scheme: 'bearer', scopes: ['builder:rw', 'buyer:rw', 'agent:rw'] }],
    },
    {
      id: 'search-talent',
      name: 'Search ranked talent',
      description: 'Query the builder directory ranked by proof-of-work (Formula E). Filter by cluster, atlas role, shipped artifacts.',
      tags: ['hiring', 'search', 'talent', 'directory'],
      examples: ['GET /api/v1/talent/search?cluster=A&shipped=Apps&limit=20'],
      input_modes: ['application/json'],
      output_modes: ['application/json'],
      security_requirements: [{ scheme: 'bearer', scopes: ['buyer:rw'] }],
    },
    {
      id: 'fetch-atlas-role',
      name: 'Fetch atlas role taxonomy entry',
      description: 'Retrieve an Atlas role definition + practitioners by role ID (e.g. A1, S2).',
      tags: ['taxonomy', 'roles', 'atlas'],
      examples: ['GET /api/v1/atlas/roles/A1'],
      input_modes: ['application/json'],
      output_modes: ['application/json'],
      security_requirements: [{ scheme: 'bearer', scopes: ['buyer:rw'] }],
    },
    {
      id: 'post-build',
      name: 'Post a build to the proof-of-work feed',
      description: 'Record a shipped build. Enrichment routes the receipt to the agent\'s or builder\'s entity per resolveEntityKindForOwner.',
      tags: ['build', 'proof-of-work', 'receipt'],
      examples: ['POST /api/v1/builds'],
      input_modes: ['application/json'],
      output_modes: ['application/json'],
      security_requirements: [{ scheme: 'bearer', scopes: ['builder:rw', 'agent:rw'] }],
    },
    {
      id: 'post-message',
      name: 'Message a builder',
      description: 'Send an outreach message to a builder. Creates or appends to a conversation.',
      tags: ['hiring', 'message', 'outreach'],
      examples: ['POST /api/v1/messages'],
      input_modes: ['application/json'],
      output_modes: ['application/json'],
      security_requirements: [{ scheme: 'bearer', scopes: ['buyer:rw'] }],
    },
    {
      id: 'post-job',
      name: 'Post a job',
      description: 'Publish a job posting visible to ranked builders.',
      tags: ['hiring', 'job', 'posting'],
      examples: ['POST /api/v1/jobs'],
      input_modes: ['application/json'],
      output_modes: ['application/json'],
      security_requirements: [{ scheme: 'bearer', scopes: ['buyer:rw'] }],
    },
    {
      id: 'save-profile',
      name: 'Save a builder to shortlist',
      description: 'Add or remove a builder from the buyer\'s shortlist.',
      tags: ['hiring', 'shortlist', 'save'],
      examples: ['POST /api/v1/saved-profiles'],
      input_modes: ['application/json'],
      output_modes: ['application/json'],
      security_requirements: [{ scheme: 'bearer', scopes: ['buyer:rw'] }],
    },
  ],
}

export async function GET() {
  return NextResponse.json(AGENT_CARD, {
    headers: { 'Cache-Control': 'public, max-age=300' },
  })
}
```

### F.3 — Update `verify-agent-card.ts` script

The existing `scripts/v2/verify-agent-card.ts` validates the card. Extend it to check A2A v1.0 required fields: `name`, `description`, `version`, `supported_interfaces`, `default_input_modes`, `default_output_modes`, `skills`. And per-skill: `id`, `name`, `description`, `tags`, `examples`, `input_modes`, `output_modes`.

Pre-edit read this script before modifying. If it currently validates a different schema, update its assertions.

### F.4 — Validate
```
npx tsc --noEmit
node --experimental-strip-types scripts/v2/verify-agent-card.ts --base http://localhost:3000
```

Both exit 0.

---

## §G — Block 5: V1 API buyer endpoints

### G.1 — Extend `authenticateApiKey` for scope

In `src/lib/apiAuth.ts`, the existing discriminated union returns `{ ok: true, auth: { profile, key } }`. Extend the `key` payload to include `scope`. New signature:

```ts
export type ApiAuthSuccess = {
  ok: true
  auth: {
    profile: { id: string; user_id: string | null; username: string; email: string | null }
    key: { id: number; scope: 'builder:rw' | 'buyer:rw' | 'agent:rw'; name: string }
  }
}
```

Add a helper:
```ts
export function requireScope(auth: ApiAuthSuccess['auth'], requiredScopes: string[]): NextResponse | null {
  if (!requiredScopes.includes(auth.key.scope)) {
    return NextResponse.json({ error: `Insufficient scope. Required: ${requiredScopes.join(' or ')}, got: ${auth.key.scope}` }, { status: 403 })
  }
  return null
}
```

Each `/api/v1/*` endpoint calls `requireScope(apiAuth.auth, ['buyer:rw'])` (or whichever scope is needed) right after `authenticateApiKey` succeeds. Return the 403 immediately if it returns non-null.

### G.2 — `GET /api/v1/talent/search`

Path: `src/app/api/v1/talent/search/route.ts` (new).

Query params:
- `cluster` (optional) — Atlas cluster ID like `A`, `B`, `S` (single letter)
- `role` (optional) — Atlas role ID like `A1`, `S2` (comma-separated allowed)
- `shipped` (optional) — artifact tag filter (e.g. `Apps`, `Tools`, `Agents`)
- `limit` (default 20, max 100)
- `offset` (default 0)

Returns:
```json
{
  "results": [
    {
      "username": "alice",
      "full_name": "...",
      "role": "...",
      "location": "...",
      "atlas_roles_confirmed": ["A1", "S2"],
      "atlas_roles_inferred": ["A3"],
      "proof_of_work": {
        "l1_receipts": 14,
        "distinct_hosts": 4,
        "last_shipped": "2026-05-24T..."
      },
      "verified": true,
      "profile_url": "https://shipstacked.com/u/alice"
    }
  ],
  "total": 47,
  "limit": 20,
  "offset": 0
}
```

Implementation: reuses Formula E ranking from `getRankedBuilders()` (per §A.9 pre-flight). Add filter clauses for cluster/role/shipped. Do NOT invent a new ranking — point at the existing helper.

### G.3 — `GET /api/v1/builders/[username]`

Path: `src/app/api/v1/builders/[username]/route.ts` (new).

Returns deep-fetched builder profile + recent receipts + atlas roles. Same shape as `/api/v1/me` but for an arbitrary public profile. Visibility: only `published = true` profiles are returned; 404 otherwise.

### G.4 — `POST /api/v1/messages`

Path: `src/app/api/v1/messages/route.ts` (extend existing if it exists for cookie-session, add Bearer-auth POST handler).

Inputs:
```json
{
  "to_username": "alice",
  "body": "...",
  "job_id": null  // optional, links message to a job
}
```

Creates or appends to a conversation. Same shape as the existing `/api/messages` route (cookie-session) but accessed via Bearer auth.

### G.5 — `GET /api/v1/messages`

List the buyer's conversations. Reuses the existing `/api/messages` cookie-session lookup, switched to bearer-key auth.

### G.6 — `POST /api/v1/jobs`

Path: `src/app/api/v1/jobs/route.ts` (new).

Inputs:
```json
{
  "role_title": "...",
  "company_name": "...",
  "description": "...",
  "salary_range": "...",
  "remote": true,
  "location": "..."
}
```

Creates a job posting. Same shape as the existing dashboard job-post form.

### G.7 — `GET /api/v1/saved-profiles` + `POST /api/v1/saved-profiles`

If `saved_profiles` table doesn't exist (likely the case per codebase read), add it in §D's DDL block. Simple table: `id, buyer_email, builder_profile_id, created_at, notes`.

If creating the table, add to §D:
```sql
CREATE TABLE public.saved_profiles (
  id BIGSERIAL PRIMARY KEY,
  buyer_email TEXT NOT NULL,
  builder_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (buyer_email, builder_profile_id)
);
CREATE INDEX idx_saved_profiles_buyer ON public.saved_profiles(buyer_email);
```

### G.8 — `GET /api/v1/me/scope`

Path: `src/app/api/v1/me/scope/route.ts` (new).

Returns:
```json
{
  "scope": "buyer:rw",
  "can": ["search-talent", "fetch-builder", "post-message", "post-job", "save-profile"],
  "cannot": ["post-build", "fetch-own-builder-profile"]
}
```

Machine-readable scope description so agents can self-introspect.

### G.9 — Validate

```
npx tsc --noEmit
npm run build
```

Each endpoint manually exercisable with a buyer-scoped API key.

---

## §H — Block 6: MCP write tools

### H.1 — Pre-edit read
`src/app/api/mcp/route.ts` from §A.2.

### H.2 — Extend MCP server with write tools

Current MCP server (per codebase read) has read-only tools using SSE/JSON-RPC. Extend with:

- `post-message` (input: `to_username`, `body`, optional `job_id`)
- `post-job` (input: `role_title`, `company_name`, `description`, etc.)
- `save-profile` (input: `builder_username`, optional `notes`)
- `search-talent` (input: `cluster?`, `role?`, `shipped?`, `limit?`)

Each tool calls the corresponding `/api/v1/*` endpoint internally, using the same Bearer auth and scope checks. **Don't duplicate logic** — MCP tools become thin wrappers over the REST endpoints.

### H.3 — Validate

```
node --experimental-strip-types scripts/v2/verify-agent-card.ts --base http://localhost:3000
```

Verify the new skills appear in the AgentCard's `skills` array (per §F).

Add an MCP smoke test if one doesn't exist in `scripts/v2/`: a script that connects to `/api/mcp`, lists tools, calls each read tool, verifies the response shape.

---

## §I — Block 7: Dashboard "Connect an agent" UI

### I.1 — Pre-edit read
- `src/app/dashboard/AgentOnboarding.tsx` (§A.5)
- `src/app/hirer/HirerDashboardClient.tsx` (§A.8)

### I.2 — Generalize `AgentOnboarding` into `<ConnectAnAgent>`

The existing `AgentOnboarding` component is specific to Card-3 (autonomous agent signup). Generalize:

New component at `src/app/components/ConnectAnAgent.tsx`.

Props:
```ts
type ConnectAnAgentProps = {
  scope: 'builder:rw' | 'buyer:rw'
  variant: 'solo_dashboard' | 'buyer_dashboard' | 'team_dashboard'  // Team for Phase 4 placeholder
}
```

Renders:
1. **"Connect an agent" header** with brief description of what an agent can do at this scope.
2. **Two paths offered:**
   - **"Use auth.md"** (recommended): displays the user's email + a button "Generate registration link" that opens a modal showing the agent-side URL `https://shipstacked.com/.well-known/oauth-authorization-server` to paste into the agent's config. (No interactive flow on the dashboard — the agent drives the flow.)
   - **"Generate API key manually"**: existing AgentOnboarding behavior. User clicks button → `/api/keys` mints a key → key shown once with copy-button.
3. **System-prompt template** customized per scope. For `builder:rw`: instructions for a builder-management agent. For `buyer:rw`: instructions for a buyer-evaluation agent.
4. **List of existing keys** with key_hint, name, scope, created_at, revoke button.

### I.3 — Place `<ConnectAnAgent>` on dashboards

- **Solo builder dashboard** (`src/app/dashboard/BuilderDashboardClient.tsx`): replace `AgentOnboarding` with `<ConnectAnAgent scope="builder:rw" variant="solo_dashboard" />`. Renders after the Proof of Work card + Buyer Mode card.
- **Buyer dashboard** (`src/app/hirer/HirerDashboardClient.tsx`): add `<ConnectAnAgent scope="buyer:rw" variant="buyer_dashboard" />` in a sensible slot (post-research of the file, likely after the conversations list).
- **Team dashboard** (Phase 4): slot pre-allocated; component reused unchanged.

### I.4 — System prompt templates

`builder:rw` system prompt:
```
You are an AI agent managing ShipStacked profile <username>.

Authoritative endpoints:
- GET /api/v1/me — fetch the current profile state
- PATCH /api/v1/profile — update profile fields
- POST /api/v1/builds — post new shipped work
- GET /api/v1/builds — list recent posts

Your job:
1. Keep the profile current: bio, skills, projects, location.
2. Post builds as they ship. Always include `outcome` and `url` so the build can be verified.
3. Monitor messages: GET /api/v1/messages periodically; draft replies for the operator's review.

Do not: post on platforms outside ShipStacked unless the operator says so. Do not modify the operator's email or password.

Authentication: Authorization: Bearer <api_key>
Full machine-readable capability map at https://shipstacked.com/.well-known/agent-card.json
```

`buyer:rw` system prompt:
```
You are an AI agent helping <buyer_email> hire AI-native builders on ShipStacked.

Authoritative endpoints:
- GET /api/v1/talent/search?cluster=X&role=Y&shipped=Z — query ranked builders
- GET /api/v1/builders/<username> — deep-fetch a candidate
- GET /api/v1/atlas/roles/<role_id> — understand role taxonomy
- POST /api/v1/messages — message a builder
- POST /api/v1/jobs — post a job
- POST /api/v1/saved-profiles — shortlist a candidate

Your job:
1. Given hiring criteria, search for matching builders.
2. For each promising candidate, fetch the full profile + receipts. Evaluate fit against the criteria.
3. Build a shortlist (POST /api/v1/saved-profiles).
4. Draft outreach messages for the operator's review before sending. Use POST /api/v1/messages.

Atlas role taxonomy guide:
- A1-A5: Applications cluster
- B1-B5: Backend cluster
- S1-S5: Systems cluster
- (etc — see /api/v1/atlas/roles)

Authentication: Authorization: Bearer <api_key>
```

### I.5 — Validate

```
npx tsc --noEmit
npm run build
```

Manual: log in to `/dashboard` as a builder → see "Connect an agent" card. Log in to `/hirer` as a buyer → see "Connect an agent" card with buyer-side system prompt.

---

## §J — Block 8: Copy + content updates

### J.1 — Homepage/hirers messaging update

Add a section on homepage about agent-native addressability. Suggested copy (operator-edit):

> **Open to any AI agent.**
> ShipStacked publishes an `auth.md`. Your buyer-side agent — Claude, Cursor, ChatGPT, custom — can register on your behalf and search talent, message builders, post jobs through standard endpoints. No bespoke integrations. No vendor lock.

### J.2 — `/api-docs` page extension

The existing `/api-docs` page documents `/api/v1/me`, `/api/v1/profile`, `/api/v1/builds`. Add:
- `/api/v1/talent/search` (buyer:rw)
- `/api/v1/builders/<username>` (any:rw)
- `/api/v1/messages` GET + POST (buyer:rw or builder:rw for own)
- `/api/v1/jobs` POST (buyer:rw)
- `/api/v1/saved-profiles` (buyer:rw)
- `/api/v1/me/scope` (any:rw)

Plus auth.md callout: "Or skip the manual key-gen entirely — point your agent at https://shipstacked.com/auth.md."

### J.3 — `/join` Card 3 copy update

Card 3 (Autonomous Agent) currently says "API-keyed agent identity, principal-linked, posts builds and proof. Wallet/autonomous identity ships later." Update to reflect Phase 3's open-protocol play:

> "API-keyed agent identity. Register via the open auth.md protocol or generate keys directly. Post builds, manage your profile, integrate into any agent platform — Claude, Cursor, ChatGPT, custom."

### J.4 — Validate
Visual check on local dev. No tsc gate for copy changes alone.

---

## §K — Block 9: Final validation

### K.1 — Gates

```
npx tsc --noEmit
npm run build
grep -rni "velocity" src/ --include="*.ts" --include="*.tsx"
node --experimental-strip-types scripts/v2/verify-agent-card.ts --base http://localhost:3000
```

All four green.

### K.2 — Endpoint smoke tests (local)

```bash
# Auth.md discovery
curl -s http://localhost:3000/.well-known/oauth-protected-resource | jq
curl -s http://localhost:3000/.well-known/oauth-authorization-server | jq
curl -s http://localhost:3000/auth.md

# A2A AgentCard
curl -s http://localhost:3000/.well-known/agent-card.json | jq '.skills | length'  # expect 7

# Manual key flow (operator does in browser):
# 1. Log in to /dashboard
# 2. Click "Generate API key" in Connect an Agent section
# 3. Copy key

# V1 API
KEY=sk_ss_...
curl -s -H "Authorization: Bearer $KEY" http://localhost:3000/api/v1/me | jq
curl -s -H "Authorization: Bearer $KEY" "http://localhost:3000/api/v1/talent/search?limit=5" | jq

# Buyer-only with builder:rw key should 403:
curl -s -H "Authorization: Bearer $KEY" -X POST http://localhost:3000/api/v1/jobs \
  -H "Content-Type: application/json" -d '{"role_title":"test"}' | jq
# Expect: {"error": "Insufficient scope..."}
```

### K.3 — Auth.md OTP smoke test (local)

```bash
# Trigger claim
CLAIM_RESPONSE=$(curl -s -X POST http://localhost:3000/api/agent/auth/claim \
  -H "Content-Type: application/json" \
  -d '{"email":"ox@agentagous.com","scope":"buyer:rw","agent_provider":"claude","agent_name":"Test"}')

CLAIM_TOKEN=$(echo $CLAIM_RESPONSE | jq -r .claim_token)

# Operator gets OTP from email
read -p "OTP: " OTP

# Complete
curl -s -X POST http://localhost:3000/api/agent/auth/claim/complete \
  -H "Content-Type: application/json" \
  -d "{\"claim_token\":\"$CLAIM_TOKEN\",\"otp_code\":\"$OTP\"}" | jq

# Use returned key
NEW_KEY=$(... | jq -r .api_key)
curl -s -H "Authorization: Bearer $NEW_KEY" http://localhost:3000/api/v1/me/scope | jq
# Expect: {"scope":"buyer:rw", ...}
```

### K.4 — Report state

Same template as prior phases:
- tsc exit code
- build exit code
- grep -rni velocity (full output)
- verify-agent-card.ts exit code
- git status --short
- git diff --stat

Plus Phase 3 specific:
- Auth.md OTP smoke test result
- V1 endpoint smoke test results (per K.2)
- A2A AgentCard skills count

Stop. Operator approves, then commit.

---

## §L — Block 10: Ship

### L.1 — Commit

```
git add -A src/
git commit -m "Phase 3: agent-native foundation

- auth.md open protocol implementation (user-claimed OTP flow)
  - /.well-known/oauth-protected-resource (RFC 9728 PRM)
  - /.well-known/oauth-authorization-server (with agent_auth block)
  - /auth.md (Markdown prose)
  - POST /api/agent/auth/claim — trigger OTP email
  - POST /api/agent/auth/claim/complete — exchange OTP for API key
- A2A v1.0 AgentCard crosswalk at /.well-known/agent-card.json
- V1 API buyer endpoints:
  - GET /api/v1/talent/search (Formula E ranked)
  - GET /api/v1/builders/<username>
  - GET/POST /api/v1/messages
  - GET/POST /api/v1/jobs
  - GET/POST /api/v1/saved-profiles
  - GET /api/v1/me/scope
- MCP server write tools: post-message, post-job, save-profile, search-talent
- API key scope model: builder:rw, buyer:rw, agent:rw (api_keys.scope column added)
- <ConnectAnAgent> shared component on Solo + Buyer dashboards
  - System-prompt templates for builder and buyer agents
- /api-docs updated with new endpoint catalog
- Card 3 copy updated to reflect open-protocol play

DDL: new agent_registrations table; api_keys.scope column added; saved_profiles table added.

Discovery + diff plan: docs/audit/DISCOVERY_phase3_agent_native.md (this file; untracked working tree; Phase 7 commits)."

git push origin main
```

### L.2 — Post-push verification

```
node --experimental-strip-types scripts/v2/verify-agent-card.ts --base https://shipstacked.com
```

Exit 0.

Vercel deploy ~2-3 min. After green:

```bash
# Discovery endpoints on prod
curl -s https://shipstacked.com/.well-known/oauth-protected-resource | jq
curl -s https://shipstacked.com/.well-known/oauth-authorization-server | jq
curl -s https://shipstacked.com/auth.md
curl -s https://shipstacked.com/.well-known/agent-card.json | jq '.skills | length'
```

All return 200 with expected content.

### L.3 — Outstanding verifications (operator manual, deferred)

Same pattern as Phase 1 & 2:
- End-to-end auth.md OTP flow with a real agent (Claude/Cursor configured via the auth.md URL)
- Buyer-side smoke test: buyer-key calls talent search, deep-fetches a builder, drafts a message, posts a job
- Builder-side smoke test: existing builder key works at builder:rw scope; 403 on buyer endpoints
- Solo + Buyer dashboard UI for `<ConnectAnAgent>` renders correctly

Record in `docs/decisions/RESUME_HERE.md` alongside still-outstanding Phase 1 + 2 items.

---

## §M — Decisions locked (2026-05-26)

- Auth.md user-claimed OTP flow ships in Phase 3.
- Auth.md agent-verified ID-JAG flow deferred to Phase 8.
- A2A v1.0 AgentCard crosswalk in Phase 3 (existing path `/.well-known/agent-card.json` reused; schema migrated).
- OAuth DCR upgrade for write-tool auth deferred to Phase 8.
- Bearer `sk_ss_*` API keys with `api_keys.scope` column for scope model.
- MCP write tools as thin wrappers over REST endpoints; no logic duplication.
- `<ConnectAnAgent>` shared component, two paths offered (auth.md URL + manual key gen).
- Saved profiles table added (new feature).
- Phase 4 (Team) inherits everything from Phase 3 — team API keys, team-agent management, team-scoped V1 endpoints are essentially free once team_profiles + team_admins exist.

## §N — Open items deferred to later phases

- Auth.md agent-verified ID-JAG flow (Phase 8)
- OAuth DCR + signed Agent Cards (Phase 8)
- A2A peer-to-peer agent delegation (Phase 8)
- AP2 (Universal Commerce Protocol) for transactional hire confirmations (Phase 9+)
- API key expiration / rotation UX (operator surfaces post-launch)
- Team-scoped API keys + team-agent management (Phase 4)
- Agent_profiles + principal_entity_id linking (Phase 5)
- Atlas wiring proper (Phase 6)

End of Phase 3 doc.
