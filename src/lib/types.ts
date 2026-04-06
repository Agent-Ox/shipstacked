export type Profile = {
  id?: string
  user_id?: string
  username: string
  full_name: string
  email: string
  location?: string
  role?: string
  bio?: string
  about?: string
  avatar_url?: string
  availability?: string
  verified?: boolean
  published?: boolean
  github_url?: string
  x_url?: string
  linkedin_url?: string
  website_url?: string
  profile_views?: number
  primary_profession?: string
  seniority?: string
  work_type?: string
  day_rate?: string
  timezone?: string
  languages?: string[]
  created_at?: string
}

export type Project = {
  id?: string
  profile_id?: string
  title: string
  description?: string
  prompt_approach?: string
  outcome?: string
  project_url?: string
  display_order?: number
  created_at?: string
}

export type Skill = {
  id?: string
  profile_id?: string
  category: string
  name: string
}

export type EmployerProfile = {
  id?: string
  email: string
  company_name?: string
  slug?: string
  about?: string
  what_they_build?: string
  location?: string
  team_size?: string
  website_url?: string
  linkedin_url?: string
  x_url?: string
  logo_url?: string
  industry?: string
  hiring_type?: string
  public?: boolean
  created_at?: string
  updated_at?: string
}

export type Job = {
  id?: string
  employer_email: string
  company_name: string
  role_title: string
  description?: string
  requirements?: string
  salary_range?: string
  location?: string
  employment_type?: string
  skills?: string[]
  status?: string
  expires_at?: string
  anonymous?: boolean
  hiring_for?: string
  urgency?: string
  day_rate?: string
  timezone?: string
  created_at?: string
}

export type Application = {
  id?: string
  job_id: string
  builder_email: string
  builder_name?: string
  profile_id?: string
  employer_email: string
  status?: string
  created_at?: string
}

// Build Feed — table to be created
export type FeedPost = {
  id?: string
  profile_id: string
  title: string
  what_built?: string
  problem_solved?: string
  tools_used?: string
  time_taken?: string
  url?: string
  reactions?: Record<string, number>
  created_at?: string
}

// GitHub data — table to be created
export type GitHubData = {
  id?: string
  profile_id: string
  github_username: string
  repos_count?: number
  commits_90d?: number
  top_languages?: string[]
  contribution_data?: Record<string, unknown>
  last_synced?: string
  created_at?: string
}

export type ProjectInquiry = {
  id?: string
  conversation_id?: string
  client_email: string
  client_name: string
  builder_profile_id: string
  post_id: string
  message: string
  status?: 'pending' | 'replied' | 'closed'
  quoted_price?: number | null
  transaction_id?: string | null
  created_at?: string
}
