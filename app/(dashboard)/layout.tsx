import { createClient } from '@/lib/supabase-server'
import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'

async function getCounts() {
  try {
    const supabase = await createClient()
    const [{ count: supportCount }, { count: bugCount }] = await Promise.all([
      supabase.from('contact_messages').select('*', { count: 'exact', head: true }).eq('status', 'novo'),
      supabase.from('bug_log').select('*', { count: 'exact', head: true }).in('status', ['otvoren', 'u_radu']).eq('priority', 'visok'),
    ])
    return { support: supportCount ?? 0, highBugs: bugCount ?? 0 }
  } catch {
    return { support: 0, highBugs: 0 }
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const counts = await getCounts()

  return (
    <div className="flex min-h-screen">
      <Sidebar unreadSupport={counts.support} highBugs={counts.highBugs} />
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0 overflow-x-hidden">
        {children}
      </main>
      <BottomNav unreadSupport={counts.support} highBugs={counts.highBugs} />
    </div>
  )
}
