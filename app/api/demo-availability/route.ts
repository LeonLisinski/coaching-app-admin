import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

// GET — list all availability slots
export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = createAdminClient()
  const { data, error } = await db
    .from('demo_availability')
    .select('*')
    .order('day_of_week')
    .order('start_time')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — add a new availability slot
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = createAdminClient()
  const { data, error } = await db
    .from('demo_availability')
    .insert({
      day_of_week:      parseInt(body.day_of_week),
      start_time:       body.start_time,
      end_time:         body.end_time,
      slot_duration_min: parseInt(body.slot_duration_min ?? body.slot_duration_minutes ?? 15),
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
