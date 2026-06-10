'use client'

/**
 * /paste/review — editable draft receipt assembled from analyzer + Atlas
 * classifier output. State is local-only in Step 5: Publish is disabled and
 * Step 6 will read the same Redis-stashed draft to persist the receipt.
 *
 * Spec: docs/v2/STEP_5_PASTE_UI_SPEC.md §2.2.
 */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Outcome, StackElement } from '@/schemas/proof-receipt-v0.1'
import type { PasteDraft } from '@/lib/paste/draft'
import type { AtlasRole } from '@/services/atlas-classifier/roles'
import IdentityPicker, { type IdentityOption } from '@/app/components/IdentityPicker'
import AtlasRoleSelector from './AtlasRoleSelector'
import StackChipList from './StackChipList'
import VerificationLadder from './VerificationLadder'
import stackVocab from '@/config/stack-vocab.json'

const TITLE_MAX = 80
const DESCRIPTION_MAX = 2000
const OUTCOME_DESC_MAX = 500

type Precision = 'day' | 'month' | 'quarter' | 'year'
type Visibility = 'public' | 'unlisted'

const OUTCOME_KINDS: Outcome['kind'][] = [
  'revenue',
  'cost_reduction',
  'time_saved',
  'performance',
  'uptime',
  'users',
  'compliance',
  'qualitative',
]

function todayISODate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function confidenceLabel(c: number): string {
  return `${Math.round(c * 100)}%`
}

