'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Clock, MessageSquare,
  Mail, Bug, StickyNote, BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const internalNavItems = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/financije', label: 'Fin.', icon: BarChart3 },
  { href: '/treneri', label: 'Treneri', icon: Users },
  { href: '/expiring', label: 'Expiry', icon: Clock },
  { href: '/mailer', label: 'Mailer', icon: Mail },
  { href: '/bugovi', label: 'Bugovi', icon: Bug, isBug: true },
  { href: '/notes', label: 'Notes', icon: StickyNote },
]

const GMAIL_URL = 'https://mail.google.com/a/unitlift.com/'

export function BottomNav({ highBugs = 0 }: { highBugs?: number }) {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-border z-50">
      <div className="flex items-center justify-around px-0.5 py-1">
        {internalNavItems.map(({ href, label, icon: Icon, isBug }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const count = isBug ? highBugs : 0
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
                  <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center bg-red-500 text-white">
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
