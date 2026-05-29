'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  TrendingUp, DollarSign, Clock, AlertTriangle,
  TrendingDown, Lock, CalendarClock, CheckCircle2,
  Activity, Loader2, Check, MessageSquare,
  Filter, BarChart3, Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { PLAN_LABELS } from '@/lib/config'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// ── Types ─────────────────────────────────────────────────────────────────

interface PlanRow { plan: string; label: string; active: number; trialing: number; revenue: number }
interface AtRiskRow { trainer_id: string; full_name: string; email: string; plan: string; status: string; locked_at: string | null; daysToLock: number | null }
interface ChurningRow { trainer_id: string; full_name: string; email: string; plan: string; status: string; current_period_end: string | null; daysLeft: number | null }
interface TrialRow { trainer_id: string; full_name: string; email: string; plan: string; trial_start: string | null; trial_end: string | null; daysLeft: number | null; daysUsed: number | null; trialDuration: number; firstChargeDate: string | null; firstChargeAmount: number }
interface UpcomingItem { date: string; trainer_id: string; full_name: string; email: string; plan: string; type: 'trial_converts' | 'renewal' | 'cancels' | 'locks'; amount: number; daysLeft: number; extra?: string }

interface HistoryRow { month: string; new: number; churned: number; active: number; mrr: number }

interface AmbassadorRow { trainer_id: string; full_name: string; email: string; plan: string; status: string; created_at: string }

interface ChurnStats {
  rateThisMonth: number
  rateLastMonth: number
  countThisMonth: number
  countLastMonth: number
  avgLifetimeMonths: number
  ltv: number
  alert: boolean
  reasonBreakdown: Array<{ reason: string; count: number }>
}

interface FunnelMonth { label: string; registered: number; trialed: number; converted: number; churned: number }
interface FunnelTotals { registered: number; trialed: number; converted: number; churned: number }
interface ForecastMonth { label: string; revenue: number; lost: number; month: string }

interface Props {
  mrr: number; arr: number; pipeline: number; atRiskRevenue: number; churningRevenue: number
  activeCount: number; trialCount: number; pastDueCount: number; lockedCount: number; canceledCount: number; churningCount: number
  planBreakdown: PlanRow[]
  chartData: Array<{ month: string; revenue: number; count: number }>
  atRiskDetails: AtRiskRow[]
  churningDetails: ChurningRow[]
  trialDetails: TrialRow[]
  upcomingEvents: UpcomingItem[]
  upcomingRevenue: number
  historyData: HistoryRow[]
  ambassadorCount: number
  ambassadorDetails: AmbassadorRow[]
  churnStats: ChurnStats
  feedbackByTrainer: Record<string, { reason: string; note: string | null; created_at: string }>
  funnelData: FunnelMonth[]
  funnelTotals: FunnelTotals
  forecastMonths: ForecastMonth[]
}

// ── Helpers ───────────────────────────────────────────────────────────────

function planBadge(plan: string | null) {
  switch (plan) {
    case 'scale': return 'bg-violet-500/20 text-violet-300 border-violet-500/30'
    case 'pro': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 'starter': return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30'
    default: return 'bg-zinc-800 text-zinc-400 border-zinc-700'
  }
}

function daysColor(days: number | null) {
  if (days === null) return 'text-muted-foreground'
  if (days <= 3) return 'text-red-400'
  if (days <= 7) return 'text-yellow-400'
  return 'text-emerald-400'
}

function daysBadge(days: number | null) {
  if (days === null) return 'bg-muted text-muted-foreground'
  if (days <= 3) return 'bg-red-500/20 text-red-400 border-red-500/20'
  if (days <= 7) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20'
  return 'bg-muted text-muted-foreground border-border'
}

const PLAN_COLORS: Record<string, string> = { starter: '#71717a', pro: '#3b82f6', scale: '#7c3aed' }

// ── Component ─────────────────────────────────────────────────────────────

