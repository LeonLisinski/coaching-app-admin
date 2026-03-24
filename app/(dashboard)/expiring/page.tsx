export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { format, differenceInDays, addDays } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PLAN_LABELS, STATUS_LABELS } from '@/lib/config'
import { Clock } from 'lucide-react'

function getDaysColor(days: number) {
  if (days < 3) return 'text-red-400'
  if (days < 7) return 'text-yellow-400'
  return 'text-emerald-400'
}

function getDaysBg(days: number) {
  if (days < 3) return 'bg-red-500/10 border-red-500/20'
  if (days < 7) return 'bg-yellow-500/10 border-yellow-500/20'
  return 'bg-emerald-500/10 border-emerald-500/20'
}

function getPlanColor(plan: string | null) {
  switch (plan) {
    case 'scale': return 'bg-violet-500/20 text-violet-300 border-violet-500/30'
    case 'pro': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 'starter': return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30'
    default: return 'bg-zinc-800 text-zinc-400 border-zinc-700'
  }
}

export default async function ExpiringPage() {
  const supabase = await createClient()

  const now = new Date()
  const in14Days = addDays(now, 14).toISOString()

  const { data: subs } = await supabase
    .from('subscriptions')
    .select(`
      trainer_id,
      plan,
      status,
      current_period_end,
      cancel_at_period_end,
      profiles:trainer_id (
        full_name,
        email
      )
    `)
    .in('status', ['active', 'trialing', 'past_due'])
    .lte('current_period_end', in14Days)
    .gte('current_period_end', now.toISOString())
    .order('current_period_end', { ascending: true })

  const items = (subs ?? []).map((s) => {
    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
    const daysLeft = differenceInDays(new Date(s.current_period_end), now)
    return {
      trainer_id: s.trainer_id,
      plan: s.plan,
      status: s.status,
      current_period_end: s.current_period_end,
      cancel_at_period_end: s.cancel_at_period_end,
      full_name: profile?.full_name ?? '—',
      email: profile?.email ?? '—',
      daysLeft,
    }
  })

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Expiring Soon</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pretplate koje ističu u sljedećih 14 dana
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Clock className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nema pretplata koje uskoro ističu</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.trainer_id} className={`border ${getDaysBg(item.daysLeft)}`}>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`text-center shrink-0 w-14 h-14 rounded-lg flex flex-col items-center justify-center border ${getDaysBg(item.daysLeft)}`}>
                    <span className={`text-2xl font-bold leading-tight ${getDaysColor(item.daysLeft)}`}>
                      {item.daysLeft}
                    </span>
                    <span className={`text-[10px] font-medium ${getDaysColor(item.daysLeft)}`}>
                      {item.daysLeft === 1 ? 'dan' : 'dana'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{item.full_name}</p>
                    <p className="text-muted-foreground text-xs truncate">{item.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Istječe: {format(new Date(item.current_period_end), 'd. M. yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0 ml-3">
                  {item.plan && (
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getPlanColor(item.plan)}`}>
                      {PLAN_LABELS[item.plan] ?? item.plan}
                    </span>
                  )}
                  {item.cancel_at_period_end && (
                    <span className="text-[10px] px-2 py-0.5 rounded border font-medium bg-red-500/10 text-red-400 border-red-500/20">
                      Otkazano
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
