import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { trainer_id, reason, note } = await req.json()

  if (!trainer_id || !reason) {
    return NextResponse.json({ error: 'trainer_id and reason are required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('churn_feedback')
    .upsert(
      { trainer_id, reason, note: note ?? null },
      { onConflict: 'trainer_id' }
    )

  if (error) {
    console.error('churn_feedback upsert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
