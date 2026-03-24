export const dynamic = 'force-dynamic'

import { SetupMfaClient } from '@/components/postavke/setup-mfa-client'
import { createClient } from '@/lib/supabase-server'

export default async function PostavkePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  const factors = user?.factors ?? []
  const hasVerifiedTotp = factors.some(f => f.factor_type === 'totp' && f.status === 'verified')
  const isAal2 = aal?.currentLevel === 'aal2'

  return <SetupMfaClient hasVerifiedTotp={hasVerifiedTotp} isAal2={isAal2} />
}
