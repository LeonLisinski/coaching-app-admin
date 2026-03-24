export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { SupportClient } from '@/components/support/support-client'

export default async function SupportPage() {
  const supabase = await createClient()

  const { data: messages } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false })

  return <SupportClient messages={messages ?? []} />
}
