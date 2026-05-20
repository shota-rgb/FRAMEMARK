export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch unread notification count
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  // Determine role: explicit metadata takes priority, then fall back to workspace ownership
  let userRole = user.user_metadata?.role as string | undefined
  if (!userRole) {
    const { data: owned } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .single()
    userRole = owned ? 'director' : 'editor'
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0d0d0d]">
      <Sidebar unreadCount={count ?? 0} userRole={userRole} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
