export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase-admin'
import { SefClient } from '@/components/sef/sef-client'

export default async function SefPage() {
  const supabase = createAdminClient()
  const { data: items } = await supabase
    .from('admin_vault')
    .select('*')
    .order('category')
    .order('title')

  return <SefClient initialItems={items ?? []} />
}
