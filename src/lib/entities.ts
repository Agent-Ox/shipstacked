/**
 * Entity helpers.
 *
 * Tier 1 merge (docs/v2/TIER_1_MERGE_SPEC.md §4.3): resolves V1 `profiles`
 * to V2 `entities` BEFORE creating a new entity. Same human → one entity.
 * The link is bidirectional (`profiles.entity_id` ↔ `entities.profile_id`,
 * migration 20260516142038_merge_profiles_entities_link.sql).
 *
 * The pre-merge behaviour — deriving slug from user_metadata.full_name with
 * no profiles lookup — caused the audit Part 3 duplicate-identity bug
 * (entity_canonical_url 404 against /u/[username]). That path now only
 * fires for genuinely new users with no V1 profile.
 */

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { entityExternalId } from './ulid.ts';
import { generateUniqueSlug, normalizeSlug } from './paste/slug.ts';

export interface EntityRow {
  id: number;
  external_id: string;
  kind: 'human' | 'operator' | 'fleet' | 'agent' | 'team' | 'org';
  display_name: string;
  slug: string;
  owner_user_id: string;
  profile_id?: string | null;
}

export interface FindOrCreateResult {
  entity: EntityRow;
  was_created: boolean;
}

interface ProfileLite {
  id: string;
  username: string;
  full_name: string | null;
  entity_id: number | null;
}

function deriveDisplayName(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | null | undefined;
  const fullName = typeof meta?.full_name === 'string' ? meta.full_name.trim() : '';
  if (fullName) return fullName;
  const name = typeof meta?.name === 'string' ? meta.name.trim() : '';
  if (name) return name;
  const email = user.email || '';
  const prefix = email.split('@')[0]?.trim() || '';
  if (prefix) return prefix;
  return 'Builder';
}

function deriveSlugBase(user: User, displayName: string): string {
  const base = normalizeSlug(displayName);
  if (base && base !== 'untitled') return base;
  const email = user.email || '';
  const prefix = email.split('@')[0]?.trim() || '';
  return normalizeSlug(prefix || 'builder');
}

/**
 * Look up the existing V1 profile for this auth user, if any.
 * Returns null when the user has no V1 profile (genuinely new account).
 */
async function findExistingProfile(
  admin: SupabaseClient,
  user: User,
): Promise<ProfileLite | null> {
  const { data, error } = await admin
    .from('profiles')
    .select('id, username, full_name, entity_id')
    .eq('user_id', user.id)
    .not('user_id', 'is', null)
    .limit(1)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') {
    throw new Error(`profile lookup failed: ${error.message}`);
  }
  return (data as ProfileLite | null) ?? null;
}

async function fetchEntityById(
  admin: SupabaseClient,
  id: number,
): Promise<EntityRow | null> {
  const { data, error } = await admin
    .from('entities')
    .select('id, external_id, kind, display_name, slug, owner_user_id, profile_id')
    .eq('id', id)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') {
    throw new Error(`entity fetch-by-id failed: ${error.message}`);
  }
  return (data as EntityRow | null) ?? null;
}

async function fetchEntityByOwner(
  admin: SupabaseClient,
  userId: string,
): Promise<EntityRow | null> {
  const { data, error } = await admin
    .from('entities')
    .select('id, external_id, kind, display_name, slug, owner_user_id, profile_id')
    .eq('owner_user_id', userId)
    .eq('kind', 'human')
    .limit(1)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') {
    throw new Error(`entity lookup failed: ${error.message}`);
  }
  return (data as EntityRow | null) ?? null;
}

async function writeProfileEntityLink(
  admin: SupabaseClient,
  profileId: string,
  entityId: number,
): Promise<void> {
  const { error } = await admin
    .from('profiles')
    .update({ entity_id: entityId })
    .eq('id', profileId);
  if (error) {
    throw new Error(`profile.entity_id update failed: ${error.message}`);
  }
}

