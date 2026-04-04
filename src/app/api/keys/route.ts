import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'crypto'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateKey(): { raw: string; hash: string; prefix: string } {
  const random = randomBytes(32).toString('hex')
  const raw = `sk_ss_${random}`
  const hash = createHash('sha256').update(raw).digest('hex')
  const prefix = `sk_ss_${random.slice(0, 8)}`
  return { raw, hash, prefix }
}

// GET — list keys for current user (never returns full key, only prefix)
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const db = admin()
  const { data: profile } = await db
    .from('profiles').select('id').eq('email', user.email).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'No profile found' }, { status: 404 })

  const { data: keys } = await db
    .from('api_keys')
    .select('id, name, key_prefix, last_used_at, created_at')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ keys: keys || [] })
}

// POST — generate a new key
export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const db = admin()
  const { data: profile } = await db
    .from('profiles').select('id').eq('email', user.email).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'No profile found — complete your profile first' }, { status: 404 })

  // Max 5 keys per profile
  const { count } = await db
    .from('api_keys')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profile.id)
  if ((count || 0) >= 5) {
    return NextResponse.json({ error: 'Maximum 5 API keys per profile. Revoke an existing key first.' }, { status: 400 })
  }

  let body: any = {}
  try { body = await req.json() } catch {}
  const name = body.name?.trim() || 'My agent'

  const { raw, hash, prefix } = generateKey()

  const { data: keyRow, error } = await db
    .from('api_keys')
    .insert({ profile_id: profile.id, email: user.email, key_hash: hash, key_prefix: prefix, name })
    .select('id, name, key_prefix, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return the raw key ONCE — we never store it and can never show it again
  return NextResponse.json({
    key: raw,
    key_prefix: prefix,
    name: keyRow.name,
    id: keyRow.id,
    warning: 'Copy this key now. It will never be shown again.',
  })
}

// DELETE — revoke a key by id
export async function DELETE(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const db = admin()
  const { data: profile } = await db
    .from('profiles').select('id').eq('email', user.email).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'No profile found' }, { status: 404 })

  let body: any = {}
  try { body = await req.json() } catch {}
  if (!body.id) return NextResponse.json({ error: 'Key id required' }, { status: 400 })

  // Ensure the key belongs to this profile
  await db
    .from('api_keys')
    .delete()
    .eq('id', body.id)
    .eq('profile_id', profile.id)

  return NextResponse.json({ revoked: true })
}
