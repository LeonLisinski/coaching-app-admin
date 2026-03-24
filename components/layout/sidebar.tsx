'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Clock, MessageSquare,
  Mail, Bug, StickyNote, LogOut, Dumbbell, BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/finansije', label: 'Finansije', icon: BarChart3 },
  { href: '/treneri', label: 'Treneri', icon: Users },
  { href: '/expiring', label: 'Expiring Soon', icon: Clock },
  { href: '/support', label: 'Support', icon: MessageSquare, badge: 'support' as const },
  { href: '/mailer', label: 'Mailer', icon: Mail },
  { href: '/bugovi', label: 'Bug Log', icon: Bug, badge: 'bugs' as const },
  { href: '/notes', label: 'Notes', icon: StickyNote },
]

export function Sidebar({ unreadSupport = 0, highBugs = 0 }: { unreadSupport?: number; highBugs?: number }) {
  const pathname = usePathname()

  async function handleSignOut() {
    await fetch('/api/auth/signout', { method: 'POST' })
    window.location.href = '/login'
  }

  function getBadgeCount(badge?: 'support' | 'bugs') {
    if (badge === 'support') return unreadSupport
    if (badge === 'bugs') return highBugs
    return 0
  }

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen border-r border-border bg-sidebar shrink-0">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <Dumbbell className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">UnitLift</p>
          <p className="text-xs text-muted-foreground">Admin</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const count = getBadgeCount(badge)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                  badge === 'bugs' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
                }`}>
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4" />
          Odjava
        </Button>
      </div>
    </aside>
  )
}