/**
 * Resolve the human entity for this user, creating it if missing.
 *
 * Resolution order (Spec §4.3):
 *   1. If V1 profile exists AND profile.entity_id is set → fetch & return that entity (idempotent).
 *   2. If V1 profile exists AND profile.entity_id null AND an entity already exists for this
 *      owner_user_id → link profile.entity_id to it and return.
 *   3. If V1 profile exists AND no entity yet → INSERT entity with slug = profile.username
 *      VERBATIM and display_name = profile.full_name; link profile.entity_id; return.
 *   4. No V1 profile → original behaviour (derive slug from user_metadata / email).
 *
 * The §0 non-negotiable: when a profile is found, `entities.slug` MUST equal
 * `profiles.username` exactly. Never normalised, never transformed.
 */
export async function findOrCreateHumanEntity(
  admin: SupabaseClient,
  user: User,
): Promise<FindOrCreateResult> {
  const profile = await findExistingProfile(admin, user);

  // ─── Path 1: V1 profile exists, already linked ────────────────────────
  if (profile?.entity_id) {
    const linked = await fetchEntityById(admin, profile.entity_id);
    if (linked) return { entity: linked, was_created: false };
    // Linked entity row missing — fall through to re-create (defensive).
  }

  // ─── Path 2: V1 profile exists, no link yet, but an entity already exists ─
  if (profile) {
    const existingByOwner = await fetchEntityByOwner(admin, user.id);
    if (existingByOwner) {
      // Link profile → entity (idempotent if entity already had profile_id set).
      if (!profile.entity_id) {
        await writeProfileEntityLink(admin, profile.id, existingByOwner.id);
      }
      return { entity: existingByOwner, was_created: false };
    }
  }

  // ─── Path 3: V1 profile exists, no entity yet → CREATE with username slug ─
  if (profile) {
    const displayName = profile.full_name?.trim() || deriveDisplayName(user);
    const slug = profile.username; // VERBATIM — Spec §0 invariant.

    const row = {
      external_id: entityExternalId(),
      kind: 'human' as const,
      display_name: displayName,
      slug,
      owner_user_id: user.id,
      profile_id: profile.id,
    };

    const { data: inserted, error: insertErr } = await admin
      .from('entities')
      .insert(row)
      .select('id, external_id, kind, display_name, slug, owner_user_id, profile_id')
      .single();

    if (insertErr || !inserted) {
      // Race: another publish in flight just claimed the slug or owner_user_id.
      if (insertErr?.code === '23505') {
        const raceWinner = await fetchEntityByOwner(admin, user.id);
        if (raceWinner) {
          if (!profile.entity_id) {
            await writeProfileEntityLink(admin, profile.id, raceWinner.id);
          }
          return { entity: raceWinner, was_created: false };
        }
      }
      throw new Error(`entity insert failed: ${insertErr?.message ?? 'unknown'}`);
    }

    await writeProfileEntityLink(admin, profile.id, (inserted as EntityRow).id);
    return { entity: inserted as EntityRow, was_created: true };
  }

  // ─── Path 4: no V1 profile (genuinely new user) → pre-merge behaviour ─
  const existingByOwner = await fetchEntityByOwner(admin, user.id);
  if (existingByOwner) {
    return { entity: existingByOwner, was_created: false };
  }

  const displayName = deriveDisplayName(user);
  const slugBase = deriveSlugBase(user, displayName);
  const slug = await generateUniqueSlug(admin, 'entities', slugBase);

  const row = {
    external_id: entityExternalId(),
    kind: 'human' as const,
    display_name: displayName,
    slug,
    owner_user_id: user.id,
  };

  const { data: inserted, error: insertErr } = await admin
    .from('entities')
    .insert(row)
    .select('id, external_id, kind, display_name, slug, owner_user_id, profile_id')
    .single();

  if (insertErr || !inserted) {
    if (insertErr?.code === '23505') {
      const raceWinner = await fetchEntityByOwner(admin, user.id);
      if (raceWinner) return { entity: raceWinner, was_created: false };
    }
    throw new Error(`entity insert failed: ${insertErr?.message ?? 'unknown'}`);
  }

  return { entity: inserted as EntityRow, was_created: true };
}

