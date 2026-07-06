/**
 * Enrichment adapter — Profile→Engine (REAL CHAIN).
 *
 * Wires the populated `profiles` graph into the existing /paste engine for
 * the D5 cohort (18 verified individual builders). The adapter traverses
 * the same code path as a real /paste publish, stopping only before
 * publishProofReceipt / findOrCreateHumanEntity.
 *
 * Spec: docs/decisions/DISCOVERY_enrichment_adapter.md
 *
 * Chain (real engine functions — NO reimplementations):
 *   validateUrl → classifyUrl → analyzePastedUrl → classifyAtlasRoles
 *
 * Per-artifact event_type rule (from spec, overrides classifier.ts's
 * SOURCE_TO_EVENT_TYPE table because the cohort-enrichment defaults differ
 * from the /paste flow's defaults):
 *   github (with repo path) / github (profile root) → published_repo
 *   vercel/netlify/replit/lovable/bolt/v0/generic   → shipped_site
 *   mcp_server                                       → deployed_mcp_server
 *   UPGRADED to shipped_agent when linked post outcome prose signals
 *     autonomous/agent operation
 *   UPGRADED to shipped_app when linked post outcome prose signals
 *     production app (only if default is shipped_site)
 *
 * URL gate:
 *   1. validateUrl(raw) from classifier.ts — throws InvalidUrlError on
 *      bad scheme / unparseable / oversized / shipstacked.com.
 *   2. Post-validateUrl path-suspect guard (this module): rejects any URL
 *      whose pathname contains encoded whitespace (`%20`) or four-or-more
 *      consecutive dots. Catches Yuki-class strings that new URL() parses
 *      leniently but are actually trailing-prose-garbage.
 *
 * Dry-run mode only: this module performs read + classify; it never calls
 * publishProofReceipt or findOrCreateHumanEntity.
 *
 * Runtime: must be loaded under `tsx` (or via Next.js build) for the `@/`
 * path aliases to resolve. Plain `node --experimental-strip-types` will
 * fail on analyzer/classifier's runtime @/ imports — that's why the
 * companion script uses `npx tsx`.
 */

import { createHash } from 'node:crypto'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type {
  EventType,
  Artifact,
  StackElement,
  Outcome,
} from '@/schemas/proof-receipt-v0.1'
import {
  validateUrl,
  classifyUrl,
  InvalidUrlError,
  type ClassifyResult,
} from '@/lib/paste/classifier'
import { analyzePastedUrl, type AnalyzeResponse } from '@/lib/paste/analyzer'
import type { ClassifierSource } from '@/lib/paste/sources'
import {
  classifyAtlasRoles,
  type AtlasClassifierInput,
  type AtlasClassifierResult,
} from '@/services/atlas-classifier'
import { findOrCreateHumanEntity, type EntityRow } from '@/lib/entities'
import { publishProofReceipt, type PasteDraft } from '@/lib/paste/publish'
import { normalizeUrl } from '@/lib/url/normalize'

// Batch 5: dedupe_key format = sha256(subject_id|normalized_artifact_url|event_type).
// Both the adapter (write site) and /api/enrich orchestration must use this
// exact format so the unique partial index on proof_receipts.dedupe_key
// correctly rejects duplicate enrichments of the same artifact for the same
// entity at the same event_type.
export function computeReceiptDedupeKey(
  subjectId: number,
  normalizedUrl: string,
  eventType: EventType,
): string {
  return createHash('sha256')
    .update(`${subjectId}|${normalizedUrl}|${eventType}`)
    .digest('hex')
}

// ───────────────────────── post-validateUrl URL guard ──────────────────────
// Catches URLs that validateUrl + new URL() accept but are obviously prose
// garbage with `https://` accidentally on the front (Yuki-class).
//
// Batch 7a expansion: the original guard checked url.pathname only, but the
// Yuki receipt (id=45) stored its trailing prose in the query string — junk
// hid in url.search, the pathname was just "/", the guard let it through.
// Now checks pathname + search + hash, plus the raw string for any literal
// whitespace (defense in depth on top of validateUrl's whitespace rejection).

export function isUrlSuspect(url: URL, raw: string): { suspect: boolean; reason?: string } {
  if (/\s/.test(raw)) {
    return { suspect: true, reason: 'raw URL string contains whitespace' }
  }
  const components = url.pathname + url.search + url.hash
  if (/%20/i.test(components)) {
    return { suspect: true, reason: 'URL components contain encoded whitespace (%20…)' }
  }
  if (/\.{4,}/.test(url.pathname)) {
    return { suspect: true, reason: 'path contains "…." (4+ consecutive dots)' }
  }
  return { suspect: false }
}

// ───────────────────────── event_type chooser ────────────────────────────────
// Implements the discovery-doc rule. Reuses `ClassifierSource` from sources.ts
// for the host-classification dimension; adds the post-outcome-prose upgrade.

