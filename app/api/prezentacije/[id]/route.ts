import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'
import { Resend } from 'resend'

const resend  = new Resend(process.env.RESEND_API_KEY)
const FROM    = 'UnitLift <no-reply@unitlift.com>'
const SITE_URL = 'https://www.unitlift.com'

const header = `<div style="background:#080818;padding:18px 24px;border-radius:12px;margin-bottom:24px">
  <span style="font-family:system-ui,sans-serif;font-size:1.15rem;font-weight:800;color:#fff;letter-spacing:-.5px">Unit<span style="color:#2a8cff">Lift</span></span>
</div>`

function fmtDT(date: string, time: string, locale: string) {
  try {
    const t = time.slice(0, 5)
    return new Date(`${date}T${t}:00`).toLocaleString(locale === 'en' ? 'en-GB' : 'hr-HR', {
      timeZone: 'Europe/Zagreb',
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return `${date} ${time.slice(0, 5)}` }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { action, adminNote } = await req.json()

  if (!['confirm', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: booking, error: fetchErr } = await db
    .from('demo_bookings')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !booking) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const newStatus = action === 'confirm' ? 'confirmed' : 'rejected'

  const { error: updateErr } = await db
    .from('demo_bookings')
    .update({ status: newStatus, admin_note: adminNote ?? null })
    .eq('id', id)

  if (updateErr) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  const { name, email, booking_date, booking_time, locale } = booking
  const dt      = fmtDT(booking_date, booking_time, locale)
  const isHr    = locale !== 'en'
  const bookingUrl = isHr ? `${SITE_URL}/prezentacija` : `${SITE_URL}/en/prezentacija`

  if (action === 'confirm') {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: isHr ? 'Termin je potvrđen — UnitLift prezentacija' : 'Your UnitLift demo is confirmed',
      html: isHr ? `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          ${header}
          <h2 style="color:#0a0a20;margin:0 0 8px">Termin je potvrđen! 🎉</h2>
          <p style="color:#525280;margin:0 0 16px;font-size:15px">Pozdrav ${name},</p>
          <div style="background:#f0f9f0;border-radius:10px;padding:18px;margin-bottom:20px;border-left:4px solid #22c55e">
            <p style="font-size:16px;font-weight:700;color:#0a0a20;margin:0">🗓 ${dt}</p>
            <p style="font-size:13px;color:#525280;margin:6px 0 0">Vremenska zona: Europe/Zagreb (CET/CEST)</p>
          </div>
          <p style="color:#525280;font-size:14px;line-height:1.7">
            Kontaktirat ćemo te nekoliko minuta prije prezentacije s linkom ili uputama za spajanje.
          </p>
        </div>` : `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          ${header}
          <h2 style="color:#0a0a20;margin:0 0 8px">Your demo is confirmed! 🎉</h2>
          <p style="color:#525280;margin:0 0 16px;font-size:15px">Hi ${name},</p>
          <div style="background:#f0f9f0;border-radius:10px;padding:18px;margin-bottom:20px;border-left:4px solid #22c55e">
            <p style="font-size:16px;font-weight:700;color:#0a0a20;margin:0">🗓 ${dt}</p>
            <p style="font-size:13px;color:#525280;margin:6px 0 0">Timezone: Europe/Zagreb (CET/CEST)</p>
          </div>
          <p style="color:#525280;font-size:14px;line-height:1.7">
            We will reach out a few minutes before the demo with a link or connection details.
          </p>
        </div>`,
    }).catch(console.error)
  } else {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: isHr ? 'Odabrani termin nije dostupan — rezerviraj novi' : 'Selected slot unavailable — please choose another',
      html: isHr ? `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          ${header}
          <h2 style="color:#0a0a20;margin:0 0 8px">Termin nije dostupan</h2>
          <p style="color:#525280;margin:0 0 16px;font-size:15px">Pozdrav ${name},</p>
          <p style="color:#525280;margin:0 0 20px;font-size:15px;line-height:1.7">
            Nažalost, odabrani termin (${dt}) nije dostupan. Ispričavamo se zbog neugodnosti.
          </p>
          <a href="${bookingUrl}" style="display:inline-block;background:#2a8cff;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
            Odaberi drugi termin
          </a>
        </div>` : `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          ${header}
          <h2 style="color:#0a0a20;margin:0 0 8px">Slot unavailable</h2>
          <p style="color:#525280;margin:0 0 16px;font-size:15px">Hi ${name},</p>
          <p style="color:#525280;margin:0 0 20px;font-size:15px;line-height:1.7">
            Unfortunately, the selected slot (${dt}) is no longer available. We apologise for the inconvenience.
          </p>
          <a href="${bookingUrl}" style="display:inline-block;background:#2a8cff;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
            Choose another time
          </a>
        </div>`,
    }).catch(console.error)
  }

  return NextResponse.json({ success: true, status: newStatus })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = createAdminClient()

  const { error } = await db
    .from('demo_bookings')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
