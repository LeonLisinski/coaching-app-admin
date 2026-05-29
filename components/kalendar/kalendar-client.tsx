'use client'

import { useState, useMemo } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, isSameMonth, isToday,
} from 'date-fns'
import { hr } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, Plus, CalendarCheck, Check,
  Trash2, X, CalendarDays,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export type CalItem = {
  id: string
  kind: 'presentation' | 'event'
  title: string
  subtitle?: string
  date: string      // yyyy-MM-dd
  time: string | null
  done: boolean
  status?: string   // for presentations
}

const WEEKDAYS = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned']

function dateKey(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

function itemStyle(item: CalItem): { chip: string; dot: string } {
  if (item.done) return { chip: 'bg-muted text-muted-foreground border-border line-through', dot: 'bg-muted-foreground' }
  if (item.kind === 'event') return { chip: 'bg-violet-500/15 text-violet-300 border-violet-500/30', dot: 'bg-violet-400' }
  if (item.status === 'pending') return { chip: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30', dot: 'bg-yellow-400' }
  return { chip: 'bg-blue-500/15 text-blue-300 border-blue-500/30', dot: 'bg-blue-400' }
}

export function KalendarClient({ items: initial }: { items: CalItem[] }) {
  const [items, setItems] = useState(initial)
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedWeekIdx, setSelectedWeekIdx] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  // add-event form
  const [showForm, setShowForm] = useState(false)
  const [fTitle, setFTitle] = useState('')
  const [fDesc, setFDesc] = useState('')
  const [fTime, setFTime] = useState('')

  const byDate = useMemo(() => {
    const map: Record<string, CalItem[]> = {}
    for (const it of items) {
      (map[it.date] ??= []).push(it)
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'))
    }
    return map
  }, [items])

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    const days: Date[] = []
    let d = start
    while (d <= end) { days.push(d); d = addDays(d, 1) }
    const w: Date[][] = []
    for (let i = 0; i < days.length; i += 7) w.push(days.slice(i, i + 7))
    return w
  }, [month])

  const selectedItems = selectedDay ? (byDate[dateKey(selectedDay)] ?? []) : []

  function openDay(d: Date, weekIdx: number) {
    if (selectedDay && dateKey(selectedDay) === dateKey(d)) {
      // Toggle close on re-click
      setSelectedDay(null); setSelectedWeekIdx(null)
      return
    }
    setSelectedDay(d)
    setSelectedWeekIdx(weekIdx)
    setShowForm(false)
    setFTitle(''); setFDesc(''); setFTime('')
  }

  async function toggleDone(item: CalItem) {
    setBusy(true)
    const next = !item.done
    setItems(prev => prev.map(i => i.id === item.id && i.kind === item.kind ? { ...i, done: next } : i))
    try {
      const res = await fetch('/api/kalendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: item.kind, id: item.id, done: next }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setItems(prev => prev.map(i => i.id === item.id && i.kind === item.kind ? { ...i, done: !next } : i))
      toast.error('Greška pri spremanju')
    }
    setBusy(false)
  }

  async function addEvent() {
    if (!fTitle.trim() || !selectedDay) { toast.error('Naslov je obavezan'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/kalendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: fTitle, description: fDesc,
          event_date: dateKey(selectedDay), event_time: fTime || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error()
      setItems(prev => [...prev, {
        id: json.data.id, kind: 'event', title: json.data.title,
        subtitle: json.data.description ?? undefined,
        date: json.data.event_date, time: json.data.event_time ? json.data.event_time.slice(0, 5) : null,
        done: false,
      }])
      setShowForm(false); setFTitle(''); setFDesc(''); setFTime('')
      toast.success('Događaj dodan')
    } catch {
      toast.error('Greška pri dodavanju')
    }
    setBusy(false)
  }

  async function deleteEvent(item: CalItem) {
    setBusy(true)
    setItems(prev => prev.filter(i => !(i.id === item.id && i.kind === item.kind)))
    try {
      const res = await fetch('/api/kalendar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      })
      if (!res.ok) throw new Error()
      toast.success('Događaj obrisan')
    } catch {
      setItems(prev => [...prev, item])
      toast.error('Greška pri brisanju')
    }
    setBusy(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header / toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarCheck className="w-6 h-6" />
            Kalendar
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Prezentacije i tvoji događaji</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => {
          const today = new Date()
          const todayWeekIdx = weeks.findIndex(w => w.some(d => dateKey(d) === dateKey(today)))
          openDay(today, todayWeekIdx >= 0 ? todayWeekIdx : 0)
          setShowForm(true)
        }}>
          <Plus className="w-4 h-4" /> Dodaj događaj
        </Button>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold capitalize">{format(month, 'LLLL yyyy.', { locale: hr })}</span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>Danas</Button>
          <Button variant="outline" size="icon-sm" onClick={() => setMonth(addMonths(month, -1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-xl border border-border overflow-hidden bg-card/40">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/30">
          {WEEKDAYS.map(d => (
            <div key={d} className="px-1 py-2 text-center text-[11px] font-medium text-muted-foreground">{d}</div>
          ))}
        </div>

        {/* Weeks — render each row then inline expand below */}
        {weeks.map((week, weekIdx) => {
          const isExpanded = selectedWeekIdx === weekIdx && selectedDay !== null
          return (
            <div key={weekIdx}>
              {/* Week row */}
              <div className="grid grid-cols-7 border-b border-border last:border-b-0">
                {week.map((d, dayIdx) => {
                  const key = dateKey(d)
                  const dayItems = byDate[key] ?? []
                  const inMonth = isSameMonth(d, month)
                  const today = isToday(d)
                  const isSelected = selectedDay && dateKey(selectedDay) === key
                  return (
                    <button
                      key={dayIdx}
                      onClick={() => openDay(d, weekIdx)}
                      className={`min-h-[64px] md:min-h-[96px] border-r border-border p-1 md:p-1.5 text-left align-top transition-colors
                        ${inMonth ? '' : 'opacity-40'}
                        ${(dayIdx + 1) % 7 === 0 ? 'border-r-0' : ''}
                        ${isSelected ? 'bg-primary/10 ring-1 ring-inset ring-primary/40' : 'hover:bg-accent/40'}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
                          today ? 'bg-primary text-primary-foreground' :
                          isSelected ? 'bg-primary/20 text-primary' : 'text-foreground'
                        }`}>
                          {format(d, 'd')}
                        </span>
                        {dayItems.length > 0 && (
                          <span className="md:hidden flex gap-0.5">
                            {dayItems.slice(0, 3).map((it, j) => (
                              <span key={j} className={`w-1.5 h-1.5 rounded-full ${itemStyle(it).dot}`} />
                            ))}
                          </span>
                        )}
                      </div>
                      {/* Desktop chips */}
                      <div className="hidden md:flex flex-col gap-1 mt-1">
                        {dayItems.slice(0, 3).map((it, j) => (
                          <span key={j} className={`text-[10px] leading-tight px-1.5 py-0.5 rounded border truncate ${itemStyle(it).chip}`}>
                            {it.time ? `${it.time} ` : ''}{it.title}
                          </span>
                        ))}
                        {dayItems.length > 3 && (
                          <span className="text-[10px] text-muted-foreground pl-1">+{dayItems.length - 3} više</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Inline expand panel */}
              {isExpanded && selectedDay && (
                <div className="border-b border-border bg-muted/20">
                  <DayPanel
                    day={selectedDay}
                    items={selectedItems}
                    busy={busy}
                    showForm={showForm}
                    fTitle={fTitle} fDesc={fDesc} fTime={fTime}
                    setFTitle={setFTitle} setFDesc={setFDesc} setFTime={setFTime}
                    setShowForm={setShowForm}
                    onClose={() => { setSelectedDay(null); setSelectedWeekIdx(null) }}
                    onToggle={toggleDone}
                    onDelete={deleteEvent}
                    onAdd={addEvent}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Prezentacija (potvrđena)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> Prezentacija (na čekanju)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-400" /> Događaj</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground" /> Gotovo</span>
      </div>
    </div>
  )
}

// ── DayPanel ──────────────────────────────────────────────────────────────────

interface DayPanelProps {
  day: Date
  items: CalItem[]
  busy: boolean
  showForm: boolean
  fTitle: string; fDesc: string; fTime: string
  setFTitle: (v: string) => void; setFDesc: (v: string) => void; setFTime: (v: string) => void
  setShowForm: (v: boolean) => void
  onClose: () => void
  onToggle: (item: CalItem) => void
  onDelete: (item: CalItem) => void
  onAdd: () => void
}

function DayPanel({ day, items, busy, showForm, fTitle, fDesc, fTime, setFTitle, setFDesc, setFTime, setShowForm, onClose, onToggle, onDelete, onAdd }: DayPanelProps) {
  return (
    <div className="px-4 py-4 space-y-3 max-w-2xl">
      {/* Panel header */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold capitalize text-sm">
          {format(day, 'EEEE, d. LLLL yyyy.', { locale: hr })}
        </h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
          aria-label="Zatvori"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Items */}
      {items.length === 0 && !showForm ? (
        <p className="text-sm text-muted-foreground">Nema stavki za ovaj dan.</p>
      ) : (
        <div className="space-y-2">
          {items.map((it) => {
            const st = itemStyle(it)
            return (
              <div key={`${it.kind}-${it.id}`} className="flex items-start gap-3 rounded-lg border border-border p-3 bg-background/40">
                <button
                  onClick={() => onToggle(it)}
                  disabled={busy}
                  className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                    it.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border hover:border-foreground'
                  }`}
                  aria-label="Označi gotovim"
                >
                  {it.done && <Check className="w-3.5 h-3.5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${st.chip.replace('line-through', '')}`}>
                      {it.kind === 'event' ? 'Događaj' : it.status === 'pending' ? 'Na čekanju' : 'Prezentacija'}
                    </span>
                    {it.time && <span className="text-xs text-muted-foreground font-mono">{it.time}</span>}
                  </div>
                  <p className={`text-sm font-medium mt-1 ${it.done ? 'line-through text-muted-foreground' : ''}`}>{it.title}</p>
                  {it.subtitle && <p className="text-xs text-muted-foreground">{it.subtitle}</p>}
                </div>
                {it.kind === 'event' && (
                  <button
                    onClick={() => onDelete(it)}
                    disabled={busy}
                    className="text-muted-foreground hover:text-red-400 shrink-0 p-1 transition-colors"
                    aria-label="Obriši"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <div className="rounded-lg border border-border p-3 space-y-3 bg-background/40">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Novi događaj</p>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Naslov</Label>
              <Input value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="Npr. Poziv s partnerom" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Vrijeme (opcionalno)</Label>
              <input
                type="time"
                value={fTime}
                onChange={(e) => setFTime(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring [color-scheme:dark]"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Bilješka (opcionalno)</Label>
              <Input value={fDesc} onChange={(e) => setFDesc(e.target.value)} placeholder="Kratka napomena..." />
            </div>
          </div>
          <Button size="sm" className="gap-1.5" disabled={busy} onClick={onAdd}>
            <Plus className="w-4 h-4" /> Spremi događaj
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-foreground/40 rounded-lg px-3 py-2 transition-colors w-full justify-center"
        >
          <CalendarDays className="w-3.5 h-3.5" /> Dodaj događaj za ovaj dan
        </button>
      )}
    </div>
  )
}