function chooseEventType(
  url: URL,
  source: ClassifierSource,
  postOutcome: string | null,
): { event_type: EventType; basis: string } {
  const host = url.hostname.toLowerCase()
  const isGithub = host === 'github.com' || host === 'www.github.com'

  let defaultType: EventType
  let basis: string

  // Github branch must check host directly: ClassifierSource returns 'github'
  // only for paths with ≥2 segments (per sources.ts:detectSourceFromUrl).
  // Profile roots (path ≤ 1 segment) come back as 'generic', but per the
  // discovery doc spec they must still resolve to published_repo.
  if (isGithub) {
    const segments = url.pathname.split('/').filter(Boolean)
    if (segments.length >= 2) {
      defaultType = 'published_repo'
      basis = 'host=github.com (repo path) → published_repo'
    } else {
      defaultType = 'published_repo'
      basis = 'host=github.com (profile root, no repo) → published_repo'
    }
  } else if (source === 'mcp_server') {
    return {
      event_type: 'deployed_mcp_server',
      basis: 'classifyUrl detected mcp_server signal → deployed_mcp_server',
    }
  } else if (
    source === 'vercel' ||
    source === 'netlify' ||
    source === 'replit' ||
    source === 'lovable' ||
    source === 'bolt' ||
    source === 'v0'
  ) {
    defaultType = 'shipped_site'
    basis = `host=${url.hostname} (deployment platform: ${source}) → shipped_site`
  } else {
    defaultType = 'shipped_site'
    basis = `host=${url.hostname} (source=generic) → shipped_site`
  }

  if (postOutcome) {
    const lower = postOutcome.toLowerCase()
    const agentSignal = /\b(autonomous|agent|agents|agentic)\b/.test(lower)
    const productionRunning =
      /\b(production|24\/7|running|live|deployed|in production|production-grade)\b/.test(lower)
    const systemSignal = /\b(system|service|platform|infrastructure)\b/.test(lower)
    const appSignal = /\b(app|application)\b/.test(lower)

    if (agentSignal && (productionRunning || systemSignal)) {
      return {
        event_type: 'shipped_agent',
        basis: `${basis} + outcome signals autonomous/agent system → upgraded to shipped_agent`,
      }
    }
    if (defaultType === 'shipped_site' && (productionRunning || appSignal)) {
      return {
        event_type: 'shipped_app',
        basis: `${basis} + outcome signals production app → upgraded to shipped_app`,
      }
    }
  }

  return { event_type: defaultType, basis }
}

// ───────────────────────── data shapes ───────────────────────────────────────

interface ProfileRow {
  id: string
  user_id: string | null
  username: string
  full_name: string | null
  bio: string | null
  role: string | null
  github_url: string | null
  website_url: string | null
}

interface ProjectRow {
  profile_id: string
  title: string | null
  project_url: string | null
  description: string | null
}

interface PostRow {
  profile_id: string
  title: string | null
  url: string | null
  outcome: string | null
}

export type CandidateSourceTable = 'profile.github_url' | 'project.project_url' | 'post.url'
export type SkipReason =
  | 'malformed_url'
  | 'malformed_url_path_suspect'
  | 'no_artifact_url'
  | 'pipeline_error'

interface CandidateArtifact {
  source: CandidateSourceTable
  source_row_label: string
  raw_url: string
  linked_post_title: string | null
  linked_post_outcome: string | null
  linked_project_title: string | null
  linked_project_description: string | null
}

interface NormalizedArtifact {
  url: URL
  normalized_url: string
  contributing: CandidateArtifact[]
}

export interface SkippedArtifact {
  profile_username: string
  raw_url: string | null
  source: CandidateSourceTable
  source_row_label: string
  reason: SkipReason
  detail?: string
}

export interface DedupeCollapse {
  profile_username: string
  normalized_url: string
  source_labels: string[]
  count: number
}

export interface WouldBeReceipt {
  profile_username: string
  artifact_url: string
  raw_url: string
  event_type: EventType
  event_type_basis: string
  title: string
  description: string
  capabilities: string[]
  stack_summary: string[] // human-readable "name (role)" — for review
  atlas_roles: string[]
  atlas_confidence: number
  atlas_reasoning: string
  classifier_version: string
  url_reachable: boolean
  url_http_status: number
  url_source: ClassifierSource
  title_provenance: 'post' | 'project' | 'analyzer' | 'profile'
  description_provenance: 'post' | 'project' | 'analyzer' | 'profile'
  outcomes_suggestions_count: number // from real analyzer; not promoted to receipt in dry-run
}

export interface DryRunReport {
  builders_processed: number
  per_builder: Array<{
    username: string
    full_name: string | null
    would_be_receipts: WouldBeReceipt[]
    skipped: SkippedArtifact[]
  }>
  skipped: SkippedArtifact[]
  dedupes: DedupeCollapse[]
  // Per operator decision: #4 (missing-https typos), #5 (unreachable URLs),
  // #6 (low-confidence github-root receipts) are ACCEPTED, not errors.
  // Surfaced here for visibility but do not block real-write.
  accepted_observations: {
    unreachable_but_classified: Array<{ username: string; artifact_url: string; http_status: number }>
    low_confidence_github_root: Array<{ username: string; artifact_url: string; confidence: number }>
    malformed_typos: Array<{ username: string; raw_url: string; source: CandidateSourceTable }>
  }
  totals: {
    receipts_would_create: number
    artifacts_skipped: number
    artifacts_skipped_by_reason: Record<string, number>
    dedupes_collapsed: number
    builders_with_zero_receipts: string[]
  }
}

