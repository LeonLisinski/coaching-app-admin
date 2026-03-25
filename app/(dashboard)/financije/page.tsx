export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { PLAN_PRICES, PLAN_LABELS } from '@/lib/config'
import { FinancijeClient } from '@/components/financije/financije-client'
import { differenceInDays, endOfMonth, format, startOfMonth, subMonths, addDays } from 'date-fns'

export default async function FinancijePage() {
  const supabase = await createClient()
  const now = new Date()
  const in30Days = addDays(now, 30).toISOString()

  const { data: subs } = await supabase
    .from('subscriptions')
    .select(`
      trainer_id, plan, status,
      current_period_end, current_period_start,
      trial_start, trial_end,
      locked_at, cancel_at_period_end,
      created_at, updated_at,
      profiles:trainer_id ( full_name, email )
    `)
    .order('created_at', { ascending: false })

  const allSubs = subs ?? []

  const activeSubs   = allSubs.filter(s => s.status === 'active')
  const trialSubs    = allSubs.filter(s => s.status === 'trialing')
  const pastDueSubs  = allSubs.filter(s => s.status === 'past_due')
  const canceledSubs = allSubs.filter(s => s.status === 'canceled')
  const lockedSubs   = allSubs.filter(s => s.status === 'locked')
  const churning     = allSubs.filter(s => s.cancel_at_period_end && (s.status === 'active' || s.status === 'trialing'))

  const mrr             = activeSubs.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] ?? 0), 0)
  const arr             = mrr * 12
  const pipeline        = trialSubs.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] ?? 0), 0)
  const atRiskRevenue   = pastDueSubs.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] ?? 0), 0)
  const churningRevenue = churning.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] ?? 0), 0)

  const planBreakdown = ['starter', 'pro', 'scale'].map(plan => ({
    plan,
    label: PLAN_LABELS[plan],
    active:   activeSubs.filter(s => s.plan === plan).length,
    trialing: trialSubs.filter(s => s.plan === plan).length,
    revenue:  activeSubs.filter(s => s.plan === plan).length * (PLAN_PRICES[plan] ?? 0),
  }))

  type UpcomingItem = {
    date: string
    trainer_id: string
    full_name: string
    email: string
    plan: string
    type: 'trial_converts' | 'renewal' | 'cancels' | 'locks'
    amount: number
    daysLeft: number
    extra?: string
  }

  const upcoming: UpcomingItem[] = []
  allSubs.forEach(s => {
    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
    const base = {
      trainer_id: s.trainer_id,
      full_name: profile?.full_name ?? '—',
      email: profile?.email ?? '—',
      plan: s.plan,
    }
    if (s.status === 'trialing' && s.trial_end) {
      const daysLeft = differenceInDays(new Date(s.trial_end), now)
      if (daysLeft >= 0 && daysLeft <= 30) upcoming.push({ ...base, date: s.trial_end, type: 'trial_converts', amount: PLAN_PRICES[s.plan] ?? 0, daysLeft })
    }
    if (s.status === 'active' && s.current_period_end && !s.cancel_at_period_end) {
      const daysLeft = differenceInDays(new Date(s.current_period_end), now)
      if (daysLeft >= 0 && daysLeft <= 30) upcoming.push({ ...base, date: s.current_period_end, type: 'renewal', amount: PLAN_PRICES[s.plan] ?? 0, daysLeft })
    }
    if (s.cancel_at_period_end && s.current_period_end) {
      const daysLeft = differenceInDays(new Date(s.current_period_end), now)
      if (daysLeft >= 0 && daysLeft <= 30) upcoming.push({ ...base, date: s.current_period_end, type: 'cancels', amount: 0, daysLeft })
    }
    if (s.status === 'past_due' && s.locked_at) {
      const daysLeft = differenceInDays(new Date(s.locked_at), now)
      if (daysLeft >= 0 && daysLeft <= 30) upcoming.push({ ...base, date: s.locked_at, type: 'locks', amount: 0, daysLeft })
    }
  })
  upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const upcomingRevenue = upcoming.filter(u => u.type === 'trial_converts' || u.type === 'renewal').reduce((sum, u) => sum + u.amount, 0)

  const months: Record<string, { revenue: number; count: number }> = {}
  for (let i = 11; i >= 0; i--) months[format(subMonths(now, i), 'MMM yy')] = { revenue: 0, count: 0 }
  allSubs.filter(s => s.status !== 'trialing').forEach(s => {
    const key = format(new Date(s.created_at), 'MMM yy')
    if (key in months) { months[key].revenue += PLAN_PRICES[s.plan] ?? 0; months[key].count++ }
  })
  const chartData = Object.entries(months).map(([month, d]) => ({ month, ...d }))

  const atRiskDetails = [...pastDueSubs, ...lockedSubs].map(s => {
    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
    return { trainer_id: s.trainer_id, full_name: profile?.full_name ?? '—', email: profile?.email ?? '—', plan: s.plan, status: s.status, locked_at: s.locked_at, daysToLock: s.locked_at ? differenceInDays(new Date(s.locked_at), now) : null }
  }).sort((a, b) => (a.daysToLock ?? 999) - (b.daysToLock ?? 999))

  const churningDetails = churning.map(s => {
    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
    return { trainer_id: s.trainer_id, full_name: profile?.full_name ?? '—', email: profile?.email ?? '—', plan: s.plan, status: s.status, current_period_end: s.current_period_end, daysLeft: s.current_period_end ? differenceInDays(new Date(s.current_period_end), now) : null }
  }).sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999))

  const trialDetails = trialSubs.map(s => {
    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
    const daysLeft = s.trial_end ? differenceInDays(new Date(s.trial_end), now) : null
    const trialDuration = s.trial_start && s.trial_end ? differenceInDays(new Date(s.trial_end), new Date(s.trial_start)) : 14
    const daysUsed = s.trial_start ? differenceInDays(now, new Date(s.trial_start)) : null
    return { trainer_id: s.trainer_id, full_name: profile?.full_name ?? '—', email: profile?.email ?? '—', plan: s.plan, trial_start: s.trial_start, trial_end: s.trial_end, daysLeft, daysUsed, trialDuration, firstChargeDate: s.trial_end, firstChargeAmount: PLAN_PRICES[s.plan] ?? 0 }
  }).sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999))

  const historyData = buildMonthlyHistory(allSubs)

  return (
    <FinancijeClient
      mrr={mrr} arr={arr} pipeline={pipeline}
      atRiskRevenue={atRiskRevenue} churningRevenue={churningRevenue}
      activeCount={activeSubs.length} trialCount={trialSubs.length}
      pastDueCount={pastDueSubs.length} lockedCount={lockedSubs.length}
      canceledCount={canceledSubs.length} churningCount={churning.length}
      planBreakdown={planBreakdown} chartData={chartData}
      atRiskDetails={atRiskDetails} churningDetails={churningDetails}
      trialDetails={trialDetails} upcomingEvents={upcoming}
      upcomingRevenue={upcomingRevenue}
      historyData={historyData}
    />
  )
}