const CHURN_REASONS = [
  { value: 'cijena', label: 'Cijena previsoka' },
  { value: 'feature', label: 'Nedostaje feature' },
  { value: 'konkurent', label: 'Prešao na konkurenta' },
  { value: 'pauza', label: 'Privremena pauza' },
  { value: 'ostalo', label: 'Ostalo' },
]

const REASON_COLORS: Record<string, string> = {
  cijena: 'bg-red-500/20 text-red-300 border-red-500/30',
  feature: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  konkurent: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  pauza: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  ostalo: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
}

function reasonLabel(r: string) {
  return CHURN_REASONS.find(x => x.value === r)?.label ?? r
}

export function FinancijeClient({
  mrr, arr, pipeline, atRiskRevenue, churningRevenue,
  activeCount, trialCount, pastDueCount, lockedCount, canceledCount, churningCount,
  planBreakdown, chartData, atRiskDetails, churningDetails, trialDetails,
  upcomingEvents, upcomingRevenue, historyData,
  ambassadorCount, ambassadorDetails,
  churnStats, feedbackByTrainer: initialFeedback,
  funnelData, funnelTotals, forecastMonths,
}: Props) {

  const [feedback, setFeedback] = useState(initialFeedback)
  const [pendingReason, setPendingReason] = useState<Record<string, string>>({})
  const [pendingNote, setPendingNote] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  async function saveFeedback(trainerId: string) {
    const reason = pendingReason[trainerId]
    if (!reason) return
    setSaving(p => ({ ...p, [trainerId]: true }))
    const note = pendingNote[trainerId] ?? null
    const res = await fetch('/api/churn-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trainer_id: trainerId, reason, note }),
    })
    setSaving(p => ({ ...p, [trainerId]: false }))
    if (res.ok) {
      setFeedback(p => ({ ...p, [trainerId]: { reason, note, created_at: new Date().toISOString() } }))
      setPendingReason(p => { const n = { ...p }; delete n[trainerId]; return n })
      setPendingNote(p => { const n = { ...p }; delete n[trainerId]; return n })
      setSaved(p => ({ ...p, [trainerId]: true }))
      setTimeout(() => setSaved(p => ({ ...p, [trainerId]: false })), 2000)
    }
  }

  const upcomingConverts = upcomingEvents.filter(e => e.type === 'trial_converts').length

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financije</h1>
        <p className="text-muted-foreground text-sm mt-1">SaaS metrike, prihodi i pregled pretplata</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="border-blue-500/30 bg-blue-500/5 col-span-2 md:col-span-1">
          <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs text-muted-foreground">MRR</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">€{mrr.toLocaleString('hr')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{activeCount} plaća · trialing ne računa</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs text-muted-foreground">ARR</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">€{arr.toLocaleString('hr')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">MRR × 12</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs text-muted-foreground">Pipeline</CardTitle>
            <Clock className="w-4 h-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-400">€{pipeline.toLocaleString('hr')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{trialCount} triala · besplatno</p>
          </CardContent>
        </Card>
        <Card className={atRiskRevenue > 0 ? 'border-red-500/20 bg-red-500/5' : ''}>
          <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs text-muted-foreground">Rizično</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${atRiskRevenue > 0 ? 'text-red-400' : ''}`}>€{atRiskRevenue.toLocaleString('hr')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{pastDueCount} kasni · {lockedCount} zaključano</p>
          </CardContent>
        </Card>
        <Card className={churningRevenue > 0 ? 'border-orange-500/20 bg-orange-500/5' : ''}>
          <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs text-muted-foreground">Otkazuju</CardTitle>
            <TrendingDown className="w-4 h-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${churningRevenue > 0 ? 'text-orange-400' : ''}`}>€{churningRevenue.toLocaleString('hr')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{churningCount} otkazuje</p>
          </CardContent>
        </Card>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { l: 'Aktivni', c: activeCount, s: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
          { l: 'Trial', c: trialCount, s: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
          { l: 'Past Due', c: pastDueCount, s: 'bg-red-500/20 text-red-300 border-red-500/30' },
          { l: 'Locked', c: lockedCount, s: 'bg-red-900/30 text-red-400 border-red-700/30' },
          { l: 'Canceled', c: canceledCount, s: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30' },
          { l: 'Ambassador', c: ambassadorCount, s: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
        ].map(s => (
          <span key={s.l} className={`text-xs px-3 py-1.5 rounded-full border font-medium ${s.s}`}>
            {s.l}: <strong>{s.c}</strong>
          </span>
        ))}
      </div>

      {/* Churn analytics */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Churn analitika
        </h2>
        {churnStats.alert && (
          <div className="mb-3 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-300">
              <strong>Upozorenje:</strong> Churn rate ovog mjeseca je{' '}
              <strong>{churnStats.rateThisMonth}%</strong> — iznad 10% praga.
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className={churnStats.alert ? 'border-red-500/30 bg-red-500/5' : ''}>
            <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs text-muted-foreground">Churn ovaj mj.</CardTitle>
              <TrendingDown className={`w-4 h-4 ${churnStats.alert ? 'text-red-400' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${churnStats.alert ? 'text-red-400' : ''}`}>
                {churnStats.rateThisMonth}%
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{churnStats.countThisMonth} otkazano</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs text-muted-foreground">Churn prošli mj.</CardTitle>
              <TrendingDown className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl font-bold">{churnStats.rateLastMonth}%</p>
                {churnStats.rateThisMonth !== churnStats.rateLastMonth && (
                  <span className={`text-xs font-medium ${churnStats.rateThisMonth > churnStats.rateLastMonth ? 'text-red-400' : 'text-emerald-400'}`}>
                    {churnStats.rateThisMonth > churnStats.rateLastMonth ? '↑' : '↓'}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{churnStats.countLastMonth} otkazano</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs text-muted-foreground">Avg. životni vijek</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {churnStats.avgLifetimeMonths > 0 ? `${churnStats.avgLifetimeMonths}mj` : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {canceledCount} otkazanih pretplata
              </p>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs text-muted-foreground">LTV (procjena)</CardTitle>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-400">
                {churnStats.ltv > 0 ? `€${churnStats.ltv.toLocaleString('hr')}` : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">avg prihod × avg trajanje</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upcoming + Plan breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Nadolazeći prihodi */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="w-4 h-4" />
                  Nadolazeći događaji (30 dana)
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Očekivani prihod:{' '}
                  <span className="text-emerald-400 font-bold">€{upcomingRevenue.toLocaleString('hr')}</span>
                  {upcomingConverts > 0 && (
                    <span className="text-yellow-400 ml-2">· {upcomingConverts} triala konvertira</span>
                  )}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">Nema događaja u sljedećih 30 dana</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((ev, i) => (
                  <div key={i} className={`flex items-start gap-3 p-2.5 rounded-lg border text-sm ${
                    ev.type === 'locks' ? 'border-red-500/20 bg-red-500/5' :
                    ev.type === 'cancels' ? 'border-orange-500/15 bg-orange-500/5' :
                    ev.type === 'trial_converts' ? 'border-yellow-500/20 bg-yellow-500/5' :
                    'border-border'
                  }`}>
                    <div className={`shrink-0 text-xs font-mono px-2 py-1 rounded border text-center w-14 ${daysBadge(ev.daysLeft)}`}>
                      {ev.daysLeft === 0 ? 'danas' : `${ev.daysLeft}d`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium">{ev.full_name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${planBadge(ev.plan)}`}>
                          {PLAN_LABELS[ev.plan] ?? ev.plan}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ev.type === 'trial_converts' ? '🎯 Trial završava → počinje plaćati' :
                         ev.type === 'renewal' ? '🔄 Obnova pretplate' :
                         ev.type === 'cancels' ? '❌ Pretplata se gasi' :
                         '🔒 Zaključava se (neplaćeno)'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{ev.email} · {format(new Date(ev.date), 'd. M. yyyy')}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`text-sm font-bold ${
                        ev.type === 'cancels' || ev.type === 'locks' ? 'text-muted-foreground' :
                        ev.type === 'trial_converts' ? 'text-yellow-400' : 'text-emerald-400'
                      }`}>
                        {ev.type === 'cancels' || ev.type === 'locks' ? '—' : `+€${ev.amount}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Po paketima</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-0 divide-y divide-border">
              <div className="grid grid-cols-4 pb-2 text-xs font-medium text-muted-foreground">
                <span>Plan</span>
                <span className="text-center">Aktivni</span>
                <span className="text-center">Trial</span>
                <span className="text-right">MRR</span>
              </div>
              {planBreakdown.map(row => (
                <div key={row.plan} className="grid grid-cols-4 py-3 items-center text-sm">
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium w-fit ${planBadge(row.plan)}`}>
                    {row.label}
                  </span>
                  <span className="text-center font-mono font-semibold">{row.active}</span>
                  <span className="text-center font-mono text-yellow-400">{row.trialing}</span>
                  <span className="text-right font-semibold">€{row.revenue.toLocaleString('hr')}</span>
                </div>
              ))}
              {ambassadorCount > 0 && (
                <div className="grid grid-cols-4 py-3 items-center text-sm">
                  <span className="text-xs px-2 py-0.5 rounded border font-medium w-fit bg-amber-500/20 text-amber-300 border-amber-500/30">
                    Ambassador
                  </span>
                  <span className="text-center font-mono font-semibold">{ambassadorCount}</span>
                  <span className="text-center font-mono text-muted-foreground">—</span>
                  <span className="text-right font-semibold text-muted-foreground">€0</span>
                </div>
              )}
              <div className="grid grid-cols-4 py-3 items-center text-sm font-bold">
                <span className="text-muted-foreground">Ukupno</span>
                <span className="text-center">{activeCount + ambassadorCount}</span>
                <span className="text-center text-yellow-400">{trialCount}</span>
                <span className="text-right text-blue-400">€{mrr.toLocaleString('hr')}</span>
              </div>
            </div>

            <div className="space-y-2">
              {planBreakdown.map(row => (
                <div key={row.plan} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-14">{row.label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: activeCount > 0 ? `${(row.active / activeCount) * 100}%` : '0%', backgroundColor: PLAN_COLORS[row.plan] }}
                    />
                  </div>
                  <span className="text-xs font-mono w-6 text-right text-muted-foreground">{row.active}</span>
                </div>
              ))}
            </div>

            <div className="h-px bg-border" />
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'oklch(0.708 0 0)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'oklch(0.708 0 0)' }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
                <Tooltip contentStyle={{ backgroundColor: 'oklch(0.205 0 0)', border: '1px solid oklch(1 0 0 / 10%)', borderRadius: '8px', fontSize: '11px', color: 'oklch(0.985 0 0)' }} formatter={(v) => [`€${v}`, 'Prihod']} />
                <Bar dataKey="revenue" radius={[3, 3, 0, 0]} fill="oklch(0.623 0.214 259.815)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Conversion funnel ──────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Filter className="w-4 h-4" /> Conversion funnel (ukupno)
        </h2>
        <div className="rounded-xl border border-border overflow-hidden">
          {/* All-time funnel steps */}
          <div className="grid grid-cols-4 divide-x divide-border">
            {[
              { label: 'Registrirani', value: funnelTotals.registered, color: 'text-blue-400', bg: '' },
              { label: 'Trial', value: funnelTotals.trialed, color: 'text-yellow-400', bg: '' },
              { label: 'Plaćajući', value: funnelTotals.converted, color: 'text-emerald-400', bg: '' },
              { label: 'Otkazali', value: funnelTotals.churned, color: 'text-red-400', bg: '' },
            ].map((step, i) => {
              const pct = funnelTotals.registered > 0
                ? Math.round((step.value / funnelTotals.registered) * 100)
                : 0
              const convRate = i > 0 && funnelTotals.registered > 0
                ? Math.round((step.value / (i === 1 ? funnelTotals.registered : i === 2 ? funnelTotals.trialed : funnelTotals.converted)) * 100)
                : null
              return (
                <div key={step.label} className="p-4 text-center space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{step.label}</p>
                  <p className={`text-2xl font-bold ${step.color}`}>{step.value}</p>
                  <p className="text-[10px] text-muted-foreground">{pct}% ukupnih</p>
                  {convRate !== null && i < 3 && (
                    <p className={`text-[10px] font-medium ${i === 2 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                      {i === 1 ? `→ ${convRate}% triala` : i === 2 ? `→ ${convRate}% konv.` : ''}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Progress bar funnel visualization */}
          <div className="px-4 pb-4 space-y-1.5">
            {[
              { label: 'Registrirani', value: funnelTotals.registered, color: 'bg-blue-500' },
              { label: 'Trial', value: funnelTotals.trialed, color: 'bg-yellow-500' },
              { label: 'Plaćajući', value: funnelTotals.converted, color: 'bg-emerald-500' },
              { label: 'Otkazali', value: funnelTotals.churned, color: 'bg-red-500' },
            ].map(step => (
              <div key={step.label} className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground w-20 text-right shrink-0">{step.label}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${step.color}`}
                    style={{ width: funnelTotals.registered > 0 ? `${(step.value / funnelTotals.registered) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground w-6 shrink-0">{step.value}</span>
              </div>
            ))}
          </div>

          {/* Monthly breakdown */}
          {funnelData.length > 0 && (
            <div className="border-t border-border">
              <div className="grid grid-cols-[70px_1fr_1fr_1fr_1fr] gap-0 px-4 py-2 bg-muted/30 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                <span>Mj.</span><span className="text-center">Novi</span><span className="text-center">Trial</span><span className="text-center">Konv.</span><span className="text-center">Churn</span>
              </div>
              {funnelData.map(row => {
                const convRate = row.trialed > 0 ? Math.round((row.converted / row.trialed) * 100) : null
                return (
                  <div key={row.label} className="grid grid-cols-[70px_1fr_1fr_1fr_1fr] gap-0 px-4 py-2.5 border-t border-border/50 text-xs items-center">
                    <span className="text-muted-foreground font-medium">{row.label}</span>
                    <span className="text-center font-bold text-blue-400">{row.registered || '—'}</span>
                    <span className="text-center font-bold text-yellow-400">{row.trialed || '—'}</span>
                    <span className="text-center">
                      <span className="font-bold text-emerald-400">{row.converted || '—'}</span>
                      {convRate !== null && row.trialed > 0 && (
                        <span className="text-[9px] text-muted-foreground ml-1">({convRate}%)</span>
                      )}
                    </span>
                    <span className="text-center font-bold text-red-400">{row.churned || '—'}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Revenue forecast ───────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Prognoza prihoda (sljedeća 3 mj.)
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Procjena bazirana na aktivnim pretplatama i poznatim datumima obnove/isteka. Ne uključuje potencijalni novi churn.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {forecastMonths.map((m, i) => (
            <Card key={m.month} className={i === 0 ? 'border-blue-500/30 bg-blue-500/5' : ''}>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs text-muted-foreground">{m.label}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                <p className={`text-xl font-bold ${i === 0 ? 'text-blue-400' : ''}`}>
                  €{m.revenue.toLocaleString('hr')}
                </p>
                {m.lost > 0 && (
                  <p className="text-[10px] text-orange-400">
                    −€{m.lost.toLocaleString('hr')} od otkazivanja
                  </p>
                )}
                {m.lost === 0 && (
                  <p className="text-[10px] text-muted-foreground">bez poznatih otkazivanja</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <BarChart3 className="w-3 h-3 text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground">
            Trenutni MRR: <span className="text-blue-400 font-semibold">€{mrr.toLocaleString('hr')}</span>
            {forecastMonths[0] && forecastMonths[0].revenue > mrr && (
              <span className="text-emerald-400 ml-2">
                +€{(forecastMonths[0].revenue - mrr).toLocaleString('hr')} od triala koji konvertiraju
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Detalji tabovi */}
      <Tabs defaultValue="trial">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="trial">
            Besplatni trial
            {trialCount > 0 && (
              <span className="ml-1.5 bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {trialCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="atrisk">
            Rizično
            {(pastDueCount + lockedCount) > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pastDueCount + lockedCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="churning">
            Otkazuju
            {churningCount > 0 && (
              <span className="ml-1.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {churningCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ambassador">
            Ambasadori
            {ambassadorCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {ambassadorCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="churn-razlozi">
            <MessageSquare className="w-3.5 h-3.5 mr-1" />
            Razlozi
            {churnStats.reasonBreakdown.length > 0 && (
              <span className="ml-1.5 bg-violet-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {churnStats.reasonBreakdown.reduce((s, r) => s + r.count, 0)}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="povijest">Povijest</TabsTrigger>
        </TabsList>

        {/* Trial tab — full detail */}
        <TabsContent value="trial" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {trialCount} korisnika koristi besplatni 14-dnevni trial · Pipeline vrijednost:{' '}
              <span className="text-yellow-400 font-semibold">€{pipeline.toLocaleString('hr')}/mj</span>
            </p>
          </div>
          {trialDetails.length === 0 ? (
            <EmptyState icon={<Clock className="w-8 h-8" />} text="Nema korisnika u trialu." />
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[60vh]">
              {trialDetails.map(r => (
                <div key={r.trainer_id} className={`border rounded-lg p-4 space-y-3 ${
                  r.daysLeft !== null && r.daysLeft <= 3
                    ? 'border-red-500/30 bg-red-500/5'
                    : r.daysLeft !== null && r.daysLeft <= 7
                    ? 'border-yellow-500/20 bg-yellow-500/5'
                    : 'border-border'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{r.full_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${planBadge(r.plan)}`}>
                          {PLAN_LABELS[r.plan] ?? r.plan} · €{r.firstChargeAmount}/mj
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs mt-0.5">{r.email}</p>
                    </div>
                    <div className={`shrink-0 text-center px-3 py-1.5 rounded-lg border text-xs font-bold ${
                      r.daysLeft !== null && r.daysLeft <= 3 ? 'border-red-500/30 bg-red-500/10 text-red-400' :
                      r.daysLeft !== null && r.daysLeft <= 7 ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' :
                      'border-border text-foreground'
                    }`}>
                      {r.daysLeft !== null ? (r.daysLeft === 0 ? 'danas' : `${r.daysLeft}d`) : '—'}
                      <p className="text-[9px] font-normal opacity-70 mt-0.5">ostalo</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {r.daysUsed !== null && r.trialDuration > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Dan {Math.min(r.daysUsed, r.trialDuration)} od {r.trialDuration}</span>
                        <span>{Math.round((Math.min(r.daysUsed, r.trialDuration) / r.trialDuration) * 100)}% potrošeno</span>
                      </div>
                      <Progress value={(Math.min(r.daysUsed, r.trialDuration) / r.trialDuration) * 100} className="h-1.5" />
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {r.trial_start && (
                      <div className="bg-muted/40 rounded px-2 py-1.5">
                        <p className="text-muted-foreground text-[10px]">Trial počeo</p>
                        <p className="font-medium mt-0.5">{format(new Date(r.trial_start), 'd. M. yyyy')}</p>
                      </div>
                    )}
                    {r.trial_end && (
                      <div className="bg-muted/40 rounded px-2 py-1.5">
                        <p className="text-muted-foreground text-[10px]">Trial završava</p>
                        <p className={`font-medium mt-0.5 ${daysColor(r.daysLeft)}`}>{format(new Date(r.trial_end), 'd. M. yyyy')}</p>
                      </div>
                    )}
                    {r.firstChargeDate && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1.5">
                        <p className="text-muted-foreground text-[10px]">1. naplata</p>
                        <p className="font-semibold mt-0.5 text-emerald-400">
                          {format(new Date(r.firstChargeDate), 'd. M. yyyy')} · €{r.firstChargeAmount}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* At Risk */}
        <TabsContent value="atrisk" className="mt-4">
          {atRiskDetails.length === 0 ? (
            <EmptyState icon={<AlertTriangle className="w-8 h-8" />} text="Nema at-risk korisnika." />
          ) : (
            <div className="border border-border rounded-lg overflow-hidden divide-y divide-border max-h-[55vh] overflow-y-auto">
              <div className="bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground sticky top-0">
                Past_due = 3 dana grace period · Nakon toga → Locked (nema pristupa)
              </div>
              {atRiskDetails.map(r => (
                <div key={r.trainer_id} className="flex items-center justify-between p-4 gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{r.full_name}</p>
                    <p className="text-muted-foreground text-xs">{r.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${planBadge(r.plan)}`}>
                      {PLAN_LABELS[r.plan] ?? r.plan}
                    </span>
                    {r.status === 'locked' ? (
                      <span className="text-xs bg-red-900/40 text-red-400 border border-red-800/40 px-2 py-0.5 rounded flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Zaključan
                      </span>
                    ) : r.daysToLock !== null ? (
                      <span className={`text-xs font-mono font-bold ${daysColor(r.daysToLock)}`}>
                        Lock za {r.daysToLock}d
                      </span>
                    ) : null}
                    {r.locked_at && (
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {format(new Date(r.locked_at), 'd. M. yyyy')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Churning */}
        <TabsContent value="churning" className="mt-4">
          {churningDetails.length === 0 ? (
            <EmptyState icon={<TrendingDown className="w-8 h-8" />} text="Nema korisnika koji otkazuju." />
          ) : (
            <div className="space-y-2 max-h-[65vh] overflow-y-auto">
              <p className="text-xs text-muted-foreground px-1">
                Korisnici koji su otkazali — pristup imaju do kraja plaćenog perioda.
                Označi razlog otkazivanja za analitiku.
              </p>
              {churningDetails.map(r => {
                const existing = feedback[r.trainer_id]
                const chosen = pendingReason[r.trainer_id] ?? existing?.reason ?? ''
                const noteVal = pendingNote[r.trainer_id] ?? existing?.note ?? ''
                const isSaving = saving[r.trainer_id]
                const isSaved = saved[r.trainer_id]
                const isDirty = pendingReason[r.trainer_id] !== undefined

                return (
                  <div key={r.trainer_id} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{r.full_name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded border font-medium ${planBadge(r.plan)}`}>
                            {PLAN_LABELS[r.plan] ?? r.plan}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs mt-0.5">{r.email}</p>
                      </div>
                      {r.current_period_end && (
                        <span className={`text-xs font-mono font-semibold shrink-0 ${daysColor(r.daysLeft)}`}>
                          {format(new Date(r.current_period_end), 'd. M.')} ({r.daysLeft}d)
                        </span>
                      )}
                    </div>

                    {/* Reason picker */}
                    <div className="space-y-2">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Razlog otkazivanja</p>
                      <div className="flex flex-wrap gap-1.5">
                        {CHURN_REASONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setPendingReason(p => ({ ...p, [r.trainer_id]: opt.value }))}
                            className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                              chosen === opt.value
                                ? REASON_COLORS[opt.value]
                                : 'border-border text-muted-foreground hover:border-zinc-500'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {chosen && (
                        <input
                          placeholder="Dodatna napomena (opcionalno)..."
                          value={noteVal}
                          onChange={e => setPendingNote(p => ({ ...p, [r.trainer_id]: e.target.value }))}
                          className="w-full text-xs bg-muted/40 border border-border rounded px-3 py-2 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-border"
                        />
                      )}
                      {(isDirty || existing) && (
                        <div className="flex items-center gap-2">
                          {isDirty && (
                            <button
                              onClick={() => saveFeedback(r.trainer_id)}
                              disabled={isSaving || !chosen}
                              className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-md font-medium transition-colors"
                            >
                              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> :
                               isSaved ? <Check className="w-3 h-3" /> : null}
                              {isSaved ? 'Spremljeno' : 'Spremi'}
                            </button>
                          )}
                          {existing && !isDirty && (
                            <span className={`text-xs px-2 py-0.5 rounded border font-medium ${REASON_COLORS[existing.reason] ?? ''}`}>
                              {reasonLabel(existing.reason)}
                            </span>
                          )}
                          {existing && !isDirty && existing.note && (
                            <span className="text-xs text-muted-foreground">{existing.note}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Povijest */}
        <TabsContent value="ambassador" className="mt-4">
          {ambassadorDetails.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nema ambasadora.</p>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[55vh]">
              {ambassadorDetails.map(r => (
                <div key={r.trainer_id} className="flex items-center justify-between border border-border rounded-lg px-4 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground">{r.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded border font-medium bg-amber-500/20 text-amber-300 border-amber-500/30">
                      Ambassador
                    </span>
                    <span className="text-xs text-muted-foreground">
                      od {format(new Date(r.created_at), 'd. M. yyyy')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Churn razlozi */}
        <TabsContent value="churn-razlozi" className="mt-4">
          {churnStats.reasonBreakdown.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="w-8 h-8" />}
              text="Nema zabilježenih razloga. Označi razlog otkazivanja u tabu 'Otkazuju'."
            />
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Ukupno označenih otkazivanja:{' '}
                <strong>{churnStats.reasonBreakdown.reduce((s, r) => s + r.count, 0)}</strong>
              </p>
              <div className="space-y-2">
                {churnStats.reasonBreakdown.map(row => {
                  const total = churnStats.reasonBreakdown.reduce((s, r) => s + r.count, 0)
                  const pct = Math.round((row.count / total) * 100)
                  return (
                    <div key={row.reason} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded border font-medium ${REASON_COLORS[row.reason] ?? 'bg-muted text-muted-foreground border-border'}`}>
                            {reasonLabel(row.reason)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">{row.count}×</span>
                          <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor:
                              row.reason === 'cijena' ? 'rgb(248,113,113)' :
                              row.reason === 'feature' ? 'rgb(251,146,60)' :
                              row.reason === 'konkurent' ? 'rgb(167,139,250)' :
                              row.reason === 'pauza' ? 'rgb(96,165,250)' :
                              'rgb(161,161,170)',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Razlozi se prikupljaju ručno — idi na tab &quot;Otkazuju&quot; i označi razlog za svakog korisnika koji je otkazao.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="povijest" className="mt-4">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              MRR je procjena — rekonstruira se iz pretplata aktivnih krajem tog mjeseca. Churn = datum otkazivanja.
            </p>
            <div className="border border-border rounded-lg divide-y divide-border">
              {[...historyData].reverse().filter((row, i) => i === 0 || row.active > 0 || row.new > 0 || row.churned > 0).map((row, i) => {
                const net = row.new - row.churned
                const isCurrentMonth = i === 0
                return (
                  <div
                    key={row.month}
                    className={`flex items-center gap-3 px-4 py-3 ${isCurrentMonth ? 'bg-blue-500/5' : 'hover:bg-muted/20'}`}
                  >
                    {/* Month label */}
                    <div className="w-20 shrink-0">
                      <p className="text-sm font-semibold">{row.month}</p>
                      {isCurrentMonth && (
                        <span className="text-[9px] text-blue-400 font-medium">trenutni</span>
                      )}
                    </div>

                    {/* Stats row */}
                    <div className="flex-1 flex items-center gap-4 min-w-0 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">Novi</span>
                        <span className={`text-xs font-bold ${row.new > 0 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                          {row.new > 0 ? `+${row.new}` : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">Churn</span>
                        <span className={`text-xs font-bold ${row.churned > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                          {row.churned > 0 ? `-${row.churned}` : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">Aktivnih</span>
                        <span className="text-xs text-foreground font-medium">{row.active}</span>
                      </div>
                    </div>

                    {/* MRR */}
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-bold ${row.mrr > 0 ? 'text-blue-400' : 'text-muted-foreground'}`}>
                        €{row.mrr.toLocaleString('hr')}
                      </p>
                      {net !== 0 && (
                        <p className={`text-[10px] font-medium ${net > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          net {net > 0 ? `+${net}` : net}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-lg gap-3">
      <span className="text-muted-foreground">{icon}</span>
      <p className="text-muted-foreground text-sm">{text}</p>
    </div>
  )
}
