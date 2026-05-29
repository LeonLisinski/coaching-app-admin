'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { primaryNav, toolsNav, settingsNav, isActive, type NavItem } from '@/lib/nav'

export function Sidebar() {
  const pathname = usePathname()

  async function handleSignOut() {
    await fetch('/api/auth/signout', { method: 'POST' })
    window.location.href = '/login'
  }

  function NavLink({ href, label, icon: Icon }: NavItem) {
    const active = isActive(href, pathname)
    return (
      <Link
        href={href}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
          active
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1">{label}</span>
      </Link>
    )
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

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Poslovanje</p>
        {primaryNav.map((item) => <NavLink key={item.href} {...item} />)}

        <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Alati</p>
        {toolsNav.map((item) => <NavLink key={item.href} {...item} />)}
      </nav>

      <div className="px-3 py-3 border-t border-border space-y-1">
        {settingsNav.map((item) => <NavLink key={item.href} {...item} />)}
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
