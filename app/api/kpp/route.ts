import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'

// ─── Auth guard ──────────────────────────────────────────────────────────────
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ─── GET /api/kpp — paginated, filtered list + total ─────────────────────────
export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp    = req.nextUrl.searchParams
  const year  = sp.get('year')  ?? String(new Date().getFullYear())
  const from  = sp.get('from')  ?? `${year}-01-01`
  const to    = sp.get('to')    ?? `${year}-12-31`
  const kat   = sp.get('kat')   ?? 'all'
  const minA  = sp.get('min')   ? parseFloat(sp.get('min')!) : null
  const maxA  = sp.get('max')   ? parseFloat(sp.get('max')!) : null
  const limit = Math.min(parseInt(sp.get('limit') ?? '50', 10), 200)
  const cursor = sp.get('cursor') // ISO date string — last datum seen for cursor pagination

  const db = createAdminClient()

  let q = db
    .from('kpp_entries')
    .select('id,rbr,broj_racuna,kupac,oib_kupca,opis,nacin_placanja,iznos,datum,kategorija,created_at', { count: 'exact' })
    .gte('datum', from)
    .lte('datum', to)
    .order('datum', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (kat !== 'all') q = q.eq('kategorija', kat)
  if (minA !== null) q = q.gte('iznos', minA)
  if (maxA !== null) q = q.lte('iznos', maxA)
  if (cursor) {
    q = q.lt('datum', cursor)
  }

  const { data, error, count } = await q

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Total for current filter (separate aggregation query)
  let totalQ = db
    .from('kpp_entries')
    .select('iznos')
    .gte('datum', from)
    .lte('datum', to)

  if (kat !== 'all') totalQ = totalQ.eq('kategorija', kat)
  if (minA !== null) totalQ = totalQ.gte('iznos', minA)
  if (maxA !== null) totalQ = totalQ.lte('iznos', maxA)

  const { data: allForTotal } = await totalQ
  const total = (allForTotal ?? []).reduce((s, r) => s + Number(r.iznos), 0)

  return NextResponse.json({ data: data ?? [], count, total })
}

// ─── POST /api/kpp — manual entry ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { kupac, oib_kupca, opis, nacin_placanja, iznos, datum, kategorija } = body

  if (!kupac || !opis || !iznos || !datum) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db   = createAdminClient()
  const year = new Date(datum).getFullYear()
  const yy   = String(year % 100).padStart(2, '0')

  const { data: seqData } = await db.rpc('next_kpp_seq', { p_year: year })
  const seq    = (seqData as number | null) ?? 1
  const seqPad = String(seq).padStart(3, '0')

  const { data, error } = await db.from('kpp_entries').insert({
    rbr:            `${yy}-${seqPad}-01`,
    broj_racuna:    `UL-${yy}-${seqPad}`,
    kupac,
    oib_kupca:      oib_kupca || null,
    buyer_type:     oib_kupca ? 'business' : 'private',
    opis,
    nacin_placanja: nacin_placanja ?? 'gotovina',
    iznos:          parseFloat(iznos),
    datum,
    kategorija:     kategorija ?? 'ostalo',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
