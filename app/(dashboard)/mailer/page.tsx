export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { MailerClient } from '@/components/mailer/mailer-client'
import { format } from 'date-fns'

export default async function MailerPage() {
  const supabase = await createClient()

  const { data: campaigns } = await supabase
    .from('mailer_campaigns')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(20)

  return <MailerClient campaigns={campaigns ?? []} />
}
