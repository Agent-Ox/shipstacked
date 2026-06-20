// Phase 9 Part 1 — minimal hirer link-card. The full 553-line hirer experience
// at /hirer is intentionally untouched; this just surfaces it from /dashboard
// for multi-pillar users. Full relocation (if ever) is a later part.
export default function HirerSection() {
  return (
    <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Hiring Access</p>
        <p style={{ fontSize: 14, color: '#1d1d1f' }}>You have an active Hiring Access subscription.</p>
      </div>
      <a href="/hirer" style={{ padding: '0.5rem 1.25rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>Manage at hirer dashboard →</a>
    </div>
  )
}
