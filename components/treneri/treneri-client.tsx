'use client'

import { useState, useMemo } from 'react'
import { format, differenceInDays } from 'date-fns'
import { hr } from 'date-fns/locale'
import {
  Search, ChevronRight, ExternalLink, AlertTriangle,
  XCircle, Copy, Check, Lock, Star, CalendarDays, CreditCard,
  User, TrendingDown, RefreshCw, Clock,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Progress } from '@/components/ui/progress'
import { PLAN_LABELS, STATUS_LABELS, effectivePrice } from '@/lib/config'

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
  promo_granted_at: string | null
  promo_ends_at: string | null
  promo_lost_at: string | null
}

function getPlanBadge(plan: string | null) {
  switch (plan) {
    case 'scale': return 'bg-violet-500/20 text-violet-300 border-violet-500/30'
    case 'pro': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 'starter': return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30'
    case 'ambassador': return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
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
          <SelectTrigger className="w-full sm:w-40">
            <span className="truncate text-sm">
              {{ all: 'Svi planovi', starter: 'Starter', pro: 'Pro', scale: 'Scale', ambassador: 'Ambassador' }[planFilter] ?? 'Plan'}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Svi planovi</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="scale">Scale</SelectItem>
            <SelectItem value="ambassador">Ambassador</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => v != null && setStatusFilter(v)}>
          <SelectTrigger className="w-full sm:w-44">
            <span className="truncate text-sm">
              {{ all: 'Svi statusi', active: 'Aktivan', trialing: 'Trial', past_due: 'Kasni', canceled: 'Otkazao', locked: 'Zaključan' }[statusFilter] ?? 'Status'}
            </span>
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

      <div className="border border-border rounded-lg overflow-hidden flex flex-col">
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-[1.5fr_1.5fr_90px_110px_110px_120px] gap-3 px-4 py-2.5 bg-muted/40 text-xs font-medium text-muted-foreground border-b border-border shrink-0">
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
          <div className="divide-y divide-border overflow-y-auto max-h-[55vh] md:max-h-[65vh]">
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
        <SheetContent className="w-full sm:max-w-md p-0 overflow-hidden flex flex-col">
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
  const price = effectivePrice(t)
  const isAmbassador = t.plan === 'ambassador'

  // Trial progress
  const trialDuration = t.trial_start && t.trial_end
    ? differenceInDays(new Date(t.trial_end), new Date(t.trial_start))
    : 14
  const trialUsed = t.trial_start ? Math.min(differenceInDays(now, new Date(t.trial_start)), trialDuration) : 0
  const trialPct = trialDuration > 0 ? Math.round((trialUsed / trialDuration) * 100) : 0

  // Initials avatar colour by plan
  const avatarColor =
    t.plan === 'scale' ? 'bg-violet-500/20 text-violet-300 border-violet-500/40' :
    t.plan === 'pro' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
    isAmbassador ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
    'bg-zinc-700/40 text-zinc-300 border-zinc-600/40'

  const initials = t.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="flex flex-col h-full">
      {/* ── Status banner ─────────────────────────────────────────── */}
      {(t.status === 'past_due' || t.status === 'locked' || t.cancel_at_period_end) && (
        <div className={`px-6 py-3 flex items-center gap-2.5 text-sm ${
          t.status === 'locked' ? 'bg-red-950/60 border-b border-red-800/40 text-red-300' :
          t.status === 'past_due' ? 'bg-red-500/10 border-b border-red-500/20 text-red-300' :
          'bg-orange-500/10 border-b border-orange-500/20 text-orange-300'
        }`}>
          {t.status === 'locked' ? <Lock className="w-4 h-4 shrink-0" /> :
           t.status === 'past_due' ? <AlertTriangle className="w-4 h-4 shrink-0" /> :
           <XCircle className="w-4 h-4 shrink-0" />}
          <span>
            {t.status === 'locked' && 'Račun zaključan — nema pristupa'}
            {t.status === 'past_due' && `Plaćanje nije uspjelo${t.locked_at ? ` · lock za ${Math.max(0, differenceInDays(new Date(t.locked_at), now))}d` : ''}`}
            {t.cancel_at_period_end && t.status !== 'locked' && t.status !== 'past_due' &&
              `Otkazuje — pristup do ${t.current_period_end ? format(new Date(t.current_period_end), 'd. M. yyyy.', { locale: hr }) : '—'}`}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-lg font-bold shrink-0 ${avatarColor}`}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold leading-tight truncate">{t.full_name}</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-sm text-muted-foreground truncate">{t.email}</span>
              <CopyButton value={t.email} />
            </div>
          </div>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-2">
          {t.plan && (
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${getPlanBadge(t.plan)}`}>
              {PLAN_LABELS[t.plan] ?? t.plan}
            </span>
          )}
          {t.status && (
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${getStatusBadge(t.status)}`}>
              {STATUS_LABELS[t.status] ?? t.status}
            </span>
          )}
          {isAmbassador && (
            <span className="text-xs px-2.5 py-1 rounded-full border font-medium bg-amber-500/20 text-amber-300 border-amber-500/30 flex items-center gap-1">
              <Star className="w-3 h-3" /> Ambassador
            </span>
          )}
          {ctx && (
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
              ctx.color.includes('red') ? 'border-red-500/30 bg-red-500/10 text-red-400' :
              ctx.color.includes('orange') ? 'border-orange-500/30 bg-orange-500/10 text-orange-400' :
              'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
            }`}>
              {ctx.label}
            </span>
          )}
        </div>

        {/* ── Subscription stats grid ────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          <StatTile
            icon={<CreditCard className="w-4 h-4" />}
            label="Cijena"
            value={isAmbassador ? 'Besplatno' : `€${price}/mj`}
            valueClass={isAmbassador ? 'text-amber-400' : 'text-foreground'}
          />
          <StatTile
            icon={<User className="w-4 h-4" />}
            label="Klijenti"
            value={t.client_limit ? `${t.client_limit}` : '—'}
          />
          <StatTile
            icon={<CalendarDays className="w-4 h-4" />}
            label="Registracija"
            value={format(new Date(t.created_at), 'd. M. yy.')}
          />
        </div>

        {/* ── Trial progress bar ─────────────────────────────────── */}
        {t.status === 'trialing' && t.trial_start && t.trial_end && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Trial
              </span>
              <span className="font-medium">
                Dan {trialUsed} / {trialDuration}
                <span className="text-muted-foreground ml-1.5">
                  ({differenceInDays(new Date(t.trial_end), now)}d ostalo)
                </span>
              </span>
            </div>
            <Progress value={trialPct} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{format(new Date(t.trial_start), 'd. M. yyyy.')}</span>
              <span className="font-medium text-yellow-400">
                1. naplata: {format(new Date(t.trial_end), 'd. M. yyyy.')}
                {price > 0 && ` · €${price}`}
              </span>
            </div>
          </div>
        )}

        {/* ── Subscription timeline ──────────────────────────────── */}
        {(t.current_period_start || t.current_period_end || t.locked_at) && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pretplata</p>
            <div className="space-y-0 border border-border rounded-xl overflow-hidden divide-y divide-border">
              {t.current_period_start && t.status !== 'trialing' && (
                <TimelineRow
                  icon={<RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />}
                  label="Period počeo"
                  value={format(new Date(t.current_period_start), 'd. MMMM yyyy.', { locale: hr })}
                />
              )}
              {t.current_period_end && (
                <TimelineRow
                  icon={t.cancel_at_period_end
                    ? <TrendingDown className="w-3.5 h-3.5 text-orange-400" />
                    : <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />}
                  label={t.cancel_at_period_end ? 'Pristup istječe' : 'Sljedeća naplata'}
                  value={format(new Date(t.current_period_end), 'd. MMMM yyyy.', { locale: hr })}
                  valueClass={t.cancel_at_period_end ? 'text-orange-400' : 'text-emerald-400'}
                  extra={!t.cancel_at_period_end && price > 0 ? `€${price}` : undefined}
                />
              )}
              {t.locked_at && (
                <TimelineRow
                  icon={<Lock className="w-3.5 h-3.5 text-red-400" />}
                  label="Zaključan"
                  value={format(new Date(t.locked_at), 'd. MMMM yyyy. HH:mm', { locale: hr })}
                  valueClass="text-red-400"
                />
              )}
            </div>
          </div>
        )}

        {/* ── Meta info ──────────────────────────────────────────── */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Info</p>
          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground">ID</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-muted-foreground">{t.id.slice(0, 18)}…</span>
                <CopyButton value={t.id} />
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground">Email</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs">{t.email}</span>
                <CopyButton value={t.email} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Stripe ─────────────────────────────────────────────── */}
        {(t.stripe_customer_id || t.stripe_subscription_id) && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Stripe</p>
            <div className="flex gap-2 flex-wrap">
              {t.stripe_customer_id && (
                <a
                  href={`https://dashboard.stripe.com/customers/${t.stripe_customer_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/8 border border-blue-500/20 rounded-lg px-3 py-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  Customer
                </a>
              )}
              {t.stripe_subscription_id && (
                <a
                  href={`https://dashboard.stripe.com/subscriptions/${t.stripe_subscription_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/8 border border-blue-500/20 rounded-lg px-3 py-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  Subscription
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatTile({
  icon, label, value, valueClass = '',
}: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-muted/30 border border-border rounded-xl p-3 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">{icon}<span className="text-[10px] font-medium uppercase tracking-wide">{label}</span></div>
      <p className={`text-base font-bold leading-tight ${valueClass}`}>{value}</p>
    </div>
  )
}

function TimelineRow({
  icon, label, value, valueClass = 'text-foreground', extra,
}: { icon: React.ReactNode; label: string; value: string; valueClass?: string; extra?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="shrink-0">{icon}</span>
      <span className="text-xs text-muted-foreground flex-1">{label}</span>
      <div className="flex items-center gap-2 text-right">
        <span className={`text-xs font-medium ${valueClass}`}>{value}</span>
        {extra && <span className="text-xs font-bold text-emerald-400">{extra}</span>}
      </div>
    </div>
  )
}
