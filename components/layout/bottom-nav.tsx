'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Clock, MessageSquare,
  Mail, Bug, StickyNote, BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/finansije', label: 'Fin.', icon: BarChart3 },
  { href: '/treneri', label: 'Treneri', icon: Users },
  { href: '/expiring', label: 'Expiring', icon: Clock },
  { href: '/support', label: 'Support', icon: MessageSquare, badge: 'support' as const },
  { href: '/mailer', label: 'Mailer', icon: Mail },
  { href: '/bugovi', label: 'Bugovi', icon: Bug, badge: 'bugs' as const },
  { href: '/notes', label: 'Notes', icon: StickyNote },
]

export function BottomNav({ unreadSupport = 0, highBugs = 0 }: { unreadSupport?: number; highBugs?: number }) {
  const pathname = usePathname()

  function getCount(badge?: 'support' | 'bugs') {
    if (badge === 'support') return unreadSupport
    if (badge === 'bugs') return highBugs
    return 0
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-border z-50">
      <div className="flex items-center justify-around px-0.5 py-1">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const count = getCount(badge)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-1 py-1 rounded-md min-w-0 flex-1 relative',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {count > 0 && (
                  <span className={`absolute -top-1.5 -right-1.5 text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center ${
                    badge === 'bugs' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
                  }`}>
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-medium truncate w-full text-center leading-tight">
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
