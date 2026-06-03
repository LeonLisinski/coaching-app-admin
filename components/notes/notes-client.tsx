'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Plus, Pencil, Trash2, Archive, Calendar, Clock, AlertTriangle,
  ImageIcon, X, Loader2, Check, Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────
type Category = 'web_app' | 'mobile_app' | 'web_site' | 'admin_app' | 'general'

interface Task {
  id: string
  title: string
  description: string | null
  category: Category
  priority: number
  due_date: string | null
  image_url: string | null
  done: boolean
  done_at: string | null
  created_at: string
}

interface Note {
  id: string
  title: string
  description: string | null
  tag: string
  archived: boolean
  created_at: string
}

interface Settings {
  id: boolean
  overdue_enabled: boolean
  overdue_days: number
  reminder_emails: string[]
  digest_enabled: boolean
  digest_priority_min: number
  digest_emails: string[]
  hide_done_after_days: number
}

// ─── Constants ──────────────────────────────────────────────────────────────
const CATEGORIES: { key: Category; label: string; sub: string; color: string; dot: string }[] = [
  { key: 'web_app',    label: 'Web app',      sub: 'trener',   color: 'border-blue-500/40 bg-blue-500/5',    dot: 'bg-blue-500' },
  { key: 'mobile_app', label: 'Mobilna app',  sub: 'klijent',  color: 'border-violet-500/40 bg-violet-500/5', dot: 'bg-violet-500' },
  { key: 'web_site',  label: 'Web stranica',  sub: '',         color: 'border-emerald-500/40 bg-emerald-500/5', dot: 'bg-emerald-500' },
  { key: 'admin_app', label: 'Admin app',     sub: '',         color: 'border-orange-500/40 bg-orange-500/5', dot: 'bg-orange-500' },
  { key: 'general',   label: 'Općenito',      sub: '',         color: 'border-zinc-500/40 bg-zinc-500/5',    dot: 'bg-zinc-400' },
]

// First 4 = main grid, last = general
const GRID_CATS = CATEGORIES.slice(0, 4)
const GENERAL_CAT = CATEGORIES[4]

const NOTE_TAGS = ['Marketing', 'Produkt', 'Tech', 'Ostalo']
const TAG_COLORS: Record<string, string> = {
  Marketing: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  Produkt: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Tech: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  Ostalo: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
}