export async function deleteEntity(admin: SupabaseClient, id: number): Promise<void> {
  await admin.from('entities').delete().eq('id', id);
}

/**
 * Create an agent entity for Card 3 (Autonomous Agent).
 *
 * Phase 5 §D.1: like `findOrCreateTeamEntity` (Phase 4 §D.1), idempotency is
 * keyed on SLUG, not owner_user_id — a user may own multiple agents, each with
 * a distinct slug (registered via /api/join/agent, §E). The caller passes an
 * explicit, pre-validated slug; there is no auto-derivation here.
 *
 * Resolution:
 *   - Same owner re-submitting an existing slug → idempotent return (was_created=false).
 *   - Slug already taken (by this or another owner, racing inserts) → the
 *     underlying 23505 unique-violation is re-thrown with `code='23505'` intact
 *     so the route can map it to a 409 conflict.
 *
 * Caller is responsible for the corresponding agent_profiles row.
 *
 * The lazy enrich/keys path (no Card-3 signup, one-agent-per-email) goes through
 * `findOrCreateAgentEntityLazy` below, NOT this function directly.
 */
export async function findOrCreateAgentEntity(
  admin: SupabaseClient,
  user: User,
  agentName: string,
  slug: string,
): Promise<FindOrCreateResult> {
  const cleanName = agentName.trim();
  if (!cleanName) throw new Error('agent name is required');
  if (!slug) throw new Error('agent slug is required');

  // Idempotent: this owner re-submitting the same slug returns the existing agent.
  const { data: existing, error: existingErr } = await admin
    .from('entities')
    .select('id, external_id, kind, display_name, slug, owner_user_id, profile_id')
    .eq('kind', 'agent')
    .eq('slug', slug)
    .eq('owner_user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (existingErr && existingErr.code !== 'PGRST116') {
    throw new Error(`agent entity lookup failed: ${existingErr.message}`);
  }
  if (existing) return { entity: existing as EntityRow, was_created: false };

  const row = {
    external_id: entityExternalId(),
    kind: 'agent' as const,
    display_name: cleanName,
    slug,
    owner_user_id: user.id,
  };

  const { data: inserted, error: insertErr } = await admin
    .from('entities')
    .insert(row)
    .select('id, external_id, kind, display_name, slug, owner_user_id, profile_id')
    .single();

  if (insertErr || !inserted) {
    // 23505 = slug already taken (by this or another owner). Bubble up with the
    // code intact so the route maps it to a 409 conflict (mirrors team factory).
    if (insertErr?.code === '23505') {
      const conflict: Error & { code?: string } = new Error('agent slug already taken');
      conflict.code = '23505';
      throw conflict;
    }
    throw new Error(`agent entity insert failed: ${insertErr?.message ?? 'unknown'}`);
  }

  return { entity: inserted as EntityRow, was_created: true };
}

/** Agent slug rule (Phase 5 §D.3 / Adjustment 3): 3–40 chars, [a-z0-9-], no
 *  leading/trailing hyphen. Stricter than the generic entities slug. */
const AGENT_SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

/** lowercase, strip non-alphanumeric except hyphens, collapse + trim hyphens,
 *  cap at 40 chars (then re-trim a trailing hyphen left by the slice). */
function sanitizeAgentSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

/** Display name for a lazily-minted agent (no Card-3 signup). Adjustment 3:
 *  user_metadata.full_name, else "<email-local-part> agent", else "Agent". */
function deriveAgentDisplayName(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | null | undefined;
  const fullName = typeof meta?.full_name === 'string' ? meta.full_name.trim() : '';
  if (fullName) return fullName;
  const prefix = (user.email?.split('@')[0] ?? '').trim();
  return prefix ? `${prefix} agent` : 'Agent';
}

/** Deterministic lazy slug (Adjustment 3): <email-local-part>-agent, sanitized.
 *  If the local part contributes < 3 usable chars, fall back to a stable
 *  owner-keyed slug `agent-<first 8 of user.id>`. */