// ───────────────────────── candidate gathering ──────────────────────────────

function gatherCandidates(
  profile: ProfileRow,
  projects: ProjectRow[],
  posts: PostRow[],
): { candidates: CandidateArtifact[]; nullPosts: PostRow[] } {
  const candidates: CandidateArtifact[] = []
  const nullPosts: PostRow[] = []

  if (profile.github_url && profile.github_url.trim().length > 0) {
    candidates.push({
      source: 'profile.github_url',
      source_row_label: 'profile.github_url',
      raw_url: profile.github_url,
      linked_post_title: null,
      linked_post_outcome: null,
      linked_project_title: null,
      linked_project_description: null,
    })
  }

  for (const p of projects) {
    if (!p.project_url || p.project_url.trim().length === 0) continue
    candidates.push({
      source: 'project.project_url',
      source_row_label: `project:${(p.title ?? '(untitled)').slice(0, 60)}`,
      raw_url: p.project_url,
      linked_post_title: null,
      linked_post_outcome: null,
      linked_project_title: p.title,
      linked_project_description: p.description,
    })
  }

  for (const p of posts) {
    if (!p.url || p.url.trim().length === 0) {
      nullPosts.push(p)
      continue
    }
    candidates.push({
      source: 'post.url',
      source_row_label: `post:${(p.title ?? '(untitled)').slice(0, 60)}`,
      raw_url: p.url,
      linked_post_title: p.title,
      linked_post_outcome: p.outcome,
      linked_project_title: null,
      linked_project_description: null,
    })
  }

  return { candidates, nullPosts }
}

// ───────────────────────── dedupe ────────────────────────────────────────────
// Normalize key matches classifier.ts:normalizeUrlForCache — protocol://host/path,
// host lowercased, trailing slash stripped on non-root.

function normalizeKey(url: URL): string {
  const path = url.pathname === '/' ? '/' : url.pathname.replace(/\/+$/, '')
  return `${url.protocol}//${url.hostname.toLowerCase()}${path}`
}

interface ValidationOutcome {
  ok: boolean
  url?: URL
  skip?: { reason: SkipReason; detail: string }
}

function validateAndGuard(rawUrl: string): ValidationOutcome {
  let parsed: URL
  try {
    // Stage B3: heal schemeless raw-stored URLs (e.g. "github.com/me") by
    // prepending https:// before validation. validateUrl itself is unchanged
    // (still strict https-only); null → '' preserves the prior skip behavior.
    parsed = validateUrl(normalizeUrl(rawUrl) ?? '')
  } catch (err) {
    const detail = err instanceof InvalidUrlError ? err.reason : String(err)
    return { ok: false, skip: { reason: 'malformed_url', detail } }
  }
  const suspect = isUrlSuspect(parsed, rawUrl.trim())
  if (suspect.suspect) {
    return { ok: false, skip: { reason: 'malformed_url_path_suspect', detail: suspect.reason ?? 'suspect URL' } }
  }
  return { ok: true, url: parsed }
}

function validateAndDedupe(candidates: CandidateArtifact[]): {
  normalized: NormalizedArtifact[]
  invalid: Array<{ candidate: CandidateArtifact; reason: SkipReason; detail: string }>
} {
  const byKey = new Map<string, NormalizedArtifact>()
  const invalid: Array<{ candidate: CandidateArtifact; reason: SkipReason; detail: string }> = []

  for (const c of candidates) {
    const v = validateAndGuard(c.raw_url)
    if (!v.ok) {
      invalid.push({ candidate: c, reason: v.skip!.reason, detail: v.skip!.detail })
      continue
    }
    const key = normalizeKey(v.url!)
    const existing = byKey.get(key)
    if (existing) {
      existing.contributing.push(c)
    } else {
      byKey.set(key, { url: v.url!, normalized_url: key, contributing: [c] })
    }
  }

  return { normalized: [...byKey.values()], invalid }
}

// ───────────────────────── content (title/description) ──────────────────────

interface ChosenContent {
  title: string
  description: string
  title_provenance: 'post' | 'project' | 'analyzer' | 'profile'
  description_provenance: 'post' | 'project' | 'analyzer' | 'profile'
  outcome_text: string | null
}

