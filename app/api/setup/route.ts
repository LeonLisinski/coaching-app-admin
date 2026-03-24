import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createAdminClient()

  // Check which tables are missing
  const tables = ['admin_notes', 'admin_tasks', 'bug_log', 'contact_messages', 'mailer_campaigns']
  const missing: string[] = []

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1)
    if (error?.code === '42P01') {
      missing.push(table)
    }
  }

  return NextResponse.json({
    ok: missing.length === 0,
    missing,
    message: missing.length === 0
      ? 'Sve tablice postoje.'
      : `Nedostaju tablice: ${missing.join(', ')}. Pokreni SQL migraciju u Supabase Dashboard → SQL Editor.`,
    sql_file: 'supabase/migrations/001_admin_tables.sql',
    dashboard_url: `https://supabase.com/dashboard/project/nvlrlubvxelrwdzggmno/sql/new`,
  })
}