function deriveAgentLazySlug(user: User): string {
  const local = sanitizeAgentSlug(user.email?.split('@')[0] ?? '');
  if (local.length >= 3) {
    const base = sanitizeAgentSlug(`${local}-agent`);
    if (AGENT_SLUG_RE.test(base)) return base;
  }
  const idPart = user.id.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 8);
  return `agent-${idPart}`;
}

/**
 * Lazy agent-entity resolution for the non-signup paths (/api/enrich receipt
 * attribution, /api/keys agent-mode key gen). Phase 5 §D.3 / Adjustment 3.
 *
 * Preserves the legacy "one agent per email/owner" guarantee: an owner-keyed
 * pre-check returns any existing agent regardless of its slug, so repeat lazy
 * mints never create duplicates (the slug-keyed primary alone would, since the
 * derived slug can diverge from a previously hex-suffixed row). Multi-agent
 * per owner is reserved for explicit Card-3 signups via the primary factory.
 *
 * Slug is derived deterministically from the email; on a cross-owner slug
 * collision (23505) it retries ONCE with a 4-char hex suffix.
 */
export async function findOrCreateAgentEntityLazy(
  admin: SupabaseClient,
  user: User,
): Promise<FindOrCreateResult> {
  // One agent per owner on the lazy path — return any existing one by owner.
  const { data: existing, error: existingErr } = await admin
    .from('entities')
    .select('id, external_id, kind, display_name, slug, owner_user_id, profile_id')
    .eq('owner_user_id', user.id)
    .eq('kind', 'agent')
    .limit(1)
    .maybeSingle();
  if (existingErr && existingErr.code !== 'PGRST116') {
    throw new Error(`agent entity lookup failed: ${existingErr.message}`);
  }
  if (existing) return { entity: existing as EntityRow, was_created: false };

  const displayName = deriveAgentDisplayName(user);
  const slug = deriveAgentLazySlug(user);
  try {
    return await findOrCreateAgentEntity(admin, user, displayName, slug);
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === '23505') {
      // Cross-owner slug collision — retry once with a short random suffix.
      const hex = Math.random().toString(16).slice(2, 6);
      const retrySlug = sanitizeAgentSlug(`${slug}-${hex}`);
      return await findOrCreateAgentEntity(admin, user, displayName, retrySlug);
    }
    throw err;
  }
}

/**
 * Create a team entity for Card 2 (Team / Agency / Studio).
 *
 * Phase 4 §D.1 (Adjustment 1): idempotency is keyed on SLUG, not
 * owner_user_id — a user may own multiple teams, each with a distinct slug.
 * The caller passes an explicit, pre-validated slug (no auto-derivation here).
 *
 * Resolution:
 *   - Same owner re-submitting an existing slug → idempotent return (was_created=false).
 *   - Slug already taken (by this or another owner, racing inserts) → the
 *     underlying 23505 unique-violation is re-thrown with `code='23505'`
 *     intact so the route can map it to a 409 conflict.
 *
 * Caller is responsible for the corresponding team_profiles + team_admins rows.
 */
export async function findOrCreateTeamEntity(
  admin: SupabaseClient,
  user: User,
  teamName: string,
  slug: string,
): Promise<FindOrCreateResult> {
  const cleanName = teamName.trim();
  if (!cleanName) throw new Error('team name is required');
  if (!slug) throw new Error('team slug is required');

  // Idempotent: this owner re-submitting the same slug returns the existing team.
  const { data: existing, error: existingErr } = await admin
    .from('entities')
    .select('id, external_id, kind, display_name, slug, owner_user_id, profile_id')
    .eq('kind', 'team')
    .eq('slug', slug)
    .eq('owner_user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (existingErr && existingErr.code !== 'PGRST116') {
    throw new Error(`team entity lookup failed: ${existingErr.message}`);
  }
  if (existing) return { entity: existing as EntityRow, was_created: false };

  const row = {
    external_id: entityExternalId(),
    kind: 'team' as const,
    display_name: cleanName,
    slug,
    owner_user_id: user.id,
  };

  const { data: inserted, error: insertErr } = await admin
    .from('entities')
    .insert(row)
    .select('id, external_id, kind, display_name, slug, owner_user_id, profile_id')
    .single();

  if (insertErr || !inserted) {
    // 23505 = slug already taken (by this or another owner). Bubble up with the
    // code intact so the route maps it to a 409 conflict (Phase 4 §D.1 / §E).
    if (insertErr?.code === '23505') {
      const conflict: Error & { code?: string } = new Error('team slug already taken');
      conflict.code = '23505';
      throw conflict;
    }
    throw new Error(`team entity insert failed: ${insertErr?.message ?? 'unknown'}`);
  }

  return { entity: inserted as EntityRow, was_created: true };
}

