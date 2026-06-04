import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

// Create a calendar event
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, description, event_date, event_time } = await req.json()
  if (!title?.trim() || !event_date) {
    return NextResponse.json({ error: 'Naslov i datum su obavezni' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data, error } = await db
    .from('calendar_events')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      event_date,
      event_time: event_time || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// Toggle done — works for both custom events and presentations
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { kind, id, done } = await req.json()
  const db = createAdminClient()

  if (kind === 'event') {
    const { error } = await db
      .from('calendar_events')
      .update({ done: !!done, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (kind === 'presentation') {
    const { error } = await db
      .from('demo_bookings')
      .update({ completed_at: done ? new Date().toISOString() : null })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

// Delete a calendar event (presentations are managed in /prezentacije)
export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await req.json()
  const db = createAdminClient()
  const { error } = await db.from('calendar_events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
