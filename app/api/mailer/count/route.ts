import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const segment = request.nextUrl.searchParams.get('segment') ?? 'all'
  const supabase = createAdminClient()

  let query = supabase.from('subscriptions').select('trainer_id, plan, status, profiles!inner(email)', { count: 'exact', head: true })

  switch (segment) {
    case 'starter':
      query = query.eq('plan', 'starter').in('status', ['active', 'trialing'])
      break
    case 'pro':
      query = query.eq('plan', 'pro').in('status', ['active', 'trialing'])
      break
    case 'scale':
      query = query.eq('plan', 'scale').in('status', ['active', 'trialing'])
      break
    case 'active':
      query = query.in('status', ['active', 'trialing'])
      break
    case 'inactive':
      query = query.in('status', ['canceled', 'locked'])
      break
    default:
      break
  }

  const { count, error } = await query

  if (error) return NextResponse.json({ count: 0 })
  return NextResponse.json({ count: count ?? 0 })
}
