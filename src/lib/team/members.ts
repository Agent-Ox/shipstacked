import type { SupabaseClient } from '@supabase/supabase-js'

export type TeamMember = {
  id: string
  username: string | null
  full_name: string | null
  role: string | null
  avatar_url: string | null
  // 'owner' | 'admin' come from team_admins; null = a self-linked builder
  // (profiles.team_entity_id). Drives the "Owner"/"Admin" badge.
  team_role: 'owner' | 'admin' | null
}

/**
 * The team's People list = membership source of truth.
 *
 * READ-ONLY. Unions two sources, deduped by profile id + user_id:
 *   1. team_admins (owners/admins) — ALWAYS shown (they run the team), profile
 *      resolved by user_id. An admin with no builder profile still shows, with
 *      a null username (rendered as an "Owner"/"Admin" chip, no /u link).
 *   2. profiles.team_entity_id == entityId (self-linkers) — gated on published
 *      when opts.publishedOnly (the public page); unfiltered for the editor.
 *
 * Never writes profiles.team_entity_id or any row — purely a read.
 */
export async function getTeamMembers(
  admin: SupabaseClient,
  entityId: number,
  opts: { publishedOnly: boolean },
): Promise<TeamMember[]> {
  const { data: adminRows } = await admin
    .from('team_admins')
    .select('user_id, role')
    .eq('team_entity_id', entityId)

  const adminUserIds = (adminRows ?? []).map((a: any) => a.user_id).filter(Boolean)
  const { data: adminProfiles } = adminUserIds.length
    ? await admin
        .from('profiles')
        .select('id, user_id, username, full_name, role, avatar_url')
        .in('user_id', adminUserIds)
    : { data: [] as any[] }
  const profByUser = new Map((adminProfiles ?? []).map((p: any) => [p.user_id, p]))

  let linkerQ = admin
    .from('profiles')
    .select('id, user_id, username, full_name, role, avatar_url')
    .eq('team_entity_id', entityId)
  if (opts.publishedOnly) linkerQ = linkerQ.eq('published', true)
  const { data: linkers } = await linkerQ

  const out: TeamMember[] = []
  const seenProfile = new Set<string>()
  const seenUser = new Set<string>()

  // Owners/admins first — always shown regardless of published.
  for (const a of (adminRows ?? []) as any[]) {
    const p = profByUser.get(a.user_id)
    if (p) { seenProfile.add(p.id); if (p.user_id) seenUser.add(p.user_id) }
    else if (a.user_id) seenUser.add(a.user_id)
    out.push({
      id: p?.id ?? `admin-${a.user_id}`,
      username: p?.username ?? null,
      full_name: p?.full_name ?? null,
      role: p?.role ?? null,
      avatar_url: p?.avatar_url ?? null,
      team_role: a.role === 'owner' ? 'owner' : 'admin',
    })
  }

  // Self-linkers not already counted as an admin (dedupe by profile id / user_id).
  for (const l of (linkers ?? []) as any[]) {
    if (seenProfile.has(l.id) || (l.user_id && seenUser.has(l.user_id))) continue
    seenProfile.add(l.id)
    out.push({
      id: l.id,
      username: l.username,
      full_name: l.full_name,
      role: l.role,
      avatar_url: l.avatar_url,
      team_role: null,
    })
  }

  // Owners first, then admins, then linkers; within a rank, by display name.
  const rank = (m: TeamMember) => (m.team_role === 'owner' ? 0 : m.team_role === 'admin' ? 1 : 2)
  out.sort((x, y) => rank(x) - rank(y) || (x.full_name || x.username || '').localeCompare(y.full_name || y.username || ''))
  return out
}
