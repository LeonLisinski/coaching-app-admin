export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase-admin'
import { PLAN_PRICES, PLAN_LABELS, effectivePrice } from '@/lib/config'
import { FinancijeClient } from '@/components/financije/financije-client'
import { differenceInDays, endOfMonth, format, startOfMonth, subMonths, addDays } from 'date-fns'
import { hr } from 'date-fns/locale'

export default async function FinancijePage() {
  const supabase = createAdminClient()
  const now = new Date()
  const in30Days = addDays(now, 30).toISOString()

  const { data: subs } = await supabase
    .from('subscriptions')
    .select(`
      trainer_id, plan, status, is_ambassador,
      current_period_end, current_period_start,
      trial_start, trial_end,
      locked_at, cancel_at_period_end,
      created_at, updated_at,
      promo_granted_at, promo_ends_at, promo_lost_at,
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

  const mrr             = activeSubs.reduce((sum, s) => sum + effectivePrice(s), 0)
  const arr             = mrr * 12
  const pipeline        = trialSubs.reduce((sum, s) => sum + effectivePrice(s), 0)
  const atRiskRevenue   = pastDueSubs.reduce((sum, s) => sum + effectivePrice(s), 0)
  const churningRevenue = churning.reduce((sum, s) => sum + effectivePrice(s), 0)

  const ambassadorSubs = allSubs.filter(s => s.is_ambassador)

  const planBreakdown = ['starter', 'pro', 'scale'].map(plan => ({
    plan,
    label: PLAN_LABELS[plan],
    active:   activeSubs.filter(s => s.plan === plan).length,
    trialing: trialSubs.filter(s => s.plan === plan).length,
    revenue:  activeSubs.filter(s => s.plan === plan).reduce((sum, s) => sum + effectivePrice(s), 0),
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
      if (daysLeft >= 0 && daysLeft <= 30) upcoming.push({ ...base, date: s.trial_end, type: 'trial_converts', amount: effectivePrice(s), daysLeft })
    }
    if (s.status === 'active' && s.current_period_end && !s.cancel_at_period_end) {
      const daysLeft = differenceInDays(new Date(s.current_period_end), now)
      if (daysLeft >= 0 && daysLeft <= 30) upcoming.push({ ...base, date: s.current_period_end, type: 'renewal', amount: effectivePrice(s), daysLeft })
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
  for (let i = 11; i >= 0; i--) months[format(subMonths(now, i), 'LLL yy', { locale: hr })] = { revenue: 0, count: 0 }
  allSubs.filter(s => s.status !== 'trialing').forEach(s => {
    const key = format(new Date(s.created_at), 'LLL yy', { locale: hr })
    if (key in months) { months[key].revenue += effectivePrice(s); months[key].count++ }
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
    return { trainer_id: s.trainer_id, full_name: profile?.full_name ?? '—', email: profile?.email ?? '—', plan: s.plan, trial_start: s.trial_start, trial_end: s.trial_end, daysLeft, daysUsed, trialDuration, firstChargeDate: s.trial_end, firstChargeAmount: effectivePrice(s) }
  }).sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999))

  const historyData = buildMonthlyHistory(allSubs)

  // ── Churn analytics ────────────────────────────────────────────────────────
  const thisMonthStart = startOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd   = endOfMonth(subMonths(now, 1))

  const churnedThisMonth = allSubs.filter(s =>
    s.status === 'canceled' &&
    new Date(s.updated_at) >= thisMonthStart
  ).length

  const churnedLastMonth = allSubs.filter(s =>
    s.status === 'canceled' &&
    new Date(s.updated_at) >= lastMonthStart &&
    new Date(s.updated_at) <= lastMonthEnd
  ).length

  // Active at start of this month (existing subs created before month start, not yet canceled or canceled after month start)
  const activeAtMonthStart = allSubs.filter(s => {
    const created = new Date(s.created_at)
    if (created >= thisMonthStart) return false
    if (s.status === 'canceled' && new Date(s.updated_at) < thisMonthStart) return false
    return true
  }).length

  const activeAtLastMonthStart = allSubs.filter(s => {
    const created = new Date(s.created_at)
    if (created >= lastMonthStart) return false
    if (s.status === 'canceled' && new Date(s.updated_at) < lastMonthStart) return false
    return true
  }).length

  const churnRateThisMonth = activeAtMonthStart > 0
    ? Math.round((churnedThisMonth / activeAtMonthStart) * 100)
    : 0

  const churnRateLastMonth = activeAtLastMonthStart > 0
    ? Math.round((churnedLastMonth / activeAtLastMonthStart) * 100)
    : 0

  // Average subscription lifetime (months) from canceled subs
  const canceledWithDates = canceledSubs.filter(s => s.created_at && s.updated_at)
  const avgLifetimeDays = canceledWithDates.length > 0
    ? canceledWithDates.reduce((sum, s) =>
        sum + differenceInDays(new Date(s.updated_at), new Date(s.created_at)), 0
      ) / canceledWithDates.length
    : 0
  const avgLifetimeMonths = Math.round((avgLifetimeDays / 30) * 10) / 10

  // LTV = avg lifetime months * avg revenue per paying sub
  const payingSubs = activeSubs.filter(s => !s.is_ambassador)
  const avgRevenue = payingSubs.length > 0
    ? payingSubs.reduce((sum, s) => sum + effectivePrice(s), 0) / payingSubs.length
    : 0
  const ltv = Math.round(avgLifetimeMonths * avgRevenue)

  // Churn feedback breakdown
  const { data: feedbackRows } = await supabase
    .from('churn_feedback')
    .select('reason')

  const reasonCounts: Record<string, number> = {}
  for (const row of feedbackRows ?? []) {
    reasonCounts[row.reason] = (reasonCounts[row.reason] ?? 0) + 1
  }

  const churnStats = {
    rateThisMonth: churnRateThisMonth,
    rateLastMonth: churnRateLastMonth,
    countThisMonth: churnedThisMonth,
    countLastMonth: churnedLastMonth,
    avgLifetimeMonths,
    ltv,
    alert: churnRateThisMonth >= 10,
    reasonBreakdown: Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
  }

  // Per-trainer churn feedback (for Treneri detail panel)
  const { data: allFeedback } = await supabase
    .from('churn_feedback')
    .select('trainer_id, reason, note, created_at')

  const feedbackByTrainer: Record<string, { reason: string; note: string | null; created_at: string }> = {}
  for (const f of allFeedback ?? []) {
    feedbackByTrainer[f.trainer_id] = { reason: f.reason, note: f.note, created_at: f.created_at }
  }

  const ambassadorDetails = ambassadorSubs.map(s => {
    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
    return { trainer_id: s.trainer_id, full_name: profile?.full_name ?? '—', email: profile?.email ?? '—', plan: s.plan, status: s.status, created_at: s.created_at }
  })

  // ── Conversion funnel ─────────────────────────────────────────────────────
  // Use last 12 months of history data for monthly funnel
  const funnelMonths = 3
  const funnelData = Array.from({ length: funnelMonths }).map((_, i) => {
    const mDate = subMonths(now, funnelMonths - 1 - i)
    const mStart = startOfMonth(mDate)
    const mEnd   = endOfMonth(mDate)
    const label  = format(mDate, 'LLL yy.', { locale: hr })

    const registered = allSubs.filter(s => {
      const d = new Date(s.created_at)
      return d >= mStart && d <= mEnd
    }).length

    const trialed = allSubs.filter(s => {
      const d = new Date(s.created_at)
      return d >= mStart && d <= mEnd && (s.trial_start !== null || s.status !== null)
    }).length

    const converted = allSubs.filter(s => {
      const d = new Date(s.created_at)
      return d >= mStart && d <= mEnd && (s.status === 'active' || s.status === 'past_due' || s.status === 'locked')
    }).length

    const churned = allSubs.filter(s => {
      if (s.status !== 'canceled') return false
      const d = new Date(s.updated_at)
      return d >= mStart && d <= mEnd
    }).length

    return { label, registered, trialed, converted, churned }
  })

  // All-time funnel totals
  const funnelTotals = {
    registered: allSubs.length,
    trialed: allSubs.filter(s => s.trial_start !== null).length,
    converted: allSubs.filter(s => s.status === 'active' || s.status === 'past_due' || s.status === 'locked').length,
    churned: canceledSubs.length,
  }

  // ── Revenue forecast (next 3 months) ─────────────────────────────────────
  const forecastMonths = [1, 2, 3].map(offset => {
    const mDate  = subMonths(now, -offset) // addMonths
    const mStart = startOfMonth(mDate)
    const mEnd   = endOfMonth(mDate)
    const label  = format(mDate, 'LLL yyyy.', { locale: hr })

    // Subs active (not canceled, not cancel_at_period_end expiring before this month)
    let base = 0
    let confirmed = 0
    let lost = 0

    activeSubs.forEach(s => {
      const price = effectivePrice(s)
      if (s.cancel_at_period_end && s.current_period_end) {
        // Will this sub expire before this month?
        const exp = new Date(s.current_period_end)
        if (exp < mStart) {
          lost += price
        } else {
          base += price
        }
      } else {
        base += price
      }
      confirmed = base
    })

    // Trial subs that convert before this month
    trialSubs.forEach(s => {
      if (!s.trial_end) return
      const trialEnd = new Date(s.trial_end)
      if (trialEnd < mStart) {
        // Already converted (or should have) by this month
        confirmed += effectivePrice(s)
      }
    })

    return { label, revenue: Math.round(confirmed), lost: Math.round(lost), month: format(mDate, 'M/yyyy') }
  })

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
      ambassadorCount={ambassadorSubs.length}
      ambassadorDetails={ambassadorDetails}
      churnStats={churnStats}
      feedbackByTrainer={feedbackByTrainer}
      funnelData={funnelData}
      funnelTotals={funnelTotals}
      forecastMonths={forecastMonths}
    />
  )
}

type SubRecord = {
  plan: string; status: string; created_at: string; updated_at: string;
  trial_end: string | null;
  promo_granted_at?: string | null;
  promo_ends_at?: string | null;
  promo_lost_at?: string | null;
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

    const mrr = paying.reduce((sum, s) => sum + effectivePrice(s), 0)
    const newCount = subs.filter(s => {
      const d = new Date(s.created_at)
      return d >= monthStart && d <= monthEnd
    }).length
    const churnCount = subs.filter(s => {
      if (s.status !== 'canceled') return false
      const d = new Date(s.updated_at)
      return d >= monthStart && d <= monthEnd
    }).length

    result.push({ month: format(monthDate, 'LLL yyyy.', { locale: hr }), new: newCount, churned: churnCount, active: activeAtEnd.length, mrr })
  }

  return result
}
