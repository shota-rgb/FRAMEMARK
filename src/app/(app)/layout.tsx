export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

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

  // Count action-required videos directly from video status
  let actionCount = 0
  if (userRole === 'director') {
    const { data: ws } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .single()
    if (ws) {
      const { count } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', ws.id)
        .in('status', ['review', 'revised'])
      actionCount = count ?? 0
    }
  } else {
    const { data: memberships } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .eq('is_accepted', true)
    if (memberships && memberships.length > 0) {
      const wsIds = memberships.map((m) => m.workspace_id)
      const { count } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .in('workspace_id', wsIds)
        .eq('status', 'revision_requested')
      actionCount = count ?? 0
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0d0d0d]">
      <Sidebar unreadCount={actionCount} userRole={userRole} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