function chooseContent(
  artifact: NormalizedArtifact,
  profile: ProfileRow,
  analyzed: AnalyzeResponse,
): ChosenContent {
  let title: string | null = null
  let description: string | null = null
  let titleProvenance: ChosenContent['title_provenance'] = 'analyzer'
  let descriptionProvenance: ChosenContent['description_provenance'] = 'analyzer'
  let outcomeText: string | null = null

  // Post > project > analyzer drafts > profile (spec: post is primary)
  for (const c of artifact.contributing) {
    if (c.source === 'post.url') {
      if (!title && c.linked_post_title && c.linked_post_title.trim().length > 0) {
        title = c.linked_post_title.trim()
        titleProvenance = 'post'
      }
      if (!description && c.linked_post_outcome && c.linked_post_outcome.trim().length > 0) {
        description = c.linked_post_outcome.trim()
        descriptionProvenance = 'post'
      }
      if (!outcomeText && c.linked_post_outcome && c.linked_post_outcome.trim().length > 0) {
        outcomeText = c.linked_post_outcome.trim()
      }
    }
  }
  for (const c of artifact.contributing) {
    if (c.source === 'project.project_url') {
      if (!title && c.linked_project_title && c.linked_project_title.trim().length > 0) {
        title = c.linked_project_title.trim()
        titleProvenance = 'project'
      }
      if (
        !description &&
        c.linked_project_description &&
        c.linked_project_description.trim().length > 0
      ) {
        description = c.linked_project_description.trim()
        descriptionProvenance = 'project'
      }
    }
  }
  if (!title && analyzed.title_draft && analyzed.title_draft.trim().length > 0) {
    title = analyzed.title_draft.trim()
    titleProvenance = 'analyzer'
  }
  if (!description && analyzed.description_draft && analyzed.description_draft.trim().length > 0) {
    description = analyzed.description_draft.trim()
    descriptionProvenance = 'analyzer'
  }
  if (!title) {
    title =
      profile.full_name && profile.role
        ? `${profile.full_name} — ${profile.role}`
        : (profile.full_name ?? profile.username)
    titleProvenance = 'profile'
  }
  if (!description) {
    description = profile.bio ?? `Artifact from ${profile.full_name ?? profile.username}`
    descriptionProvenance = 'profile'
  }

  return {
    title: title.slice(0, 160),
    description: description.slice(0, 500),
    title_provenance: titleProvenance,
    description_provenance: descriptionProvenance,
    outcome_text: outcomeText,
  }
}

// ───────────────────────── per-artifact pipeline ────────────────────────────

async function processArtifact(
  profile: ProfileRow,
  artifact: NormalizedArtifact,
): Promise<WouldBeReceipt> {
  // Real chain: classifyUrl → analyzePastedUrl → classifyAtlasRoles
  const classified: ClassifyResult = await classifyUrl(artifact.url)
  const analyzed: AnalyzeResponse = await analyzePastedUrl({
    url: artifact.url,
    source: classified.source,
    classifierMetadata: classified.metadata,
  })

  const content = chooseContent(artifact, profile, analyzed)
  const et = chooseEventType(artifact.url, classified.source, content.outcome_text)

  // Use analyzer artifacts when present (real extractor signal). Fall back to
  // a single synthetic artifact only if the analyzer returned none.
  const artifacts: Artifact[] =
    analyzed.artifacts.length > 0
      ? analyzed.artifacts
      : [
          {
            kind:
              et.event_type === 'published_repo'
                ? 'repo'
                : et.event_type === 'shipped_site'
                  ? 'url'
                  : 'deployment',
            url: artifact.normalized_url,
            title: content.title,
          },
        ]

  const atlasInput: AtlasClassifierInput = {
    event_type: et.event_type,
    title: content.title,
    description: content.description,
    artifacts,
    stack: analyzed.stack,
    capabilities: analyzed.capabilities,
  }
  const atlasResult = await classifyAtlasRoles(atlasInput)

  const stackSummary: string[] = (analyzed.stack ?? []).map(
    (s: StackElement) => `${s.name}${s.version ? ` ${s.version}` : ''} (${s.role})`,
  )

  return {
    profile_username: profile.username,
    artifact_url: artifact.normalized_url,
    raw_url: artifact.contributing[0].raw_url,
    event_type: et.event_type,
    event_type_basis: et.basis,
    title: content.title,
    description: content.description,
    capabilities: analyzed.capabilities,
    stack_summary: stackSummary,
    atlas_roles: atlasResult.inferred,
    atlas_confidence: atlasResult.confidence,
    atlas_reasoning: atlasResult.reasoning,
    classifier_version: atlasResult.classifier_version,
    url_reachable: classified.reachable,
    url_http_status: classified.http_status,
    url_source: classified.source,
    title_provenance: content.title_provenance,
    description_provenance: content.description_provenance,
    outcomes_suggestions_count: (analyzed.outcomes_suggestions ?? []).length,
  }
}

// ───────────────────────── top-level ─────────────────────────────────────────

