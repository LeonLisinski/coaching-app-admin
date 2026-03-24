export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PLAN_PRICES } from '@/lib/config'
import { RevenueChart } from '@/components/overview/revenue-chart'
import { TrendingUp, Users, UserPlus, UserMinus, Clock, DollarSign } from 'lucide-react'
import { format, startOfMonth, subMonths } from 'date-fns'

export default async function OverviewPage() {
  const supabase = await createClient()
  const now = new Date()
  const monthStart = startOfMonth(now).toISOString()

  const [
    { data: allSubs },
    { data: newTrainers },
    { data: churnedSubs },
    { data: recentProfiles },
    { data: historySubs },
  ] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('plan, status, trainer_id'),
    supabase
      .from('profiles')
      .select('id')
      .eq('role', 'trainer')
      .gte('created_at', monthStart),
    supabase
      .from('subscriptions')
      .select('id')
      .eq('status', 'canceled')
      .gte('updated_at', monthStart),
    supabase
      .from('profiles')
      .select('id, full_name, email, created_at')
      .eq('role', 'trainer')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('subscriptions')
      .select('plan, status, created_at')
      .gte('created_at', subMonths(now, 12).toISOString()),
  ])

  const subs = allSubs ?? []

  // MRR = samo aktivne (paying) pretplate, bez trialing
  const mrr = subs
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (PLAN_PRICES[s.plan] ?? 0), 0)

  // Pipeline = trialing × cijena (potencijalni prihod)
  const pipeline = subs
    .filter(s => s.status === 'trialing')
    .reduce((sum, s) => sum + (PLAN_PRICES[s.plan] ?? 0), 0)

  const arr = mrr * 12
  const activeCount = subs.filter(s => s.status === 'active').length
  const trialCount = subs.filter(s => s.status === 'trialing').length
  const newCount = newTrainers?.length ?? 0
  const churnCount = churnedSubs?.length ?? 0
  const chartData = buildChartData(historySubs ?? [])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {format(now, 'MMMM yyyy')}
        </p>
      </div>

      {/* Financije row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          title="MRR"
          value={`€${mrr.toLocaleString()}`}
          icon={<TrendingUp className="w-4 h-4" />}
          description="Samo aktivne pretplate"
          highlight
        />
        <StatCard
          title="ARR"
          value={`€${arr.toLocaleString()}`}
          icon={<DollarSign className="w-4 h-4" />}
          description="MRR × 12"
        />
        <StatCard
          title="Pipeline (trial)"
          value={`€${pipeline.toLocaleString()}`}
          icon={<Clock className="w-4 h-4" />}
          description={`${trialCount} korisnika u trialu`}
          muted
        />
      </div>

      {/* Treneri row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Aktivni treneri"
          value={activeCount}
          icon={<Users className="w-4 h-4" />}
          description="Status: active"
        />
        <StatCard
          title="U trialu"
          value={trialCount}
          icon={<Clock className="w-4 h-4" />}
          description="14-dnevni trial"
        />
        <StatCard
          title="Novi ovaj mj."
          value={newCount}
          icon={<UserPlus className="w-4 h-4" />}
          description="Registrirali se"
        />
        <StatCard
          title="Churn ovaj mj."
          value={churnCount}
          icon={<UserMinus className="w-4 h-4" />}
          description="Otkazali pretplatu"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nove pretplate po mjesecima (zadnjih 12)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Estimirani prihod od novih pretplatnika po registraciji
          </p>
        </CardHeader>
        <CardContent>
          <RevenueChart data={chartData} />
        </CardContent>
      </Card>

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
  )
}

function StatCard({
  title, value, icon, description, highlight, muted,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  description: string
  highlight?: boolean
  muted?: boolean
}) {
  return (
    <Card className={highlight ? 'border-blue-500/30 bg-blue-500/5' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <span className={highlight ? 'text-blue-400' : 'text-muted-foreground'}>{icon}</span>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${muted ? 'text-muted-foreground' : ''}`}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
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
