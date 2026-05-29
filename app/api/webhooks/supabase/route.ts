import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase-admin'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = 'UnitLift <no-reply@unitlift.com>'
const TO     = process.env.ADMIN_NOTIFY_EMAIL ?? 'leon@unitlift.com'
const SECRET = process.env.SUPABASE_WEBHOOK_SECRET

async function resolveTrainerName(trainerId: string): Promise<string> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', trainerId)
      .single()
    return data?.full_name ?? '—'
  } catch { return '—' }
}

const header = `<div style="background:#080818;padding:14px 20px;border-radius:10px;margin-bottom:20px">
  <span style="font-family:system-ui,sans-serif;font-size:1rem;font-weight:800;color:#fff;letter-spacing:-.5px">Unit<span style="color:#2a8cff">Lift</span></span>
  <span style="font-family:system-ui,sans-serif;font-size:.75rem;color:#525280;margin-left:8px">Admin obavijest</span>
</div>`

export async function POST(req: NextRequest) {
  // Optional: verify shared secret header
  if (SECRET) {
    const sig = req.headers.get('x-webhook-secret')
    if (sig !== SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const table  = body.table as string
  const type   = body.type as string   // INSERT | UPDATE | DELETE
  const record = body.record as Record<string, unknown>   // new row
  const old    = body.old_record as Record<string, unknown> | null // previous row (UPDATE)

  try {
    // ── subscriptions: trial → active (conversion) ──────────────
    if (table === 'subscriptions' && type === 'UPDATE') {
      const oldStatus = old?.status as string | undefined
      const newStatus = record.status as string

      if (oldStatus === 'trialing' && newStatus === 'active') {
        const trainerId = record.trainer_id as string | undefined
        const name  = trainerId ? await resolveTrainerName(trainerId) : '—'
        const plan  = (record.plan as string | undefined) ?? '—'
        await resend.emails.send({
          from: FROM, to: TO,
          subject: `✅ Trial konvertiran — ${name}`,
          html: `${header}
            <h2 style="color:#f0f0ff;font-family:sans-serif;margin:0 0 12px">Trial → Plaćajući 🎉</h2>
            <p style="font-family:sans-serif;color:#a0a0c0;margin:0 0 16px;font-size:14px">Trener je prešao s triala na plaćenu pretplatu.</p>
            <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:13px">
              <tr><td style="padding:8px 12px;color:#a0a0c0;width:110px">Ime</td><td style="padding:8px 12px;color:#f0f0ff;font-weight:600">${name}</td></tr>
              <tr style="background:#0d0d2a"><td style="padding:8px 12px;color:#a0a0c0">Plan</td><td style="padding:8px 12px;color:#f0f0ff;font-weight:600">${plan}</td></tr>
            </table>
            <p style="font-family:sans-serif;font-size:12px;color:#525280;margin-top:20px">
              <a href="https://admin.unitlift.com/treneri" style="color:#2a8cff">Otvori admin → Treneri</a>
            </p>`,
        })
      }

      // ── subscriptions: cancel_at_period_end → true (cancellation) ──
      const oldCancel = old?.cancel_at_period_end as boolean | undefined
      const newCancel = record.cancel_at_period_end as boolean
      if (!oldCancel && newCancel) {
        const trainerId = record.trainer_id as string | undefined
        const name = trainerId ? await resolveTrainerName(trainerId) : '—'
        const plan = (record.plan as string | undefined) ?? '—'
        const end  = (record.current_period_end as string | undefined)
        await resend.emails.send({
          from: FROM, to: TO,
          subject: `❌ Otkazivanje — ${name}`,
          html: `${header}
            <h2 style="color:#f0f0ff;font-family:sans-serif;margin:0 0 12px">Trener otkazuje pretplatu</h2>
            <p style="font-family:sans-serif;color:#a0a0c0;margin:0 0 16px;font-size:14px">Trener je otkazao. Pristup ostaje do kraja perioda.</p>
            <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:13px">
              <tr><td style="padding:8px 12px;color:#a0a0c0;width:110px">Ime</td><td style="padding:8px 12px;color:#f0f0ff;font-weight:600">${name}</td></tr>
              <tr style="background:#0d0d2a"><td style="padding:8px 12px;color:#a0a0c0">Plan</td><td style="padding:8px 12px;color:#f0f0ff;font-weight:600">${plan}</td></tr>
              ${end ? `<tr><td style="padding:8px 12px;color:#a0a0c0">Pristup do</td><td style="padding:8px 12px;color:#fb923c;font-weight:600">${new Date(end).toLocaleDateString('hr')}</td></tr>` : ''}
            </table>
            <p style="font-family:sans-serif;font-size:12px;color:#525280;margin-top:20px">
              <a href="https://admin.unitlift.com/financije" style="color:#2a8cff">Otvori admin → Financije → Otkazuju</a> i označi razlog.
            </p>`,
        })
      }
    }

    // ── demo_bookings: nova potvrđena rezervacija ────────────────
    if (table === 'demo_bookings' && type === 'INSERT') {
      const name    = (record.name as string | undefined) ?? '—'
      const email   = (record.email as string | undefined) ?? '—'
      const company = (record.company as string | undefined)
      const date    = (record.date as string | undefined)
      const time    = (record.time as string | undefined)
      await resend.emails.send({
        from: FROM, to: TO,
        subject: `📅 Nova prezentacija — ${name}`,
        html: `${header}
          <h2 style="color:#f0f0ff;font-family:sans-serif;margin:0 0 12px">Nova demo rezervacija</h2>
          <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:13px">
            <tr><td style="padding:8px 12px;color:#a0a0c0;width:110px">Ime</td><td style="padding:8px 12px;color:#f0f0ff;font-weight:600">${name}</td></tr>
            <tr style="background:#0d0d2a"><td style="padding:8px 12px;color:#a0a0c0">Email</td><td style="padding:8px 12px;color:#f0f0ff">${email}</td></tr>
            ${company ? `<tr><td style="padding:8px 12px;color:#a0a0c0">Tvrtka</td><td style="padding:8px 12px;color:#f0f0ff">${company}</td></tr>` : ''}
            ${date ? `<tr style="background:#0d0d2a"><td style="padding:8px 12px;color:#a0a0c0">Datum</td><td style="padding:8px 12px;color:#60a5fa;font-weight:600">${date}${time ? ` u ${time.slice(0, 5)}` : ''}</td></tr>` : ''}
          </table>
          <p style="font-family:sans-serif;font-size:12px;color:#525280;margin-top:20px">
            <a href="https://admin.unitlift.com/prezentacije" style="color:#2a8cff">Potvrdi ili odbij u adminu</a>
          </p>`,
      })
    }
  } catch (err) {
    console.error('Webhook email error:', err)
    // Still return 200 so Supabase doesn't retry forever
  }

  return NextResponse.json({ ok: true })
}
