import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

const TAGS = ['Marketing', 'Produkt', 'Tech', 'Ostalo']

// PATCH /api/notes/items/[id] — edit or archive note
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if ('title' in body) {
    const t = (body.title ?? '').trim()
    if (!t) return NextResponse.json({ error: 'Naslov je obavezan' }, { status: 400 })
    patch.title = t
  }
  if ('description' in body) patch.description = body.description?.trim() || null
  if ('tag' in body) patch.tag = TAGS.includes(body.tag) ? body.tag : 'Ostalo'
  if ('archived' in body) patch.archived = !!body.archived

  const db = createAdminClient()
  const { data, error } = await db.from('admin_notes').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// DELETE /api/notes/items/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = createAdminClient()
  const { error } = await db.from('admin_notes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
