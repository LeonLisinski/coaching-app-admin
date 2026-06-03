import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

function cleanEmails(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((e) => String(e).trim().toLowerCase())
    .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))
}

// GET /api/notes/settings
export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data, error } = await db.from('admin_task_settings').select('*').eq('id', true).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// PATCH /api/notes/settings
export async function PATCH(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if ('overdue_enabled' in body) patch.overdue_enabled = !!body.overdue_enabled
  if ('overdue_days' in body) patch.overdue_days = Math.max(0, Math.min(365, Number(body.overdue_days) || 0))
  if ('reminder_emails' in body) patch.reminder_emails = cleanEmails(body.reminder_emails)
  if ('digest_enabled' in body) patch.digest_enabled = !!body.digest_enabled
  if ('digest_priority_min' in body) patch.digest_priority_min = Math.max(0, Math.min(10, Number(body.digest_priority_min) || 0))
  if ('digest_emails' in body) patch.digest_emails = cleanEmails(body.digest_emails)
  if ('hide_done_after_days' in body) patch.hide_done_after_days = Math.max(0, Math.min(365, Number(body.hide_done_after_days) || 0))

  const db = createAdminClient()
  const { data, error } = await db
    .from('admin_task_settings')
    .update(patch)
    .eq('id', true)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
