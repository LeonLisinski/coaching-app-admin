export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { BugoviClient } from '@/components/bugovi/bugovi-client'

export default async function BugoviPage() {
  const supabase = await createClient()

  const { data: bugs } = await supabase
    .from('bug_log')
    .select('*')
    .order('status', { ascending: true }) // otvoren first
    .order('priority', { ascending: true }) // visok first (alphabetical: nizak, srednji, visok — we sort client-side)
    .order('created_at', { ascending: false })

  // Sort: open visok first, then open srednji, then open nizak, then u_radu, then riješen
  const PRIORITY_ORDER: Record<string, number> = { visok: 0, srednji: 1, nizak: 2 }
  const STATUS_ORDER: Record<string, number> = { otvoren: 0, u_radu: 1, 'riješen': 2 }

  const sorted = (bugs ?? []).sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
    if (statusDiff !== 0) return statusDiff
    return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
  })

  return <BugoviClient bugs={sorted} />
}
