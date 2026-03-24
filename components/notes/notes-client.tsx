'use client'

import { useState } from 'react'
import { Plus, Archive, Pencil, Trash2, Check } from 'lucide-react'
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
import { createClient } from '@/lib/supabase'

interface Note {
  id: string
  title: string
  description: string
  tag: string
  archived: boolean
  created_at: string
}

interface Task {
  id: string
  text: string
  priority: 'visok' | 'srednji' | 'nizak'
  done: boolean
  created_at: string
}

const NOTE_TAGS = ['Marketing', 'Produkt', 'Tech', 'Ostalo']

const PRIORITY_ORDER: Record<string, number> = { visok: 0, srednji: 1, nizak: 2 }

const PRIORITY_COLORS: Record<string, string> = {
  visok: 'bg-red-500/20 text-red-300 border-red-500/30',
  srednji: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  nizak: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
}

const TAG_COLORS: Record<string, string> = {
  Marketing: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  Produkt: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Tech: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  Ostalo: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
}

export function NotesClient({ notes: initialNotes, tasks: initialTasks }: { notes: Note[]; tasks: Task[] }) {
  const [notes, setNotes] = useState(initialNotes)
  const [tasks, setTasks] = useState(initialTasks)
  const [taskFilter, setTaskFilter] = useState<'sve' | 'aktivni' | 'dovrseni'>('sve')
  const [noteDialog, setNoteDialog] = useState(false)
  const [editNote, setEditNote] = useState<Note | null>(null)
  const [noteForm, setNoteForm] = useState({ title: '', description: '', tag: 'Ostalo' })
  const [savingNote, setSavingNote] = useState(false)
  const [newTaskText, setNewTaskText] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('srednji')
  const [savingTask, setSavingTask] = useState(false)

  const supabase = createClient()

  const visibleNotes = notes.filter((n) => !n.archived)

  const filteredTasks = tasks
    .filter((t) => {
      if (taskFilter === 'aktivni') return !t.done
      if (taskFilter === 'dovrseni') return t.done
      return true
    })
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

  function openNewNote() {
    setEditNote(null)
    setNoteForm({ title: '', description: '', tag: 'Ostalo' })
    setNoteDialog(true)
  }

  function openEditNote(note: Note) {
    setEditNote(note)
    setNoteForm({ title: note.title, description: note.description, tag: note.tag })
    setNoteDialog(true)
  }

  async function saveNote() {
    if (!noteForm.title.trim()) return
    setSavingNote(true)

    if (editNote) {
      const { error } = await supabase
        .from('admin_notes')
        .update({ title: noteForm.title, description: noteForm.description, tag: noteForm.tag })
        .eq('id', editNote.id)

      if (error) {
        toast.error('Greška')
      } else {
        setNotes((prev) => prev.map((n) => n.id === editNote.id ? { ...n, ...noteForm } : n))
        toast.success('Bilješka ažurirana')
        setNoteDialog(false)
      }
    } else {
      const { data, error } = await supabase
        .from('admin_notes')
        .insert({ ...noteForm, archived: false })
        .select()
        .single()

    if (error) {
      toast.error(`Greška: ${error.message}`)
    } else {
      setNotes((prev) => [data, ...prev])
      toast.success('Bilješka dodana')
      setNoteDialog(false)
    }
    }
    setSavingNote(false)
  }

  async function archiveNote(id: string) {
    const { error } = await supabase.from('admin_notes').update({ archived: true }).eq('id', id)
    if (error) {
      toast.error('Greška')
    } else {
      setNotes((prev) => prev.map((n) => n.id === id ? { ...n, archived: true } : n))
      toast.success('Arhivirano')
    }
  }

  async function deleteNote(id: string) {
    const { error } = await supabase.from('admin_notes').delete().eq('id', id)
    if (error) {
      toast.error('Greška')
    } else {
      setNotes((prev) => prev.filter((n) => n.id !== id))
      toast.success('Obrisano')
    }
  }

  async function addTask() {
    if (!newTaskText.trim()) return
    setSavingTask(true)

    const { data, error } = await supabase
      .from('admin_tasks')
      .insert({ text: newTaskText.trim(), priority: newTaskPriority, done: false })
      .select()
      .single()

    if (error) {
      toast.error('Greška')
    } else {
      setTasks((prev) => [data, ...prev])
      setNewTaskText('')
      setNewTaskPriority('srednji')
    }
    setSavingTask(false)
  }

  async function toggleTask(id: string, done: boolean) {
    const { error } = await supabase.from('admin_tasks').update({ done }).eq('id', id)
    if (!error) {
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done } : t))
    }
  }

  async function deleteTask(id: string) {
    const { error } = await supabase.from('admin_tasks').delete().eq('id', id)
    if (!error) {
      setTasks((prev) => prev.filter((t) => t.id !== id))
    }
  }

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-2xl font-bold">Notes</h1>

      <Tabs defaultValue="ideje">
        <TabsList>
          <TabsTrigger value="ideje">Ideje ({visibleNotes.length})</TabsTrigger>
          <TabsTrigger value="zadaci">Zadaci ({tasks.filter((t) => !t.done).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="ideje" className="mt-5 space-y-4">
          <Button size="sm" onClick={openNewNote} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova ideja
          </Button>

          {visibleNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-lg">
              <p className="text-muted-foreground text-sm">Nema aktivnih ideja. Dodaj prvu!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleNotes.map((note) => (
                <Card key={note.id} className="group relative">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${TAG_COLORS[note.tag] ?? TAG_COLORS.Ostalo}`}>
                        {note.tag}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditNote(note)}
                          className="p-1 hover:text-foreground text-muted-foreground transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => archiveNote(note.id)}
                          className="p-1 hover:text-foreground text-muted-foreground transition-colors"
                          title="Arhiviraj"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="p-1 hover:text-red-400 text-muted-foreground transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="font-semibold text-sm mt-2">{note.title}</p>
                  </CardHeader>
                  {note.description && (
                    <CardContent className="pt-0">
                      <p className="text-muted-foreground text-xs leading-relaxed">{note.description}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="zadaci" className="mt-5 space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Novi zadatak..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              className="flex-1"
            />
            <Select value={newTaskPriority} onValueChange={(v) => v != null && setNewTaskPriority(v as Task['priority'])}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visok">Visok</SelectItem>
                <SelectItem value="srednji">Srednji</SelectItem>
                <SelectItem value="nizak">Nizak</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addTask} disabled={savingTask || !newTaskText.trim()} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            {(['sve', 'aktivni', 'dovrseni'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTaskFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                  taskFilter === f
                    ? 'bg-accent border-accent-foreground/20 text-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm border border-dashed border-border rounded-lg">
              Nema zadataka
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border border-border transition-opacity ${task.done ? 'opacity-50' : ''}`}
                >
                  <Checkbox
                    checked={task.done}
                    onCheckedChange={(checked) => toggleTask(task.id, !!checked)}
                  />
                  <span className={`flex-1 text-sm ${task.done ? 'line-through text-muted-foreground' : ''}`}>
                    {task.text}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium ${PRIORITY_COLORS[task.priority]}`}>
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </span>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editNote ? 'Uredi bilješku' : 'Nova ideja'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Naslov</Label>
              <Input
                value={noteForm.title}
                onChange={(e) => setNoteForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Naslov ideje..."
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Opis</Label>
              <Textarea
                value={noteForm.description}
                onChange={(e) => setNoteForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Detalji..."
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Tag</Label>
              <Select value={noteForm.tag} onValueChange={(v) => v != null && setNoteForm((f) => ({ ...f, tag: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_TAGS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={saveNote} disabled={savingNote || !noteForm.title.trim()} className="w-full">
              {savingNote ? 'Snima...' : editNote ? 'Spremi izmjene' : 'Dodaj ideju'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