export async function runDryRun(
  admin: SupabaseClient,
  usernames: readonly string[],
  log: (msg: string) => void = () => {},
): Promise<DryRunReport> {
  const report: DryRunReport = {
    builders_processed: 0,
    per_builder: [],
    skipped: [],
    dedupes: [],
    accepted_observations: {
      unreachable_but_classified: [],
      low_confidence_github_root: [],
      malformed_typos: [],
    },
    totals: {
      receipts_would_create: 0,
      artifacts_skipped: 0,
      artifacts_skipped_by_reason: {},
      dedupes_collapsed: 0,
      builders_with_zero_receipts: [],
    },
  }

  const { data: profiles, error: pErr } = await admin
    .from('profiles')
    .select('id, user_id, username, full_name, bio, role, github_url, website_url')
    .in('username', usernames as string[])
  if (pErr) throw pErr

  const byUsername = new Map<string, ProfileRow>()
  for (const p of (profiles as ProfileRow[] | null) ?? []) byUsername.set(p.username, p)

  for (const username of usernames) {
    const profile = byUsername.get(username)
    if (!profile) {
      log(`[adapter] profile not found: ${username}`)
      continue
    }

    const [{ data: projects, error: e1 }, { data: posts, error: e2 }] = await Promise.all([
      admin
        .from('projects')
        .select('profile_id, title, project_url, description')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: true }),
      admin
        .from('posts')
        .select('profile_id, title, url, outcome')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: true }),
    ])
    if (e1) throw e1
    if (e2) throw e2

    const { candidates, nullPosts } = gatherCandidates(
      profile,
      (projects as ProjectRow[] | null) ?? [],
      (posts as PostRow[] | null) ?? [],
    )

    const builderSkipped: SkippedArtifact[] = []
    for (const np of nullPosts) {
      const s: SkippedArtifact = {
        profile_username: profile.username,
        raw_url: null,
        source: 'post.url',
        source_row_label: `post:${(np.title ?? '(untitled)').slice(0, 60)}`,
        reason: 'no_artifact_url',
      }
      builderSkipped.push(s)
      report.skipped.push(s)
    }

    const { normalized, invalid } = validateAndDedupe(candidates)
    for (const inv of invalid) {
      const s: SkippedArtifact = {
        profile_username: profile.username,
        raw_url: inv.candidate.raw_url,
        source: inv.candidate.source,
        source_row_label: inv.candidate.source_row_label,
        reason: inv.reason,
        detail: inv.detail,
      }
      builderSkipped.push(s)
      report.skipped.push(s)

      // #4 — missing-https typos surfaced as "malformed_typos" accepted observation
      // (operator: recorded fixable-at-source-later, not an error).
      if (inv.reason === 'malformed_url' && inv.detail === 'URL is not parseable') {
        report.accepted_observations.malformed_typos.push({
          username: profile.username,
          raw_url: inv.candidate.raw_url,
          source: inv.candidate.source,
        })
      }
    }

    for (const n of normalized) {
      if (n.contributing.length > 1) {
        report.dedupes.push({
          profile_username: profile.username,
          normalized_url: n.normalized_url,
          source_labels: n.contributing.map((c) => c.source_row_label),
          count: n.contributing.length,
        })
      }
    }

    const wouldBe: WouldBeReceipt[] = []
    for (const artifact of normalized) {
      log(`[adapter] ${profile.username} → ${artifact.normalized_url}`)
      try {
        const r = await processArtifact(profile, artifact)
        wouldBe.push(r)

        // #5 — unreachable but classified
        if (!r.url_reachable) {
          report.accepted_observations.unreachable_but_classified.push({
            username: profile.username,
            artifact_url: r.artifact_url,
            http_status: r.url_http_status,
          })
        }
        // #6 — github-root receipts with low confidence (< 0.30)
        if (
          r.event_type_basis.includes('profile root') &&
          r.atlas_confidence < 0.3
        ) {
          report.accepted_observations.low_confidence_github_root.push({
            username: profile.username,
            artifact_url: r.artifact_url,
            confidence: r.atlas_confidence,
          })
        }
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err)
        log(`[adapter] ERROR ${artifact.normalized_url}: ${detail}`)
        report.skipped.push({
          profile_username: profile.username,
          raw_url: artifact.normalized_url,
          source: artifact.contributing[0].source,
          source_row_label: artifact.contributing[0].source_row_label,
          reason: 'pipeline_error',
          detail,
        })
      }
    }

    report.per_builder.push({
      username: profile.username,
      full_name: profile.full_name,
      would_be_receipts: wouldBe,
      skipped: builderSkipped,
    })
    report.builders_processed += 1
    if (wouldBe.length === 0) {
      report.totals.builders_with_zero_receipts.push(profile.username)
    }
  }

  report.totals.receipts_would_create = report.per_builder.reduce(
    (acc, b) => acc + b.would_be_receipts.length,
    0,
  )
  report.totals.artifacts_skipped = report.skipped.length
  for (const s of report.skipped) {
    report.totals.artifacts_skipped_by_reason[s.reason] =
      (report.totals.artifacts_skipped_by_reason[s.reason] ?? 0) + 1
  }
  report.totals.dedupes_collapsed = report.dedupes.length

  return report
}

// Re-export the Outcome type so the script's type imports stay co-located.
export type { Outcome }

// ════════════════════════════════════════════════════════════════════════════
// WRITE MODE — actually commits proof_receipts + entities for the cohort.
// Mirrors runDryRun's chain, then calls findOrCreateHumanEntity +
// publishProofReceipt at the end. Per-artifact failures are caught and
// logged; the batch does NOT abort on a single bad classify or publish.
// ════════════════════════════════════════════════════════════════════════════

export interface WrittenReceipt {
  profile_username: string
  artifact_url: string
  raw_url: string
  event_type: EventType
  event_type_basis: string
  title: string
  description: string
  atlas_roles: string[]
  atlas_confidence: number
  url_reachable: boolean
  url_http_status: number
  receipt_db_id: number
  receipt_external_id: string
  receipt_slug: string
  receipt_canonical_url: string
  entity_canonical_url: string
  verification_level: 'L0_claimed' | 'L1_artifact_confirmed'
  entity_was_created: boolean
}

export interface WriteFailure {
  profile_username: string
  artifact_url: string
  // 'duplicate' is not a real failure — it indicates the receipt already
  // exists (per dedupe_key unique partial index) and was skipped at the
  // DB level. Orchestrators count duplicates separately from failures.
  stage: 'fetch_user' | 'classify_url' | 'analyze' | 'classify_atlas' | 'publish' | 'pipeline' | 'duplicate'
  error: string
}

