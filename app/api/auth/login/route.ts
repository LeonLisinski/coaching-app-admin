import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email i lozinka su obavezni.' }, { status: 400 })
  }

  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    return NextResponse.json({ error: 'Serverska greška.' }, { status: 500 })
  }

  // Server-side provjera emaila — klijent nikad ne zna koji je točan email
  if (email.toLowerCase().trim() !== adminEmail.toLowerCase()) {
    // Namjerno isti error kao za krivu lozinku — ne otkrivamo koji dio je kriv
    return NextResponse.json({ error: 'Neispravni podaci.' }, { status: 401 })
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

  const { error } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password,
  })

  if (error) {
    // Uvijek isti error — ne otkrivamo je li email ili lozinka krivo
    return NextResponse.json({ error: 'Neispravni podaci.' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
