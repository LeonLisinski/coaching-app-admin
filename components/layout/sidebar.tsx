'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Clock, MessageSquare,
  Mail, StickyNote, LogOut, BarChart3, Settings, Vault, CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const internalNavItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/financije', label: 'Financije', icon: BarChart3 },
  { href: '/treneri', label: 'Treneri', icon: Users },
  { href: '/expiring', label: 'Expiring Soon', icon: Clock },
  { href: '/mailer', label: 'Mailer', icon: Mail },
  { href: '/notes', label: 'Notes', icon: StickyNote },
  { href: '/sef', label: 'Sef', icon: Vault },
  { href: '/prezentacije', label: 'Prezentacije', icon: CalendarDays },
  { href: '/postavke', label: 'Postavke', icon: Settings },
]

const GMAIL_URL = 'https://mail.google.com/a/unitlift.com/'

export function Sidebar() {
  const pathname = usePathname()

  async function handleSignOut() {
    await fetch('/api/auth/signout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen border-r border-border bg-sidebar shrink-0">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <Image
          src="/logo-unitlift.svg"
          alt="UnitLift"
          width={80}
          height={50}
          className="h-7 w-auto"
          priority
        />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">UnitLift</span>
          <span className="text-[10px] text-muted-foreground">Admin</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {internalNavItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
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
            </Link>
          )
        })}

        {/* Gmail — external link */}
        <a
          href={GMAIL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span className="flex-1">Support</span>
          <span className="text-[9px] text-muted-foreground/60">↗</span>
        </a>
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