export interface WriteReport {
  builders_processed: number
  per_builder: Array<{
    username: string
    full_name: string | null
    written: WrittenReceipt[]
    skipped: SkippedArtifact[]
    failures: WriteFailure[]
  }>
  written_flat: WrittenReceipt[]
  skipped: SkippedArtifact[]
  failures: WriteFailure[]
  dedupes: DedupeCollapse[]
  totals: {
    receipts_written: number
    entities_created: number
    artifacts_skipped: number
    artifacts_skipped_by_reason: Record<string, number>
    artifacts_failed: number
    artifacts_failed_by_stage: Record<string, number>
    dedupes_collapsed: number
    builders_with_zero_receipts: string[]
  }
}

async function fetchAuthUser(admin: SupabaseClient, userId: string): Promise<User> {
  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error || !data?.user) {
    throw new Error(`getUserById(${userId}) failed: ${error?.message ?? 'no user'}`)
  }
  return data.user
}

function buildPasteDraft(args: {
  url: string
  source: ClassifierSource
  event_type: EventType
  title: string
  description: string
  artifacts: Artifact[]
  stack: StackElement[]
  outcomes: Outcome[]
  capabilities: string[]
  atlas: AtlasClassifierResult
  reachable: boolean
  occurredAt?: string | null
}): PasteDraft {
  // PasteDraft.title is max 80; AtlasClassifierInput.title is max 160.
  // The classifier already saw the longer version; truncate for storage.
  const titleTruncated = args.title.length > 80 ? args.title.slice(0, 79) + '…' : args.title
  const descriptionTrimmed =
    args.description.length > 2000 ? args.description.slice(0, 1999) + '…' : args.description
  const occurred = args.occurredAt ?? new Date().toISOString()
  return {
    url: args.url,
    source: args.source,
    event_type: args.event_type,
    title: titleTruncated,
    description: descriptionTrimmed,
    occurred_at: occurred,
    occurred_at_precision: 'day',
    artifacts: args.artifacts,
    stack: args.stack,
    outcomes: args.outcomes,
    capabilities: args.capabilities,
    atlas_roles_confirmed: [],
    atlas_roles_claimed: [],
    atlas_roles_inferred: args.atlas.inferred,
    atlas_confidence: args.atlas.confidence,
    classifier_version: args.atlas.classifier_version,
    classifier_reasoning: args.atlas.reasoning,
    visibility: 'public',
    wanted_attestation: false,
    classifier_reachable: args.reachable,
  }
}

async function processArtifactForWrite(
  admin: SupabaseClient,
  profile: ProfileRow,
  user: User,
  artifact: NormalizedArtifact,
  subjectEntity?: EntityRow,
): Promise<
  | { ok: true; written: WrittenReceipt; entity_was_created: boolean }
  | { ok: false; failure: Omit<WriteFailure, 'profile_username' | 'artifact_url'> }
