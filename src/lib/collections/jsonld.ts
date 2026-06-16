/**
 * Collection JSON-LD projection.
 *
 * Wraps Beacon 1's buildPersonJsonLd output inside a schema.org/ItemList.
 * (Phase 6 §I.1: buildPersonJsonLd moved positional→options-object; this caller
 * passes no atlasRoles, so its emission stays byte-unchanged.) The collection metadata
 * (title, description) comes from the CollectionRow passed in — NOT
 * from any code constant. Slugs are data.
 */

import { SCHEMA_CONTEXT } from '../jsonld/context.ts'
import { buildPersonJsonLd } from '../jsonld/person.ts'
import { collectionUrl, type CollectionRow } from './context.ts'
import type { ConsentedCollection } from './assemble.ts'

export interface CollectionJsonLd {
  '@context': typeof SCHEMA_CONTEXT
  '@type': ['ItemList', 'shipstacked:BuilderCollection']
  '@id': string
  name: string
  description?: string
  numberOfItems: number
  dateModified: string
  'shipstacked:collectionSlug': string
  'shipstacked:consentModel': 'explicit-per-builder-opt-in'
  itemListElement: Array<{
    '@type': 'ListItem'
    position: number
    item: ReturnType<typeof buildPersonJsonLd>
  }>
}

export function buildCollectionJsonLd(
  collection: CollectionRow,
  data: ConsentedCollection,
): CollectionJsonLd {
  const itemListElement = data.builders.map((b, idx) => ({
    '@type': 'ListItem' as const,
    position: idx + 1,
    // Phase 6 §I.1: positional→options refactor; emission unchanged (no atlasRoles passed).
    item: buildPersonJsonLd({ profile: b.profile, entity: b.entity, skills: b.skills, projects: b.projects, github: b.github }),
  }))

  const out: CollectionJsonLd = {
    '@context': SCHEMA_CONTEXT,
    '@type': ['ItemList', 'shipstacked:BuilderCollection'],
    '@id': collectionUrl(collection.slug),
    name: collection.title,
    numberOfItems: data.builders.length,
    dateModified: data.most_recent_change ?? collection.created_at,
    'shipstacked:collectionSlug': collection.slug,
    'shipstacked:consentModel': 'explicit-per-builder-opt-in',
    itemListElement,
  }
  if (collection.description && collection.description.trim().length > 0) {
    out.description = collection.description.trim()
  }
  return out
}
