export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
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

  // Read seen-video cookie (set by markVideoSeen server action when user opens a video)
  const cookieStore = await cookies()
  let seenVideos: Array<{ id: string; status: string }> = []
  try {
    const raw = cookieStore.get('seen_videos')?.value
    seenVideos = raw ? JSON.parse(raw) : []
  } catch { seenVideos = [] }

  // Count action-required videos that the user hasn't seen yet.
  // Try the DB-based RPC first (requires SQL migration); fall back to
  // direct count minus cookie-tracked seen entries.
  let actionCount = 0
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_unseen_action_count', { uid: user.id })
  if (!rpcError && rpcData !== null) {
    actionCount = rpcData as number
  } else {
    const actionStatuses = userRole === 'director' ? ['review', 'revised'] : ['revision_requested']
    if (userRole === 'director') {
      const { data: ws } = await supabase
        .from('workspaces').select('id').eq('owner_id', user.id).limit(1).single()
      if (ws) {
        const { data: actionVideos } = await supabase
          .from('videos').select('id, status')
          .eq('workspace_id', ws.id).in('status', actionStatuses)
        actionCount = (actionVideos ?? []).filter(
          (v) => !seenVideos.some((s) => s.id === v.id && s.status === v.status)
        ).length
      }
    } else {
      const { data: memberships } = await supabase
        .from('workspace_members').select('workspace_id')
        .eq('user_id', user.id).eq('is_accepted', true)
      if (memberships?.length) {
        const { data: actionVideos } = await supabase
          .from('videos').select('id, status')
          .in('workspace_id', memberships.map((m) => m.workspace_id))
          .in('status', actionStatuses)
        actionCount = (actionVideos ?? []).filter(
          (v) => !seenVideos.some((s) => s.id === v.id && s.status === v.status)
        ).length
      }
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
