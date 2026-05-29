'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Mail, Send, Users, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface Campaign {
  id: string
  subject: string
  segment: string
  recipient_count: number
  sent_at: string
}

const SEGMENTS = [
  { value: 'all', label: 'Svi treneri', group: 'all' },
  { value: 'starter', label: 'Starter', group: 'plan' },
  { value: 'pro', label: 'Pro', group: 'plan' },
  { value: 'scale', label: 'Scale', group: 'plan' },
  { value: 'ambassador', label: 'Ambasadori', group: 'plan' },
  { value: 'active', label: 'Aktivni', group: 'status' },
  { value: 'inactive', label: 'Neaktivni', group: 'status' },
]

export function MailerClient({ campaigns: initialCampaigns }: { campaigns: Campaign[] }) {
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [segment, setSegment] = useState('all')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [counts, setCounts] = useState<Record<string, number | null>>({})
  const [sending, setSending] = useState(false)

  const recipientCount = counts[segment] ?? null

  useEffect(() => {
    let cancelled = false
    Promise.all(
      SEGMENTS.map(async (s) => {
        try {
          const res = await fetch(`/api/mailer/count?segment=${s.value}`)
          const data = await res.json()
          return [s.value, data.count ?? 0] as const
        } catch {
          return [s.value, null] as const
        }
      })
    ).then((entries) => {
      if (!cancelled) setCounts(Object.fromEntries(entries))
    })
    return () => { cancelled = true }
  }, [])

  async function handleSend() {
    if (!subject.trim() || !body.trim()) {
      toast.error('Unesi subject i tijelo maila')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/mailer/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segment, subject, body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Greška')
      toast.success(`Poslano ${data.sent} primatelja`)
      setCampaigns((prev) => [data.campaign, ...prev])
      setSubject('')
      setBody('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Greška pri slanju')
    }
    setSending(false)
  }

  const groups: { key: string; title: string }[] = [
    { key: 'all', title: 'Svi' },
    { key: 'plan', title: 'Po paketu' },
    { key: 'status', title: 'Po statusu' },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mailer</h1>
        <p className="text-muted-foreground text-sm mt-1">Pošalji email kampanju trenerima</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova kampanja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            <Label>Kome šalješ</Label>
            {groups.map((g) => (
              <div key={g.key} className="space-y-1.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">{g.title}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SEGMENTS.filter((s) => s.group === g.key).map((s) => {
                    const selected = segment === s.value
                    const count = counts[s.value]
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setSegment(s.value)}
                        className={`relative flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors ${
                          selected
                            ? 'border-primary/50 bg-primary/10'
                            : 'border-border bg-card hover:bg-accent/40'
                        }`}
                      >
                        {selected && <Check className="absolute top-2 right-2 w-3.5 h-3.5 text-primary" />}
                        <span className="text-sm font-medium">{s.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {count == null ? '…' : `${count} ${count === 1 ? 'primatelj' : 'primatelja'}`}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2 text-sm pt-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Odabrano:</span>
              <span className="font-semibold">
                {recipientCount == null ? '…' : `${recipientCount} primatelja`}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Npr. Nova funkcionalnost u UnitLiftu..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Tijelo maila</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Dragi treneru,&#10;&#10;Pišemo vam jer..."
              className="min-h-[200px] font-mono text-sm resize-y"
            />
            <p className="text-xs text-muted-foreground">
              Podržava plain text. Koristi prazne redove za paragrafe.
            </p>
          </div>

          <Button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !body.trim()}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Šalje se...' : 'Pošalji kampanju'}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-base font-semibold mb-3">Poslane kampanje</h2>
        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-lg">
            <Mail className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-sm">Još nema poslanih kampanja</p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="hidden md:grid grid-cols-[1fr_1fr_100px_100px] gap-4 px-4 py-2.5 bg-muted/40 text-xs font-medium text-muted-foreground border-b border-border">
              <span>Subject</span>
              <span>Segment</span>
              <span>Primatelja</span>
              <span>Datum</span>
            </div>
            <div className="divide-y divide-border">
              {campaigns.map((c) => (
                <div key={c.id} className="hidden md:grid grid-cols-[1fr_1fr_100px_100px] gap-4 px-4 py-3 items-center text-sm">
                  <span className="font-medium truncate">{c.subject}</span>
                  <span className="text-muted-foreground">
                    {SEGMENTS.find((s) => s.value === c.segment)?.label ?? c.segment}
                  </span>
                  <span className="text-muted-foreground">{c.recipient_count}</span>
                  <span className="text-muted-foreground text-xs">
                    {format(new Date(c.sent_at), 'd. M. yy')}
                  </span>
                </div>
              ))}
              {campaigns.map((c) => (
                <div key={`mob-${c.id}`} className="md:hidden px-4 py-3 space-y-1">
                  <p className="font-medium text-sm">{c.subject}</p>
                  <p className="text-muted-foreground text-xs">
                    {SEGMENTS.find((s) => s.value === c.segment)?.label ?? c.segment} · {c.recipient_count} primatelja · {format(new Date(c.sent_at), 'd. M. yy')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