type SubRecord = {
  plan: string; status: string; created_at: string; updated_at: string;
  trial_end: string | null;
}

function buildMonthlyHistory(subs: SubRecord[]) {
  const now = new Date()
  const result = []

  for (let i = 23; i >= 0; i--) {
    const monthDate = subMonths(now, i)
    const monthEnd = endOfMonth(monthDate)
    const monthStart = startOfMonth(monthDate)

    // Subscriptions that existed and were not-yet-canceled at end of this month
    const activeAtEnd = subs.filter(s => {
      if (new Date(s.created_at) > monthEnd) return false
      if (s.status === 'canceled') return new Date(s.updated_at) > monthEnd
      return true
    })

    // Paying (not trialing) at end of month: trial_end was before or at monthEnd
    const paying = activeAtEnd.filter(s => {
      if (!s.trial_end) return true
      return new Date(s.trial_end) <= monthEnd
    })

    const mrr = paying.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] ?? 0), 0)
    const newCount = subs.filter(s => {
      const d = new Date(s.created_at)
      return d >= monthStart && d <= monthEnd
    }).length
    const churnCount = subs.filter(s => {
      if (s.status !== 'canceled') return false
      const d = new Date(s.updated_at)
      return d >= monthStart && d <= monthEnd
    }).length

    result.push({ month: format(monthDate, 'MMM yyyy'), new: newCount, churned: churnCount, active: activeAtEnd.length, mrr })
  }

  return result
}
