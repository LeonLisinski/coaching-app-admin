'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Clock, MessageSquare,
  Mail, StickyNote, BarChart3, Vault, CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const internalNavItems = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/financije', label: 'Fin.', icon: BarChart3 },
  { href: '/treneri', label: 'Treneri', icon: Users },
  { href: '/expiring', label: 'Expiry', icon: Clock },
  { href: '/mailer', label: 'Mailer', icon: Mail },
  { href: '/notes', label: 'Notes', icon: StickyNote },
  { href: '/sef', label: 'Sef', icon: Vault },
  { href: '/prezentacije', label: 'Demo', icon: CalendarDays },
]

const GMAIL_URL = 'https://mail.google.com/a/unitlift.com/'

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-border z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around px-0.5 py-1">
        {internalNavItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-1 py-1 rounded-md min-w-0 flex-1 relative',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-medium truncate w-full text-center leading-tight">
                {label}
              </span>
            </Link>
          )
        })}

        {/* Gmail — external */}
        <a
          href={GMAIL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-0.5 px-1 py-1 rounded-md min-w-0 flex-1 text-muted-foreground"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[9px] font-medium truncate w-full text-center leading-tight">Mail</span>
        </a>
      </div>
    </nav>
  )
}
