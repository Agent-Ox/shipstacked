import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    // Validate type and size
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

    const ext = file.type.split('/')[1]
    const filename = user.id + '.' + ext
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Supabase Storage
    const { error: uploadError } = await adminSupabase.storage
      .from('avatars')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = adminSupabase.storage
      .from('avatars')
      .getPublicUrl(filename)

    // Update profile
    await adminSupabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('email', user.email)

    return NextResponse.json({ url: publicUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
