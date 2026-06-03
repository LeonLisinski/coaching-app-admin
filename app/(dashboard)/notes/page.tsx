export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase-admin'
import { NotesClient } from '@/components/notes/notes-client'

export default async function NotesPage() {
  const supabase = createAdminClient()

  const [{ data: tasks }, { data: notes }, { data: settings }] = await Promise.all([
    supabase.from('admin_tasks').select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('admin_notes').select('*').order('created_at', { ascending: false }),
    supabase.from('admin_task_settings').select('*').eq('id', true).single(),
  ])

  return (
    <NotesClient
      tasks={tasks ?? []}
      notes={notes ?? []}
      settings={settings ?? null}
    />
  )
}
