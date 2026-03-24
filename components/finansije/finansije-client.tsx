'use client'

import { format } from 'date-fns'
import {
  TrendingUp, DollarSign, Clock, AlertTriangle,
  TrendingDown, Users, XCircle, Lock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PLAN_LABELS } from '@/lib/config'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

interface PlanRow {
  plan: string
  label: string
  active: number
  trialing: number
  revenue: number
}

interface AtRiskRow {
  trainer_id: string
  full_name: string
  email: string
  plan: string
  status: string
  locked_at: string | null
  daysToLock: number | null
}

interface ChurningRow {
  trainer_id: string
  full_name: string
  email: string
  plan: string
  status: string
  current_period_end: string | null
  daysLeft: number | null
}

interface TrialRow {
  trainer_id: string
  full_name: string
  email: string
  plan: string
  trial_end: string | null
  daysLeft: number | null
}

interface Props {
  mrr: number
  arr: number
  pipeline: number
  atRiskRevenue: number
  churningRevenue: number
  activeCount: number
  trialCount: number
  pastDueCount: number
  lockedCount: number
  canceledCount: number
  churningCount: number
  planBreakdown: PlanRow[]
  chartData: Array<{ month: string; revenue: number; count: number }>
  atRiskDetails: AtRiskRow[]
  churningDetails: ChurningRow[]
  trialDetails: TrialRow[]
}

const PLAN_COLORS: Record<string, string> = {
  starter: '#71717a',
  pro: '#3b82f6',
  scale: '#7c3aed',
}

function getDaysColor(days: number | null) {
  if (days === null) return 'text-muted-foreground'
  if (days < 3) return 'text-red-400'
  if (days < 7) return 'text-yellow-400'
  return 'text-emerald-400'
}

function getPlanBadge(plan: string) {
  const colors: Record<string, string> = {
    starter: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
    pro: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    scale: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  }
  return colors[plan] ?? 'bg-zinc-800 text-zinc-400'
}

