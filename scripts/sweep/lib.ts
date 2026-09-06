// Behavioural sweep harness (disposable). All created data is prefixed "sweeptest-".
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createChunks } from '@supabase/ssr/dist/main/utils/chunker.js'
import { stringToBase64URL } from '@supabase/ssr/dist/main/utils/base64url.js'

export const BASE = process.env.SWEEP_BASE || 'https://shipstacked.com'
export const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!
export const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY!
export const admin = createClient(URL_, SRK, { auth: { persistSession: false } })

const projectRef = new globalThis.URL(URL_).hostname.split('.')[0]
export const STORAGE_KEY = `sb-${projectRef}-auth-token`

export interface Actor { email: string; password: string; userId: string; cookie: string; sb: SupabaseClient }

export async function makeActor(label: string): Promise<Actor> {
  const email = `oxleethomas+sweeptest-${label}@gmail.com`
  const password = 'SweepTest!' + Math.random().toString(36).slice(2, 10)
  // clean any prior run
  const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const prior = existing?.users.find(u => (u.email ?? '').toLowerCase() === email.toLowerCase())
  if (prior) await admin.auth.admin.deleteUser(prior.id)
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { password_set: true } })
  if (error) throw new Error(`createUser ${email}: ${error.message}`)
  const sb = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: si, error: siErr } = await sb.auth.signInWithPassword({ email, password })
  if (siErr || !si.session) throw new Error(`signIn ${email}: ${siErr?.message}`)
  return { email, password, userId: data.user!.id, cookie: sessionCookie(si.session), sb }
}

export function sessionCookie(session: any): string {
  const payload = {
    access_token: session.access_token,
    token_type: session.token_type,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    refresh_token: session.refresh_token,
    user: session.user,
  }
  const encoded = 'base64-' + stringToBase64URL(JSON.stringify(payload))
  const chunks = createChunks(STORAGE_KEY, encoded)
  return chunks.map((c: any) => `${c.name}=${encodeURIComponent(c.value)}`).join('; ')
}

export interface Res { status: number; body: string; json: any; headers: Headers }
export async function req(path: string, opts: { method?: string; cookie?: string; body?: any; headers?: Record<string,string>; redirect?: RequestRedirect } = {}): Promise<Res> {
  const h: Record<string, string> = { 'User-Agent': 'ShipStacked-Sweep/1.0', ...(opts.headers ?? {}) }
  if (opts.cookie) h['Cookie'] = opts.cookie
  if (opts.body !== undefined) h['Content-Type'] = 'application/json'
  const r = await fetch(BASE + path, {
    method: opts.method ?? 'GET', headers: h,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    redirect: opts.redirect ?? 'manual',
  })
  const body = await r.text()
  let json: any = null
  try { json = JSON.parse(body) } catch {}
  return { status: r.status, body, json, headers: r.headers }
}

// ── result log ────────────────────────────────────────────────────────────
export interface Row { flow: string; step: string; expected: string; actual: string; pass: boolean; severity?: 'critical'|'high'|'medium'|'low' }
export const rows: Row[] = []
export function check(flow: string, step: string, expected: string, actual: string, pass: boolean, severity?: Row['severity']) {
  rows.push({ flow, step, expected, actual, pass, severity })
  console.log(`${pass ? 'PASS' : 'FAIL'}  [${flow}] ${step}\n        expected: ${expected}\n        actual:   ${actual}`)
  return pass
}
export const has = (body: string, needle: string) => body.toLowerCase().includes(needle.toLowerCase())
