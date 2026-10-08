'use server'

/**
 * Server actions for the /paste flow.
 *
 * `createPasteDraft` runs the Atlas classifier (server-only — uses
 * ANTHROPIC_API_KEY) against analyzer output, then stashes the combined
 * draft in Upstash Redis and returns a draft_id the client can navigate to.
 *
 * The Atlas classifier is intentionally kept server-side (no public route);
 * the action is the only callable surface. Per STEP_5_PASTE_UI_SPEC §4
 * "Option 1 — Server action in /paste".
 */

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { classifyAtlasRoles, type AtlasClassifierResult } from '@/services/atlas-classifier'
import { stashDraft } from '@/lib/paste/draft'
import type { AnalyzeResponse } from '@/lib/paste/analyzer'
import type { ClassifyResult } from '@/lib/paste/classifier'
import { isRegionBlocked, REGION_BLOCKED_MESSAGE } from '@/lib/geo/region-gate'

export interface CreatePasteDraftInput {
  url: string
  classify: Omit<ClassifyResult, 'cache_hit'>
  analyze: AnalyzeResponse
}

export type CreatePasteDraftResult =
  | { draft_id: string; atlas: AtlasClassifierResult }
  | { blocked: true; message: string }

export async function createPasteDraft(
  input: CreatePasteDraftInput,
): Promise<CreatePasteDraftResult> {
  // Region gate runs before auth and before any Claude call.
  if (isRegionBlocked(await headers())) {
    return { blocked: true, message: REGION_BLOCKED_MESSAGE }
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/login?return_to=${encodeURIComponent('/paste')}&pasted_url=${encodeURIComponent(input.url)}`)
  }

  const atlas = await classifyAtlasRoles({
    event_type: input.classify.event_type_candidate,
    title: input.analyze.title_draft,
    description: input.analyze.description_draft,
    artifacts: input.analyze.artifacts,
    stack: input.analyze.stack,
    capabilities: input.analyze.capabilities,
  })

  const draft_id = await stashDraft({
    url: input.url,
    user_id: user.id,
    classify: input.classify,
    analyze: input.analyze,
    atlas,
    created_at: new Date().toISOString(),
  })

  return { draft_id, atlas }
}
