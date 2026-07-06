/**
 * Capability vocabulary — loader + resolver (Stage B1).
 *
 * Pure library over the live `capability_vocab` table (the canonical capability
 * taxonomy: tool / capability / domain layers, each with a stable slug, a
 * display label, and an alias list). Reads reference data via a caller-supplied
 * Supabase client (mirrors src/lib/atlas/roles.ts — the caller passes the client;
 * this module never creates one). Rows are anon/service-role readable.
 *
 * INERT as of Stage B1: nothing consumes this yet. Later stages use it to
 * normalize captured skills/services/capabilities → canonical slugs, generate
 * per-capability pages (generateStaticParams), and power search.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type CapabilityLayer = 'tool' | 'capability' | 'domain'

export interface CapabilityVocabEntry {
  slug: string
  label: string
  layer: CapabilityLayer
  aliases: string[]
  status: 'canonical' | 'graduated'
  description: string | null
  source_categories: string[]
}

// Small, rarely-changing reference set — memoized in-module after first load.
// Cache the data array (not keyed on client); reset via clearVocabCache() in tests.
let _cache: CapabilityVocabEntry[] | null = null

/**
 * Load the full capability vocabulary. Returns [] on error (fail-soft — a bad
 * reference read must not throw into callers; they treat empty as "no match").
 * Memoized: the first successful load is reused for the module's lifetime.
 */
export async function loadVocab(supabase: SupabaseClient): Promise<CapabilityVocabEntry[]> {
  if (_cache) return _cache
  const { data, error } = await supabase
    .from('capability_vocab')
    .select('slug, label, layer, aliases, status, description, source_categories')
  if (error || !data) return [] // fail-soft; do NOT cache a failed load
  const rows: CapabilityVocabEntry[] = data.map((r: any) => ({
    slug: r.slug,
    label: r.label,
    layer: r.layer as CapabilityLayer,
    aliases: Array.isArray(r.aliases) ? r.aliases : [],
    status: r.status as CapabilityVocabEntry['status'],
    description: r.description ?? null,
    source_categories: Array.isArray(r.source_categories) ? r.source_categories : [],
  }))
  _cache = rows
  return rows
}

/** Test hook — drop the in-module memo so a fresh loadVocab re-reads. */
export function clearVocabCache(): void {
  _cache = null
}

// Per-vocab-array lookup index, built once and keyed on the array identity.
// loadVocab returns a stable cached reference, so the O(n) index build happens
// once and every resolve is O(1). Keys are lowercased: slug, label, each alias.
const _indexCache = new WeakMap<CapabilityVocabEntry[], Map<string, CapabilityVocabEntry>>()

function indexOf(vocab: CapabilityVocabEntry[]): Map<string, CapabilityVocabEntry> {
  const cached = _indexCache.get(vocab)
  if (cached) return cached
  const map = new Map<string, CapabilityVocabEntry>()
  for (const entry of vocab) {
    const keys = [entry.slug, entry.label, ...entry.aliases]
    for (const k of keys) {
      const norm = k?.trim().toLowerCase()
      if (norm && !map.has(norm)) map.set(norm, entry)
    }
  }
  _indexCache.set(vocab, map)
  return map
}

/** Resolve a raw string to its full canonical entry (slug/label/alias, case-insensitive), or null. */
export function resolveEntry(raw: string, vocab: CapabilityVocabEntry[]): CapabilityVocabEntry | null {
  const norm = raw?.trim().toLowerCase()
  if (!norm) return null
  return indexOf(vocab).get(norm) ?? null
}

/**
 * Resolve a raw capability string to its canonical slug, or null if unknown.
 * Matches exact slug, label (case-insensitive), or any alias (case-insensitive).
 *   resolveCapability('RAG systems') → 'rag'
 *   resolveCapability('Claude')      → 'claude-code'
 *   resolveCapability('nonsense')    → null
 */
export function resolveCapability(raw: string, vocab: CapabilityVocabEntry[]): string | null {
  return resolveEntry(raw, vocab)?.slug ?? null
}

/**
 * Resolve a list of raw strings → canonical entries. Drops unresolved, dedupes
 * by slug, preserves first-seen order. For mapping a builder's skills[] or a
 * team's services[] onto the canonical vocabulary.
 */
export function resolveMany(
  raws: string[],
  vocab: CapabilityVocabEntry[],
): { slug: string; label: string; layer: CapabilityLayer }[] {
  const out: { slug: string; label: string; layer: CapabilityLayer }[] = []
  const seen = new Set<string>()
  for (const raw of raws) {
    const entry = resolveEntry(raw, vocab)
    if (!entry || seen.has(entry.slug)) continue
    seen.add(entry.slug)
    out.push({ slug: entry.slug, label: entry.label, layer: entry.layer })
  }
  return out
}

/** All entries in one layer (tool / capability / domain) — e.g. for per-capability page params. */
export function getVocabByLayer(vocab: CapabilityVocabEntry[], layer: CapabilityLayer): CapabilityVocabEntry[] {
  return vocab.filter((e) => e.layer === layer)
}
