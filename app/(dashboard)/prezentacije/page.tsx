export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase-admin'
import { PrezentacijeClient } from '@/components/prezentacije/prezentacije-client'

export default async function PrezentacijePage() {
  const supabase = createAdminClient()

  const { data: bookings } = await supabase
    .from('demo_bookings')
    .select('*')
    .order('booking_date', { ascending: false })
    .order('booking_time', { ascending: false })

  return <PrezentacijeClient bookings={bookings ?? []} />
}
