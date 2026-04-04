import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type ApiKeyAuth = {
  profile: any
  email: string
  keyId: string
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
    .select('id, profile_id, email')
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
    auth: { profile, email: keyRow.email, keyId: keyRow.id }
  }
}

export function apiError(status: number, error: string, details?: any) {
  return Response.json({ ok: false, error, ...(details && { details }) }, { status })
}

export function apiOk(data: any) {
  return Response.json({ ok: true, ...data })
}
