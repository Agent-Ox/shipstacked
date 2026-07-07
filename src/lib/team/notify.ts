import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { resolveOrgByEmail } from '@/lib/org/resolve-by-email'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'

/**
 * Email every admin of a team that someone contacted them (GAP 3 limitation 2).
 *
 * Admin emails are resolved via auth.admin.getUserById — team owners may have NO
 * profiles row, so auth is the reliable source (profiles-by-user_id would miss
 * them). Dedupes; never emails the sender themselves. Fire-and-forget by the
 * caller — failures are logged, never thrown.
 *
 * Only used on the team-contact path (subject_entity_id set). The builder/hirer
 * notification logic in /api/messages POST is untouched.
 */
export async function notifyTeamAdminsOfContact(opts: {
  admin: SupabaseClient
  teamEntityId: number | string
  senderEmail: string
  messagePreview: string
}): Promise<void> {
  const { admin, teamEntityId, senderEmail, messagePreview } = opts
  const resend = new Resend(process.env.RESEND_API_KEY)

  // Team name (entities.display_name).
  const { data: ent } = await admin
    .from('entities')
    .select('display_name')
    .eq('id', teamEntityId)
    .maybeSingle()
  const teamName = ent?.display_name || 'your team'

  // Contacter display name — Stage 5d: the contacter's org (team_profiles.team_name
  // via resolveOrgByEmail), then their builder name, then the raw email.
  const [orgByEmail, { data: pr }] = await Promise.all([
    resolveOrgByEmail(admin, [senderEmail]),
    admin.from('profiles').select('full_name').eq('email', senderEmail).maybeSingle(),
  ])
  const contacterName = orgByEmail.get(senderEmail)?.team_name || pr?.full_name || senderEmail

  // All admins → emails (via auth; owners may have no profiles row). Dedupe +
  // never notify the sender themselves.
  const { data: adminRows } = await admin
    .from('team_admins')
    .select('user_id')
    .eq('team_entity_id', teamEntityId)
  const userIds = [...new Set((adminRows || []).map((a: any) => a.user_id).filter(Boolean))]
  const resolved = await Promise.all(userIds.map(async (uid) => {
    const { data } = await admin.auth.admin.getUserById(uid)
    return data?.user?.email || null
  }))
  const emails = [...new Set(
    resolved.filter((e): e is string => !!e && e.toLowerCase() !== senderEmail.toLowerCase()),
  )]
  if (emails.length === 0) return

  const inboxUrl = `${siteUrl}/messages?as=team&entity=${teamEntityId}`

  await Promise.all(emails.map((to) =>
    resend.emails.send({
      from: 'ShipStacked <hello@shipstacked.com>',
      to,
      subject: `${contacterName} contacted ${teamName} on ShipStacked`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
          <h2 style="font-size: 20px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em; margin-bottom: 0.5rem;">
            New message for ${teamName}
          </h2>
          <p style="color: #6e6e73; font-size: 14px; line-height: 1.6; margin-bottom: 1rem;">
            ${contacterName} contacted your team on ShipStacked:
          </p>
          <div style="background: #f5f5f7; border-radius: 10px; padding: 1rem; margin-bottom: 1.5rem; font-size: 14px; color: #3d3d3f; line-height: 1.6;">
            ${messagePreview}
          </div>
          <a href="${inboxUrl}"
            style="display: inline-block; padding: 0.75rem 1.5rem; background: #0071e3; color: white; border-radius: 20px; text-decoration: none; font-size: 14px; font-weight: 500;">
            Reply in your team inbox →
          </a>
          <hr style="border: none; border-top: 1px solid #e0e0e5; margin: 1.5rem 0;" />
          <p style="color: #aeaeb2; font-size: 12px;">ShipStacked — The proof-of-work platform for AI-native builders.</p>
        </div>
      `,
    }).catch((e) => console.error('Team contact notification failed:', e))
  ))
}
