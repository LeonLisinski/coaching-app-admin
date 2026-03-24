import { createClient } from '@/lib/supabase-server'
import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'

async function getUnreadSupportCount() {
  try {
    const supabase = await createClient()
    const { count } = await supabase
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'novo')
    return count ?? 0
  } catch {
    return 0
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const unreadSupport = await getUnreadSupportCount()

  return (
    <div className="flex min-h-screen">
      <Sidebar unreadSupport={unreadSupport} />
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav unreadSupport={unreadSupport} />
    </div>
  )
}
