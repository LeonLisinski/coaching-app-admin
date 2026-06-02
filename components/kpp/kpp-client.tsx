'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Pencil, Trash2, Download, ChevronDown, Loader2,
  Check, X, Filter, BookText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ─── Types ────────────────────────────────────────────────────────────────────

interface KppEntry {
  id:             string
  rbr:            string
  broj_racuna:    string
  kupac:          string
  oib_kupca:      string | null
  opis:           string
  nacin_placanja: string
  iznos:          number
  datum:          string
  kategorija:     'app' | 'ostalo'
  created_at:     string
}

interface Filters {
  year:   string
  from:   string
  to:     string
  kat:    'all' | 'app' | 'ostalo'
  min:    string
  max:    string
}

const CURRENT_YEAR = String(new Date().getFullYear())

const DEFAULT_FILTERS: Filters = {
  year: CURRENT_YEAR,
  from: `${CURRENT_YEAR}-01-01`,
  to:   `${CURRENT_YEAR}-12-31`,
  kat:  'all',
  min:  '',
  max:  '',
}

const PAYMENT_OPTIONS = ['kartica', 'gotovina', 'transakcijski', 'ostalo']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return iso.slice(0, 10).split('-').reverse().join('.')
}

function fmtEur(n: number) {
  return '€' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

// ─── Modal: New / Edit entry ──────────────────────────────────────────────────

interface EntryFormData {
  kupac:          string
  oib_kupca:      string
  opis:           string
  nacin_placanja: string
  iznos:          string
  datum:          string
  kategorija:     string
}

const EMPTY_FORM: EntryFormData = {
  kupac: '', oib_kupca: '', opis: '', nacin_placanja: 'gotovina',
  iznos: '', datum: new Date().toISOString().slice(0, 10), kategorija: 'ostalo',
}

function EntryModal({
  entry,
  onClose,
  onSaved,
}: {
  entry: KppEntry | null
  onClose: () => void
  onSaved: (e: KppEntry) => void
}) {
  const isEdit = !!entry
  const [form, setForm] = useState<EntryFormData>(
    entry
      ? {
          kupac:          entry.kupac,
          oib_kupca:      entry.oib_kupca ?? '',
          opis:           entry.opis,
          nacin_placanja: entry.nacin_placanja,
          iznos:          String(entry.iznos),
          datum:          entry.datum,
          kategorija:     entry.kategorija,
        }
      : { ...EMPTY_FORM }
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const set = (k: keyof EntryFormData, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (!form.kupac.trim() || !form.opis.trim() || !form.iznos || !form.datum) {
      setErr('Sva obavezna polja moraju biti ispunjena.')
      return
    }
    setSaving(true)
    try {
      const url    = isEdit ? `/api/kpp/${entry!.id}` : '/api/kpp'
      const method = isEdit ? 'PATCH' : 'POST'
      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          iznos: parseFloat(form.iznos),
          oib_kupca: form.oib_kupca || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setErr(json.error ?? 'Greška'); setSaving(false); return }
      onSaved(json.data)
    } catch {
      setErr('Greška pri spajanju na server.')
      setSaving(false)
    }
  }

  const inputCls = 'w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background'

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-1">
          <h2 className="text-base font-bold">{isEdit ? 'Uredi unos' : 'Novi unos'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 flex flex-col gap-4">

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Kupac *</label>
              <input className={inputCls} value={form.kupac} onChange={e => set('kupac', e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">OIB kupca</label>
              <input
                className={inputCls}
                value={form.oib_kupca}
                onChange={e => set('oib_kupca', e.target.value.replace(/\D/g, '').slice(0, 11))}
                inputMode="numeric"
                placeholder="11 znakova"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Datum *</label>
              <DateInput value={form.datum} onChange={v => set('datum', v)} className={inputCls} />
            </div>

            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Opis *</label>
              <input className={inputCls} value={form.opis} onChange={e => set('opis', e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Iznos (EUR) *</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                className={inputCls} value={form.iznos}
                onChange={e => set('iznos', e.target.value.replace(/[^0-9.]/g, ''))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Način plaćanja</label>
              <select
                className={inputCls}
                value={form.nacin_placanja}
                onChange={e => set('nacin_placanja', e.target.value)}
              >
                {PAYMENT_OPTIONS.map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Kategorija</label>
              <select
                className={inputCls}
                value={form.kategorija}
                onChange={e => set('kategorija', e.target.value)}
              >
                <option value="app">App</option>
                <option value="ostalo">Ostalo</option>
              </select>
            </div>
          </div>

          {err && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{err}</p>}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Odustani
            </Button>
            <Button type="submit" disabled={saving} className="flex-1 gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {isEdit ? 'Spremi' : 'Dodaj unos'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Delete confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ entry, onClose, onDeleted }: { entry: KppEntry; onClose: () => void; onDeleted: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    const res = await fetch(`/api/kpp/${entry.id}`, { method: 'DELETE' })
    if (res.ok) onDeleted(entry.id)
    else setDeleting(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6 flex flex-col gap-4">
        <h2 className="font-bold text-base">Izbriši unos?</h2>
        <p className="text-sm text-muted-foreground">
          Unos <strong>{entry.rbr}</strong> — {entry.kupac} ({fmtEur(entry.iznos)}) bit će trajno obrisan.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Odustani</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="flex-1 gap-2">
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Izbriši
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

const YEARS = [2024, 2025, 2026, 2027, 2028]

function FilterBar({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const [open, setOpen] = useState(false)
  const [yearOpen, setYearOpen] = useState(false)
  const [local, setLocal] = useState(filters)
  const yearRef = useRef<HTMLDivElement>(null)

  // Close year dropdown on outside click
  useEffect(() => {
    if (!yearOpen) return
    const handler = (e: MouseEvent) => {
      if (yearRef.current && !yearRef.current.contains(e.target as Node)) setYearOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [yearOpen])

  const set = (k: keyof Filters, v: string) =>
    setLocal(prev => ({ ...prev, [k]: v }))

  const apply = () => { onChange(local); setOpen(false) }
  const reset = () => { setLocal(DEFAULT_FILTERS); onChange(DEFAULT_FILTERS); setOpen(false) }

  const selectYear = (y: number) => {
    const ys = String(y)
    const nf = { ...local, year: ys, from: `${ys}-01-01`, to: `${ys}-12-31` }
    setLocal(nf)
    onChange(nf)
    setYearOpen(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">

      {/* Custom year picker */}
      <div ref={yearRef} className="relative">
        <button
          onClick={() => setYearOpen(o => !o)}
          className="flex items-center gap-2 bg-muted hover:bg-muted/80 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border border-transparent hover:border-border"
        >
          <span className="text-muted-foreground font-normal">Godina</span>
          <span>{local.year}</span>
          <ChevronDown size={11} className={`text-muted-foreground transition-transform ${yearOpen ? 'rotate-180' : ''}`} />
        </button>

        {yearOpen && (
          <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden min-w-[90px]">
            {YEARS.map(y => (
              <button
                key={y}
                onClick={() => selectYear(y)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  String(y) === local.year
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'hover:bg-accent text-foreground'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-1 bg-muted rounded-lg px-1 py-1">
        {(['all', 'app', 'ostalo'] as const).map(k => (
          <button
            key={k}
            onClick={() => { const nf = { ...local, kat: k }; setLocal(nf); onChange(nf) }}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              local.kat === k
                ? 'bg-background shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {k === 'all' ? 'Sve' : k === 'app' ? 'App' : 'Ostalo'}
          </button>
        ))}
      </div>

      {/* Advanced filters toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 transition-colors ${
          open
            ? 'border-primary/50 bg-primary/5 text-foreground'
            : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'
        }`}
      >
        <Filter size={12} />
        Filteri
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="w-full bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 items-end mt-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Od datuma</label>
            <DateInput
              value={local.from}
              onChange={v => set('from', v)}
              className="text-xs border border-input rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring w-28"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Do datuma</label>
            <DateInput
              value={local.to}
              onChange={v => set('to', v)}
              className="text-xs border border-input rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring w-28"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Min iznos (€)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              className="text-xs border border-input rounded-lg px-2 py-1.5 bg-background w-24 focus:outline-none focus:ring-1 focus:ring-ring"
              value={local.min}
              onChange={e => set('min', e.target.value.replace(/[^0-9.]/g, ''))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Max iznos (€)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="9999.00"
              className="text-xs border border-input rounded-lg px-2 py-1.5 bg-background w-24 focus:outline-none focus:ring-1 focus:ring-ring"
              value={local.max}
              onChange={e => set('max', e.target.value.replace(/[^0-9.]/g, ''))}
            />
          </div>
          <div className="flex gap-2 items-end">
            <Button size="sm" onClick={apply} className="gap-1.5 h-8"><Check size={12} /> Primijeni</Button>
            <Button size="sm" variant="outline" onClick={reset} className="h-8">Reset</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Smart date input: display dd.mm.yyyy, store yyyy-mm-dd ──────────────────
function DateInput({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  // value is always yyyy-mm-dd (or ''); display is dd.mm.yyyy
  const toDisplay = (iso: string) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${d}.${m}.${y}`
  }
  const [raw, setRaw] = useState(toDisplay(value))

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/[^0-9.]/g, '')
    // Auto-insert dots
    if (v.length === 2 && !v.includes('.') && raw.length < 3) v += '.'
    if (v.length === 5 && v.split('.').length === 2 && raw.length < 6) v += '.'
    setRaw(v)
    // Parse dd.mm.yyyy → yyyy-mm-dd
    const parts = v.split('.')
    if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
      const iso = `${parts[2]}-${parts[1]}-${parts[0]}`
      if (!isNaN(Date.parse(iso))) onChange(iso)
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="dd.mm.yyyy"
      value={raw}
      onChange={handleChange}
      onBlur={() => setRaw(toDisplay(value))}
      maxLength={10}
      className={className}
    />
  )
}

export function KppClient() {
  const [rows, setRows]         = useState<KppEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]   = useState(false)
  const [total, setTotal]       = useState(0)
  const [filters, setFilters]   = useState<Filters>(DEFAULT_FILTERS)
  const [editEntry, setEditEntry]     = useState<KppEntry | 'new' | undefined>()
  const [deleteEntry, setDeleteEntry] = useState<KppEntry | null>(null)
  const [exporting, setExporting]     = useState(false)
  const PAGE = 50
  const cursorRef = useRef<string | null>(null)

  const buildQs = useCallback((f: Filters, cursor?: string | null) => {
    const p = new URLSearchParams({
      from:  f.from,
      to:    f.to,
      kat:   f.kat,
      limit: String(PAGE),
    })
    if (f.min) p.set('min', f.min)
    if (f.max) p.set('max', f.max)
    if (cursor) p.set('cursor', cursor)
    return p.toString()
  }, [])

  const fetchPage = useCallback(async (f: Filters, reset = true) => {
    if (reset) {
      setLoading(true)
      cursorRef.current = null
    } else {
      setLoadingMore(true)
    }

    try {
      const cursor = reset ? null : cursorRef.current
      const res  = await fetch(`/api/kpp?${buildQs(f, cursor)}`)
      const json = await res.json()

      if (!res.ok) { console.error(json.error); return }

      const newRows: KppEntry[] = json.data ?? []

      if (reset) {
        setRows(newRows)
        setTotal(json.total ?? 0)
      } else {
        setRows(prev => [...prev, ...newRows])
      }

      setHasMore(newRows.length === PAGE)
      if (newRows.length > 0) {
        cursorRef.current = newRows[newRows.length - 1].datum
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [buildQs])

  useEffect(() => {
    fetchPage(filters, true)
  }, [filters]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (f: Filters) => {
    setFilters(f)
  }

  const handleSaved = (entry: KppEntry) => {
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === entry.id)
      if (idx >= 0) {
        const next = [...prev]; next[idx] = entry; return next
      }
      return [entry, ...prev]
    })
    setEditEntry(undefined)
    // Re-fetch to update total
    fetchPage(filters, true)
  }

  const handleDeleted = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id))
    setDeleteEntry(null)
    fetchPage(filters, true)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const XLSX = await import('xlsx')
      // Fetch ALL rows for current filter (no cursor, high limit)
      const p = new URLSearchParams({ from: filters.from, to: filters.to, kat: filters.kat, limit: '5000' })
      if (filters.min) p.set('min', filters.min)
      if (filters.max) p.set('max', filters.max)
      const res  = await fetch(`/api/kpp?${p}`)
      const json = await res.json()
      const allRows: KppEntry[] = json.data ?? []

      const sheetData = [
        // Metadata row
        [`Izvoz: ${new Date().toLocaleString('hr')}`, `Period: ${filters.from} – ${filters.to}`, `Ukupno: €${json.total?.toFixed(2)}`],
        [],
        ['Rbr', 'Broj računa', 'Kupac', 'OIB kupca', 'Opis', 'Način plaćanja', 'Iznos (€)', 'Datum', 'Kategorija'],
        ...allRows.map(r => [
          r.rbr, r.broj_racuna, r.kupac, r.oib_kupca ?? '', r.opis,
          r.nacin_placanja, r.iznos, r.datum, r.kategorija,
        ]),
      ]

      const ws = XLSX.utils.aoa_to_sheet(sheetData)
      ws['!cols'] = [10, 14, 24, 14, 30, 16, 12, 12, 10].map(w => ({ wch: w }))

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'KPP')

      const fromPart = filters.from.slice(0, 7).replace('-', '_')
      const toPart   = filters.to.slice(0, 7).replace('-', '_')
      XLSX.writeFile(wb, `KPP_${fromPart}-${toPart}.xlsx`)
    } catch (e) {
      console.error('Export failed:', e)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Modals */}
      {editEntry !== undefined && (
        <EntryModal
          entry={editEntry === 'new' ? null : editEntry}
          onClose={() => setEditEntry(undefined)}
          onSaved={handleSaved}
        />
      )}
      {deleteEntry && (
        <DeleteConfirm
          entry={deleteEntry}
          onClose={() => setDeleteEntry(null)}
          onDeleted={handleDeleted}
        />
      )}

      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BookText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">KPP — Knjiga primitaka i prihoda</h1>
              <p className="text-xs text-muted-foreground">Evidencija prihoda UnitLift platforme</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
              className="gap-2"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Izvozi u Excel
            </Button>
            <Button size="sm" onClick={() => setEditEntry('new')} className="gap-2">
              <Plus size={14} /> Novi unos
            </Button>
          </div>
        </div>

        <FilterBar filters={filters} onChange={handleFilterChange} />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 size={18} className="animate-spin" /> Učitavanje…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <BookText size={40} className="opacity-20" />
            <p className="text-sm">Nema zapisa za odabrane filtere</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur border-b border-border z-10">
              <tr>
                {['Rbr', 'Broj računa', 'Kupac', 'OIB kupca', 'Opis', 'Način plaćanja', 'Iznos', 'Datum', 'Kat.', ''].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-muted/40 transition-colors group">
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">{row.rbr}</td>
                  <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{row.broj_racuna}</td>
                  <td className="px-4 py-2.5 max-w-[160px] truncate" title={row.kupac}>{row.kupac}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{row.oib_kupca ?? '—'}</td>
                  <td className="px-4 py-2.5 max-w-[200px] truncate text-xs" title={row.opis}>{row.opis}</td>
                  <td className="px-4 py-2.5 text-xs capitalize text-muted-foreground">{row.nacin_placanja}</td>
                  <td className="px-4 py-2.5 font-semibold tabular-nums whitespace-nowrap">{fmtEur(row.iznos)}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(row.datum)}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={row.kategorija === 'app' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                      {row.kategorija}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditEntry(row)}
                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Uredi"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteEntry(row)}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Izbriši"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <div className="flex justify-center py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPage(filters, false)}
              disabled={loadingMore}
              className="gap-2"
            >
              {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
              Učitaj još
            </Button>
          </div>
        )}
      </div>

      {/* Footer: total */}
      <div className="px-6 py-3 border-t border-border bg-muted/40 flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? 'unos' : 'unosa'} prikazano
          {hasMore ? ' (postoji još…)' : ''}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Ukupno prihodi:</span>
          <span className="text-base font-bold tabular-nums text-primary">{fmtEur(total)}</span>
        </div>
      </div>
    </div>
  )
}
