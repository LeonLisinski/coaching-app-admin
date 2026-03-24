'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Search, ChevronDown, ExternalLink } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  trial_end: string | null
  cancel_at_period_end: boolean
  stripe_customer_id: string | null
}

function getPlanColor(plan: string | null) {
  switch (plan) {
    case 'scale': return 'bg-violet-500/20 text-violet-300 border-violet-500/30'
    case 'pro': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 'starter': return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30'
    default: return 'bg-zinc-800 text-zinc-400 border-zinc-700'
  }
}

function getStatusColor(status: string | null) {
  switch (status) {
    case 'active': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    case 'trialing': return 'bg-sky-500/20 text-sky-300 border-sky-500/30'
    case 'past_due': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    case 'canceled': return 'bg-red-500/20 text-red-300 border-red-500/30'
    case 'locked': return 'bg-red-800/30 text-red-400 border-red-800/30'
    default: return 'bg-zinc-800 text-zinc-400 border-zinc-700'
  }
}

export function TreneriClient({ trainers }: { trainers: Trainer[] }) {
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<Trainer | null>(null)

  const filtered = useMemo(() => {
    return trainers.filter((t) => {
      const matchSearch =
        !search ||
        t.full_name.toLowerCase().includes(search.toLowerCase()) ||
        t.email.toLowerCase().includes(search.toLowerCase())
      const matchPlan = planFilter === 'all' || t.plan === planFilter
      const matchStatus = statusFilter === 'all' || t.status === statusFilter
      return matchSearch && matchPlan && matchStatus
    })
  }, [trainers, search, planFilter, statusFilter])

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Treneri</h1>
        <p className="text-muted-foreground text-sm mt-1">{trainers.length} ukupno</p>
      </div>

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

      <div className="text-xs text-muted-foreground">{filtered.length} rezultata</div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_1fr_100px_120px_130px] gap-4 px-4 py-2.5 bg-muted/40 text-xs font-medium text-muted-foreground border-b border-border">
          <span>Ime</span>
          <span>Email</span>
          <span>Plan</span>
          <span>Status</span>
          <span>Registracija</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            Nema trenera koji odgovaraju filteru
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className="w-full text-left hover:bg-accent/30 transition-colors"
              >
                <div className="hidden md:grid grid-cols-[1fr_1fr_100px_120px_130px] gap-4 px-4 py-3 items-center text-sm">
                  <span className="font-medium truncate">{t.full_name}</span>
                  <span className="text-muted-foreground truncate">{t.email}</span>
                  <span>
                    {t.plan ? (
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getPlanColor(t.plan)}`}>
                        {PLAN_LABELS[t.plan] ?? t.plan}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </span>
                  <span>
                    {t.status ? (
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getStatusColor(t.status)}`}>
                        {STATUS_LABELS[t.status] ?? t.status}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {format(new Date(t.created_at), 'd. M. yyyy')}
                  </span>
                </div>

                <div className="md:hidden flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{t.full_name}</p>
                    <p className="text-muted-foreground text-xs truncate">{t.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {t.plan && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${getPlanColor(t.plan)}`}>
                          {PLAN_LABELS[t.plan] ?? t.plan}
                        </span>
                      )}
                      {t.status && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${getStatusColor(t.status)}`}>
                          {STATUS_LABELS[t.status] ?? t.status}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground rotate-[-90deg]" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.full_name}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <div className="space-y-3">
                  <DetailRow label="Email" value={selected.email} />
                  <DetailRow label="ID" value={selected.id} mono />
                  <DetailRow
                    label="Registracija"
                    value={format(new Date(selected.created_at), 'd. M. yyyy. HH:mm')}
                  />
                </div>
                <Separator />
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pretplata</p>
                  <div className="flex items-center gap-2">
                    {selected.plan ? (
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getPlanColor(selected.plan)}`}>
                        {PLAN_LABELS[selected.plan] ?? selected.plan}
                      </span>
                    ) : <span className="text-muted-foreground text-sm">—</span>}
                    {selected.status ? (
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getStatusColor(selected.status)}`}>
                        {STATUS_LABELS[selected.status] ?? selected.status}
                      </span>
                    ) : null}
                  </div>
                  {selected.current_period_end && (
                    <DetailRow
                      label="Kraj perioda"
                      value={format(new Date(selected.current_period_end), 'd. M. yyyy')}
                    />
                  )}
                  {selected.trial_end && (
                    <DetailRow
                      label="Kraj triala"
                      value={format(new Date(selected.trial_end), 'd. M. yyyy')}
                    />
                  )}
                  {selected.cancel_at_period_end && (
                    <p className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded px-3 py-2">
                      ⚠ Otkazan — istječe na kraju perioda
                    </p>
                  )}
                  {selected.stripe_customer_id && (
                    <a
                      href={`https://dashboard.stripe.com/customers/${selected.stripe_customer_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Stripe Dashboard
                    </a>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={`text-sm text-right break-all ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  )
}
