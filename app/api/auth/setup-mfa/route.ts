import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// GET — start enrollment, returns QR code
export async function GET() {
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nije autentificiran.' }, { status: 401 })

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: 'UnitLift Admin',
    friendlyName: 'UnitLift Admin',
  })

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Greška.' }, { status: 500 })
  }

  return NextResponse.json({
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  })
}

// POST — confirm enrollment with 6-digit code
export async function POST(request: Request) {
  const { factorId, code } = await request.json()

  if (!factorId || !code) {
    return NextResponse.json({ error: 'Nedostaju podaci.' }, { status: 400 })
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

  // Challenge then verify to confirm enrollment
  const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId })
  if (challengeErr || !challenge) {
    return NextResponse.json({ error: 'Challenge greška.' }, { status: 500 })
  }

  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: code.replace(/\s/g, ''),
  })

  if (verifyErr) {
    return NextResponse.json({ error: 'Neispravan kod. Provjeri app.' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
