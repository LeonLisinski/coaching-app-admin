import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'

// In-memory rate limiter — per IP, max 5 attempts per 15 minutes
const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function getRateLimit(ip: string): { blocked: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const entry = attempts.get(ip)

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { blocked: false, remaining: MAX_ATTEMPTS - 1, resetIn: WINDOW_MS }
  }

  entry.count++
  const resetIn = Math.ceil((entry.resetAt - now) / 1000 / 60)
  return {
    blocked: entry.count > MAX_ATTEMPTS,
    remaining: Math.max(0, MAX_ATTEMPTS - entry.count),
    resetIn,
  }
}

function clearAttempts(ip: string) {
  attempts.delete(ip)
}

export async function POST(request: Request) {
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    'unknown'

  // Rate limit check
  const rateLimit = getRateLimit(ip)
  if (rateLimit.blocked) {
    return NextResponse.json(
      { error: `Previše pokušaja. Pokušaj ponovo za ${rateLimit.resetIn} min.` },
      { status: 429 }
    )
  }

  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email i lozinka su obavezni.' }, { status: 400 })
  }

  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    return NextResponse.json({ error: 'Serverska greška.' }, { status: 500 })
  }

  // Email check — same error as wrong password so attacker can't tell which is wrong
  if (email.toLowerCase().trim() !== adminEmail.toLowerCase()) {
    return NextResponse.json(
      { error: `Neispravni podaci. Još ${rateLimit.remaining} pokušaja.` },
      { status: 401 }
    )
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email: adminEmail, password })

  if (error) {
    return NextResponse.json(
      { error: `Neispravni podaci. Još ${rateLimit.remaining} pokušaja.` },
      { status: 401 }
    )
  }

  // Check if MFA is required
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  if (aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2') {
    // User has 2FA enrolled — need to verify TOTP
    const factors = data.user?.factors ?? []
    const totpFactor = factors.find(f => f.factor_type === 'totp' && f.status === 'verified')

    if (totpFactor) {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      })

      if (challengeError || !challenge) {
        return NextResponse.json({ error: 'MFA greška. Pokušaj ponovo.' }, { status: 500 })
      }

      return NextResponse.json({
        mfaRequired: true,
        factorId: totpFactor.id,
        challengeId: challenge.id,
      })
    }
  }

  // No MFA or already aal2 — login complete
  clearAttempts(ip)
  return NextResponse.json({ ok: true })
}
