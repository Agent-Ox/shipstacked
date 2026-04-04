import { authenticateApiKey, apiError, apiOk } from '@/lib/apiAuth'

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) return apiError(auth.status, auth.error)

  const { profile } = auth.auth

  return apiOk({
    profile: {
      username: profile.username,
      full_name: profile.full_name,
      role: profile.role,
      bio: profile.bio,
      about: profile.about,
      location: profile.location,
      availability: profile.availability,
      primary_profession: profile.primary_profession,
      seniority: profile.seniority,
      work_type: profile.work_type,
      day_rate: profile.day_rate,
      timezone: profile.timezone,
      languages: profile.languages,
      github_url: profile.github_url,
      x_url: profile.x_url,
      linkedin_url: profile.linkedin_url,
      website_url: profile.website_url,
      verified: profile.verified,
      published: profile.published,
      velocity_score: profile.velocity_score,
      github_connected: profile.github_connected,
      skills: profile.skills?.map((s: any) => ({ category: s.category, name: s.name })) || [],
      projects: profile.projects?.map((p: any) => ({
        title: p.title,
        description: p.description,
        outcome: p.outcome,
        url: p.project_url,
      })) || [],
      profile_url: `https://shipstacked.com/u/${profile.username}`,
    }
  })
}
