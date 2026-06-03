import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

const BUCKET = 'admin-task-images'
const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

// POST /api/notes/upload — upload a task image (used by CTRL+V paste or file picker)
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Nedostaje datoteka' }, { status: 400 })
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'Nepodržan format slike' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Slika je prevelika (max 10MB)' }, { status: 400 })
  }

  const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const db = createAdminClient()
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await db.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: pub } = db.storage.from(BUCKET).getPublicUrl(path)
  return NextResponse.json({ url: pub.publicUrl, path })
}