// Priority 0-10 → color
function priorityStyle(p: number): { bar: string; badge: string; label: string } {
  if (p >= 9) return { bar: 'bg-red-500', badge: 'bg-red-500/20 text-red-300 border-red-500/40', label: 'Kritično' }
  if (p >= 7) return { bar: 'bg-orange-500', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40', label: 'Visok' }
  if (p >= 4) return { bar: 'bg-yellow-500', badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', label: 'Srednji' }
  return { bar: 'bg-emerald-500', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', label: 'Nizak' }
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtDate(ymd: string): string {
  const [y, m, d] = ymd.split('-')
  return `${d}.${m}.${y}.`
}

function dueInfo(due: string | null): { overdue: boolean; today: boolean; days: number } | null {
  if (!due) return null
  const t = todayStr()
  const a = new Date(due + 'T00:00:00').getTime()
  const b = new Date(t + 'T00:00:00').getTime()
  const days = Math.round((a - b) / 86400000)
  return { overdue: days < 0, today: days === 0, days }
}

const emptyTaskForm = {
  id: '',
  title: '',
  description: '',
  category: 'web_app' as Category,
  priority: 5,
  due_date: '',
  image_url: '',
}

// ─── DateInput — must be defined before NotesClient (SSR hoisting issue) ──────
function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [display, setDisplay] = useState(() => {
    if (!value) return ''
    const [y, m, d] = value.split('-')
    return `${d}.${m}.${y}`
  })

  useEffect(() => {
    if (!value) { setDisplay(''); return }
    const [y, m, d] = value.split('-')
    if (y && m && d) setDisplay(`${d}.${m}.${y}`)
  }, [value])

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    let fmt = digits
    if (digits.length > 4) fmt = digits.slice(0, 2) + '.' + digits.slice(2, 4) + '.' + digits.slice(4)
    else if (digits.length > 2) fmt = digits.slice(0, 2) + '.' + digits.slice(2)
    if (raw.endsWith('.') && fmt.length < 6) fmt = fmt + '.'
    setDisplay(fmt)
    if (digits.length === 8) {
      onChange(`${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`)
    } else {
      onChange('')
    }
  }

  return (
    <Input
      value={display}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="dd.mm.yyyy"
      maxLength={10}
      inputMode="numeric"
    />
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function NotesClient({
  tasks: initialTasks,
  notes: initialNotes,
  settings: initialSettings,
}: {
  tasks: Task[]
  notes: Note[]
  settings: Settings | null
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [showDone, setShowDone] = useState(false)

  // Task editor dialog
  const [taskDialog, setTaskDialog] = useState(false)
  const [taskForm, setTaskForm] = useState(emptyTaskForm)
  const [isEditTask, setIsEditTask] = useState(false)
  const [savingTask, setSavingTask] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Task detail dialog
  const [detailTask, setDetailTask] = useState<Task | null>(null)

  // Lightbox
  const [lightbox, setLightbox] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeTaskCount = tasks.filter((t) => !t.done).length

  // ── Task helpers ────────────────────────────────────────────────────────────
  function openNewTask() {
    setTaskForm(emptyTaskForm)
    setIsEditTask(false)
    setTaskDialog(true)
  }

  function openEditTask(task: Task) {
    setTaskForm({
      id: task.id,
      title: task.title,
      description: task.description ?? '',
      category: task.category,
      priority: task.priority,
      due_date: task.due_date ?? '',
      image_url: task.image_url ?? '',
    })
    setIsEditTask(true)
    setDetailTask(null)
    setTaskDialog(true)
  }

  async function uploadImage(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/notes/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Greška kod uploada')
        return
      }
      setTaskForm((f) => ({ ...f, image_url: data.url }))
      toast.success('Slika dodana')
    } catch {
      toast.error('Greška kod uploada')
    } finally {
      setUploading(false)
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          uploadImage(file)
        }
        break
      }
    }
  }

  async function saveTask() {
    if (!taskForm.title.trim()) return
    setSavingTask(true)
    const payload = {
      title: taskForm.title,
      description: taskForm.description,
      category: taskForm.category,
      priority: taskForm.priority,
      due_date: taskForm.due_date || null,
      image_url: taskForm.image_url || null,
    }
    try {
      if (isEditTask) {
        const res = await fetch(`/api/notes/tasks/${taskForm.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || 'Greška'); return }
        setTasks((prev) => prev.map((t) => (t.id === taskForm.id ? data.data : t)))
        toast.success('Zadatak ažuriran')
      } else {
        const res = await fetch('/api/notes/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || 'Greška'); return }
        setTasks((prev) => [data.data, ...prev])
        toast.success('Zadatak dodan')
      }
      setTaskDialog(false)
    } finally {
      setSavingTask(false)
    }
  }

  async function toggleTaskDone(task: Task, done: boolean) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done, done_at: done ? new Date().toISOString() : null } : t)))
    const res = await fetch(`/api/notes/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done }),
    })
    if (!res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !done } : t)))
      toast.error('Greška')
    }
  }

  async function deleteTask(id: string) {
    const res = await fetch(`/api/notes/tasks/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== id))
      setDetailTask(null)
      toast.success('Obrisano')
    } else {
      toast.error('Greška')
    }
  }

  function openNewTaskForCat(cat: Category) {
    setTaskForm({ ...emptyTaskForm, category: cat })
    setIsEditTask(false)
    setTaskDialog(true)
  }

  return (
    <div className="flex flex-col h-dvh p-4 md:p-6 gap-3 w-full overflow-hidden">
      <div className="flex items-start justify-between gap-4 flex-wrap shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Notes</h1>
          <p className="text-sm text-muted-foreground mt-1">Zadaci i bilješke za razvoj UnitLifta</p>
        </div>
        <Button size="sm" onClick={openNewTask} className="gap-1.5 shrink-0">
          <Plus className="w-4 h-4" /> Novi zadatak
        </Button>
      </div>

      <Tabs defaultValue="zadaci" className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between gap-3 flex-wrap shrink-0">
          <TabsList>
            <TabsTrigger value="zadaci">Zadaci ({activeTaskCount})</TabsTrigger>
            <TabsTrigger value="ostalo">Ostalo ({notes.filter((n) => !n.archived).length})</TabsTrigger>
            <TabsTrigger value="postavke">Postavke</TabsTrigger>
          </TabsList>
          <button
            onClick={() => setShowDone((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            {showDone ? 'Sakrij završene' : 'Prikaži završene'}
          </button>
        </div>

        {/* ─── ZADACI ─────────────────────────────────────────────────────────── */}
        <TabsContent value="zadaci" className="mt-3 flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
          {/* 2×2 grid — fixed proportional height (does NOT grow with content) */}
          <div
            className="grid grid-cols-1 gap-3 md:grid-cols-2 flex-[3_3_0%] min-h-0"
            style={{ gridTemplateRows: 'repeat(2, minmax(0, 1fr))' }}
          >
            {GRID_CATS.map((cat) => {
              const catTasks = tasks
                .filter((t) => t.category === cat.key)
                .filter((t) => (showDone ? true : !t.done))
                .sort((a, b) => {
                  if (a.done !== b.done) return a.done ? 1 : -1
                  return b.priority - a.priority
                })
              const activeCount = catTasks.filter((t) => !t.done).length
              return (
                <CategoryCard
                  key={cat.key}
                  cat={cat}
                  activeCount={activeCount}
                  onAdd={() => openNewTaskForCat(cat.key)}
                >
                  {catTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={(done) => toggleTaskDone(task, done)}
                      onOpen={() => setDetailTask(task)}
                      onEdit={() => openEditTask(task)}
                      onDelete={() => deleteTask(task.id)}
                    />
                  ))}
                </CategoryCard>
              )
            })}
          </div>

          {/* Općenito — full-width strip, fixed proportional height */}
          {(() => {
            const genTasks = tasks
              .filter((t) => t.category === GENERAL_CAT.key)
              .filter((t) => (showDone ? true : !t.done))
              .sort((a, b) => {
                if (a.done !== b.done) return a.done ? 1 : -1
                return b.priority - a.priority
              })
            return (
              <div className="flex-[1.2_1.2_0%] min-h-0">
                <CategoryCard
                  cat={GENERAL_CAT}
                  activeCount={genTasks.filter((t) => !t.done).length}
                  onAdd={() => openNewTaskForCat(GENERAL_CAT.key)}
                  wide
                >
                  {genTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={(done) => toggleTaskDone(task, done)}
                      onOpen={() => setDetailTask(task)}
                      onEdit={() => openEditTask(task)}
                      onDelete={() => deleteTask(task.id)}
                    />
                  ))}
                </CategoryCard>
              </div>
            )
          })()}
        </TabsContent>

        {/* ─── OSTALO ─────────────────────────────────────────────────────────── */}
        <TabsContent value="ostalo" className="mt-5">
          <NotesTab notes={notes} setNotes={setNotes} />
        </TabsContent>

        {/* ─── POSTAVKE ───────────────────────────────────────────────────────── */}
        <TabsContent value="postavke" className="mt-5">
          <SettingsTab initial={initialSettings} />
        </TabsContent>
      </Tabs>

      {/* ─── Task editor dialog ─────────────────────────────────────────────── */}
      <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditTask ? 'Uredi zadatak' : 'Novi zadatak'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2" onPaste={handlePaste}>
            <div className="space-y-1.5">
              <Label>Naslov *</Label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Kratki naziv zadatka..."
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label>Opis</Label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Detaljan opis (opcionalno)..."
                className="min-h-[90px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kategorija</Label>
                <Select
                  value={taskForm.category}
                  onValueChange={(v) => v != null && setTaskForm((f) => ({ ...f, category: v as Category }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.label}{c.sub ? ` (${c.sub})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rok (opcionalno)</Label>
                <DateInput
                  value={taskForm.due_date}
                  onChange={(v) => setTaskForm((f) => ({ ...f, due_date: v }))}
                />
              </div>
            </div>

            {/* Priority slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Prioritet</Label>
                <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${priorityStyle(taskForm.priority).badge}`}>
                  {taskForm.priority}/10 · {priorityStyle(taskForm.priority).label}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={taskForm.priority}
                onChange={(e) => setTaskForm((f) => ({ ...f, priority: Number(e.target.value) }))}
                className="w-full accent-primary"
              />
            </div>

            {/* Image */}
            <div className="space-y-1.5">
              <Label>Slika</Label>
              {taskForm.image_url ? (
                <div className="relative group rounded-lg overflow-hidden border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={taskForm.image_url} alt="Prilog" className="w-full max-h-52 object-contain bg-black/20" />
                  <button
                    onClick={() => setTaskForm((f) => ({ ...f, image_url: '' }))}
                    className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-full border border-dashed border-border rounded-lg py-6 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="w-5 h-5" />
                      <span className="text-xs text-center">
                        Kopiraj sliku i pritisni{' '}
                        <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[11px]">Ctrl+V</kbd>
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors mt-0.5"
                      >
                        ili odaberi datoteku
                      </button>
                    </>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadImage(file)
                  e.target.value = ''
                }}
              />
            </div>

            <Button onClick={saveTask} disabled={savingTask || uploading || !taskForm.title.trim()} className="w-full">
              {savingTask ? 'Snima...' : isEditTask ? 'Spremi izmjene' : 'Dodaj zadatak'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Task detail dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!detailTask} onOpenChange={(o) => !o && setDetailTask(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
          {detailTask && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8">{detailTask.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${priorityStyle(detailTask.priority).badge}`}>
                    P{detailTask.priority}/10 · {priorityStyle(detailTask.priority).label}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground">
                    {CATEGORIES.find((c) => c.key === detailTask.category)?.label}
                  </span>
                  {detailTask.due_date && <DueBadge due={detailTask.due_date} />}
                </div>

                {detailTask.description && (
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{detailTask.description}</p>
                )}

                {detailTask.image_url && (
                  <button
                    onClick={() => setLightbox(detailTask.image_url!)}
                    className="block w-full rounded-lg overflow-hidden border border-border bg-black/20 hover:opacity-90 transition-opacity"
                    title="Klikni za povećanje"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={detailTask.image_url} alt="Prilog" className="w-full object-contain max-h-64" />
                  </button>
                )}

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => openEditTask(detailTask)} className="gap-1.5">
                    <Pencil className="w-3.5 h-3.5" /> Uredi
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleTaskDone(detailTask, !detailTask.done).then(() => setDetailTask(null))}
                    className="gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" /> {detailTask.done ? 'Vrati u aktivne' : 'Označi gotovim'}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteTask(detailTask.id)} className="gap-1.5 ml-auto">
                    <Trash2 className="w-3.5 h-3.5" /> Obriši
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Lightbox ──────────────────────────────────────────────────────────── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Povećana slika"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CategoryCard({
  cat, activeCount, onAdd, children, wide,
}: {
  cat: { key: string; label: string; sub: string; color: string; dot: string }
  activeCount: number
  onAdd: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  const hasChildren = Array.isArray(children) ? children.filter(Boolean).length > 0 : !!children
  return (
    <div className={`border rounded-xl flex flex-col h-full min-h-0 ${cat.color} ${wide ? 'col-span-full' : ''}`}>
      {/* Card header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-inherit shrink-0">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cat.dot}`} />
        <span className="font-semibold text-sm">{cat.label}</span>
        {cat.sub && <span className="text-xs text-muted-foreground">({cat.sub})</span>}
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-background/60 border border-border/60 text-muted-foreground tabular-nums">
          {activeCount}
        </span>
        <button
          onClick={onAdd}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/20 transition-colors"
          title="Dodaj zadatak"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* Tasks — scrollable, slim custom scrollbar */}
      <div
        className="overflow-y-auto flex-1 divide-y divide-border/40 min-h-0"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.12) transparent' }}
      >
        {hasChildren
          ? children
          : (
            <p className="text-center text-xs text-muted-foreground py-6">Nema zadataka</p>
          )}
      </div>
    </div>
  )
}