/**
 * Create an org entity (unification Stage 1).
 *
 * Mirrors `findOrCreateTeamEntity` EXACTLY — same slug-keyed idempotency, same
 * external_id generation, same 23505 conflict re-throw, same return shape — with
 * the single difference that it inserts kind='org' instead of kind='team'. The
 * unified org model treats team and hiring company as one entity kind; this is
 * the factory that mints it.
 *
 * INERT as of Stage 1: nothing calls this yet. Stage 2 wires it into the
 * signup/create paths. `findOrCreateTeamEntity` stays the live team factory
 * until later stages migrate teams onto the org kind.
 *
 * Caller is responsible for the corresponding org profile + team_admins rows.
 */
export async function findOrCreateOrgEntity(
  admin: SupabaseClient,
  user: User,
  orgName: string,
  slug: string,
): Promise<FindOrCreateResult> {
  const cleanName = orgName.trim();
  if (!cleanName) throw new Error('org name is required');
  if (!slug) throw new Error('org slug is required');

  // Idempotent: this owner re-submitting the same slug returns the existing org.
  const { data: existing, error: existingErr } = await admin
    .from('entities')
    .select('id, external_id, kind, display_name, slug, owner_user_id, profile_id')
    .eq('kind', 'org')
    .eq('slug', slug)
    .eq('owner_user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (existingErr && existingErr.code !== 'PGRST116') {
    throw new Error(`org entity lookup failed: ${existingErr.message}`);
  }
  if (existing) return { entity: existing as EntityRow, was_created: false };

  const row = {
    external_id: entityExternalId(),
    kind: 'org' as const,
    display_name: cleanName,
    slug,
    owner_user_id: user.id,
  };

  const { data: inserted, error: insertErr } = await admin
    .from('entities')
    .insert(row)
    .select('id, external_id, kind, display_name, slug, owner_user_id, profile_id')
    .single();

  if (insertErr || !inserted) {
    // 23505 = slug already taken (by this or another owner). Bubble up with the
    // code intact so the route maps it to a 409 conflict (mirrors team factory).
    if (insertErr?.code === '23505') {
      const conflict: Error & { code?: string } = new Error('org slug already taken');
      conflict.code = '23505';
      throw conflict;
    }
    throw new Error(`org entity insert failed: ${insertErr?.message ?? 'unknown'}`);
  }

  return { entity: inserted as EntityRow, was_created: true };
}


/**
 * Resolve the entity kind for a given owner_user_id by querying entities directly.
 * Used by /api/enrich to route receipt subject resolution through the right entity
 * (agent / team / human) when called via API-key auth.
 *
 * Phase 4 §D.2 (Adjustment 1): scope drives the kind, not the user's entity
 * inventory. The API key's scope is passed as `hintScope`; a user who owns a
 * human + a team entity resolves to 'team' only when a team:rw key was used.
 *
 *   - hintScope === 'team:rw'  → return 'team' if a team entity exists (else fall through)
 *   - hintScope === 'agent:rw' → return 'agent' if an agent entity exists (else fall through)
 *   - otherwise (no hint, builder:rw, buyer:rw) → prefer human → agent → team → null
 *
 * Note: this does NOT touch the profiles.entity_id ↔ entities.profile_id link contract,
 * which remains human-only per Spec §0. Agent and team entities have no profile link.
 */
