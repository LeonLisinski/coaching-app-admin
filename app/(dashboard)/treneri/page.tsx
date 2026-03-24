export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { TreneriClient } from '@/components/treneri/treneri-client'

export default async function TreneriPage() {
  const supabase = await createClient()

  const { data: trainers } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      created_at,
      subscriptions (
        plan,
        status,
        current_period_end,
        trial_end,
        cancel_at_period_end,
        stripe_customer_id
      )
    `)
    .eq('role', 'trainer')
    .order('created_at', { ascending: false })

  const normalized = (trainers ?? []).map((t) => {
    const sub = Array.isArray(t.subscriptions) ? t.subscriptions[0] : t.subscriptions
    return {
      id: t.id,
      full_name: t.full_name ?? '—',
      email: t.email ?? '—',
      created_at: t.created_at,
      plan: sub?.plan ?? null,
      status: sub?.status ?? null,
      current_period_end: sub?.current_period_end ?? null,
      trial_end: sub?.trial_end ?? null,
      cancel_at_period_end: sub?.cancel_at_period_end ?? false,
      stripe_customer_id: sub?.stripe_customer_id ?? null,
    }
  })

  return <TreneriClient trainers={normalized} />
}
