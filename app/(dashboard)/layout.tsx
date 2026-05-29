import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { MobileTopBar } from '@/components/layout/mobile-topbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileTopBar />
        <main className="flex-1 flex flex-col min-w-0 pb-24 md:pb-0 overflow-x-hidden">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
