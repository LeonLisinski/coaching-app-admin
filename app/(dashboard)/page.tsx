export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PLAN_PRICES, PLAN_LABELS } from '@/lib/config'
import { RevenueChart } from '@/components/overview/revenue-chart'
import {
  TrendingUp, Users, UserPlus, UserMinus,
  Clock, DollarSign, Bug, CalendarClock, AlertTriangle
} from 'lucide-react'
import { format, startOfMonth, subMonths, addDays, differenceInDays } from 'date-fns'
import Link from 'next/link'

export default async function OverviewPage() {
  const supabase = await createClient()
  const now = new Date()
  const monthStart = startOfMonth(now).toISOString()
  const in30Days = addDays(now, 30).toISOString()

  const [
    { data: allSubs },
    { data: newTrainers },
    { data: churnedSubs },
    { data: recentProfiles },
    { data: historySubs },
    { data: openBugs },
    { data: upcomingBillingSubs },
    { data: upcomingTrialSubs },
  ] = await Promise.all([
    supabase.from('subscriptions').select('plan, status, trainer_id'),
    supabase.from('profiles').select('id').eq('role', 'trainer').gte('created_at', monthStart),
    supabase.from('subscriptions').select('id').eq('status', 'canceled').gte('updated_at', monthStart),
    supabase.from('profiles').select('id, full_name, email, created_at')
      .eq('role', 'trainer').order('created_at', { ascending: false }).limit(5),
    supabase.from('subscriptions').select('plan, status, created_at')
      .gte('created_at', subMonths(now, 12).toISOString()),
    supabase.from('bug_log').select('id, priority, status')
      .neq('status', 'riješen').order('created_at', { ascending: false }),
    // Active subs renewing in 30 days
    supabase.from('subscriptions').select(`
      trainer_id, plan, status, current_period_end, cancel_at_period_end,
      profiles:trainer_id ( full_name )
    `).eq('status', 'active')
      .lte('current_period_end', in30Days)
      .gte('current_period_end', now.toISOString())
      .order('current_period_end', { ascending: true }),
    // Trials ending in 30 days → first payment
    supabase.from('subscriptions').select(`
      trainer_id, plan, status, trial_end,
      profiles:trainer_id ( full_name )
    `).eq('status', 'trialing')
      .lte('trial_end', in30Days)
      .gte('trial_end', now.toISOString())
      .order('trial_end', { ascending: true }),
  ])

  const subs = allSubs ?? []
  const mrr = subs.filter(s => s.status === 'active').reduce((sum, s) => sum + (PLAN_PRICES[s.plan] ?? 0), 0)
  const arr = mrr * 12
  const pipeline = subs.filter(s => s.status === 'trialing').reduce((sum, s) => sum + (PLAN_PRICES[s.plan] ?? 0), 0)
  const activeCount = subs.filter(s => s.status === 'active').length
  const trialCount = subs.filter(s => s.status === 'trialing').length
  const newCount = newTrainers?.length ?? 0
  const churnCount = churnedSubs?.length ?? 0
  const chartData = buildChartData(historySubs ?? [])

  // Bug stats
  const bugs = openBugs ?? []
  const highBugs = bugs.filter(b => b.priority === 'visok').length
  const totalOpenBugs = bugs.length

  // Upcoming events — merge billing + trials, sort by date
  type UpcomingEvent = {
    date: string
    name: string
    plan: string
    type: 'renewal' | 'trial_end' | 'cancel'
    revenue: number
    daysLeft: number
  }

  const upcoming: UpcomingEvent[] = [
    ...(upcomingTrialSubs ?? []).map(s => {
      const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
      return {
        date: s.trial_end!,
        name: profile?.full_name ?? '—',
        plan: s.plan,
        type: 'trial_end' as const,
        revenue: PLAN_PRICES[s.plan] ?? 0,
        daysLeft: differenceInDays(new Date(s.trial_end!), now),
      }
    }),
    ...(upcomingBillingSubs ?? []).map(s => {
      const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
      return {
        date: s.current_period_end!,
        name: profile?.full_name ?? '—',
        plan: s.plan,
        type: s.cancel_at_period_end ? 'cancel' as const : 'renewal' as const,
        revenue: s.cancel_at_period_end ? 0 : PLAN_PRICES[s.plan] ?? 0,
        daysLeft: differenceInDays(new Date(s.current_period_end!), now),
      }
    }),
  ]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 8)

  const upcoming30DayRevenue = [
    ...(upcomingTrialSubs ?? []).map(s => PLAN_PRICES[s.plan] ?? 0),
    ...(upcomingBillingSubs ?? []).filter(s => !s.cancel_at_period_end).map(s => PLAN_PRICES[s.plan] ?? 0),
  ].reduce((a, b) => a + b, 0)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">{format(now, 'MMMM yyyy')}</p>
      </div>

      {/* Financijski KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">MRR</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{mrr.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Samo aktivne pretplate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">ARR</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{arr.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">MRR × 12</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20 bg-yellow-500/5 col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Pipeline (trial)</CardTitle>
            <Clock className="w-4 h-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">€{pipeline.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{trialCount} korisnika · još ne plaća</p>
          </CardContent>
        </Card>
      </div>

      {/* Treneri row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Aktivni</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Status: active</p>
          </CardContent>
        </Card>
        <Card className={trialCount > 0 ? 'border-yellow-500/20' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">U trialu</CardTitle>
            <Clock className="w-4 h-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trialCount}</div>
            <p className="text-xs text-muted-foreground mt-1">14-dnevni besplatni trial</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Novi ovaj mj.</CardTitle>
            <UserPlus className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Registrirali se</p>
          </CardContent>
        </Card>
        <Card className={highBugs > 0 ? 'border-red-500/30 bg-red-500/5' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Otvoreni bugovi</CardTitle>
            <Bug className={`w-4 h-4 ${highBugs > 0 ? 'text-red-400' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${highBugs > 0 ? 'text-red-400' : ''}`}>{totalOpenBugs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {highBugs > 0 ? `${highBugs} visokog prioriteta` : 'Nema kritičnih'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Nadolazeći događaji</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sljedećih 30 dana · Očekivani prihod:{' '}
                <span className="text-emerald-400 font-semibold">€{upcoming30DayRevenue}</span>
              </p>
            </div>
            <CalendarClock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            {upcoming.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">
                Nema događaja u sljedećih 30 dana
              </p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((ev, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className={`w-14 text-center shrink-0 text-xs font-mono rounded px-1 py-0.5 ${
                      ev.daysLeft <= 3 ? 'bg-red-500/20 text-red-400' :
                      ev.daysLeft <= 7 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {ev.daysLeft === 0 ? 'danas' : `${ev.daysLeft}d`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate block">{ev.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {ev.type === 'trial_end' ? '🎯 Trial → plaćanje počinje' :
                         ev.type === 'cancel' ? '❌ Otkazuje pretplatu' :
                         '🔄 Obnova pretplate'}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-semibold ${
                        ev.type === 'cancel' ? 'text-muted-foreground line-through' :
                        ev.type === 'trial_end' ? 'text-emerald-400' : 'text-foreground'
                      }`}>
                        {ev.type === 'cancel' ? `€${PLAN_PRICES[ev.plan] ?? 0}` : `+€${ev.revenue}`}
                      </span>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(ev.date), 'd. M.')}</p>
                    </div>
                  </div>
                ))}
                {upcoming.length === 8 && (
                  <Link href="/finansije" className="block text-center text-xs text-blue-400 hover:text-blue-300 pt-1">
                    Vidi sve →
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent registrations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nedavne registracije</CardTitle>
          </CardHeader>
          <CardContent>
            {(recentProfiles ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Nema podataka</p>
            ) : (
              <div className="divide-y divide-border">
                {(recentProfiles ?? []).map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-3 gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{p.full_name || '—'}</p>
                      <p className="text-muted-foreground text-xs truncate">{p.email}</p>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(p.created_at), 'd. M. yyyy')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nove pretplate (zadnjih 12 mj.)</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  )
}

function buildChartData(subs: Array<{ plan: string; status: string; created_at: string }>) {
  const now = new Date()
  const months: Record<string, number> = {}
  for (let i = 11; i >= 0; i--) {
    months[format(subMonths(now, i), 'MMM yy')] = 0
  }
  subs.forEach((s) => {
    const key = format(new Date(s.created_at), 'MMM yy')
    if (key in months) months[key] += PLAN_PRICES[s.plan] ?? 0
  })
  return Object.entries(months).map(([month, revenue]) => ({ month, revenue }))
}
