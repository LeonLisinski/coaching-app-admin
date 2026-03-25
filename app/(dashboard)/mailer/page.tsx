export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase-admin'
import { MailerClient } from '@/components/mailer/mailer-client'
import { format } from 'date-fns'

export default async function MailerPage() {
  const supabase = createAdminClient()

  const { data: campaigns } = await supabase
    .from('mailer_campaigns')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(20)

  return <MailerClient campaigns={campaigns ?? []} />
}