function DueBadge({ due }: { due: string }) {
  const info = dueInfo(due)
  if (!info) return null
  let cls = 'border-border text-muted-foreground'
  let txt = fmtDate(due)
  if (info.overdue) { cls = 'bg-red-500/20 text-red-300 border-red-500/40'; txt = `Rok prošao (${Math.abs(info.days)}d)` }
  else if (info.today) { cls = 'bg-orange-500/20 text-orange-300 border-orange-500/40'; txt = 'Rok danas' }
  else if (info.days <= 3) { cls = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'; txt = `Za ${info.days}d · ${fmtDate(due)}` }
  return (
    <span className={`text-xs px-2 py-0.5 rounded border inline-flex items-center gap-1 ${cls}`}>
      {info.overdue ? <AlertTriangle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
      {txt}
    </span>
  )
}

function TaskRow({ task, onToggle, onOpen, onEdit, onDelete }: {
  task: Task
  onToggle: (done: boolean) => void
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const ps = priorityStyle(task.priority)
  return (
    <div className={`group flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors ${task.done ? 'opacity-50' : ''}`}>
      <div className={`w-1 self-stretch rounded-full ${ps.bar} shrink-0`} />
      <Checkbox checked={task.done} onCheckedChange={(c) => onToggle(!!c)} />
      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
        <span className={`text-sm ${task.done ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className={`text-[10px] px-1.5 py-0 rounded border font-semibold ${ps.badge}`}>P{task.priority}</span>
          {task.due_date && <DueBadge due={task.due_date} />}
          {task.image_url && <ImageIcon className="w-3 h-3 text-muted-foreground" />}
        </div>
      </button>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Ostalo (notes) tab ───────────────────────────────────────────────────────
function NotesTab({ notes, setNotes }: { notes: Note[]; setNotes: React.Dispatch<React.SetStateAction<Note[]>> }) {
  const [dialog, setDialog] = useState(false)
  const [editNote, setEditNote] = useState<Note | null>(null)
  const [form, setForm] = useState({ title: '', description: '', tag: 'Ostalo' })
  const [saving, setSaving] = useState(false)

  const visible = notes.filter((n) => !n.archived)

  function openNew() {
    setEditNote(null)
    setForm({ title: '', description: '', tag: 'Ostalo' })
    setDialog(true)
  }
  function openEdit(n: Note) {
    setEditNote(n)
    setForm({ title: n.title, description: n.description ?? '', tag: n.tag })
    setDialog(true)
  }

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      if (editNote) {
        const res = await fetch(`/api/notes/items/${editNote.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || 'Greška'); return }
        setNotes((prev) => prev.map((n) => (n.id === editNote.id ? data.data : n)))
        toast.success('Ažurirano')
      } else {
        const res = await fetch('/api/notes/items', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || 'Greška'); return }
        setNotes((prev) => [data.data, ...prev])
        toast.success('Dodano')
      }
      setDialog(false)
    } finally {
      setSaving(false)
    }
  }

  async function archive(id: string) {
    const res = await fetch(`/api/notes/items/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: true }),
    })
    if (res.ok) { setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, archived: true } : n))); toast.success('Arhivirano') }
    else toast.error('Greška')
  }

  async function remove(id: string) {
    const res = await fetch(`/api/notes/items/${id}`, { method: 'DELETE' })
    if (res.ok) { setNotes((prev) => prev.filter((n) => n.id !== id)); toast.success('Obrisano') }
    else toast.error('Greška')
  }

  return (
    <div className="space-y-4">
      <Button size="sm" onClick={openNew} className="gap-1.5">
        <Plus className="w-4 h-4" /> Nova bilješka
      </Button>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground text-sm">Nema bilješki. Dodaj prvu!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((note) => (
            <Card key={note.id} className="group relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium ${TAG_COLORS[note.tag] ?? TAG_COLORS.Ostalo}`}>{note.tag}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(note)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => archive(note.id)} className="p-1 text-muted-foreground hover:text-foreground" title="Arhiviraj"><Archive className="w-3.5 h-3.5" /></button>
                    <button onClick={() => remove(note.id)} className="p-1 text-muted-foreground hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <p className="font-semibold text-sm mt-2">{note.title}</p>
              </CardHeader>
              {note.description && (
                <CardContent className="pt-0">
                  <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap">{note.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editNote ? 'Uredi bilješku' : 'Nova bilješka'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Naslov</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Naslov..." autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Opis</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Detalji..." className="min-h-[100px]" />
            </div>
            <div className="space-y-1.5">
              <Label>Tag</Label>
              <Select value={form.tag} onValueChange={(v) => v != null && setForm((f) => ({ ...f, tag: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NOTE_TAGS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={save} disabled={saving || !form.title.trim()} className="w-full">
              {saving ? 'Snima...' : editNote ? 'Spremi izmjene' : 'Dodaj'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Postavke (settings) tab ────────────────────────────────────────────────
function SettingsTab({ initial }: { initial: Settings | null }) {
  const [s, setS] = useState<Settings>(
    initial ?? {
      id: true, overdue_enabled: true, overdue_days: 2,
      reminder_emails: ['leon@unitlift.com', 'leon.lisinski@gmail.com'],
      digest_enabled: false, digest_priority_min: 7, digest_emails: ['leon@unitlift.com'],
      hide_done_after_days: 7,
    }
  )
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/notes/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Greška'); return }
      setS(data.data)
      toast.success('Postavke spremljene')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Overdue reminder */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Podsjetnik za prekoračeni rok</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <Checkbox checked={s.overdue_enabled} onCheckedChange={(c) => setS((p) => ({ ...p, overdue_enabled: !!c }))} />
            <span className="text-sm">Pošalji email kad zadatak prekorači rok</span>
          </label>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Pošalji nakon</span>
            <Input
              type="number" min={0} max={365}
              value={s.overdue_days}
              onChange={(e) => setS((p) => ({ ...p, overdue_days: Number(e.target.value) }))}
              className="w-20"
            />
            <span className="text-muted-foreground">dana od roka</span>
          </div>
          <EmailListEditor
            label="Primatelji podsjetnika"
            emails={s.reminder_emails}
            onChange={(emails) => setS((p) => ({ ...p, reminder_emails: emails }))}
          />
        </CardContent>
      </Card>

      {/* Daily digest */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Dnevni pregled zadataka</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <Checkbox checked={s.digest_enabled} onCheckedChange={(c) => setS((p) => ({ ...p, digest_enabled: !!c }))} />
            <span className="text-sm">Svako jutro pošalji pregled otvorenih zadataka</span>
          </label>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Samo prioritet ≥</span>
            <Input
              type="number" min={0} max={10}
              value={s.digest_priority_min}
              onChange={(e) => setS((p) => ({ ...p, digest_priority_min: Number(e.target.value) }))}
              className="w-20"
            />
          </div>
          <EmailListEditor
            label="Primatelji pregleda"
            emails={s.digest_emails}
            onChange={(emails) => setS((p) => ({ ...p, digest_emails: emails }))}
          />
        </CardContent>
      </Card>

      {/* Hide completed */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <Check className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Sakrivanje završenih</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Završeni zadaci se ne brišu, ali možeš ih sakriti gumbom "Prikaži/Sakrij završene" u tabu Zadaci.</span>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
        {saving ? 'Snima...' : 'Spremi postavke'}
      </Button>
      <p className="text-xs text-muted-foreground">
        Podsjetnici se šalju automatski svako jutro (cron). Provjeri da je <code className="text-foreground/70">CRON_SECRET</code> postavljen u Vercel okruženju.
      </p>
    </div>
  )
}

function EmailListEditor({ label, emails, onChange }: {
  label: string; emails: string[]; onChange: (emails: string[]) => void
}) {
  const [draft, setDraft] = useState('')

  function add() {
    const e = draft.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { toast.error('Neispravan email'); return }
    if (emails.includes(e)) { setDraft(''); return }
    onChange([...emails, e])
    setDraft('')
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {emails.map((e) => (
          <span key={e} className="text-xs px-2 py-1 rounded-md bg-muted border border-border inline-flex items-center gap-1.5">
            {e}
            <button onClick={() => onChange(emails.filter((x) => x !== e))} className="text-muted-foreground hover:text-red-400">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {emails.length === 0 && <span className="text-xs text-muted-foreground">Nema primatelja</span>}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="dodaj@email.com"
          className="flex-1"
        />
        <Button variant="outline" size="sm" onClick={add} type="button">Dodaj</Button>
      </div>
    </div>
  )
}
