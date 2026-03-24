import { createClient } from '@/lib/supabase-server'
import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'

async function getHighBugCount() {
  try {
    const supabase = await createClient()
    const { count } = await supabase
      .from('bug_log')
      .select('*', { count: 'exact', head: true })
      .in('status', ['otvoren', 'u_radu'])
      .eq('priority', 'visok')
    return count ?? 0
  } catch {
    return 0
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const highBugs = await getHighBugCount()

  return (
    <div className="flex min-h-screen">
      <Sidebar highBugs={highBugs} />
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0 overflow-x-hidden">
        {children}
      </main>
      <BottomNav highBugs={highBugs} />
    </div>
  )
}
