import {
  LayoutDashboard, BarChart3, Users, CalendarDays,
  Mail, Vault, StickyNote, Settings, type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  href: string
  label: string
  mobileLabel?: string
  icon: LucideIcon
}

/** Shown as bottom-nav tabs on mobile and the top group on desktop. */
export const primaryNav: NavItem[] = [
  { href: '/',              label: 'Pregled',      icon: LayoutDashboard },
  { href: '/financije',     label: 'Financije',    mobileLabel: 'Fin.', icon: BarChart3 },
  { href: '/treneri',       label: 'Treneri',      icon: Users },
  { href: '/prezentacije',  label: 'Prezentacije', mobileLabel: 'Demo', icon: CalendarDays },
]

/** Secondary tools — desktop "Alati" group + mobile "Više" sheet. */
export const toolsNav: NavItem[] = [
  { href: '/mailer', label: 'Mailer', icon: Mail },
  { href: '/sef',    label: 'Sef',    icon: Vault },
  { href: '/notes',  label: 'Notes',  icon: StickyNote },
]

export const settingsNav: NavItem[] = [
  { href: '/postavke', label: 'Postavke', icon: Settings },
]

export const allNav: NavItem[] = [...primaryNav, ...toolsNav, ...settingsNav]

export function isActive(href: string, pathname: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

/** Resolve the current page title from the longest matching nav href. */
export function resolveTitle(pathname: string): string {
  const match = allNav
    .filter((n) => isActive(n.href, pathname))
    .sort((a, b) => b.href.length - a.href.length)[0]
  return match?.label ?? 'UnitLift Admin'
}
