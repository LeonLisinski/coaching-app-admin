import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

const CATEGORIES = ['web_app', 'mobile_app', 'web_site', 'admin_app', 'general']

// GET /api/notes/tasks — list all tasks
export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('admin_tasks')
    .select('*')
    .order('done', { ascending: true })
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/notes/tasks — create task
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const title = (body.title ?? '').trim()
  if (!title) return NextResponse.json({ error: 'Naslov je obavezan' }, { status: 400 })

  const category = CATEGORIES.includes(body.category) ? body.category : 'general'
  const priority = Math.max(0, Math.min(10, Number(body.priority ?? 5)))

  const db = createAdminClient()
  const { data, error } = await db
    .from('admin_tasks')
    .insert({
      title,
      description: body.description?.trim() || null,
      category,
      priority,
      due_date: body.due_date || null,
      image_url: body.image_url || null,
      done: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
