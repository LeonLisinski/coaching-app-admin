import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

const CATEGORIES = ['web_app', 'mobile_app', 'web_site', 'admin_app', 'general']

// PATCH /api/notes/tasks/[id] — update task (edit fields or toggle done)
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
  if ('category' in body) patch.category = CATEGORIES.includes(body.category) ? body.category : 'general'
  if ('priority' in body) patch.priority = Math.max(0, Math.min(10, Number(body.priority)))
  if ('due_date' in body) patch.due_date = body.due_date || null
  if ('image_url' in body) patch.image_url = body.image_url || null
  if ('done' in body) {
    patch.done = !!body.done
    patch.done_at = body.done ? new Date().toISOString() : null
  }

  const db = createAdminClient()
  const { data, error } = await db.from('admin_tasks').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// DELETE /api/notes/tasks/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = createAdminClient()
  const { error } = await db.from('admin_tasks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
