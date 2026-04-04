import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'

async function fetchGitHubData(accessToken: string) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  const userRes = await fetch('https://api.github.com/user', { headers })
  if (!userRes.ok) throw new Error(`GitHub user fetch failed: ${userRes.status}`)
  const user = await userRes.json()

  const reposRes = await fetch(
    'https://api.github.com/user/repos?per_page=100&sort=updated&type=owner',
    { headers }
  )
  const repos = reposRes.ok ? await reposRes.json() : []

  const reposCount = user.public_repos || 0

  const langCounts: Record<string, number> = {}
  for (const repo of repos) {
    if (repo.language) {
      langCounts[repo.language] = (langCounts[repo.language] || 0) + 1
    }
  }
  const topLanguages = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang]) => lang)

  const eventsRes = await fetch(
    `https://api.github.com/users/${user.login}/events?per_page=100`,
    { headers }
  )

  let commits90d = 0
  const contributionData: Record<string, number> = {}

  if (eventsRes.ok) {
    const events = await eventsRes.json()
    const cutoff90 = new Date()
    cutoff90.setDate(cutoff90.getDate() - 90)
    const cutoff84 = new Date()
    cutoff84.setDate(cutoff84.getDate() - 84)

    for (const event of events) {
      if (event.type !== 'PushEvent') continue
      const eventDate = new Date(event.created_at)
      const commitCount = event.payload?.commits?.length || 0

      if (eventDate > cutoff90) {
        commits90d += commitCount
      }
      if (eventDate > cutoff84) {
        const week = new Date(event.created_at).toISOString().slice(0, 10)
        contributionData[week] = (contributionData[week] || 0) + commitCount
      }
    }
  }

  return {
    github_username: user.login,
    avatar_url: user.avatar_url,
    repos_count: reposCount,
    commits_90d: commits90d,
    top_languages: topLanguages,
    contribution_data: contributionData,
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code || !state) {
    console.error('GitHub callback: missing code or state')
    return NextResponse.redirect(`${siteUrl}/dashboard?github=error`)
  }

  // Decode email from state
  let email: string
  try {
    email = Buffer.from(state, 'base64').toString('utf-8')
    if (!email || !email.includes('@')) throw new Error('Invalid email decoded')
  } catch (e) {
    console.error('GitHub callback: state decode failed', e)
    return NextResponse.redirect(`${siteUrl}/dashboard?github=error`)
  }

  // Exchange code for access token
  let accessToken: string
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID!,
        client_secret: process.env.GITHUB_CLIENT_SECRET!,
        code,
        redirect_uri: `${siteUrl}/api/github/callback`,
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      console.error('GitHub callback: no access token returned', tokenData)
      return NextResponse.redirect(`${siteUrl}/dashboard?github=error`)
    }
    accessToken = tokenData.access_token
  } catch (e) {
    console.error('GitHub callback: token exchange failed', e)
    return NextResponse.redirect(`${siteUrl}/dashboard?github=error`)
  }

  // Fetch GitHub data
  let githubData
  try {
    githubData = await fetchGitHubData(accessToken)
  } catch (e) {
    console.error('GitHub callback: fetchGitHubData failed', e)
    return NextResponse.redirect(`${siteUrl}/dashboard?github=error`)
  }

  // Save to Supabase using service role
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get profile by email
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, avatar_url')
    .eq('email', email)
    .maybeSingle()

  if (profileError) {
    console.error('GitHub callback: profile lookup error', profileError)
    return NextResponse.redirect(`${siteUrl}/dashboard?github=error`)
  }

  if (!profile) {
    console.error('GitHub callback: no profile found for email', email)
    // No builder profile yet — still save github_data linked to auth user
    // Try to find by auth user instead — redirect to connect GitHub after creating profile
    return NextResponse.redirect(`${siteUrl}/join?github=connected&gh_user=${githubData.github_username}`)
  }

  // Upsert github_data
  const { error: upsertError } = await supabase.from('github_data').upsert({
    profile_id: profile.id,
    github_username: githubData.github_username,
    repos_count: githubData.repos_count,
    commits_90d: githubData.commits_90d,
    top_languages: githubData.top_languages,
    contribution_data: githubData.contribution_data,
    last_synced: new Date().toISOString(),
  }, { onConflict: 'profile_id' })

  if (upsertError) {
    console.error('GitHub callback: github_data upsert error', upsertError)
    return NextResponse.redirect(`${siteUrl}/dashboard?github=error`)
  }

  // Update profile
  const profileUpdate: Record<string, unknown> = {
    github_connected: true,
    github_username: githubData.github_username,
    github_url: `https://github.com/${githubData.github_username}`,
  }
  if (!profile.avatar_url && githubData.avatar_url) {
    profileUpdate.avatar_url = githubData.avatar_url
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update(profileUpdate)
    .eq('id', profile.id)

  if (updateError) {
    console.error('GitHub callback: profile update error', updateError)
    return NextResponse.redirect(`${siteUrl}/dashboard?github=error`)
  }

  return NextResponse.redirect(`${siteUrl}/dashboard?github=connected`)
}