> {
  // 1. classifyUrl
  let classified: ClassifyResult
  try {
    classified = await classifyUrl(artifact.url)
  } catch (err) {
    return {
      ok: false,
      failure: { stage: 'classify_url', error: err instanceof Error ? err.message : String(err) },
    }
  }

  // 2. analyzePastedUrl
  let analyzed: AnalyzeResponse
  try {
    analyzed = await analyzePastedUrl({
      url: artifact.url,
      source: classified.source,
      classifierMetadata: classified.metadata,
    })
  } catch (err) {
    return {
      ok: false,
      failure: { stage: 'analyze', error: err instanceof Error ? err.message : String(err) },
    }
  }

  // 3. content + event_type
  const content = chooseContent(artifact, profile, analyzed)
  const et = chooseEventType(artifact.url, classified.source, content.outcome_text)

  // 4. classifyAtlasRoles
  const artifactsForClassifier: Artifact[] =
    analyzed.artifacts.length > 0
      ? analyzed.artifacts
      : [
          {
            kind:
              et.event_type === 'published_repo'
                ? 'repo'
                : et.event_type === 'shipped_site'
                  ? 'url'
                  : 'deployment',
            url: artifact.normalized_url,
            title: content.title,
          },
        ]
  const atlasInput: AtlasClassifierInput = {
    event_type: et.event_type,
    title: content.title,
    description: content.description,
    artifacts: artifactsForClassifier,
    stack: analyzed.stack,
    capabilities: analyzed.capabilities,
  }
  let atlasResult: AtlasClassifierResult
  try {
    atlasResult = await classifyAtlasRoles(atlasInput)
  } catch (err) {
    return {
      ok: false,
      failure: { stage: 'classify_atlas', error: err instanceof Error ? err.message : String(err) },
    }
  }

  // 5. Build draft + publish.
  const draft = buildPasteDraft({
    url: artifact.normalized_url,
    source: classified.source,
    event_type: et.event_type,
    title: content.title,
    description: content.description,
    artifacts: artifactsForClassifier,
    stack: analyzed.stack,
    outcomes: analyzed.outcomes_suggestions ?? [],
    capabilities: analyzed.capabilities,
    atlas: atlasResult,
    reachable: classified.reachable,
  })

  // We need entity_was_created — findOrCreateHumanEntity is invoked inside
  // publishProofReceipt and not surfaced in the result. Call it ourselves
  // first to capture the flag AND to get entity.id for the dedupe_key.
  // publishProofReceipt will call findOrCreateHumanEntity again and re-find
  // the just-created entity (idempotent).
  let entityWasCreated = false
  let entityId: number
  if (subjectEntity) {
    // Caller pinned the subject entity (agent enrichment path) — use it for the
    // dedupe key so it matches publishProofReceipt's subject_id. Caller owns its
    // lifecycle, so entity_was_created stays false.
    entityId = subjectEntity.id
  } else {
    try {
      const eRes = await findOrCreateHumanEntity(admin, user)
      entityWasCreated = eRes.was_created
      entityId = eRes.entity.id
    } catch (err) {
      return {
        ok: false,
        failure: { stage: 'publish', error: 'pre-publish entity check failed: ' + (err instanceof Error ? err.message : String(err)) },
      }
    }
  }

  // Batch 5: compute per-receipt dedupe_key BEFORE publish so it lands on
  // the insert row (atomic — unique partial index rejects duplicates at the
  // DB level rather than relying on a post-insert UPDATE).
  const dedupeKey = computeReceiptDedupeKey(entityId, artifact.normalized_url, et.event_type)
  const draftWithDedupeKey: PasteDraft = { ...draft, dedupe_key: dedupeKey }

  // 6. publishProofReceipt
  let publishResult
  try {
    publishResult = await publishProofReceipt({ admin, user, draft: draftWithDedupeKey, ...(subjectEntity ? { subjectEntity } : {}) })
  } catch (err) {
    return {
      ok: false,
      failure: { stage: 'publish', error: err instanceof Error ? err.message : String(err) },
    }
  }
  if (!publishResult.success) {
    if (publishResult.error === 'duplicate') {
      // Receipt with this dedupe_key already exists. Distinct from a real
      // failure: orchestrators count duplicates separately.
      return {
        ok: false,
        failure: { stage: 'duplicate', error: publishResult.message },
      }
    }
    return {
      ok: false,
      failure: { stage: 'publish', error: `${publishResult.error}: ${publishResult.message}` },
    }
  }

  const written: WrittenReceipt = {
    profile_username: profile.username,
    artifact_url: artifact.normalized_url,
    raw_url: artifact.contributing[0].raw_url,
    event_type: et.event_type,
    event_type_basis: et.basis,
    title: draft.title,
    description: draft.description,
    atlas_roles: atlasResult.inferred,
    atlas_confidence: atlasResult.confidence,
    url_reachable: classified.reachable,
    url_http_status: classified.http_status,
    receipt_db_id: publishResult.receipt_db_id,
    receipt_external_id: publishResult.id,
    receipt_slug: publishResult.slug,
    receipt_canonical_url: publishResult.canonical_url,
    entity_canonical_url: publishResult.entity_canonical_url,
    verification_level: publishResult.verification_level,
    entity_was_created: entityWasCreated,
  }
  return { ok: true, written, entity_was_created: entityWasCreated }
}

// ════════════════════════════════════════════════════════════════════════════
// Batch 5 — single-entity enrichment helper.
//
// Thin wrapper around runRealWrite that looks up a single profile by id
// (rather than taking a username array). Used by /api/enrich for signup +
// post-update triggers. Reuses 100% of the per-builder logic; the only
// "batch ceremony" skipped is the cohort script's snapshot + per-builder
// expected-count comparison (those live in scripts/v2/enrich-cohort-write.ts,
// not in runRealWrite itself).
//
// Returns an empty report when the profile doesn't exist (caller treats as
// no-op — entity may have been deleted between trigger fire and run).
// ════════════════════════════════════════════════════════════════════════════
export async function runRealWriteForOne(
  admin: SupabaseClient,
  profileId: string,
  log: (msg: string) => void = () => {},
  opts?: { subjectEntity?: EntityRow },
): Promise<WriteReport> {
  const { data: prof, error } = await admin
    .from('profiles')
    .select('username')
    .eq('id', profileId)
    .maybeSingle()
  if (error || !prof) {
    log(`[adapter:one] profile ${profileId} not found`)
    return {
      builders_processed: 0,
      per_builder: [],
      written_flat: [],
      skipped: [],
      failures: [],
      dedupes: [],
      totals: {
        receipts_written: 0,
        entities_created: 0,
        artifacts_skipped: 0,
        artifacts_skipped_by_reason: {},
        artifacts_failed: 0,
        artifacts_failed_by_stage: {},
        dedupes_collapsed: 0,
        builders_with_zero_receipts: [],
      },
    }
  }
  return runRealWrite(admin, [prof.username], log, opts)
}

