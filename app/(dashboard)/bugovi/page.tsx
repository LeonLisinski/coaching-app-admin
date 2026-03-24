export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { BugoviClient } from '@/components/bugovi/bugovi-client'

export default async function BugoviPage() {
  const supabase = await createClient()

  const { data: bugs } = await supabase
    .from('bug_log')
    .select('*')
    .order('created_at', { ascending: false })

  return <BugoviClient bugs={bugs ?? []} />
}
