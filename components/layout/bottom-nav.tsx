'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { primaryNav, toolsNav, settingsNav, isActive } from '@/lib/nav'

export function BottomNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const moreItems = [...toolsNav, ...settingsNav]
  const moreActive = moreItems.some((i) => isActive(i.href, pathname))

  async function handleSignOut() {
    await fetch('/api/auth/signout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar/95 backdrop-blur border-t border-border z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch justify-around px-1 py-1.5">
          {primaryNav.map(({ href, label, mobileLabel, icon: Icon }) => {
            const active = isActive(href, pathname)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center gap-1 px-1 py-1 rounded-md min-w-0 flex-1',
                  active ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                <Icon className={cn('w-5 h-5', active && 'text-primary')} />
                <span className="text-[10px] font-medium truncate w-full text-center leading-tight">
                  {mobileLabel ?? label}
                </span>
              </Link>
            )
          })}

          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-col items-center gap-1 px-1 py-1 rounded-md min-w-0 flex-1',
              moreActive ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            <MoreHorizontal className={cn('w-5 h-5', moreActive && 'text-primary')} />
            <span className="text-[10px] font-medium leading-tight">Više</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl pb-[calc(env(safe-area-inset-bottom)+1rem)]"
        >
          <SheetHeader className="pb-0">
            <SheetTitle>Više</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 p-4 pt-2">
            {moreItems.map(({ href, label, icon: Icon }) => {
              const active = isActive(href, pathname)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors',
                    active
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </Link>
              )
            })}
            <button
              onClick={handleSignOut}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Odjava
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
