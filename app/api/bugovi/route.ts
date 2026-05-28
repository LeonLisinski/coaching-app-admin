import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { title, description, location, priority } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data, error } = await db
    .from('bug_log')
    .insert({ title, description, location, priority, status: 'otvoren' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
