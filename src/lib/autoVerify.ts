import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// Auto-verification criteria:
// 1. ≥1 proven project (url + description/outcome) OR legacy build-feed post (url + outcome)
// 2. Profile has: full_name, bio, role, location
// 3. At least 1 project OR at least 3 skills selected

export async function checkAutoVerify(profileId: string): Promise<boolean> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, bio, role, location, verified')
    .eq('id', profileId)
    .maybeSingle()

  if (!profile) return false
  if (profile.verified) return true // already verified, nothing to do

  // Check profile completeness
  const hasBasics = !!(profile.full_name && profile.bio && profile.role && profile.location)
  if (!hasBasics) return false

  // Check projects
  const { count: projectCount } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)

  // Check skills
  const { count: skillCount } = await supabase
    .from('skills')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)

  const hasPortfolio = (projectCount || 0) >= 1 || (skillCount || 0) >= 3
  if (!hasPortfolio) return false

  // Proven build — at least 1 proven project (the signup build was rerouted
  // posts→projects) OR a legacy build-feed post. A project counts as proven
  // when it has a non-empty project_url AND prose (the rerouted outcome lands
  // in description; some projects carry it in outcome).
  const { data: projRows } = await supabase
    .from('projects')
    .select('description, outcome, project_url')
    .eq('profile_id', profileId)
  const provenProjectCount = (projRows || []).filter(p =>
    (p.project_url || '').trim() && ((p.description || '').trim() || (p.outcome || '').trim()),
  ).length

  // Legacy Build Feed posts — a post with both outcome AND url.
  const { count: provenPostCount } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .not('outcome', 'is', null)
    .neq('outcome', '')
    .not('url', 'is', null)
    .neq('url', '')

  if (((provenPostCount || 0) + provenProjectCount) < 1) return false

  // All criteria met — verify and publish the profile
  await supabase
    .from('profiles')
    .update({ verified: true, published: true })
    .eq('id', profileId)

  // Send congratulations email
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'ShipStacked <hello@shipstacked.com>',
      to: profile.email,
      subject: '✓ You\'re now a verified ShipStacked builder',
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
          <h1 style="font-size: 24px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em; margin-bottom: 0.5rem;">
            You're verified. ✓
          </h1>
          <p style="color: #6e6e73; font-size: 15px; line-height: 1.6; margin-bottom: 1.5rem;">
            ${profile.full_name?.split(' ')[0] || 'Hey'} — your ShipStacked profile just earned the verified builder badge. You proved you ship real things with real outcomes.
          </p>
          <p style="color: #6e6e73; font-size: 15px; line-height: 1.6; margin-bottom: 1.5rem;">
            Verified builders get more hirer attention, rank higher in search, and get surfaced first to hirers browsing the talent directory.
          </p>
          <a href="${siteUrl}/dashboard"
            style="display: inline-block; padding: 0.75rem 1.5rem; background: #0071e3; color: white; border-radius: 20px; text-decoration: none; font-size: 15px; font-weight: 500; margin-bottom: 1.5rem;">
            View your verified profile →
          </a>
          <p style="color: #aeaeb2; font-size: 13px; line-height: 1.6;">
            Keep shipping. Every build you post strengthens your proof-of-work record.
          </p>
          <hr style="border: none; border-top: 1px solid #e0e0e5; margin: 1.5rem 0;" />
          <p style="color: #aeaeb2; font-size: 12px;">ShipStacked — The proof-of-work platform for AI-native builders.</p>
        </div>
      `
    })
  } catch (e) {
    console.error('Auto-verify email failed:', e)
  }

  return true
}
