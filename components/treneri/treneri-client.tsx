'use client'

import { useState, useMemo } from 'react'
import { format, differenceInDays } from 'date-fns'
import { Search, ChevronRight, ExternalLink, AlertTriangle, Clock, XCircle, Copy, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { PLAN_LABELS, STATUS_LABELS } from '@/lib/config'

interface Trainer {
  id: string
  full_name: string
  email: string
  created_at: string
  plan: string | null
  status: string | null
  current_period_end: string | null
  current_period_start: string | null
  trial_start: string | null
  trial_end: string | null
  locked_at: string | null
  cancel_at_period_end: boolean
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  client_limit: number | null
}

function getPlanBadge(plan: string | null) {
  switch (plan) {
    case 'scale': return 'bg-violet-500/20 text-violet-300 border-violet-500/30'
    case 'pro': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 'starter': return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30'
    default: return 'bg-zinc-800 text-zinc-400 border-zinc-700'
  }
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case 'active': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    case 'trialing': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    case 'past_due': return 'bg-red-500/20 text-red-300 border-red-500/30'
    case 'canceled': return 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30'
    case 'locked': return 'bg-red-900/30 text-red-400 border-red-800/30'
    default: return 'bg-zinc-800 text-zinc-400 border-zinc-700'
  }
}

function getSubContext(t: Trainer): { label: string; color: string } | null {
  const now = new Date()

  if (t.status === 'trialing' && t.trial_end) {
    const days = differenceInDays(new Date(t.trial_end), now)
    if (days < 0) return { label: 'Trial istekao', color: 'text-red-400' }
    if (days <= 3) return { label: `Trial: ${days}d`, color: 'text-red-400' }
    if (days <= 7) return { label: `Trial: ${days}d`, color: 'text-yellow-400' }
    return { label: `Trial: ${days}d`, color: 'text-yellow-300' }
  }

  if (t.status === 'past_due' && t.locked_at) {
    const days = differenceInDays(new Date(t.locked_at), now)
    if (days <= 0) return { label: 'Lock odmah', color: 'text-red-500' }
    return { label: `Lock za ${days}d`, color: 'text-red-400' }
  }

  if (t.cancel_at_period_end && t.current_period_end) {
    const days = differenceInDays(new Date(t.current_period_end), now)
    return { label: `Otkazuje za ${days}d`, color: 'text-orange-400' }
  }

  if (t.status === 'active' && t.current_period_end) {
    const days = differenceInDays(new Date(t.current_period_end), now)
    if (days <= 5) return { label: `Obnova za ${days}d`, color: 'text-muted-foreground' }
  }

  return null
}

