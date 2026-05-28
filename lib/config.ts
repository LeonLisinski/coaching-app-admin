export const PLAN_PRICES: Record<string, number> = {
  starter: 29,
  pro: 59,
  scale: 99,
}

export const PLAN_PROMO_PRICES: Record<string, number> = {
  starter: 14.5,
  pro: 29.5,
  scale: 49.5,
}

/** Returns effective monthly base price (promo or regular) for a subscription row. */
export function effectivePrice(s: {
  plan: string | null
  promo_granted_at?: string | null
  promo_ends_at?: string | null
  promo_lost_at?: string | null
}): number {
  const now = Date.now()
  const isPromoActive =
    s.promo_granted_at != null &&
    s.promo_lost_at == null &&
    (s.promo_ends_at == null || new Date(s.promo_ends_at).getTime() > now)
  const plan = s.plan ?? ''
  return isPromoActive
    ? (PLAN_PROMO_PRICES[plan] ?? PLAN_PRICES[plan] ?? 0)
    : (PLAN_PRICES[plan] ?? 0)
}

export const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  scale: 'Scale',
  ambassador: 'Ambassador',
}

export const STATUS_LABELS: Record<string, string> = {
  active: 'Aktivan',
  trialing: 'Trial',
  past_due: 'Kasni',
  canceled: 'Otkazao',
  locked: 'Zaključan',
}

export const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: 'LayoutDashboard' },
  { href: '/treneri', label: 'Treneri', icon: 'Users' },
  { href: '/expiring', label: 'Expiring Soon', icon: 'Clock' },
  { href: '/support', label: 'Support', icon: 'MessageSquare' },
  { href: '/mailer', label: 'Mailer', icon: 'Mail' },
  { href: '/bugovi', label: 'Bug Log', icon: 'Bug' },
  { href: '/notes', label: 'Notes', icon: 'StickyNote' },
]
