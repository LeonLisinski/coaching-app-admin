import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { segment, subject, body } = await request.json()

  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Subject i tijelo su obavezni' }, { status: 400 })
  }

  const supabase = createAdminClient()

  let query = supabase
    .from('subscriptions')
    .select('trainer_id, plan, status, profiles!inner(email, full_name)')

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

  const { data: subs, error: fetchError } = await query
  if (fetchError) {
    return NextResponse.json({ error: 'Greška pri dohvatu trenera' }, { status: 500 })
  }

  const recipients = (subs ?? []).map((s) => {
    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
    return { email: profile?.email, name: profile?.full_name }
  }).filter((r) => !!r.email)

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'Nema primatelja za odabrani segment' }, { status: 400 })
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'admin@unitlift.com'

  const sendResults = await Promise.allSettled(
    recipients.map((r) =>
      resend.emails.send({
        from: `UnitLift <${fromEmail}>`,
        to: r.email!,
        subject,
        text: body,
      })
    )
  )

  const sent = sendResults.filter((r) => r.status === 'fulfilled').length

  const { data: campaign } = await supabase
    .from('mailer_campaigns')
    .insert({
      subject,
      segment,
      recipient_count: sent,
      body_preview: body.slice(0, 200),
    })
    .select()
    .single()

  return NextResponse.json({ sent, campaign })
}
