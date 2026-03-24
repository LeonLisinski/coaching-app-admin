export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PLAN_PRICES, PLAN_LABELS, STATUS_LABELS } from '@/lib/config'
import { RevenueChart } from '@/components/overview/revenue-chart'
import { TrendingUp, Users, UserPlus, UserMinus } from 'lucide-react'
import { format, startOfMonth, subMonths } from 'date-fns'

function getPlanBadgeVariant(plan: string) {
  const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
    starter: 'outline',
    pro: 'secondary',
    scale: 'default',
  }
  return variants[plan] ?? 'outline'
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    active: 'text-emerald-400',
    trialing: 'text-blue-400',
    past_due: 'text-yellow-400',
    canceled: 'text-red-400',
    locked: 'text-red-500',
  }
  return colors[status] ?? 'text-muted-foreground'
}

export default async function OverviewPage() {
  const supabase = await createClient()

  const now = new Date()
  const monthStart = startOfMonth(now).toISOString()
  const prevMonthStart = startOfMonth(subMonths(now, 1)).toISOString()

  const [
    { data: activeSubs },
    { data: newTrainers },
    { data: churnedSubs },
    { data: recentProfiles },
    { data: allSubs },
  ] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('plan, status')
      .in('status', ['active', 'trialing']),
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

  const mrr = (activeSubs ?? []).reduce((sum, s) => {
    return sum + (PLAN_PRICES[s.plan] ?? 0)
  }, 0)

  const activeCount = activeSubs?.length ?? 0
  const newCount = newTrainers?.length ?? 0
  const churnCount = churnedSubs?.length ?? 0

  const chartData = buildChartData(allSubs ?? [])

  const subMap: Record<string, { plan: string; status: string }> = {}
  if (recentProfiles && activeSubs) {
    activeSubs.forEach((s: { plan: string; status: string } & { trainer_id?: string }) => {
      if (s.trainer_id) subMap[s.trainer_id] = s
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {format(now, 'MMMM yyyy')} — dashboard pregled
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="MRR"
          value={`€${mrr.toLocaleString()}`}
          icon={<TrendingUp className="w-4 h-4" />}
          description="Estimirani mjesečni prihod"
        />
        <StatCard
          title="Aktivni treneri"
          value={activeCount}
          icon={<Users className="w-4 h-4" />}
          description="Active + trialing"
        />
        <StatCard
          title="Novi ovaj mjesec"
          value={newCount}
          icon={<UserPlus className="w-4 h-4" />}
          description="Registrirali se u zadnjih 30d"
        />
        <StatCard
          title="Churn ovaj mjesec"
          value={churnCount}
          icon={<UserMinus className="w-4 h-4" />}
          description="Otkazali pretplatu"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prihod po mjesecima (zadnjih 12)</CardTitle>
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
          <div className="space-y-0">
            {(recentProfiles ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Nema podataka</p>
            ) : (
              <div className="divide-y divide-border">
                {(recentProfiles ?? []).map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{p.full_name || '—'}</p>
                      <p className="text-muted-foreground text-xs truncate">{p.email}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(p.created_at), 'd. M. yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  description: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

function buildChartData(subs: Array<{ plan: string; created_at: string }>) {
  const months: Record<string, number> = {}

  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = subMonths(now, i)
    const key = format(d, 'MMM yy')
    months[key] = 0
  }

  subs.forEach((s) => {
    const key = format(new Date(s.created_at), 'MMM yy')
    if (key in months) {
      months[key] += PLAN_PRICES[s.plan] ?? 0
    }
  })

  return Object.entries(months).map(([month, revenue]) => ({ month, revenue }))
}