export async function resolveEntityKindForOwner(
  admin: SupabaseClient,
  userId: string,
  hintScope?: 'builder:rw' | 'buyer:rw' | 'agent:rw' | 'team:rw',
): Promise<'agent' | 'team' | 'human' | null> {
  // Scope-driven short-circuits: the key's scope picks the identity when the
  // user owns more than one kind.
  if (hintScope === 'team:rw') {
    const { data: teamRow } = await admin
      .from('entities')
      .select('id')
      .eq('owner_user_id', userId)
      .eq('kind', 'team')
      .limit(1)
      .maybeSingle()
    if (teamRow) return 'team'
    // fall through if the team-scoped key's owner has no team entity
  }
  if (hintScope === 'agent:rw') {
    const { data: agentRow } = await admin
      .from('entities')
      .select('id')
      .eq('owner_user_id', userId)
      .eq('kind', 'agent')
      .limit(1)
      .maybeSingle()
    if (agentRow) return 'agent'
    // fall through
  }

  // Default resolution (no hint / builder:rw / buyer:rw): human → agent → team.
  const { data: humanRow } = await admin
    .from('entities')
    .select('id')
    .eq('owner_user_id', userId)
    .eq('kind', 'human')
    .limit(1)
    .maybeSingle()
  if (humanRow) return 'human'

  const { data: agentRow } = await admin
    .from('entities')
    .select('id')
    .eq('owner_user_id', userId)
    .eq('kind', 'agent')
    .limit(1)
    .maybeSingle()
  if (agentRow) return 'agent'

  const { data: teamRow } = await admin
    .from('entities')
    .select('id')
    .eq('owner_user_id', userId)
    .eq('kind', 'team')
    .limit(1)
    .maybeSingle()
  if (teamRow) return 'team'

  return null
}

/**
 * Resolve the principal an agent acts on behalf of (Phase 5 §D.2).
 *
 * The principal is stored on agent_profiles.principal_entity_id:
 *   - NOT NULL → that entity (a team the owner admins, or any human/team).
 *   - NULL     → default to the agent owner's human entity.
 *
 * Returns null gracefully when:
 *   - no agent_profiles row exists for this agent entity, OR
 *   - an explicit principal points at a missing / non-human-non-team entity, OR
 *   - the default path applies but the owner has no human entity (the
 *     operator-owned seed-and-verify agent hits this — §L).
 *
 * Used by /agent/[slug], agent-org.ts JSON-LD, and /api/v1/agent[/slug].
 */
export async function resolveAgentPrincipal(
  admin: SupabaseClient,
  agentEntityId: number,
): Promise<{ kind: 'human' | 'team'; entity_id: number; slug: string; display_name: string } | null> {
  const { data: profile, error: profileErr } = await admin
    .from('agent_profiles')
    .select('principal_entity_id')
    .eq('entity_id', agentEntityId)
    .maybeSingle();
  if (profileErr && profileErr.code !== 'PGRST116') {
    throw new Error(`agent_profiles lookup failed: ${profileErr.message}`);
  }
  if (!profile) return null;

  // Explicit principal → resolve it (must be human or team).
  if (profile.principal_entity_id != null) {
    const ent = await fetchEntityById(admin, profile.principal_entity_id);
    if (ent && (ent.kind === 'human' || ent.kind === 'team')) {
      return { kind: ent.kind, entity_id: ent.id, slug: ent.slug, display_name: ent.display_name };
    }
    return null; // dangling or wrong-kind principal — degrade gracefully
  }

  // Default → the agent owner's human entity.
  const agentEnt = await fetchEntityById(admin, agentEntityId);
  if (!agentEnt) return null;
  const human = await fetchEntityByOwner(admin, agentEnt.owner_user_id); // kind='human'
  if (human) {
    return { kind: 'human', entity_id: human.id, slug: human.slug, display_name: human.display_name };
  }
  return null;
}
