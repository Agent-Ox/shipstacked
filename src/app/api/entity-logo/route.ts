import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// POST — entity-scoped logo upload for teams + agents. Returns { url }; the
// caller persists logo_url via its own PATCH (mirrors /api/hirer-logo, which
// also returns the URL without writing a row). Auth is scoped to the entity:
// team admins for kind='team', the owner for kind='agent'.
export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File
    const entityId = Number(formData.get('entity_id'))
    const kind = formData.get('kind')
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
    if (!entityId || (kind !== 'team' && kind !== 'agent')) {
      return NextResponse.json({ error: 'entity_id and kind (team|agent) are required' }, { status: 400 })
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use JPG, PNG, or WebP.' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 })
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Authorize the caller against the entity.
    if (kind === 'team') {
      const { data: adminRow } = await adminSupabase
        .from('team_admins')
        .select('id')
        .eq('team_entity_id', entityId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!adminRow) return NextResponse.json({ error: 'Not an admin of this team' }, { status: 403 })
    } else {
      const { data: agentEnt } = await adminSupabase
        .from('entities')
        .select('id')
        .eq('id', entityId)
        .eq('kind', 'agent')
        .eq('owner_user_id', user.id)
        .maybeSingle()
      if (!agentEnt) return NextResponse.json({ error: "You don't own this agent" }, { status: 403 })
    }

    const ext = file.type.split('/')[1]
    const filename = `${kind}-logo-${entityId}.${ext}`
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { error: uploadError } = await adminSupabase.storage
      .from('avatars')
      .upload(filename, buffer, { contentType: file.type, upsert: true })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = adminSupabase.storage
      .from('avatars')
      .getPublicUrl(filename)

    return NextResponse.json({ url: publicUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
