export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { format, differenceInDays, addDays } from 'date-fns'
import { Card } from '@/components/ui/card'
import { PLAN_LABELS } from '@/lib/config'
import { Clock, CreditCard } from 'lucide-react'

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

function getPlanBadge(plan: string | null) {
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
  const in7Days = addDays(now, 7).toISOString()

  // Billing renewals expiring in 14 days
  const [{ data: billingSubs }, { data: trialSubs }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select(`
        trainer_id, plan, status, current_period_end, cancel_at_period_end,
        profiles:trainer_id ( full_name, email )
      `)
      .in('status', ['active', 'past_due'])
      .lte('current_period_end', in14Days)
      .gte('current_period_end', now.toISOString())
      .order('current_period_end', { ascending: true }),

    // Trials expiring in 7 days (conversion opportunity)
    supabase
      .from('subscriptions')
      .select(`
        trainer_id, plan, status, trial_end,
        profiles:trainer_id ( full_name, email )
      `)
      .eq('status', 'trialing')
      .lte('trial_end', in7Days)
      .gte('trial_end', now.toISOString())
      .order('trial_end', { ascending: true }),
  ])

  const billingItems = (billingSubs ?? []).map((s) => {
    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
    return {
      trainer_id: s.trainer_id,
      plan: s.plan,
      status: s.status,
      date: s.current_period_end,
      cancel_at_period_end: s.cancel_at_period_end,
      full_name: profile?.full_name ?? '—',
      email: profile?.email ?? '—',
      daysLeft: differenceInDays(new Date(s.current_period_end), now),
    }
  })

  const trialItems = (trialSubs ?? []).map((s) => {
    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
    return {
      trainer_id: s.trainer_id,
      plan: s.plan,
      date: s.trial_end,
      full_name: profile?.full_name ?? '—',
      email: profile?.email ?? '—',
      daysLeft: differenceInDays(new Date(s.trial_end!), now),
    }
  })

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Expiring Soon</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pretplate i triali koji uskoro ističu
        </p>
      </div>

      {/* Billing renewals section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Obnove pretplate (14 dana)</h2>
          <span className="text-xs text-muted-foreground">— naplata ili otkazivanje</span>
        </div>

        {billingItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground text-sm">Nema pretplata koje se obnavljaju u idućih 14 dana</p>
          </div>
        ) : (
          <div className="space-y-2">
            {billingItems.map((item) => (
              <Card key={item.trainer_id} className={`border ${getDaysBg(item.daysLeft)}`}>
                <div className="flex items-center justify-between p-4 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`text-center shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center border ${getDaysBg(item.daysLeft)}`}>
                      <span className={`text-xl font-bold leading-tight ${getDaysColor(item.daysLeft)}`}>
                        {item.daysLeft}
                      </span>
                      <span className={`text-[9px] font-medium ${getDaysColor(item.daysLeft)}`}>dana</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{item.full_name}</p>
                      <p className="text-muted-foreground text-xs truncate">{item.email}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.cancel_at_period_end ? '❌ Otkazuje' : '🔄 Obnavlja'} se {format(new Date(item.date!), 'd. M. yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getPlanBadge(item.plan)}`}>
                      {PLAN_LABELS[item.plan] ?? item.plan}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Trial endings section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-yellow-400" />
          <h2 className="text-sm font-semibold">Triali koji ističu (7 dana)</h2>
          <span className="text-xs text-muted-foreground">— potencijalni novi klijenti</span>
        </div>

        {trialItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground text-sm">Nema triala koji ističu u idućih 7 dana</p>
          </div>
        ) : (
          <div className="space-y-2">
            {trialItems.map((item) => (
              <Card key={item.trainer_id} className={`border ${getDaysBg(item.daysLeft)}`}>
                <div className="flex items-center justify-between p-4 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`text-center shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center border ${getDaysBg(item.daysLeft)}`}>
                      <span className={`text-xl font-bold leading-tight ${getDaysColor(item.daysLeft)}`}>
                        {item.daysLeft}
                      </span>
                      <span className={`text-[9px] font-medium ${getDaysColor(item.daysLeft)}`}>dana</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{item.full_name}</p>
                      <p className="text-muted-foreground text-xs truncate">{item.email}</p>
                      <p className="text-xs text-yellow-400 mt-0.5">
                        Trial istječe {format(new Date(item.date!), 'd. M. yyyy')} → postaje paying
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getPlanBadge(item.plan)}`}>
                      {PLAN_LABELS[item.plan] ?? item.plan}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
