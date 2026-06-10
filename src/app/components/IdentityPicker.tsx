'use client'

// "Post as:" identity selector for /paste/review (Phase 4 §J). Renders only
// when the signed-in user owns more than one entity (e.g. a human + a team).
// The chosen entity_id flows to /api/paste/publish → publishProofReceipt's
// subjectEntity param (the Phase 1 Block 5R plumbing) so the receipt is
// attributed to the selected identity.

const KIND_ICON: Record<string, string> = { human: '👤', team: '👥', agent: '🤖' }

export type IdentityOption = {
  id: number
  kind: 'human' | 'team' | 'agent'
  slug: string
  display_name: string
}

type Props = {
  options: IdentityOption[]
  value: number // entity_id
  onChange: (entity_id: number) => void
}

export default function IdentityPicker({ options, value, onChange }: Props) {
  // No choice to make → render nothing (single identity, or none).
  if (options.length <= 1) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1rem', background: '#f4f4f6', border: '1px solid #e0e0e5', borderRadius: 10, marginBottom: '1.75rem', flexWrap: 'wrap' }}>
      <label htmlFor="identity-picker" style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>Post as:</label>
      <select
        id="identity-picker"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, minWidth: 220, padding: '0.5rem 0.75rem', border: '1px solid #d2d2d7', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: 'white', color: '#1d1d1f', outline: 'none' }}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {(KIND_ICON[o.kind] ?? '•')} {o.display_name} ({o.kind})
          </option>
        ))}
      </select>
    </div>
  )
}
