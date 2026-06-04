import { createClient } from '@/lib/supabase-server'

/**
 * Returns the authenticated admin user if:
 *   1. a valid session exists, AND
 *   2. user.email matches ADMIN_EMAIL env var
 * Returns null otherwise (caller must respond 401/403).
 */
export async function requireAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== adminEmail) return null
  return user
}