export async function runRealWrite(
  admin: SupabaseClient,
  usernames: readonly string[],
  log: (msg: string) => void = () => {},
  opts?: { subjectEntity?: EntityRow },
): Promise<WriteReport> {
  const report: WriteReport = {
    builders_processed: 0,
    per_builder: [],
    written_flat: [],
    skipped: [],
    failures: [],
    dedupes: [],
    totals: {
      receipts_written: 0,
      entities_created: 0,
      artifacts_skipped: 0,
      artifacts_skipped_by_reason: {},
      artifacts_failed: 0,
      artifacts_failed_by_stage: {},
      dedupes_collapsed: 0,
      builders_with_zero_receipts: [],
    },
  }

  const { data: profiles, error: pErr } = await admin
    .from('profiles')
    .select('id, user_id, username, full_name, bio, role, github_url, website_url')
    .in('username', usernames as string[])
  if (pErr) throw pErr

  const byUsername = new Map<string, ProfileRow>()
  for (const p of (profiles as ProfileRow[] | null) ?? []) byUsername.set(p.username, p)

  for (const username of usernames) {
    const profile = byUsername.get(username)
    if (!profile) {
      log(`[write] profile not found: ${username}`)
      continue
    }

    // Fetch auth user for findOrCreateHumanEntity + publishProofReceipt.
    let user: User
    try {
      if (!profile.user_id) {
        throw new Error(`profile.user_id is null for ${username}`)
      }
      user = await fetchAuthUser(admin, profile.user_id)
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      log(`[write] ${username} — fetch_user FAILED: ${error}`)
      // Whole builder fails — record one failure with artifact_url=''.
      report.failures.push({
        profile_username: profile.username,
        artifact_url: '',
        stage: 'fetch_user',
        error,
      })
      report.per_builder.push({
        username: profile.username,
        full_name: profile.full_name,
        written: [],
        skipped: [],
        failures: [
          {
            profile_username: profile.username,
            artifact_url: '',
            stage: 'fetch_user',
            error,
          },
        ],
      })
      report.builders_processed += 1
      report.totals.builders_with_zero_receipts.push(profile.username)
      continue
    }

    const [{ data: projects, error: e1 }, { data: posts, error: e2 }] = await Promise.all([
      admin
        .from('projects')
        .select('profile_id, title, project_url, description')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: true }),
      admin
        .from('posts')
        .select('profile_id, title, url, outcome')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: true }),
    ])
    if (e1) throw e1
    if (e2) throw e2

    const { candidates, nullPosts } = gatherCandidates(
      profile,
      (projects as ProjectRow[] | null) ?? [],
      (posts as PostRow[] | null) ?? [],
    )

    const builderSkipped: SkippedArtifact[] = []
    for (const np of nullPosts) {
      const s: SkippedArtifact = {
        profile_username: profile.username,
        raw_url: null,
        source: 'post.url',
        source_row_label: `post:${(np.title ?? '(untitled)').slice(0, 60)}`,
        reason: 'no_artifact_url',
      }
      builderSkipped.push(s)
      report.skipped.push(s)
    }

    const { normalized, invalid } = validateAndDedupe(candidates)
    for (const inv of invalid) {
      const s: SkippedArtifact = {
        profile_username: profile.username,
        raw_url: inv.candidate.raw_url,
        source: inv.candidate.source,
        source_row_label: inv.candidate.source_row_label,
        reason: inv.reason,
        detail: inv.detail,
      }
      builderSkipped.push(s)
      report.skipped.push(s)
    }

    for (const n of normalized) {
      if (n.contributing.length > 1) {
        report.dedupes.push({
          profile_username: profile.username,
          normalized_url: n.normalized_url,
          source_labels: n.contributing.map((c) => c.source_row_label),
          count: n.contributing.length,
        })
      }
    }

    const written: WrittenReceipt[] = []
    const failures: WriteFailure[] = []
    for (const artifact of normalized) {
      log(`[write] ${profile.username} → ${artifact.normalized_url}`)
      try {
        const result = await processArtifactForWrite(admin, profile, user, artifact, opts?.subjectEntity)
        if (result.ok) {
          written.push(result.written)
          report.written_flat.push(result.written)
          if (result.entity_was_created) report.totals.entities_created += 1
        } else {
          const f: WriteFailure = {
            profile_username: profile.username,
            artifact_url: artifact.normalized_url,
            stage: result.failure.stage,
            error: result.failure.error,
          }
          failures.push(f)
          report.failures.push(f)
          log(`[write]   FAILED stage=${result.failure.stage}: ${result.failure.error}`)
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        const f: WriteFailure = {
          profile_username: profile.username,
          artifact_url: artifact.normalized_url,
          stage: 'pipeline',
          error,
        }
        failures.push(f)
        report.failures.push(f)
        log(`[write]   PIPELINE FAILURE: ${error}`)
      }
    }

    report.per_builder.push({
      username: profile.username,
      full_name: profile.full_name,
      written,
      skipped: builderSkipped,
      failures,
    })
    report.builders_processed += 1
    if (written.length === 0) {
      report.totals.builders_with_zero_receipts.push(profile.username)
    }
  }

  report.totals.receipts_written = report.written_flat.length
  report.totals.artifacts_skipped = report.skipped.length
  for (const s of report.skipped) {
    report.totals.artifacts_skipped_by_reason[s.reason] =
      (report.totals.artifacts_skipped_by_reason[s.reason] ?? 0) + 1
  }
  report.totals.artifacts_failed = report.failures.length
  for (const f of report.failures) {
    report.totals.artifacts_failed_by_stage[f.stage] =
      (report.totals.artifacts_failed_by_stage[f.stage] ?? 0) + 1
  }
  report.totals.dedupes_collapsed = report.dedupes.length

  return report
}
