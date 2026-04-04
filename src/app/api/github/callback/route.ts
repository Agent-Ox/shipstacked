import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'

async function fetchGitHubData(accessToken: string) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  // Fetch authenticated user profile
  const userRes = await fetch('https://api.github.com/user', { headers })
  if (!userRes.ok) throw new Error(`GitHub user fetch failed: ${userRes.status}`)
  const user = await userRes.json()

  // Fetch repos (owner only, sorted by updated)
  const reposRes = await fetch(
    'https://api.github.com/user/repos?per_page=100&sort=updated&type=owner',
    { headers }
  )
  const repos = reposRes.ok ? await reposRes.json() : []
  const reposCount = user.public_repos || 0

  // Top languages from repos
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

  // Use GraphQL contributionsCollection for accurate commit count (includes private repos)
  const now = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 90)

  const graphqlQuery = {
    query: `query {
      viewer {
        contributionsCollection(from: "${from.toISOString()}", to: "${now.toISOString()}") {
          totalCommitContributions
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }`
  }

  let commits90d = 0
  const contributionData: Record<string, number> = {}

  try {
    const graphqlRes = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(graphqlQuery),
    })

    if (graphqlRes.ok) {
      const graphqlData = await graphqlRes.json()
      const collection = graphqlData?.data?.viewer?.contributionsCollection

      if (collection) {
        commits90d = collection.totalCommitContributions || 0

        // Build contribution data from calendar (last 12 weeks)
        const weeks = collection.contributionCalendar?.weeks || []
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 84)

        for (const week of weeks) {
          for (const day of week.contributionDays || []) {
            if (day.contributionCount > 0 && new Date(day.date) > cutoff) {
              contributionData[day.date] = day.contributionCount
            }
          }
        }
      }
    } else {
      console.error('GraphQL failed, falling back to events API')
      // Fallback to events API
      const eventsRes = await fetch(
        'https://api.github.com/user/events?per_page=100',
        { headers }
      )
      if (eventsRes.ok) {
        const events = await eventsRes.json()
        const cutoff90 = new Date()
        cutoff90.setDate(cutoff90.getDate() - 90)
        for (const event of events) {
          if (event.type === 'PushEvent' && new Date(event.created_at) > cutoff90) {
            commits90d += event.payload?.commits?.length || 0
            const date = event.created_at.slice(0, 10)
            contributionData[date] = (contributionData[date] || 0) + (event.payload?.commits?.length || 0)
          }
        }
      }
    }
  } catch (e) {
    console.error('Contribution fetch error:', e)
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

  let email: string
  try {
    email = Buffer.from(state, 'base64').toString('utf-8')
    if (!email || !email.includes('@')) throw new Error('Invalid email decoded')
  } catch (e) {
    console.error('GitHub callback: state decode failed', e)
    return NextResponse.redirect(`${siteUrl}/dashboard?github=error`)
  }

  let accessToken: string
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID!,
        client_secret: process.env.GITHUB_CLIENT_SECRET!,
        code,
        redirect_uri: `${siteUrl}/api/github/callback`,
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      console.error('GitHub callback: no access token', tokenData)
      return NextResponse.redirect(`${siteUrl}/dashboard?github=error`)
    }
    accessToken = tokenData.access_token
  } catch (e) {
    console.error('GitHub callback: token exchange failed', e)
    return NextResponse.redirect(`${siteUrl}/dashboard?github=error`)
  }

  let githubData
  try {
    githubData = await fetchGitHubData(accessToken)
  } catch (e) {
    console.error('GitHub callback: fetchGitHubData failed', e)
    return NextResponse.redirect(`${siteUrl}/dashboard?github=error`)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, avatar_url')
    .eq('email', email)
    .maybeSingle()

  if (profileError || !profile) {
    console.error('GitHub callback: profile lookup failed', profileError, 'email:', email)
    return NextResponse.redirect(`${siteUrl}/dashboard?github=error`)
  }

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
    console.error('GitHub callback: upsert error', upsertError)
    return NextResponse.redirect(`${siteUrl}/dashboard?github=error`)
  }

  const profileUpdate: Record<string, unknown> = {
    github_connected: true,
    github_username: githubData.github_username,
    github_url: `https://github.com/${githubData.github_username}`,
  }
  if (!profile.avatar_url && githubData.avatar_url) {
    profileUpdate.avatar_url = githubData.avatar_url
  }

  await supabase.from('profiles').update(profileUpdate).eq('id', profile.id)

  return NextResponse.redirect(`${siteUrl}/dashboard?github=connected`)
}
