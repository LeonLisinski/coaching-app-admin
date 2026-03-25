'use client'

import { useState } from 'react'
import { Link2, KeyRound, Terminal, FileText, Plus, Eye, EyeOff, Copy, Check, Pencil, Trash2, ExternalLink, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

type Category = 'link' | 'auth' | 'api' | 'note'

interface VaultItem {
  id: string
  title: string
  category: Category
  url: string | null
  username: string | null
  password: string | null
  notes: string | null
  created_at: string
}

const CATEGORIES: { value: Category; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'link', label: 'Linkovi', icon: Link2, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { value: 'auth', label: 'Prijave', icon: KeyRound, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  { value: 'api', label: 'API ključevi', icon: Terminal, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  { value: 'note', label: 'Napomene', icon: FileText, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
]

function categoryMeta(cat: Category) {
  return CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[0]
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function SecretField({ value, label }: { value: string; label: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}:</span>
      <span className="font-mono text-xs truncate flex-1">
        {visible ? value : '••••••••••••'}
      </span>
      <button onClick={() => setVisible(v => !v)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0">
        {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
      <CopyButton value={value} />
    </div>
  )
}

const EMPTY_FORM = { title: '', category: 'link' as Category, url: '', username: '', password: '', notes: '' }

export function SefClient({ initialItems }: { initialItems: VaultItem[] }) {
  const [items, setItems] = useState<VaultItem[]>(initialItems)
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editItem, setEditItem] = useState<VaultItem | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filtered = items.filter(item => {
    const matchCat = filter === 'all' || item.category === filter
    const q = search.toLowerCase()
    const matchSearch = !q || item.title.toLowerCase().includes(q) || item.url?.toLowerCase().includes(q) || item.notes?.toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: filtered.filter(i => i.category === cat.value),
  })).filter(g => g.items.length > 0)

  function openAdd() {
    setEditItem(null)
    setForm(EMPTY_FORM)
    setSheetOpen(true)
  }

  function openEdit(item: VaultItem) {
    setEditItem(item)
    setForm({
      title: item.title,
      category: item.category,
      url: item.url ?? '',
      username: item.username ?? '',
      password: item.password ?? '',
      notes: item.notes ?? '',
    })
    setSheetOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        url: form.url.trim() || null,
        username: form.username.trim() || null,
        password: form.password.trim() || null,
        notes: form.notes.trim() || null,
      }

      if (editItem) {
        const res = await fetch('/api/vault', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editItem.id, ...payload }) })
        const updated = await res.json()
        setItems(prev => prev.map(i => i.id === editItem.id ? updated : i))
      } else {
        const res = await fetch('/api/vault', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const created = await res.json()
        setItems(prev => [created, ...prev])
      }
      setSheetOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch('/api/vault', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      setItems(prev => prev.filter(i => i.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sef</h1>
          <p className="text-muted-foreground text-sm mt-1">Linkovi, prijave, API ključevi i napomene</p>
        </div>
        <Button onClick={openAdd} size="sm" className="shrink-0">
          <Plus className="w-4 h-4 mr-1.5" /> Dodaj
        </Button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Pretraži..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${filter === 'all' ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}
          >
            Sve ({items.length})
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors flex items-center gap-1.5 ${filter === cat.value ? `${cat.color} font-semibold` : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              <cat.icon className="w-3 h-3" />
              {cat.label} ({items.filter(i => i.category === cat.value).length})
            </button>
          ))}
        </div>
      </div>

      {/* Groups */}
      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3 border border-dashed border-border rounded-xl">
          <KeyRound className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">Nema unosa. Dodaj prvi!</p>
          <Button onClick={openAdd} size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-1.5" /> Dodaj unos
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.value}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${group.color}`}>
                  <group.icon className="w-3 h-3" />
                  {group.label}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {group.items.map(item => (
                  <VaultCard
                    key={item.id}
                    item={item}
                    onEdit={() => openEdit(item)}
                    onDelete={() => handleDelete(item.id)}
                    deleting={deletingId === item.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-5 border-b border-border">
            <SheetTitle className="text-lg">{editItem ? 'Uredi unos' : 'Novi unos'}</SheetTitle>
          </SheetHeader>

          <div className="space-y-5 pt-5">
            {/* Category picker */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kategorija</Label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, category: c.value }))}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      form.category === c.value
                        ? `${c.color} ring-1 ring-current`
                        : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
                    }`}
                  >
                    <c.icon className="w-4 h-4 shrink-0" />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Naziv <span className="text-red-400">*</span>
              </Label>
              <Input
                placeholder="npr. Vercel, Stripe Dashboard, Resend..."
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                autoFocus
              />
            </div>

            {/* URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">URL</Label>
              <Input
                placeholder="https://..."
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              />
            </div>

            {/* Auth/API fields */}
            {(form.category === 'auth' || form.category === 'api') && (
              <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {form.category === 'api' ? 'API detalji' : 'Podaci za prijavu'}
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {form.category === 'api' ? 'Ime / email / opis' : 'Korisničko ime / email'}
                  </Label>
                  <Input
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {form.category === 'api' ? 'API ključ / secret' : 'Lozinka'}
                  </Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Napomene</Label>
              <Textarea
                className="resize-none"
                rows={3}
                placeholder="Bilo što korisno — plan, upute, linkovi..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="flex-1"
              >
                {saving ? 'Sprema...' : editItem ? 'Spremi izmjene' : 'Dodaj unos'}
              </Button>
              <Button variant="outline" size="icon" onClick={() => setSheetOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function VaultCard({ item, onEdit, onDelete, deleting }: { item: VaultItem; onEdit: () => void; onDelete: () => void; deleting: boolean }) {
  const meta = categoryMeta(item.category)

  return (
    <Card className="border-border hover:border-muted-foreground/30 transition-colors">
      <CardContent className="p-4 space-y-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`shrink-0 p-1.5 rounded-md border ${meta.color}`}>
              <meta.icon className="w-3.5 h-3.5" />
            </span>
            <span className="font-semibold text-sm truncate">{item.title}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onEdit} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* URL */}
        {item.url && (
          <div className="flex items-center gap-1.5 min-w-0">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 truncate flex-1 hover:underline"
            >
              {item.url}
            </a>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground">
              <ExternalLink className="w-3 h-3" />
            </a>
            <CopyButton value={item.url} />
          </div>
        )}

        {/* Username */}
        {item.username && (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs text-muted-foreground shrink-0">User:</span>
            <span className="text-xs truncate flex-1">{item.username}</span>
            <CopyButton value={item.username} />
          </div>
        )}

        {/* Password / API key */}
        {item.password && (
          <SecretField value={item.password} label={item.category === 'api' ? 'Key' : 'Pass'} />
        )}

        {/* Notes */}
        {item.notes && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 border-t border-border pt-2 mt-1">
            {item.notes}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
