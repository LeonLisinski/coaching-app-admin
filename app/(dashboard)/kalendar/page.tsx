export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase-admin'
import { KalendarClient, type CalItem } from '@/components/kalendar/kalendar-client'

export default async function KalendarPage() {
  const supabase = createAdminClient()

  const [{ data: bookings }, { data: events }] = await Promise.all([
    supabase
      .from('demo_bookings')
      .select('id, name, email, booking_date, booking_time, status, completed_at')
      .in('status', ['pending', 'confirmed']),
    supabase
      .from('calendar_events')
      .select('id, title, description, event_date, event_time, done'),
  ])

  const items: CalItem[] = [
    ...(bookings ?? []).map((b): CalItem => ({
      id: b.id,
      kind: 'presentation',
      title: b.name,
      subtitle: b.email,
      date: b.booking_date,
      time: b.booking_time ? b.booking_time.slice(0, 5) : null,
      done: b.completed_at != null,
      status: b.status,
    })),
    ...(events ?? []).map((e): CalItem => ({
      id: e.id,
      kind: 'event',
      title: e.title,
      subtitle: e.description ?? undefined,
      date: e.event_date,
      time: e.event_time ? e.event_time.slice(0, 5) : null,
      done: e.done,
    })),
  ]

  return <KalendarClient items={items} />
}
