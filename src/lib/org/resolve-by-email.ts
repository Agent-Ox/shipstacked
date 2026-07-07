export interface OrgIdentity {
  team_name: string
  logo_url: string | null
  slug: string | null
  published: boolean
}

/**
 * Resolve email → the org (kind='org'|'team') that email's user owns, with its
 * team_profiles identity. The org-unification replacement (Stage 5d) for the
 * email-keyed employer_profiles lookups: auth.users (email→id) → entities
 * (owner_user_id, kind org/team) → team_profiles.
 *
 * auth.users is the only table indexing all org-owner emails (org owners have no
 * profiles row). listUsers is bounded — only runs when emails.length > 0 — and
 * this is a low-frequency contacter/notification surface. A future
 * denormalization (email on entities, or a lookup view) could drop the listUsers.
 *
 * Returns a Map keyed by email; emails with no owned org are simply absent.
 * `published` is included so callers can gate builder-facing display; `slug` so
 * they can link to /team/<slug>.
 */
export async function resolveOrgByEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  emails: string[],
): Promise<Map<string, OrgIdentity>> {
  const out = new Map<string, OrgIdentity>()
  const wanted = [...new Set(emails.filter(Boolean))]
  if (wanted.length === 0) return out

  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailByUserId = new Map<string, string>()
  for (const u of users) if (u.email && wanted.includes(u.email)) emailByUserId.set(u.id, u.email)
  const ownerIds = [...emailByUserId.keys()]
  if (ownerIds.length === 0) return out

  const { data: ownerEnts } = await admin
    .from('entities')
    .select('id, slug, owner_user_id')
    .in('owner_user_id', ownerIds)
    .in('kind', ['org', 'team'])
  const entIds = (ownerEnts || []).map((e: { id: number }) => e.id)
  if (entIds.length === 0) return out

  const { data: tps } = await admin
    .from('team_profiles')
    .select('entity_id, team_name, logo_url, published')
    .in('entity_id', entIds)
  const tpByEnt = new Map<number, { team_name: string; logo_url: string | null; published: boolean }>(
    (tps || []).map((t: { entity_id: number; team_name: string; logo_url: string | null; published: boolean }) => [t.entity_id, t]),
  )

  for (const e of (ownerEnts || []) as Array<{ id: number; slug: string | null; owner_user_id: string }>) {
    const email = emailByUserId.get(e.owner_user_id)
    const tp = tpByEnt.get(e.id)
    if (email && tp) {
      out.set(email, {
        team_name: tp.team_name,
        logo_url: tp.logo_url ?? null,
        slug: e.slug ?? null,
        published: tp.published ?? false,
      })
    }
  }
  return out
}
