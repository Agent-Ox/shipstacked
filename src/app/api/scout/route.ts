import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    const supabase = await createServerSupabaseClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    const userRole = user?.user_metadata?.role || 'visitor'

    // Fetch current user profile if builder
    let currentUserContext = ''
    if (user && userRole === 'builder') {
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('*, skills(*), projects(*)')
        .eq('email', user.email)
        .maybeSingle()

      if (myProfile) {
        const mySkills = myProfile.skills?.map((s: any) => s.name).join(', ') || 'none listed'
        const myProjects = myProfile.projects?.map((p: any) => p.title + ': ' + p.outcome).join(' | ') || 'none listed'
        currentUserContext = `
THE BUILDER YOU ARE TALKING TO:
Name: ${myProfile.full_name}
Role: ${myProfile.role || 'not specified'}
Location: ${myProfile.location || 'not specified'}
Availability: ${myProfile.availability || 'not specified'}
Bio: ${myProfile.bio || 'none'}
Skills: ${mySkills}
Projects: ${myProjects}
Profile URL: shipstacked.com/u/${myProfile.username}

Use this to personalise your responses. Address them by first name. You already know their background — do not ask them to repeat it.`
      }
    }

    // Fetch employer profile if employer
    let employerContext = ''
    if (user && userRole === 'employer') {
      const { data: empProfile } = await supabase
        .from('employer_profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle()

      const { data: empJobs } = await supabase
        .from('jobs')
        .select('*')
        .eq('employer_email', user.email)
        .eq('status', 'active')

      if (empProfile || empJobs?.length) {
        employerContext = `
THE EMPLOYER YOU ARE TALKING TO:
Company: ${empProfile?.company_name || 'not specified'}
Location: ${empProfile?.location || 'not specified'}
What they build with AI: ${empProfile?.what_they_build || 'not specified'}
Active job listings: ${empJobs?.map((j: any) => j.role_title + ' (' + j.location + ')').join(', ') || 'none'}

Use this context to personalise your responses. You already know what they are hiring for.`
      }
    }

    // Fetch all published profiles with skills and projects
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*, skills(*), projects(*)')
      .eq('published', true)
      .order('verified', { ascending: false })
      .order('created_at', { ascending: false })

    const profileContext = profiles?.map(p => {
      const skills = p.skills?.map((s: any) => s.category + ': ' + s.name).join(', ') || 'none listed'
      const projects = p.projects?.map((pr: any) =>
        'Project: ' + pr.title + '. Built: ' + pr.description + '. AI usage: ' + pr.prompt_approach + '. Outcome: ' + pr.outcome
      ).join(' | ') || 'none listed'

      return '---' +
        'NAME: ' + p.full_name +
        ' | ROLE: ' + (p.role || 'not specified') +
        ' | LOCATION: ' + (p.location || 'not specified') +
        ' | AVAILABILITY: ' + (p.availability || 'not specified') +
        ' | VERIFIED: ' + (p.verified ? 'yes' : 'no') +
        ' | BIO: ' + (p.bio || 'none') +
        ' | SKILLS: ' + skills +
        ' | PROJECTS: ' + projects +
        ' | PROFILE URL: shipstacked.com/u/' + p.username +
        '---'
    }).join('\n') || 'No profiles available yet.'

    // Fetch public employer profiles
    const { data: employerProfiles } = await supabase
      .from('employer_profiles')
      .select('*, jobs(*)')
      .eq('public', true)

    const employerProfileContext = employerProfiles?.length ? employerProfiles.map(e => {
      const jobs = e.jobs?.filter((j: any) => j.status === 'active').map((j: any) => j.role_title).join(', ') || 'none'
      return 'COMPANY: ' + e.company_name + ' | LOCATION: ' + (e.location || 'n/a') + ' | BUILDING: ' + (e.what_they_build || 'n/a') + ' | OPEN ROLES: ' + jobs + ' | PROFILE: shipstacked.com/company/' + e.slug
    }).join('\n') : 'No public employer profiles yet.'

    const systemPrompt = 'You are Scout, the AI talent concierge for ShipStacked — the hiring platform for AI-native builders.' +
      (currentUserContext ? currentUserContext : '') +
      (employerContext ? employerContext : '') +
      '\n\nALL BUILDER PROFILES ON CLAUDHIRE:\n' + profileContext +
      '\n\nPUBLIC EMPLOYER PROFILES:\n' + employerProfileContext +
      '\n\nYOUR JOB:\n' +
      'You serve two types of users — employers and builders.\n\n' +
      'FOR EMPLOYERS: When you receive __EMPLOYER_GREETING__, respond with ONE sentence only. Look at their company name and active job listings. Format: Hey - I can see COMPANY is hiring for ROLE. Ask me to find your best builder matches. If no company or jobs found say: Hey - tell me what role you are hiring for and I will find your best matches. ONE sentence only.\n\n' +
      'FOR EMPLOYERS asking real questions: Surface the best matching builder profiles. Be specific - reference actual projects, skills, location, availability. Give 2-4 matches. Always include profile URLs. Proactively suggest matches based on their job listings.\n\n' +
      'FOR BUILDERS: When you receive __BUILDER_GREETING__, respond with ONE sentence only. No more. Say: Hey - I know your profile. Ask me who is hiring for your skills and I will find your best matches. ONE sentence only.\n\n' +
      'ALWAYS: Be concise and useful. Never make up information. Answer questions about how ShipStacked works.\n\n' +
      'TONE: Confident, sharp, warm. Like a great recruiter who already knows you.'

    // Handle builder auto-init — replace with a proper prompt
    const processedMessages = messages.map((m: any) => {
      if (m.content === '__BUILDER_INIT__') {
        return { ...m, content: '__BUILDER_GREETING__' }
      }
      return m
    })

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: processedMessages,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
        controller.close()
      }
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      }
    })

  } catch (err: any) {
    console.error('Scout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
