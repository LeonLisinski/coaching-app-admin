'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { MessageSquare, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'

interface Message {
  id: string
  name: string
  email: string
  message: string
  status: 'novo' | 'u_obradi' | 'rijeseno'
  created_at: string
  subject?: string
}

const STATUS_LABELS = {
  novo: 'Novo',
  u_obradi: 'U obradi',
  rijeseno: 'Riješeno',
}

const STATUS_COLORS: Record<string, string> = {
  novo: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  u_obradi: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  rijeseno: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
}

export function SupportClient({ messages: initialMessages }: { messages: Message[] }) {
  const [messages, setMessages] = useState(initialMessages)
  const [selected, setSelected] = useState<Message | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [updating, setUpdating] = useState<string | null>(null)

  const supabase = createClient()

  const filtered = filterStatus === 'all'
    ? messages
    : messages.filter((m) => m.status === filterStatus)

  const unreadCount = messages.filter((m) => m.status === 'novo').length

  async function updateStatus(id: string, status: string) {
    setUpdating(id)
    const { error } = await supabase
      .from('contact_messages')
      .update({ status })
      .eq('id', id)

    if (error) {
      toast.error('Greška pri ažuriranju statusa')
    } else {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: status as Message['status'] } : m))
      )
      if (selected?.id === id) {
        setSelected((prev) => prev ? { ...prev, status: status as Message['status'] } : null)
      }
      toast.success('Status ažuriran')
    }
    setUpdating(null)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Support
            {unreadCount > 0 && (
              <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {messages.length} poruka ukupno
          </p>
        </div>
        <Select value={filterStatus} onValueChange={(v) => v != null && setFilterStatus(v)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Sve poruke</SelectItem>
            <SelectItem value="novo">Novo</SelectItem>
            <SelectItem value="u_obradi">U obradi</SelectItem>
            <SelectItem value="rijeseno">Riješeno</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MessageSquare className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {filterStatus === 'all' ? 'Nema poruka' : `Nema poruka sa statusom "${STATUS_LABELS[filterStatus as keyof typeof STATUS_LABELS] ?? filterStatus}"`}
          </p>
          {filterStatus === 'all' && (
            <p className="text-muted-foreground text-xs mt-2 max-w-sm">
              Poruke se prikazuju kada se doda kontakt forma u coaching-app koja upisuje u tablicu <code className="bg-muted px-1 rounded">contact_messages</code>.
            </p>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
          {filtered.map((msg) => (
            <div
              key={msg.id}
              className="flex items-start justify-between gap-4 p-4 hover:bg-accent/30 cursor-pointer transition-colors"
              onClick={() => setSelected(msg)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{msg.name}</span>
                  <span className="text-muted-foreground text-xs">{msg.email}</span>
                </div>
                {msg.subject && (
                  <p className="text-sm font-medium mt-0.5 text-muted-foreground">{msg.subject}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{msg.message}</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {format(new Date(msg.created_at), 'd. M. yyyy HH:mm')}
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-2">
                <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_COLORS[msg.status]}`}>
                  {STATUS_LABELS[msg.status]}
                </span>
                <Select
                  value={msg.status}
                  onValueChange={(v) => {
                      if (v != null) updateStatus(msg.id, v)
                    }}
                >
                  <SelectTrigger
                    className="h-7 text-xs w-32"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="u_obradi">U obradi</SelectItem>
                    <SelectItem value="rijeseno">Riješeno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <a href={`mailto:${selected.email}`} className="text-blue-400 hover:underline">
                      {selected.email}
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Datum</span>
                    <span>{format(new Date(selected.created_at), 'd. M. yyyy. HH:mm')}</span>
                  </div>
                  {selected.subject && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Predmet</span>
                      <span>{selected.subject}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Select
                      value={selected.status}
                      onValueChange={(v) => v != null && updateStatus(selected.id, v)}
                      disabled={!!updating}
                    >
                      <SelectTrigger className="h-8 w-36 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="novo">Novo</SelectItem>
                        <SelectItem value="u_obradi">U obradi</SelectItem>
                        <SelectItem value="rijeseno">Riješeno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Poruka</p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{selected.message}</p>
                </div>
                <a
                  href={`mailto:${selected.email}?subject=Re: ${selected.subject ?? 'Vaša poruka'}`}
                  className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Odgovori emailom →
                </a>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