export function FinansijeClient({
  mrr, arr, pipeline, atRiskRevenue, churningRevenue,
  activeCount, trialCount, pastDueCount, lockedCount, canceledCount, churningCount,
  planBreakdown, chartData, atRiskDetails, churningDetails, trialDetails,
}: Props) {
  const totalMrrPotential = mrr + pipeline

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finansije</h1>
        <p className="text-muted-foreground text-sm mt-1">
          SaaS metrike i pregled prihoda
        </p>
      </div>

      {/* Top finansijski KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="border-blue-500/30 bg-blue-500/5 col-span-2 md:col-span-1">
          <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs text-muted-foreground">MRR</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">€{mrr.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{activeCount} aktivnih</p>
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
            <p className="text-xs text-muted-foreground mt-0.5">{trialCount} u trialu</p>
          </CardContent>
        </Card>

        <Card className={atRiskRevenue > 0 ? 'border-red-500/20 bg-red-500/5' : ''}>
          <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs text-muted-foreground">At Risk</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${atRiskRevenue > 0 ? 'text-red-400' : ''}`}>
              €{atRiskRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pastDueCount} past_due · {lockedCount} locked
            </p>
          </CardContent>
        </Card>

        <Card className={churningRevenue > 0 ? 'border-orange-500/20 bg-orange-500/5' : ''}>
          <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs text-muted-foreground">Churning</CardTitle>
            <TrendingDown className="w-4 h-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${churningRevenue > 0 ? 'text-orange-400' : ''}`}>
              €{churningRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{churningCount} cancel pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Status summary pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Aktivni', count: activeCount, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
          { label: 'Trial', count: trialCount, color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
          { label: 'Past Due', count: pastDueCount, color: 'bg-red-500/20 text-red-300 border-red-500/30' },
          { label: 'Locked', count: lockedCount, color: 'bg-red-800/30 text-red-400 border-red-700/30' },
          { label: 'Canceled', count: canceledCount, color: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30' },
        ].map(s => (
          <span key={s.label} className={`text-xs px-3 py-1.5 rounded-full border font-medium ${s.color}`}>
            {s.label}: <strong>{s.count}</strong>
          </span>
        ))}
      </div>

      {/* Plan breakdown + chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prihod po planu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0 divide-y divide-border">
              <div className="grid grid-cols-4 pb-2 text-xs font-medium text-muted-foreground">
                <span>Plan</span>
                <span className="text-center">Aktivni</span>
                <span className="text-center">Trial</span>
                <span className="text-right">MRR</span>
              </div>
              {planBreakdown.map(row => (
                <div key={row.plan} className="grid grid-cols-4 py-3 items-center text-sm">
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium w-fit ${getPlanBadge(row.plan)}`}>
                    {row.label}
                  </span>
                  <span className="text-center font-mono">{row.active}</span>
                  <span className="text-center font-mono text-muted-foreground">{row.trialing}</span>
                  <span className="text-right font-semibold">€{row.revenue.toLocaleString()}</span>
                </div>
              ))}
              <div className="grid grid-cols-4 py-3 items-center text-sm font-bold border-t border-border">
                <span>Ukupno</span>
                <span className="text-center">{activeCount}</span>
                <span className="text-center text-muted-foreground">{trialCount}</span>
                <span className="text-right text-blue-400">€{mrr.toLocaleString()}</span>
              </div>
            </div>

            {/* Plan distribution bar */}
            <div className="mt-4 space-y-2">
              <p className="text-xs text-muted-foreground">Distribucija planova (aktivni)</p>
              {planBreakdown.map(row => (
                <div key={row.plan} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-14">{row.label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: activeCount > 0 ? `${(row.active / activeCount) * 100}%` : '0%',
                        backgroundColor: PLAN_COLORS[row.plan],
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono w-6 text-right">{row.active}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nove pretplate (zadnjih 12 mj.)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: 'oklch(0.708 0 0)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'oklch(0.708 0 0)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `€${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'oklch(0.205 0 0)',
                    border: '1px solid oklch(1 0 0 / 10%)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'oklch(0.985 0 0)',
                  }}
                  formatter={(value) => [`€${value}`, 'Prihod']}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]} fill="oklch(0.623 0.214 259.815)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detalji po statusu */}
      <Tabs defaultValue="atrisk">
        <TabsList>
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
          <TabsTrigger value="trial">
            Trial ({trialCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="atrisk" className="mt-4">
          {atRiskDetails.length === 0 ? (
            <EmptyState icon={<AlertTriangle className="w-8 h-8" />} text="Nema at-risk korisnika. Odlično!" />
          ) : (
            <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
              {atRiskDetails.map(r => (
                <div key={r.trainer_id} className="flex items-center justify-between p-4 gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{r.full_name}</p>
                    <p className="text-muted-foreground text-xs truncate">{r.email}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getPlanBadge(r.plan)}`}>
                      {PLAN_LABELS[r.plan] ?? r.plan}
                    </span>
                    {r.status === 'locked' ? (
                      <span className="text-xs bg-red-900/40 text-red-400 border border-red-800/40 px-2 py-0.5 rounded flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Zaključan
                      </span>
                    ) : r.daysToLock !== null ? (
                      <span className={`text-xs font-mono ${getDaysColor(r.daysToLock)}`}>
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

        <TabsContent value="churning" className="mt-4">
          {churningDetails.length === 0 ? (
            <EmptyState icon={<TrendingDown className="w-8 h-8" />} text="Nema korisnika koji otkazuju." />
          ) : (
            <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
              <div className="bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
                Ovi korisnici su otkazali — pristup imaju do kraja plaćenog perioda
              </div>
              {churningDetails.map(r => (
                <div key={r.trainer_id} className="flex items-center justify-between p-4 gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{r.full_name}</p>
                    <p className="text-muted-foreground text-xs truncate">{r.email}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getPlanBadge(r.plan)}`}>
                      {PLAN_LABELS[r.plan] ?? r.plan}
                    </span>
                    {r.current_period_end && (
                      <span className={`text-xs font-mono ${getDaysColor(r.daysLeft)}`}>
                        Istječe {format(new Date(r.current_period_end), 'd. M.')}
                        {r.daysLeft !== null && ` (${r.daysLeft}d)`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trial" className="mt-4">
          {trialDetails.length === 0 ? (
            <EmptyState icon={<Clock className="w-8 h-8" />} text="Nema korisnika u trialu." />
          ) : (
            <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
              <div className="bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
                14-dnevni besplatni trial — postaju paying na kraju triala ako ne otkažu
              </div>
              {trialDetails.map(r => (
                <div key={r.trainer_id} className="flex items-center justify-between p-4 gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{r.full_name}</p>
                    <p className="text-muted-foreground text-xs truncate">{r.email}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getPlanBadge(r.plan)}`}>
                      {PLAN_LABELS[r.plan] ?? r.plan}
                    </span>
                    {r.trial_end && (
                      <span className={`text-xs font-mono ${getDaysColor(r.daysLeft)}`}>
                        {r.daysLeft !== null && r.daysLeft <= 0
                          ? 'Istekao'
                          : `${r.daysLeft}d ostalo`}
                      </span>
                    )}
                    {r.trial_end && (
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {format(new Date(r.trial_end), 'd. M. yyyy')}
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
