import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

const TAGS = ['Marketing', 'Produkt', 'Tech', 'Ostalo']

// POST /api/notes/items — create note
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const title = (body.title ?? '').trim()
  if (!title) return NextResponse.json({ error: 'Naslov je obavezan' }, { status: 400 })

  const tag = TAGS.includes(body.tag) ? body.tag : 'Ostalo'

  const db = createAdminClient()
  const { data, error } = await db
    .from('admin_notes')
    .insert({ title, description: body.description?.trim() || null, tag, archived: false })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