export function TreneriClient({ trainers }: { trainers: Trainer[] }) {
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<Trainer | null>(null)

  const filtered = useMemo(() => {
    return trainers.filter((t) => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        t.full_name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q)
      const matchPlan = planFilter === 'all' || t.plan === planFilter
      const matchStatus = statusFilter === 'all' || t.status === statusFilter
      return matchSearch && matchPlan && matchStatus
    })
  }, [trainers, search, planFilter, statusFilter])

  const counts = useMemo(() => ({
    active: trainers.filter(t => t.status === 'active').length,
    trialing: trainers.filter(t => t.status === 'trialing').length,
    pastDue: trainers.filter(t => t.status === 'past_due').length,
    canceled: trainers.filter(t => t.status === 'canceled').length,
  }), [trainers])

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Treneri</h1>
        <p className="text-muted-foreground text-sm mt-1">{trainers.length} ukupno</p>
      </div>

      {/* Status summary */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Aktivni', count: counts.active, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', filter: 'active' },
          { label: 'Trial', count: counts.trialing, color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', filter: 'trialing' },
          { label: 'Past Due', count: counts.pastDue, color: 'bg-red-500/20 text-red-300 border-red-500/30', filter: 'past_due' },
          { label: 'Canceled', count: counts.canceled, color: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30', filter: 'canceled' },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setStatusFilter(statusFilter === s.filter ? 'all' : s.filter)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-opacity ${s.color} ${statusFilter !== 'all' && statusFilter !== s.filter ? 'opacity-40' : ''}`}
          >
            {s.label}: {s.count}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pretraži po imenu ili emailu..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={planFilter} onValueChange={(v) => v != null && setPlanFilter(v)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Svi planovi</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="scale">Scale</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => v != null && setStatusFilter(v)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Svi statusi</SelectItem>
            <SelectItem value="active">Aktivan</SelectItem>
            <SelectItem value="trialing">Trial</SelectItem>
            <SelectItem value="past_due">Kasni</SelectItem>
            <SelectItem value="canceled">Otkazao</SelectItem>
            <SelectItem value="locked">Zaključan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} rezultata</p>

      <div className="border border-border rounded-lg overflow-hidden">
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-[1.5fr_1.5fr_90px_110px_110px_120px] gap-3 px-4 py-2.5 bg-muted/40 text-xs font-medium text-muted-foreground border-b border-border">
          <span>Ime</span>
          <span>Email</span>
          <span>Plan</span>
          <span>Status</span>
          <span>Kontekst</span>
          <span>Registracija</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            Nema trenera koji odgovaraju filteru
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((t) => {
              const ctx = getSubContext(t)
              return (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className="w-full text-left hover:bg-accent/30 transition-colors"
                >
                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-[1.5fr_1.5fr_90px_110px_110px_120px] gap-3 px-4 py-3 items-center text-sm">
                    <span className="font-medium truncate">{t.full_name}</span>
                    <span className="text-muted-foreground truncate text-xs">{t.email}</span>
                    <span>
                      {t.plan ? (
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getPlanBadge(t.plan)}`}>
                          {PLAN_LABELS[t.plan] ?? t.plan}
                        </span>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </span>
                    <span>
                      {t.status ? (
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getStatusBadge(t.status)}`}>
                          {STATUS_LABELS[t.status] ?? t.status}
                        </span>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </span>
                    <span className={`text-xs font-medium ${ctx?.color ?? 'text-muted-foreground'}`}>
                      {ctx?.label ?? '—'}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {format(new Date(t.created_at), 'd. M. yyyy')}
                    </span>
                  </div>

                  {/* Mobile row */}
                  <div className="md:hidden flex items-center justify-between px-4 py-3 gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{t.full_name}</p>
                      <p className="text-muted-foreground text-xs truncate">{t.email}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {t.plan && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${getPlanBadge(t.plan)}`}>
                            {PLAN_LABELS[t.plan] ?? t.plan}
                          </span>
                        )}
                        {t.status && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${getStatusBadge(t.status)}`}>
                            {STATUS_LABELS[t.status] ?? t.status}
                          </span>
                        )}
                        {ctx && (
                          <span className={`text-[10px] font-medium ${ctx.color}`}>{ctx.label}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selected && <TrainerDetail trainer={selected} />}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}

function TrainerDetail({ trainer: t }: { trainer: Trainer }) {
  const now = new Date()
  const ctx = getSubContext(t)
  const PLAN_PRICES: Record<string, number> = { starter: 29, pro: 59, scale: 99 }

  return (
    <>
      <SheetHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <SheetTitle className="text-lg leading-tight">{t.full_name}</SheetTitle>
            <p className="text-sm text-muted-foreground mt-0.5">{t.email}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            {t.plan && (
              <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getPlanBadge(t.plan)}`}>
                {PLAN_LABELS[t.plan] ?? t.plan}
              </span>
            )}
            {t.status && (
              <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getStatusBadge(t.status)}`}>
                {STATUS_LABELS[t.status] ?? t.status}
              </span>
            )}
          </div>
        </div>
      </SheetHeader>

      <div className="mt-5 space-y-4 px-0">
        {/* Alerts */}
        {t.status === 'past_due' && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-300">
              Plaćanje nije uspjelo.{t.locked_at && ` Zaključava se za ${Math.max(0, differenceInDays(new Date(t.locked_at), now))} dana.`}
            </p>
          </div>
        )}
        {t.status === 'locked' && (
          <div className="flex items-start gap-2 bg-red-900/20 border border-red-800/30 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-400">Račun je zaključan. Trener nema pristup.</p>
          </div>
        )}
        {t.cancel_at_period_end && (
          <div className="flex items-start gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
            <XCircle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
            <p className="text-sm text-orange-300">
              Otkazao — pristup do {t.current_period_end ? format(new Date(t.current_period_end), 'd. M. yyyy') : '—'}
            </p>
          </div>
        )}

        {/* ID + Registracija */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">ID</span>
            <div className="flex items-center gap-1">
              <span className="text-xs font-mono text-muted-foreground truncate max-w-[220px]">{t.id}</span>
              <CopyButton value={t.id} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Email</span>
            <div className="flex items-center gap-1">
              <span className="text-xs truncate max-w-[220px]">{t.email}</span>
              <CopyButton value={t.email} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Registracija</span>
            <span className="text-xs">{format(new Date(t.created_at), 'd. M. yyyy. HH:mm')}</span>
          </div>
        </div>

        <Separator />

        {/* Pretplata */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pretplata</p>

          {ctx && (
            <div className={`text-xs font-medium px-2.5 py-1.5 rounded-md border w-fit ${
              ctx.color.includes('red') ? 'border-red-500/30 bg-red-500/10' :
              ctx.color.includes('orange') ? 'border-orange-500/30 bg-orange-500/10' :
              ctx.color.includes('yellow') ? 'border-yellow-500/30 bg-yellow-500/10' :
              'border-border bg-muted/30'
            } ${ctx.color}`}>
              {ctx.label}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {t.client_limit && (
              <div className="bg-muted/30 rounded-lg border border-border p-2.5 text-center">
                <p className="text-xs text-muted-foreground">Limit klijenata</p>
                <p className="text-lg font-bold mt-0.5">{t.client_limit}</p>
              </div>
            )}
            {t.plan && (
              <div className="bg-muted/30 rounded-lg border border-border p-2.5 text-center">
                <p className="text-xs text-muted-foreground">Cijena</p>
                <p className="text-lg font-bold mt-0.5">€{PLAN_PRICES[t.plan] ?? '—'}<span className="text-xs font-normal text-muted-foreground">/mj</span></p>
              </div>
            )}
          </div>

          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
            {t.status === 'trialing' && t.trial_start && (
              <Row label="Trial počeo" value={format(new Date(t.trial_start), 'd. M. yyyy')} />
            )}
            {t.status === 'trialing' && t.trial_end && (
              <>
                <Row
                  label="Trial završava"
                  value={format(new Date(t.trial_end), 'd. M. yyyy')}
                  highlight={differenceInDays(new Date(t.trial_end), now) <= 3 ? 'red' : differenceInDays(new Date(t.trial_end), now) <= 7 ? 'yellow' : undefined}
                />
                <Row
                  label="1. naplata"
                  value={`${format(new Date(t.trial_end), 'd. M. yyyy')} · €${PLAN_PRICES[t.plan ?? ''] ?? '—'}`}
                />
              </>
            )}
            {!['trialing'].includes(t.status ?? '') && t.current_period_start && (
              <Row label="Period počeo" value={format(new Date(t.current_period_start), 'd. M. yyyy')} />
            )}
            {t.current_period_end && (
              <Row
                label={t.cancel_at_period_end ? 'Pristup do' : 'Sljedeća naplata'}
                value={format(new Date(t.current_period_end), 'd. M. yyyy')}
                highlight={t.cancel_at_period_end ? 'yellow' : undefined}
              />
            )}
            {t.locked_at && (
              <Row label="Zaključan" value={format(new Date(t.locked_at), 'd. M. yyyy HH:mm')} highlight="red" />
            )}
          </div>
        </div>

        {(t.stripe_customer_id || t.stripe_subscription_id) && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stripe</p>
              <div className="flex flex-col gap-2">
                {t.stripe_customer_id && (
                  <a
                    href={`https://dashboard.stripe.com/customers/${t.stripe_customer_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/5 border border-blue-500/20 rounded-lg px-3 py-2"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    Otvori Customer u Stripeu
                  </a>
                )}
                {t.stripe_subscription_id && (
                  <a
                    href={`https://dashboard.stripe.com/subscriptions/${t.stripe_subscription_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/5 border border-blue-500/20 rounded-lg px-3 py-2"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    Otvori Subscription u Stripeu
                  </a>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function Row({ label, value, mono, highlight }: {
  label: string
  value: string
  mono?: boolean
  highlight?: 'red' | 'yellow'
}) {
  const valueClass = highlight === 'red'
    ? 'text-red-400'
    : highlight === 'yellow'
    ? 'text-yellow-400'
    : mono
    ? 'font-mono text-xs text-muted-foreground'
    : 'text-sm'

  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={`text-right break-all ${valueClass}`}>{value}</span>
    </div>
  )
}
