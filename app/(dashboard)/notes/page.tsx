export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { NotesClient } from '@/components/notes/notes-client'

export default async function NotesPage() {
  const supabase = await createClient()

  const [{ data: notes }, { data: tasks }] = await Promise.all([
    supabase.from('admin_notes').select('*').order('created_at', { ascending: false }),
    supabase.from('admin_tasks').select('*').order('created_at', { ascending: false }),
  ])

  return <NotesClient notes={notes ?? []} tasks={tasks ?? []} />
}
