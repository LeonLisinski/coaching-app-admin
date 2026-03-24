'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Bug, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'

interface BugEntry {
  id: string
  title: string
  description: string
  location: string
  priority: 'visok' | 'srednji' | 'nizak'
  status: 'otvoren' | 'u_radu' | 'riješen'
  created_at: string
}

const PRIORITY_COLORS: Record<string, string> = {
  visok: 'bg-red-500/20 text-red-300 border-red-500/30',
  srednji: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  nizak: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
}

const STATUS_COLORS: Record<string, string> = {
  otvoren: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  u_radu: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  riješen: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
}

const LOCATIONS = [
  'app.unitlift.com',
  'mobilna aplikacija',
  'web stranica (unitlift.com)',
  'admin dashboard',
  'ostalo',
]

export function BugoviClient({ bugs: initialBugs }: { bugs: BugEntry[] }) {
  const [bugs, setBugs] = useState(initialBugs)
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: LOCATIONS[0],
    priority: 'srednji' as BugEntry['priority'],
  })
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  const filtered = bugs.filter((b) => {
    if (priorityFilter !== 'all' && b.priority !== priorityFilter) return false
    if (statusFilter !== 'all' && b.status !== statusFilter) return false
    return true
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)

    const { data, error } = await supabase
      .from('bug_log')
      .insert({ ...form, status: 'otvoren' })
      .select()
      .single()

    if (error) {
      toast.error('Greška pri unosu buga')
    } else {
      setBugs((prev) => [data, ...prev])
      setForm({ title: '', description: '', location: LOCATIONS[0], priority: 'srednji' })
      setOpen(false)
      toast.success('Bug zabilježen')
    }
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(id)
    const { error } = await supabase.from('bug_log').update({ status }).eq('id', id)
    if (error) {
      toast.error('Greška')
    } else {
      setBugs((prev) => prev.map((b) => b.id === id ? { ...b, status: status as BugEntry['status'] } : b))
    }
    setUpdating(null)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bug Log</h1>
          <p className="text-muted-foreground text-sm mt-1">{bugs.length} zabilježenih bugova</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" />
            Novi bug
          </Button>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Unesi novi bug</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Naziv</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Kratki opis problema..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Opis</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Detaljan opis, koraci za reprodukciju..."
                  className="min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lokacija</Label>
                  <Select value={form.location} onValueChange={(v) => setForm((f) => ({ ...f, location: v ?? LOCATIONS[0] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioritet</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => v != null && setForm((f) => ({ ...f, priority: v as BugEntry['priority'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visok">Visok</SelectItem>
                      <SelectItem value="srednji">Srednji</SelectItem>
                      <SelectItem value="nizak">Nizak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? 'Snima...' : 'Zabilježi bug'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={priorityFilter} onValueChange={(v) => v && setPriorityFilter(v)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Prioritet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Svi prioriteti</SelectItem>
            <SelectItem value="visok">Visok</SelectItem>
            <SelectItem value="srednji">Srednji</SelectItem>
            <SelectItem value="nizak">Nizak</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Svi statusi</SelectItem>
            <SelectItem value="otvoren">Otvoren</SelectItem>
            <SelectItem value="u_radu">U radu</SelectItem>
            <SelectItem value="riješen">Riješen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-lg">
          <Bug className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">Nema bugova. Izvrsno!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((bug) => (
            <div key={bug.id} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{bug.title}</p>
                  {bug.description && (
                    <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{bug.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${PRIORITY_COLORS[bug.priority]}`}>
                      {bug.priority.charAt(0).toUpperCase() + bug.priority.slice(1)}
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border">
                      {bug.location}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(bug.created_at), 'd. M. yyyy')}
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  <Select
                    value={bug.status}
                    onValueChange={(v) => v != null && updateStatus(bug.id, v)}
                    disabled={updating === bug.id}
                  >
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="otvoren">Otvoren</SelectItem>
                      <SelectItem value="u_radu">U radu</SelectItem>
                      <SelectItem value="riješen">Riješen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_COLORS[bug.status]}`}>
                  {bug.status === 'riješen' ? 'Riješen' : bug.status === 'u_radu' ? 'U radu' : 'Otvoren'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
