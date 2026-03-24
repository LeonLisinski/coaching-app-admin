import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { factorId, challengeId, code } = await request.json()

  if (!factorId || !challengeId || !code) {
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

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code: code.replace(/\s/g, ''),
  })

  if (error) {
    return NextResponse.json({ error: 'Neispravan kod. Provjeri Google Authenticator.' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
