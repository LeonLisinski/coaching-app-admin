'use client'

import { format } from 'date-fns'
import {
  TrendingUp, DollarSign, Clock, AlertTriangle,
  TrendingDown, Lock, CalendarClock, CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { PLAN_LABELS, PLAN_PRICES } from '@/lib/config'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// ── Types ─────────────────────────────────────────────────────────────────

interface PlanRow { plan: string; label: string; active: number; trialing: number; revenue: number }
interface AtRiskRow { trainer_id: string; full_name: string; email: string; plan: string; status: string; locked_at: string | null; daysToLock: number | null }
interface ChurningRow { trainer_id: string; full_name: string; email: string; plan: string; status: string; current_period_end: string | null; daysLeft: number | null }
interface TrialRow { trainer_id: string; full_name: string; email: string; plan: string; trial_start: string | null; trial_end: string | null; daysLeft: number | null; daysUsed: number | null; trialDuration: number; firstChargeDate: string | null; firstChargeAmount: number }
interface UpcomingItem { date: string; trainer_id: string; full_name: string; email: string; plan: string; type: 'trial_converts' | 'renewal' | 'cancels' | 'locks'; amount: number; daysLeft: number; extra?: string }

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

export function FinansijeClient({
  mrr, arr, pipeline, atRiskRevenue, churningRevenue,
  activeCount, trialCount, pastDueCount, lockedCount, canceledCount, churningCount,
  planBreakdown, chartData, atRiskDetails, churningDetails, trialDetails,
  upcomingEvents, upcomingRevenue,
}: Props) {

  const totalActive = activeCount + trialCount
  const upcomingIn7 = upcomingEvents.filter(e => e.daysLeft <= 7).length
  const upcomingConverts = upcomingEvents.filter(e => e.type === 'trial_converts').length

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finansije</h1>
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
            <p className="text-2xl font-bold">€{mrr.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{activeCount} plaća · trialing ne računa</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs text-muted-foreground">ARR</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">€{arr.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">MRR × 12</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs text-muted-foreground">Pipeline</CardTitle>
            <Clock className="w-4 h-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-400">€{pipeline.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{trialCount} triala · besplatno</p>
          </CardContent>
        </Card>
        <Card className={atRiskRevenue > 0 ? 'border-red-500/20 bg-red-500/5' : ''}>
          <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs text-muted-foreground">At Risk</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${atRiskRevenue > 0 ? 'text-red-400' : ''}`}>€{atRiskRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{pastDueCount} past_due · {lockedCount} locked</p>
          </CardContent>
        </Card>
        <Card className={churningRevenue > 0 ? 'border-orange-500/20 bg-orange-500/5' : ''}>
          <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs text-muted-foreground">Churning</CardTitle>
            <TrendingDown className="w-4 h-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${churningRevenue > 0 ? 'text-orange-400' : ''}`}>€{churningRevenue.toLocaleString()}</p>
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
        ].map(s => (
          <span key={s.l} className={`text-xs px-3 py-1.5 rounded-full border font-medium ${s.s}`}>
            {s.l}: <strong>{s.c}</strong>
          </span>
        ))}
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
                  <span className="text-emerald-400 font-bold">€{upcomingRevenue.toLocaleString()}</span>
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
            <CardTitle className="text-base">Plan breakdown</CardTitle>
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
                  <span className="text-right font-semibold">€{row.revenue.toLocaleString()}</span>
                </div>
              ))}
              <div className="grid grid-cols-4 py-3 items-center text-sm font-bold">
                <span className="text-muted-foreground">Ukupno</span>
                <span className="text-center">{activeCount}</span>
                <span className="text-center text-yellow-400">{trialCount}</span>
                <span className="text-right text-blue-400">€{mrr.toLocaleString()}</span>
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

      {/* Detalji tabovi */}
      <Tabs defaultValue="trial">
        <TabsList>
          <TabsTrigger value="trial">
            Besplatni trial
            {trialCount > 0 && (
              <span className="ml-1.5 bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {trialCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="atrisk">
            At Risk
            {(pastDueCount + lockedCount) > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pastDueCount + lockedCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="churning">
            Churning
            {churningCount > 0 && (
              <span className="ml-1.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {churningCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Trial tab — full detail */}
        <TabsContent value="trial" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {trialCount} korisnika koristi besplatni 14-dnevni trial · Pipeline vrijednost:{' '}
              <span className="text-yellow-400 font-semibold">€{pipeline.toLocaleString()}/mj</span>
            </p>
          </div>
          {trialDetails.length === 0 ? (
            <EmptyState icon={<Clock className="w-8 h-8" />} text="Nema korisnika u trialu." />
          ) : (
            <div className="space-y-2">
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
            <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
              <div className="bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
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
            <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
              <div className="bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
                Korisnici koji su otkazali — pristup imaju do kraja plaćenog perioda
              </div>
              {churningDetails.map(r => (
                <div key={r.trainer_id} className="flex items-center justify-between p-4 gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{r.full_name}</p>
                    <p className="text-muted-foreground text-xs">{r.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${planBadge(r.plan)}`}>
                      {PLAN_LABELS[r.plan] ?? r.plan}
                    </span>
                    {r.current_period_end && (
                      <span className={`text-xs font-mono font-semibold ${daysColor(r.daysLeft)}`}>
                        Istječe {format(new Date(r.current_period_end), 'd. M.')} ({r.daysLeft}d)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
