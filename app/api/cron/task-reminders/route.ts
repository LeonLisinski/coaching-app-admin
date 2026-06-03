import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CATEGORY_LABELS: Record<string, string> = {
  web_app: 'Web app (trener)',
  mobile_app: 'Mobilna app (klijent)',
  web_site: 'Web stranica',
  admin_app: 'Admin app',
  general: 'Općenito',
}

function todayInZagreb(): string {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Zagreb' }))
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysBetween(fromYmd: string, toYmd: string): number {
  const a = new Date(fromYmd + 'T00:00:00Z').getTime()
  const b = new Date(toYmd + 'T00:00:00Z').getTime()
  return Math.round((b - a) / 86400000)
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function wrapEmail(title: string, inner: string): string {
  return `<!DOCTYPE html><html lang="hr"><head><meta charset="utf-8"/></head>
<body style="margin:0;background:#0b0a12;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:32px 16px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:560px;background:#15131f;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
      <tr><td style="padding:24px 28px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <span style="font-size:18px;font-weight:800;color:#fff;">UnitLift Admin</span>
      </td></tr>
      <tr><td style="padding:24px 28px;">
        <h1 style="margin:0 0 16px 0;font-size:18px;color:#f4f4f5;">${escapeHtml(title)}</h1>
        ${inner}
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret) {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }
  } else if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'admin@unitlift.com'
  const from = `UnitLift Admin <${fromEmail}>`

  const { data: settings } = await db.from('admin_task_settings').select('*').eq('id', true).single()
  if (!settings) return NextResponse.json({ error: 'No settings' }, { status: 500 })

  const today = todayInZagreb()
  let overdueSent = 0
  let digestSent = 0
  const errors: string[] = []

  // ── Overdue reminders ───────────────────────────────────────────────────────
  if (settings.overdue_enabled && (settings.reminder_emails?.length ?? 0) > 0) {
    try {
      const { data: tasks } = await db
        .from('admin_tasks')
        .select('id, title, category, priority, due_date')
        .eq('done', false)
        .not('due_date', 'is', null)

      for (const task of tasks ?? []) {
        const overdueDays = daysBetween(task.due_date as string, today)
        if (overdueDays < settings.overdue_days) continue

        // Dedupe: one reminder per task per day
        const dedupeKey = `overdue-${task.id}-${today}`
        const { error: dErr } = await db
          .from('admin_task_reminders')
          .insert({ task_id: task.id, kind: 'overdue', dedupe_key: dedupeKey })
        if (dErr) continue // 23505 duplicate → already sent today

        const catLabel = CATEGORY_LABELS[task.category as string] ?? task.category
        const inner = `
          <p style="margin:0 0 12px 0;font-size:14px;color:#d4d4d8;line-height:1.6;">
            Zadatak je <strong style="color:#f87171;">${overdueDays} dana</strong> nakon roka.
          </p>
          <div style="background:#0e0c16;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;">
            <p style="margin:0 0 6px 0;font-size:15px;font-weight:700;color:#fff;">${escapeHtml(task.title as string)}</p>
            <p style="margin:0;font-size:13px;color:#a1a1aa;">${escapeHtml(catLabel)} · prioritet ${task.priority}/10 · rok ${escapeHtml(task.due_date as string)}</p>
          </div>`

        const r = await resend.emails.send({
          from,
          to: settings.reminder_emails as string[],
          subject: `⏰ Zadatak ${overdueDays}d nakon roka: ${task.title}`,
          html: wrapEmail('Podsjetnik za zadatak', inner),
        })
        if (r.error) errors.push(`overdue ${task.id}: ${r.error.message}`)
        else overdueSent++
      }
    } catch (e: any) {
      errors.push(`overdue block: ${e?.message || e}`)
    }
  }

  // ── Daily digest of open high-priority tasks ────────────────────────────────
  if (settings.digest_enabled && (settings.digest_emails?.length ?? 0) > 0) {
    try {
      const dedupeKey = `digest-${today}`
      const { error: dErr } = await db
        .from('admin_task_reminders')
        .insert({ task_id: null as any, kind: 'digest', dedupe_key: dedupeKey })

      if (!dErr) {
        const { data: tasks } = await db
          .from('admin_tasks')
          .select('id, title, category, priority, due_date')
          .eq('done', false)
          .gte('priority', settings.digest_priority_min)
          .order('priority', { ascending: false })

        if (tasks && tasks.length > 0) {
          const rows = tasks.map((t) => {
            const catLabel = CATEGORY_LABELS[t.category as string] ?? t.category
            const due = t.due_date ? ` · rok ${escapeHtml(t.due_date as string)}` : ''
            return `<li style="margin:0 0 8px 0;font-size:14px;color:#d4d4d8;">
              <strong style="color:#fff;">${escapeHtml(t.title as string)}</strong>
              <span style="color:#a1a1aa;font-size:12px;"> — ${escapeHtml(catLabel)} · P${t.priority}${due}</span>
            </li>`
          }).join('')
          const inner = `
            <p style="margin:0 0 14px 0;font-size:14px;color:#d4d4d8;">Otvoreni zadaci s prioritetom ≥ ${settings.digest_priority_min}:</p>
            <ul style="margin:0;padding-left:18px;">${rows}</ul>`

          const r = await resend.emails.send({
            from,
            to: settings.digest_emails as string[],
            subject: `📋 Dnevni pregled zadataka (${tasks.length})`,
            html: wrapEmail('Dnevni pregled zadataka', inner),
          })
          if (r.error) errors.push(`digest: ${r.error.message}`)
          else digestSent++
        }
      }
    } catch (e: any) {
      errors.push(`digest block: ${e?.message || e}`)
    }
  }

  return NextResponse.json({
    ok: true,
    overdueSent,
    digestSent,
    today,
    errors: errors.length ? errors : undefined,
  })
}
