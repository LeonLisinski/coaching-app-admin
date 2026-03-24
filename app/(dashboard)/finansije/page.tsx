export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { PLAN_PRICES, PLAN_LABELS } from '@/lib/config'
import { FinansijeClient } from '@/components/finansije/finansije-client'
import { differenceInDays, format, subMonths } from 'date-fns'

export default async function FinansijePage() {
  const supabase = await createClient()
  const now = new Date()

  const { data: subs } = await supabase
    .from('subscriptions')
    .select(`
      trainer_id,
      plan,
      status,
      current_period_end,
      trial_end,
      trial_start,
      locked_at,
      cancel_at_period_end,
      created_at,
      updated_at,
      profiles:trainer_id (
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false })

  const allSubs = subs ?? []

  // ── Revenue metrics ───────────────────────────────────────────────────────
  const activeSubs = allSubs.filter(s => s.status === 'active')
  const trialSubs  = allSubs.filter(s => s.status === 'trialing')
  const pastDueSubs = allSubs.filter(s => s.status === 'past_due')
  const canceledSubs = allSubs.filter(s => s.status === 'canceled')
  const lockedSubs = allSubs.filter(s => s.status === 'locked')
  const churning = allSubs.filter(s => s.cancel_at_period_end && (s.status === 'active' || s.status === 'trialing'))

  const mrr = activeSubs.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] ?? 0), 0)
  const arr = mrr * 12
  const pipeline = trialSubs.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] ?? 0), 0)
  const atRiskRevenue = pastDueSubs.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] ?? 0), 0)
  const churningRevenue = churning.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] ?? 0), 0)

  // ── Plan breakdown ────────────────────────────────────────────────────────
  const planBreakdown = ['starter', 'pro', 'scale'].map(plan => {
    const planActive = activeSubs.filter(s => s.plan === plan).length
    const planTrial  = trialSubs.filter(s => s.plan === plan).length
    const planRevenue = planActive * (PLAN_PRICES[plan] ?? 0)
    return { plan, label: PLAN_LABELS[plan], active: planActive, trialing: planTrial, revenue: planRevenue }
  })

  // ── Monthly chart data (new paid subs per month) ──────────────────────────
  const months: Record<string, { revenue: number; count: number }> = {}
  for (let i = 11; i >= 0; i--) {
    months[format(subMonths(now, i), 'MMM yy')] = { revenue: 0, count: 0 }
  }
  allSubs
    .filter(s => s.status !== 'trialing') // only subs that at some point converted
    .forEach((s) => {
      const key = format(new Date(s.created_at), 'MMM yy')
      if (key in months) {
        months[key].revenue += PLAN_PRICES[s.plan] ?? 0
        months[key].count += 1
      }
    })
  const chartData = Object.entries(months).map(([month, d]) => ({ month, ...d }))

  // ── At-risk details ───────────────────────────────────────────────────────
  const atRiskDetails = [...pastDueSubs, ...lockedSubs].map(s => {
    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
    const daysToLock = s.locked_at ? differenceInDays(new Date(s.locked_at), now) : null
    return {
      trainer_id: s.trainer_id,
      full_name: profile?.full_name ?? '—',
      email: profile?.email ?? '—',
      plan: s.plan,
      status: s.status,
      locked_at: s.locked_at,
      daysToLock,
    }
  }).sort((a, b) => (a.daysToLock ?? 999) - (b.daysToLock ?? 999))

  // ── Churning details ─────────────────────────────────────────────────────
  const churningDetails = churning.map(s => {
    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
    const daysLeft = s.current_period_end ? differenceInDays(new Date(s.current_period_end), now) : null
    return {
      trainer_id: s.trainer_id,
      full_name: profile?.full_name ?? '—',
      email: profile?.email ?? '—',
      plan: s.plan,
      status: s.status,
      current_period_end: s.current_period_end,
      daysLeft,
    }
  }).sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999))

  // ── Trial details ─────────────────────────────────────────────────────────
  const trialDetails = trialSubs.map(s => {
    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
    const daysLeft = s.trial_end ? differenceInDays(new Date(s.trial_end), now) : null
    return {
      trainer_id: s.trainer_id,
      full_name: profile?.full_name ?? '—',
      email: profile?.email ?? '—',
      plan: s.plan,
      trial_end: s.trial_end,
      daysLeft,
    }
  }).sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999))

  return (
    <FinansijeClient
      mrr={mrr}
      arr={arr}
      pipeline={pipeline}
      atRiskRevenue={atRiskRevenue}
      churningRevenue={churningRevenue}
      activeCount={activeSubs.length}
      trialCount={trialSubs.length}
      pastDueCount={pastDueSubs.length}
      lockedCount={lockedSubs.length}
      canceledCount={canceledSubs.length}
      churningCount={churning.length}
      planBreakdown={planBreakdown}
      chartData={chartData}
      atRiskDetails={atRiskDetails}
      churningDetails={churningDetails}
      trialDetails={trialDetails}
    />
  )
}
