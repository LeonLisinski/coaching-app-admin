'use client'

import Image from 'next/image'

export function MobileTopBar() {
  return (
    <header
      className="md:hidden sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Image
          src="/logo-unitlift.svg"
          alt="UnitLift"
          width={80}
          height={50}
          className="h-6 w-auto"
          priority
        />
        <span className="text-sm font-semibold leading-none">UnitLift</span>
        <span className="text-[10px] text-muted-foreground leading-none">Admin</span>
      </div>
    </header>
  )
}
