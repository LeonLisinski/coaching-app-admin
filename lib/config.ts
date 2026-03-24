export const PLAN_PRICES: Record<string, number> = {
  starter: 29,
  pro: 59,
  scale: 99,
}

export const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  scale: 'Scale',
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
