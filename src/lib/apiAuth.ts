import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Phase 4 §G: 'team:rw' added. The api_keys.scope column is plain
// TEXT NOT NULL DEFAULT 'builder:rw' (Phase 3 §D DDL — no CHECK constraint),
// so the DB already accepts any scope string; this union + /api/keys
// ALLOWED_SCOPES are the only gates on valid values.
export type ApiScope = 'builder:rw' | 'buyer:rw' | 'agent:rw' | 'team:rw'

export type ApiKeyAuth = {
  profile: any
  email: string
  keyId: string
  scope: ApiScope
}

export type ApiAuthResult =
  | { ok: true; auth: ApiKeyAuth }
  | { ok: false; status: number; error: string }

// Authenticates a request using Authorization: Bearer sk_ss_...
// Returns the profile associated with the key, or an error response shape
export async function authenticateApiKey(req: Request): Promise<ApiAuthResult> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Missing Authorization header. Use: Authorization: Bearer sk_ss_...' }
  }

  const rawKey = authHeader.replace('Bearer ', '').trim()
  if (!rawKey.startsWith('sk_ss_')) {
    return { ok: false, status: 401, error: 'Invalid API key format. Keys must start with sk_ss_' }
  }

  const hash = createHash('sha256').update(rawKey).digest('hex')

  const db = admin()

  // Look up the key
  const { data: keyRow } = await db
    .from('api_keys')
    .select('id, profile_id, email, scope')
    .eq('key_hash', hash)
    .maybeSingle()

  if (!keyRow) {
    return { ok: false, status: 401, error: 'API key not found or revoked' }
  }

  // Fetch the profile
  const { data: profile } = await db
    .from('profiles')
    .select('*, skills(*), projects(*)')
    .eq('id', keyRow.profile_id)
    .maybeSingle()

  if (!profile) {
    return { ok: false, status: 404, error: 'No profile found for this API key' }
  }

  // Update last_used_at fire-and-forget
  db.from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRow.id)
    .then(() => {})

  return {
    ok: true,
    auth: {
      profile,
      email: keyRow.email,
      keyId: keyRow.id,
      // scope column is NOT NULL DEFAULT 'builder:rw' (Phase 3 §D); the ?? guard
      // is belt-and-suspenders for any pre-migration row a stale cache might return.
      scope: (keyRow.scope ?? 'builder:rw') as ApiScope,
    }
  }
}

export function apiError(status: number, error: string, details?: any) {
  return Response.json({ ok: false, error, ...(details && { details }) }, { status })
}

export function apiOk(data: any) {
  return Response.json({ ok: true, ...data })
}

// Scope gate (Phase 3). Call right after authenticateApiKey succeeds:
//   const scopeErr = requireScope(auth.auth, ['buyer:rw'])
//   if (scopeErr) return scopeErr
// Returns a 403 Response when the key's scope isn't in `allowed`, else null.
// Returns a Response (via apiError) to match this file's existing convention.
export function requireScope(
  auth: ApiKeyAuth,
  allowed: ReadonlyArray<ApiScope>,
): Response | null {
  if (!allowed.includes(auth.scope)) {
    return apiError(403, `Insufficient scope. Required: ${allowed.join(' or ')}, got: ${auth.scope}`)
  }
  return null
}
