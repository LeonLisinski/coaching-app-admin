import { createClient } from '@/lib/supabase-server'

/** Returns the authenticated admin user, or null if not logged in. */
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
