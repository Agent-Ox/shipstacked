import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'oxleethomas+admin@gmail.com'

// =====================================================================
// POST /api/admin/candidates/log
//
// Multi-purpose endpoint for outreach actions on a candidate:
//
//   action: 'sent'       — log outreach as sent, update status to 'contacted'
//   action: 'skip'       — leave for later, no status change
//   action: 'dismiss'    — set status to 'dismissed' (won't show in queue)
//   action: 'block'      — set status to 'blocked' (never contact)
//   action: 'replied'    — mark as 'replied'
//   action: 'signed_up'  — mark as 'signed_up'
//   action: 'reset'      — set back to 'new'
//
// For action='sent', body also includes:
//   draft_id (optional)  — the draft this was based on
//   sent_text            — the actual text posted (may differ from draft if edited)
//   notes (optional)
//
// For other actions:
//   notes (optional)
// =====================================================================

type Body = {
  candidate_id?: string
  action?: string
  draft_id?: string
  sent_text?: string
  notes?: string
}

const STATUS_BY_ACTION: Record<string, string | null> = {
  sent:       'contacted',
  skip:       null,            // no status change
  dismiss:    'dismissed',
  block:      'blocked',
  replied:    'replied',
  signed_up:  'signed_up',
  reset:      'new',
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const candidateId = body?.candidate_id?.trim()
  const action = body?.action?.trim()

  if (!candidateId) return NextResponse.json({ error: 'candidate_id required' }, { status: 400 })
  if (!action || !(action in STATUS_BY_ACTION)) {
    return NextResponse.json({
      error: `action must be one of: ${Object.keys(STATUS_BY_ACTION).join(', ')}`
    }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify candidate exists
  const { data: candidate } = await admin
    .from('candidates')
    .select('id, status')
    .eq('id', candidateId)
    .maybeSingle()

  if (!candidate) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
  }

  // ----- Action: sent -----
  if (action === 'sent') {
    const sentText = body?.sent_text?.trim()
    if (!sentText) {
      return NextResponse.json({ error: 'sent_text required for action=sent' }, { status: 400 })
    }

    // Was the sent_text different from the draft?
    let wasEdited = false
    if (body.draft_id) {
      const { data: draft } = await admin
        .from('outreach_drafts')
        .select('draft_text')
        .eq('id', body.draft_id)
        .maybeSingle()

      if (draft) {
        wasEdited = draft.draft_text.trim() !== sentText
        // Mark the draft as used
        await admin
          .from('outreach_drafts')
          .update({ was_used: true, was_edited: wasEdited })
          .eq('id', body.draft_id)
      }
    }

    // Insert outreach_log row
    const { error: logError } = await admin
      .from('outreach_log')
      .insert({
        candidate_id: candidateId,
        draft_id: body.draft_id || null,
        sent_text: sentText,
        sent_by: user.email,
        notes: body.notes || null,
      })

    if (logError) {
      console.error('[log] insert failed:', logError)
      return NextResponse.json({ error: 'Failed to log outreach' }, { status: 500 })
    }

    // Update candidate status + last_contacted_at
    await admin
      .from('candidates')
      .update({
        status: 'contacted',
        last_contacted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', candidateId)

    return NextResponse.json({ ok: true, action: 'sent', candidate_id: candidateId })
  }

  // ----- Action: skip (no DB change beyond a possible note) -----
  if (action === 'skip') {
    if (body.notes) {
      await admin
        .from('candidates')
        .update({ notes: body.notes, updated_at: new Date().toISOString() })
        .eq('id', candidateId)
    }
    return NextResponse.json({ ok: true, action: 'skip', candidate_id: candidateId })
  }

  // ----- All other actions: simple status update -----
  const newStatus = STATUS_BY_ACTION[action]
  if (newStatus) {
    const updates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    if (action === 'replied') {
      // Stamp the most recent outreach_log row
      await admin
        .from('outreach_log')
        .update({ reply_received_at: new Date().toISOString() })
        .eq('candidate_id', candidateId)
        .order('sent_at', { ascending: false })
        .limit(1)
    }

    if (action === 'signed_up') {
      updates.signed_up_at = new Date().toISOString()
      // If we have a recent log row, mark it as attributed
      await admin
        .from('outreach_log')
        .update({ signup_attributed: true })
        .eq('candidate_id', candidateId)
    }

    if (body.notes) updates.notes = body.notes

    const { error: updateError } = await admin
      .from('candidates')
      .update(updates)
      .eq('id', candidateId)

    if (updateError) {
      console.error('[log] status update failed:', updateError)
      return NextResponse.json({ error: 'Status update failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, action, candidate_id: candidateId })
}
