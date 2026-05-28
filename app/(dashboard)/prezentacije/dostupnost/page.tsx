export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase-admin'
import { DostupnostClient } from '@/components/prezentacije/dostupnost-client'

export default async function DostupnostPage() {
  const supabase = createAdminClient()

  const [{ data: availability }, { data: blocked }] = await Promise.all([
    supabase.from('demo_availability').select('*').order('day_of_week').order('start_time'),
    supabase.from('demo_blocked_slots').select('*').order('blocked_date', { ascending: false }).order('blocked_time'),
  ])

  return <DostupnostClient availability={availability ?? []} blocked={blocked ?? []} />
}
