import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = createAdminClient()

  // Clear deletion flag in profiles
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ deletion_requested_at: null })
    .eq('id', id)

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  // Un-ban user in Supabase Auth
  const { error: authErr } = await supabase.auth.admin.updateUserById(id, {
    ban_duration: 'none',
  })

  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
