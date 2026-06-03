'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { CalendarDays, Check, X, Clock, ChevronRight, Trash2 } from 'lucide-react'
import Link from 'next/link'

type Booking = {
  id: string
  booking_date: string
  booking_time: string
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled'
  name: string
  email: string
  num_clients: number | null
  current_tool: string | null
  message: string | null
  locale: string
  admin_note: string | null
  created_at: string
}

const STATUS_LABEL: Record<string, string> = {
  pending:   'Na čekanju',
  confirmed: 'Potvrđeno',
  rejected:  'Odbijeno',
  cancelled: 'Otkazano',
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  rejected:  'bg-red-50 text-red-600 border-red-200',
  cancelled: 'bg-gray-50 text-gray-500 border-gray-200',
}

const LEFT_BORDER: Record<string, string> = {
  pending:   'border-l-yellow-400',
  confirmed: 'border-l-green-500',
  rejected:  'border-l-red-400',
  cancelled: 'border-l-gray-300',
}

function fmtDT(date: string, time: string) {
  try {
    const t = time.slice(0, 5)
    return new Date(`${date}T${t}:00`).toLocaleString('hr-HR', {
      timeZone: 'Europe/Zagreb',
      weekday: 'short', day: 'numeric', month: 'short',
      year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return `${date} ${time.slice(0, 5)}` }
}

export function PrezentacijeClient({ bookings: initial }: { bookings: Booking[] }) {
  const [bookings, setBookings] = useState(initial)
  const [filter,   setFilter]   = useState<string>('all')
  const [acting,      setActing]      = useState<string | null>(null)
  const [noteFor,     setNoteFor]     = useState<string | null>(null)
  const [note,        setNote]        = useState('')
  const [confirmDel,  setConfirmDel]  = useState<string | null>(null)

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  const counts = {
    all:       bookings.length,
    pending:   bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    rejected:  bookings.filter(b => b.status === 'rejected').length,
  }

  async function deleteBooking(id: string) {
    setActing(id)
    try {
      const res = await fetch(`/api/prezentacije/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setBookings(bs => bs.filter(b => b.id !== id))
      toast.success('Zahtjev obrisan.')
    } catch {
      toast.error('Greška pri brisanju.')
    } finally {
      setActing(null)
      setConfirmDel(null)
    }
  }

  async function act(id: string, action: 'confirm' | 'reject') {
    setActing(id)
    try {
      const res = await fetch(`/api/prezentacije/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminNote: note }),
      })
      if (!res.ok) throw new Error()
      const newStatus = action === 'confirm' ? 'confirmed' : 'rejected'
      setBookings(bs => bs.map(b => b.id === id ? { ...b, status: newStatus as Booking['status'], admin_note: note || b.admin_note } : b))
      toast.success(action === 'confirm' ? 'Termin potvrđen — email poslan.' : 'Zahtjev odbijen — email poslan.')
      setNoteFor(null)
      setNote('')
    } catch {
      toast.error('Greška. Pokušaj ponovo.')
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Prezentacije
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Zahtjevi za besplatnu prezentaciju</p>
        </div>
        <Link href="/prezentacije/dostupnost">
          <Button variant="outline" size="sm" className="gap-2">
            <Clock className="w-4 h-4" />
            Dostupnost
            <ChevronRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(['all', 'pending', 'confirmed', 'rejected'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
              filter === f
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground border-border hover:bg-accent'
            }`}
          >
            {f === 'all' ? 'Sve' : STATUS_LABEL[f]}
            <span className="ml-1.5 text-xs opacity-60">({counts[f]})</span>
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Nema zahtjeva za odabrani filter.
        </div>
      ) : (
        <div className="flex flex-col gap-3 overflow-y-auto max-h-[60vh] md:max-h-[65vh]">
          {filtered.map(b => (
            <div
              key={b.id}
              className={`border border-border border-l-4 ${LEFT_BORDER[b.status]} rounded-lg p-4 bg-card`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div>
                  <span className="font-semibold text-sm">{b.name}</span>
                  <span className="text-muted-foreground text-sm ml-2">{b.email}</span>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${STATUS_COLORS[b.status]}`}>
                  {STATUS_LABEL[b.status]}
                </span>
              </div>

              <p className="text-sm font-medium mb-1">
                🗓 {fmtDT(b.booking_date, b.booking_time)}
              </p>

              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mb-2">
                {b.num_clients != null && <span>Klijenata: <b>{b.num_clients}</b></span>}
                {b.current_tool && <span>Alat: <b>{b.current_tool}</b></span>}
                {b.locale && <span>{b.locale.toUpperCase()}</span>}
              </div>

              {b.message && (
                <p className="text-xs text-muted-foreground italic mb-2 border-l-2 border-border pl-2">{b.message}</p>
              )}

              {b.admin_note && (
                <p className="text-xs text-violet-600 mb-2">Napomena: {b.admin_note}</p>
              )}

              <p className="text-[11px] text-muted-foreground/60 mb-3">
                {new Date(b.created_at).toLocaleDateString('hr-HR')} · {b.id.slice(0, 8)}
              </p>

              <div className="flex flex-wrap gap-2 items-center justify-between">
                {/* Confirm / reject — only for pending */}
                <div className="flex flex-wrap gap-2 items-start">
                  {b.status === 'pending' && (
                    <>
                      {noteFor === b.id && (
                        <input
                          className="flex-1 min-w-[160px] text-sm border border-border rounded-md px-3 py-1.5 bg-background"
                          placeholder="Interna napomena (opcionalno)"
                          value={note}
                          onChange={e => setNote(e.target.value)}
                        />
                      )}
                      <Button
                        variant="outline" size="sm"
                        onClick={() => { setNoteFor(noteFor === b.id ? null : b.id); setNote('') }}
                      >
                        {noteFor === b.id ? 'Odustani' : '+ Napomena'}
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                        disabled={!!acting}
                        onClick={() => act(b.id, 'confirm')}
                      >
                        <Check className="w-3.5 h-3.5" />
                        {acting === b.id ? '...' : 'Potvrdi'}
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
                        disabled={!!acting}
                        onClick={() => act(b.id, 'reject')}
                      >
                        <X className="w-3.5 h-3.5" />
                        {acting === b.id ? '...' : 'Odbij'}
                      </Button>
                    </>
                  )}
                </div>

                {/* Delete — always visible, with inline confirm */}
                <div className="flex items-center gap-2 ml-auto">
                  {confirmDel === b.id ? (
                    <>
                      <span className="text-xs text-muted-foreground">Obrisati?</span>
                      <Button
                        size="sm" variant="destructive"
                        disabled={!!acting}
                        onClick={() => deleteBooking(b.id)}
                        className="gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {acting === b.id ? '...' : 'Da, obriši'}
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        onClick={() => setConfirmDel(null)}
                      >
                        Odustani
                      </Button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDel(b.id)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Obriši zahtjev"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
