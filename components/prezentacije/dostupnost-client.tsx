'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

function getBrowserSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

type Availability = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration_minutes: number
}

type BlockedSlot = {
  id: string
  blocked_date: string
  blocked_time: string | null
  reason: string | null
}

const DAY_NAMES = ['Nedjelja', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota']

export function DostupnostClient({
  availability: initial,
  blocked: initialBlocked,
}: {
  availability: Availability[]
  blocked: BlockedSlot[]
}) {
  const [availability, setAvailability] = useState(initial)
  const [blocked,      setBlocked]      = useState(initialBlocked)
  const [saving,       setSaving]       = useState(false)
  const [newBlock,     setNewBlock]     = useState({ date: '', time: '', reason: '' })

  // New availability row form
  const [newRow, setNewRow] = useState({ day: '1', start: '18:00', end: '21:00', duration: '15' })

  async function saveNewAvailability() {
    setSaving(true)
    const db = getBrowserSupabase()
    const { data, error } = await db.from('demo_availability').insert({
      day_of_week: parseInt(newRow.day),
      start_time: newRow.start,
      end_time: newRow.end,
      slot_duration_minutes: parseInt(newRow.duration),
    }).select().single()
    setSaving(false)
    if (error) { toast.error('Greška pri dodavanju.'); return }
    setAvailability(prev => [...prev, data].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)))
    setNewRow({ day: '1', start: '18:00', end: '21:00', duration: '15' })
    toast.success('Dostupnost dodana.')
  }

  async function deleteAvailability(id: string) {
    const db = getBrowserSupabase()
    const { error } = await db.from('demo_availability').delete().eq('id', id)
    if (error) { toast.error('Greška.'); return }
    setAvailability(prev => prev.filter(a => a.id !== id))
    toast.success('Uklonjen.')
  }

  async function addBlock() {
    if (!newBlock.date) { toast.error('Datum je obavezan.'); return }
    const db = getBrowserSupabase()
    const { data, error } = await db.from('demo_blocked_slots').insert({
      blocked_date: newBlock.date,
      blocked_time: newBlock.time || null,
      reason: newBlock.reason || null,
    }).select().single()
    if (error) { toast.error('Greška pri blokiranju.'); return }
    setBlocked(prev => [data, ...prev])
    setNewBlock({ date: '', time: '', reason: '' })
    toast.success('Termin blokiran.')
  }

  async function deleteBlock(id: string) {
    const db = getBrowserSupabase()
    const { error } = await db.from('demo_blocked_slots').delete().eq('id', id)
    if (error) { toast.error('Greška.'); return }
    setBlocked(prev => prev.filter(b => b.id !== id))
    toast.success('Blokada uklonjena.')
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link href="/prezentacije" className="text-xs text-muted-foreground hover:underline flex items-center gap-1 mb-3">
          <ArrowLeft className="w-3 h-3" /> Natrag na zahtjeve
        </Link>
        <h1 className="text-xl font-bold">Dostupnost za prezentacije</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Tjedna dostupnost i ručno blokiranje termina</p>
      </div>

      {/* Weekly availability */}
      <section>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Tjedna dostupnost</h2>
        <div className="border border-border rounded-lg overflow-hidden">
          {availability.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">Nema definiranih termina.</p>
          ) : (
            <div className="divide-y divide-border">
              {availability.map(a => (
                <div key={a.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <span className="font-medium text-sm">{DAY_NAMES[a.day_of_week]}</span>
                    <span className="text-muted-foreground text-sm ml-3">
                      {a.start_time.slice(0, 5)} – {a.end_time.slice(0, 5)}
                    </span>
                    <span className="text-xs text-muted-foreground/70 ml-2">({a.slot_duration_minutes} min)</span>
                  </div>
                  <Button
                    variant="ghost" size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                    onClick={() => deleteAvailability(a.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {/* Add row */}
          <div className="border-t border-border p-4 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-3">Dodaj novi termin</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <select
                value={newRow.day}
                onChange={e => setNewRow(r => ({ ...r, day: e.target.value }))}
                className="border border-border rounded-md px-3 py-1.5 text-sm bg-background"
              >
                {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
              <input type="time" value={newRow.start}
                onChange={e => setNewRow(r => ({ ...r, start: e.target.value }))}
                className="border border-border rounded-md px-3 py-1.5 text-sm bg-background" />
              <input type="time" value={newRow.end}
                onChange={e => setNewRow(r => ({ ...r, end: e.target.value }))}
                className="border border-border rounded-md px-3 py-1.5 text-sm bg-background" />
              <div className="flex items-center gap-2">
                <input type="number" value={newRow.duration} min={5} max={120} step={5}
                  onChange={e => setNewRow(r => ({ ...r, duration: e.target.value }))}
                  className="border border-border rounded-md px-3 py-1.5 text-sm bg-background w-full"
                  placeholder="min" />
              </div>
            </div>
            <Button size="sm" className="mt-2 gap-1.5" disabled={saving} onClick={saveNewAvailability}>
              <Plus className="w-3.5 h-3.5" /> Dodaj
            </Button>
          </div>
        </div>
      </section>

      {/* Blocked slots */}
      <section>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Blokirani termini</h2>
        <div className="border border-border rounded-lg overflow-hidden">
          {blocked.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">Nema blokiranih termina.</p>
          ) : (
            <div className="divide-y divide-border">
              {blocked.map(b => (
                <div key={b.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <span className="font-medium text-sm">{b.blocked_date}</span>
                    {b.blocked_time && <span className="text-muted-foreground text-sm ml-2">{b.blocked_time.slice(0, 5)}</span>}
                    {!b.blocked_time && <span className="text-xs text-yellow-600 ml-2">(cijeli dan)</span>}
                    {b.reason && <span className="text-xs text-muted-foreground/70 ml-2">— {b.reason}</span>}
                  </div>
                  <Button
                    variant="ghost" size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                    onClick={() => deleteBlock(b.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {/* Add block */}
          <div className="border-t border-border p-4 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-3">Blokiraj datum/termin</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input type="date" value={newBlock.date}
                onChange={e => setNewBlock(b => ({ ...b, date: e.target.value }))}
                className="border border-border rounded-md px-3 py-1.5 text-sm bg-background" />
              <input type="time" value={newBlock.time} placeholder="Termin (prazan = cijeli dan)"
                onChange={e => setNewBlock(b => ({ ...b, time: e.target.value }))}
                className="border border-border rounded-md px-3 py-1.5 text-sm bg-background" />
              <input type="text" value={newBlock.reason} placeholder="Razlog (opcionalno)"
                onChange={e => setNewBlock(b => ({ ...b, reason: e.target.value }))}
                className="border border-border rounded-md px-3 py-1.5 text-sm bg-background" />
            </div>
            <Button size="sm" className="mt-2 gap-1.5" onClick={addBlock}>
              <Plus className="w-3.5 h-3.5" /> Blokiraj
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