export default function ReviewForm({
  draftId,
  draft,
  atlasRoles,
  ownedEntities = [],
}: {
  draftId: string
  draft: PasteDraft
  atlasRoles: AtlasRole[]
  ownedEntities?: IdentityOption[]
}) {
  const inferredIds = draft.atlas.inferred
  const lowConfidence = draft.atlas.confidence < 0.2

  const router = useRouter()

  // Identity picker (Phase 4 §J): default to the human entity, else first owned.
  const defaultEntityId = useMemo(() => {
    if (ownedEntities.length === 0) return 0
    return (ownedEntities.find((e) => e.kind === 'human') ?? ownedEntities[0]).id
  }, [ownedEntities])
  const [subjectEntityId, setSubjectEntityId] = useState<number>(defaultEntityId)
  const [title, setTitle] = useState(draft.analyze.title_draft.slice(0, TITLE_MAX))
  const [description, setDescription] = useState(draft.analyze.description_draft.slice(0, DESCRIPTION_MAX))
  const [occurredAt, setOccurredAt] = useState(todayISODate())
  const [precision, setPrecision] = useState<Precision>('day')
  const [confirmedRoles, setConfirmedRoles] = useState<string[]>(inferredIds)
  const [stack, setStack] = useState<StackElement[]>(draft.analyze.stack as StackElement[])
  const [outcomes, setOutcomes] = useState<Outcome[]>([])
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [wantedAttestation, setWantedAttestation] = useState(false)
  const [attestationModalOpen, setAttestationModalOpen] = useState(false)
  const [addingOutcome, setAddingOutcome] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)

  const roleById = useMemo(() => {
    const m = new Map<string, AtlasRole>()
    for (const r of atlasRoles) m.set(r.id, r)
    return m
  }, [atlasRoles])

  // Roles to render as checkboxes: every role the classifier inferred,
  // plus any role the user has manually added (so they can uncheck/recheck).
  const displayRoleIds = useMemo(() => {
    const set = new Set<string>(inferredIds)
    for (const id of confirmedRoles) set.add(id)
    return Array.from(set)
  }, [inferredIds, confirmedRoles])

  const currentLadder: 'L0' | 'L1' = draft.classify.reachable ? 'L1' : 'L0'

  async function handlePublish() {
    if (publishing) return
    setPublishError(null)

    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()
    if (!trimmedTitle) {
      setPublishError('Title is required.')
      return
    }
    if (!trimmedDescription) {
      setPublishError('Description is required.')
      return
    }
    if (confirmedRoles.length === 0) {
      setPublishError('Pick at least one Atlas role before publishing.')
      return
    }

    // Build the spec §2.1 PasteDraft shape from local state + draft data.
    // claimed = user-added roles that the classifier didn't infer; inferred
    // = original classifier output (retained even when user unchecks); the
    // user's confirmed set is the source of truth for what gets indexed.
    const claimedRoles = confirmedRoles.filter((id) => !inferredIds.includes(id))
    const publishPayload = {
      draft_id: draftId,
      // Only sent when the user actually has a choice (>1 owned entity); when
      // omitted the server defaults to human-entity resolution — solo path
      // unchanged (Phase 4 §J).
      ...(ownedEntities.length > 1 ? { subject_entity_id: subjectEntityId } : {}),
      draft: {
        url: draft.url,
        source: draft.classify.source,
        event_type: draft.classify.event_type_candidate,
        title: trimmedTitle,
        description: trimmedDescription,
        occurred_at: new Date(occurredAt).toISOString(),
        occurred_at_precision: precision,
        artifacts: draft.analyze.artifacts,
        stack,
        outcomes,
        capabilities: draft.analyze.capabilities,
        atlas_roles_confirmed: confirmedRoles,
        atlas_roles_claimed: claimedRoles,
        atlas_roles_inferred: inferredIds,
        atlas_confidence: draft.atlas.confidence,
        classifier_version: draft.atlas.classifier_version,
        classifier_reasoning: draft.atlas.reasoning,
        classifier_reachable: draft.classify.reachable,
        visibility,
        wanted_attestation: wantedAttestation,
      },
    }

    setPublishing(true)
    try {
      const res = await fetch('/api/paste/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(publishPayload),
      })
      if (res.status === 401) {
        const returnTo = `/paste/review?draft=${encodeURIComponent(draftId)}`
        router.push(`/login?return_to=${encodeURIComponent(returnTo)}`)
        return
      }
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        const msg = json?.message || 'Publishing failed — try again?'
        setPublishError(msg)
        setPublishing(false)
        return
      }
      // Server-side navigation so the freshly-published /p/<slug> page
      // (Step 7) gets a fresh server render with the new receipt.
      window.location.href = json.canonical_url
    } catch (e) {
      console.error('[paste] publish failed', e)
      setPublishError('Network error. Try again?')
      setPublishing(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', padding: '2rem 1.5rem 4rem' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <a href="/" style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em', display: 'block', marginBottom: '2rem' }}>
          ShipStacked<span style={{ color: '#0071e3' }}>.</span>
        </a>

        <div style={{ marginBottom: '2rem' }}>
          <p style={{ color: '#86868b', fontSize: 13, marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Review</p>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.025em', color: '#1d1d1f', margin: 0 }}>
            Your draft proof receipt
          </h1>
          <p style={{ color: '#6e6e73', fontSize: 14, marginTop: '0.5rem', wordBreak: 'break-all' }}>
            From <a href={draft.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0071e3', textDecoration: 'none' }}>{draft.url}</a>
          </p>
        </div>

        {lowConfidence && (
          <div style={{ background: '#fff8e6', border: '1px solid #ffd98a', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: 14, color: '#5a4400' }}>
            This didn’t classify cleanly — pick a role yourself below.
          </div>
        )}

        {/* IDENTITY PICKER (Phase 4 §J) — hidden unless >1 owned entity */}
        <IdentityPicker options={ownedEntities} value={subjectEntityId} onChange={setSubjectEntityId} />

        {/* TITLE */}
        <Section label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
            placeholder="What did you ship?"
            style={inputStyle}
          />
          <Counter current={title.length} max={TITLE_MAX} />
        </Section>

        {/* DESCRIPTION + PREVIEW */}
        <Section label="What happened">
          <div className="paste-md-grid">
            <div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
                rows={10}
                placeholder="Markdown is supported."
                style={{ ...inputStyle, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', resize: 'vertical', minHeight: 220 }}
              />
              <Counter current={description.length} max={DESCRIPTION_MAX} />
            </div>
            <div style={{ borderLeft: '1px solid #ececf0', paddingLeft: '1rem' }}>
              <p style={{ fontSize: 12, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 0, marginBottom: '0.5rem', fontWeight: 600 }}>Preview</p>
              <div style={{ fontSize: 14, color: '#1d1d1f', lineHeight: 1.55 }}>
                <Markdown remarkPlugins={[remarkGfm]}>{description || '*Nothing yet.*'}</Markdown>
              </div>
            </div>
          </div>
        </Section>

        {/* WHEN */}
        <Section label="When">
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              style={{ ...inputStyle, width: 180 }}
            />
            <select
              value={precision}
              onChange={(e) => setPrecision(e.target.value as Precision)}
              style={{ ...inputStyle, width: 180 }}
            >
              <option value="day">Day precision</option>
              <option value="month">Month precision</option>
              <option value="quarter">Quarter precision</option>
              <option value="year">Year precision</option>
            </select>
          </div>
        </Section>

        {/* ATLAS ROLES */}
        <Section label="Atlas roles we detected">
          {displayRoleIds.length === 0 ? (
            <p style={{ fontSize: 14, color: '#6e6e73', margin: 0 }}>
              No roles detected automatically. Add one below.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.4rem' }}>
              {displayRoleIds.map((id) => {
                const role = roleById.get(id)
                const checked = confirmedRoles.includes(id)
                const wasInferred = inferredIds.includes(id)
                return (
                  <li key={id}>
                    <label style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', fontSize: 14, color: '#1d1d1f', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setConfirmedRoles((prev) => prev.includes(id) ? prev : [...prev, id])
                          } else {
                            setConfirmedRoles((prev) => prev.filter((r) => r !== id))
                          }
                        }}
                      />
                      <span style={{ fontWeight: 600, color: '#0071e3' }}>{id}</span>
                      <span>{role?.name ?? 'Unknown role'}</span>
                      {wasInferred && (
                        <span style={{ marginLeft: 'auto', color: '#6e6e73', fontSize: 12 }}>
                          {confidenceLabel(draft.atlas.confidence)} confidence
                        </span>
                      )}
                    </label>
                  </li>
                )
              })}
            </ul>
          )}

          <div style={{ marginTop: '0.75rem' }}>
            <AtlasRoleSelector
              allRoles={atlasRoles}
              excludeIds={displayRoleIds}
              onAdd={(id) => setConfirmedRoles((prev) => prev.includes(id) ? prev : [...prev, id])}
            />
          </div>

          {draft.atlas.reasoning && (
            <p style={{ fontSize: 12, color: '#6e6e73', marginTop: '1rem', marginBottom: 0, lineHeight: 1.5 }}>
              We classified this based on: {draft.atlas.reasoning}
            </p>
          )}
        </Section>

        {/* STACK */}
        <Section label="Stack we detected">
          <StackChipList
            value={stack}
            onChange={setStack}
            vocab={stackVocab as Record<string, string[]>}
          />
        </Section>

        {/* OUTCOMES */}
        <Section
          label="Outcomes"
          hint="optional · +trust"
        >
          {outcomes.length === 0 && !addingOutcome && (
            <p style={{ fontSize: 14, color: '#6e6e73', margin: '0 0 0.75rem' }}>
              Add a measurable result and your receipt becomes harder to wave away.
            </p>
          )}
          {outcomes.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 0.75rem', display: 'grid', gap: '0.5rem' }}>
              {outcomes.map((o, i) => (
                <li
                  key={i}
                  style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#f4f4f6', borderRadius: 8, fontSize: 14, color: '#1d1d1f' }}
                >
                  <span style={{ fontWeight: 600, color: '#0071e3', textTransform: 'capitalize' }}>{o.kind.replace(/_/g, ' ')}</span>
                  {typeof o.value === 'number' && (
                    <span>
                      {o.value}{o.unit ? ` ${o.unit}` : ''}
                    </span>
                  )}
                  <span style={{ color: '#1d1d1f', marginLeft: o.value === undefined ? 0 : '0.5rem' }}>
                    {o.description}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOutcomes(outcomes.filter((_, j) => j !== i))}
                    aria-label="Remove outcome"
                    style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#6e6e73', cursor: 'pointer', fontSize: 16, padding: 0 }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          {addingOutcome ? (
            <OutcomeAdder
              onSubmit={(o) => {
                setOutcomes([...outcomes, o])
                setAddingOutcome(false)
              }}
              onCancel={() => setAddingOutcome(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAddingOutcome(true)}
              style={{ padding: '0.4rem 0.75rem', fontSize: 13, fontWeight: 500, color: '#0071e3', background: 'transparent', border: '1px dashed #c8defc', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              + Add outcome
            </button>
          )}
        </Section>

        {/* ATTESTATION */}
        <Section label="Attestation" hint="optional · +trust">
          <button
            type="button"
            onClick={() => {
              setAttestationModalOpen(true)
              setWantedAttestation(true)
            }}
            style={{ padding: '0.55rem 1rem', fontSize: 14, fontWeight: 500, color: '#1d1d1f', background: 'white', border: '1px solid #d2d2d7', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Request attestation (coming soon)
          </button>
          {wantedAttestation && (
            <p style={{ fontSize: 12, color: '#6e6e73', marginTop: '0.5rem', marginBottom: 0 }}>
              We’ll remember you wanted this and ping you when Phase 1B ships attestations.
            </p>
          )}
        </Section>

        {/* VISIBILITY */}
        <Section label="Visibility">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Radio
              label="Public"
              sub="Indexable. Anyone can see it."
              checked={visibility === 'public'}
              onChange={() => setVisibility('public')}
            />
            <Radio
              label="Unlisted"
              sub="Only people with the link."
              checked={visibility === 'unlisted'}
              onChange={() => setVisibility('unlisted')}
            />
          </div>
        </Section>

        {/* VERIFICATION LADDER */}
        <Section label="Verification ladder">
          <VerificationLadder current={currentLadder} />
        </Section>

        {/* PUBLISH CTA */}
        <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #ececf0' }}>
          {publishError && (
            <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: 14, color: '#c00' }}>
              {publishError}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              style={{ padding: '0.9rem 1.5rem', background: publishing ? '#9ec6f5' : '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 15, fontWeight: 600, cursor: publishing ? 'wait' : 'pointer', fontFamily: 'inherit', letterSpacing: '-0.01em' }}
            >
              {publishing ? 'Publishing…' : 'Publish proof receipt →'}
            </button>
            <span style={{ fontSize: 12, color: '#86868b', marginLeft: 'auto' }}>
              Draft id <code style={{ background: '#f4f4f6', padding: '2px 6px', borderRadius: 4 }}>{draftId.slice(0, 8)}</code>
            </span>
          </div>
        </div>
      </div>

      {attestationModalOpen && (
        <AttestationModal onClose={() => setAttestationModalOpen(false)} />
      )}

      <style>{`
        .paste-md-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        @media (max-width: 720px) {
          .paste-md-grid { grid-template-columns: 1fr; }
          .paste-md-grid > div:last-child { border-left: none !important; padding-left: 0 !important; border-top: 1px solid #ececf0; padding-top: 1rem; }
        }
      `}</style>
    </div>
  )
}

// ─── primitives ──────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.7rem 0.9rem',
  border: '1px solid #d2d2d7',
  borderRadius: 10,
  fontSize: 15,
  outline: 'none',
  fontFamily: 'inherit',
  background: 'white',
  boxSizing: 'border-box',
  color: '#1d1d1f',
}

function Section({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '1.75rem' }}>
      <h2 style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.6rem' }}>
        {label}
        {hint && <span style={{ marginLeft: 8, color: '#86868b', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>{hint}</span>}
      </h2>
      {children}
    </section>
  )
}

function Counter({ current, max }: { current: number; max: number }) {
  const close = current > max * 0.9
  return (
    <div style={{ fontSize: 12, color: close ? '#b25500' : '#86868b', textAlign: 'right', marginTop: 4 }}>
      {current} / {max}
    </div>
  )
}

function Radio({ label, sub, checked, onChange }: { label: string; sub: string; checked: boolean; onChange: () => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.6rem 0.85rem', border: checked ? '1px solid #0071e3' : '1px solid #d2d2d7', borderRadius: 10, cursor: 'pointer', background: checked ? '#eaf3ff' : 'white', minWidth: 200 }}>
      <input type="radio" checked={checked} onChange={onChange} style={{ marginTop: 4 }} />
      <span>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{label}</span>
        <span style={{ display: 'block', fontSize: 12, color: '#6e6e73', marginTop: 2 }}>{sub}</span>
      </span>
    </label>
  )
}

function OutcomeAdder({ onSubmit, onCancel }: { onSubmit: (o: Outcome) => void; onCancel: () => void }) {
  const [kind, setKind] = useState<Outcome['kind']>('qualitative')
  const [value, setValue] = useState<string>('')
  const [unit, setUnit] = useState<string>('')
  const [description, setDescription] = useState<string>('')

  function commit() {
    const trimmed = description.trim()
    if (!trimmed) return
    const numericValue = value.trim() === '' ? undefined : Number(value)
    onSubmit({
      kind,
      value: typeof numericValue === 'number' && Number.isFinite(numericValue) ? numericValue : undefined,
      unit: unit.trim() || undefined,
      description: trimmed.slice(0, OUTCOME_DESC_MAX),
      verified: false,
    })
  }

  return (
    <div style={{ border: '1px solid #ececf0', borderRadius: 10, padding: '0.85rem', background: 'white', display: 'grid', gap: '0.6rem' }}>
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        <select value={kind} onChange={(e) => setKind(e.target.value as Outcome['kind'])} style={{ ...inputStyle, width: 180 }}>
          {OUTCOME_KINDS.map((k) => (
            <option key={k} value={k} style={{ textTransform: 'capitalize' }}>
              {k.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <input type="number" placeholder="Value (optional)" value={value} onChange={(e) => setValue(e.target.value)} style={{ ...inputStyle, width: 160 }} />
        <input type="text" placeholder="Unit (e.g. %, hrs)" value={unit} onChange={(e) => setUnit(e.target.value)} style={{ ...inputStyle, width: 160 }} />
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value.slice(0, OUTCOME_DESC_MAX))}
        placeholder="Describe the outcome…"
        rows={2}
        style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
      />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={commit}
          disabled={!description.trim()}
          style={{ padding: '0.5rem 1rem', fontSize: 13, fontWeight: 600, color: 'white', background: description.trim() ? '#0071e3' : '#c5c5cc', border: 'none', borderRadius: 8, cursor: description.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{ padding: '0.5rem 1rem', fontSize: 13, fontWeight: 500, color: '#1d1d1f', background: 'transparent', border: '1px solid #d2d2d7', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function AttestationModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'white', borderRadius: 14, padding: '1.5rem', maxWidth: 480, width: '100%', boxShadow: '0 16px 48px rgba(0,0,0,0.18)' }}
      >
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1d1d1f' }}>Attestations are coming soon</h3>
        <p style={{ fontSize: 14, color: '#1d1d1f', lineHeight: 1.55, marginTop: '0.75rem' }}>
          An attestation is when a client, hirer, or peer signs off on your receipt.
          It moves the receipt up to <strong>L3 Externally Attested</strong> on the
          verification ladder — the strongest current trust signal.
        </p>
        <p style={{ fontSize: 14, color: '#1d1d1f', lineHeight: 1.55, marginTop: '0.75rem' }}>
          We’re shipping the request flow in <strong>Phase 1B</strong>. We’ve noted
          your interest on this draft so we can prompt you when it lands.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '0.55rem 1.1rem', fontSize: 14, fontWeight: 600, color: 'white', background: '#0071e3', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
