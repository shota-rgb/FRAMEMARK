import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Users } from 'lucide-react'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const userRole = user.user_metadata?.role as string | undefined
  const isEditorRole = userRole === 'editor'

  let workspace = null

  if (!isEditorRole) {
    // Director: get or auto-create workspace
    const { data: ownedWorkspace } = await supabase
      .from('workspaces')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (ownedWorkspace) {
      workspace = ownedWorkspace
    } else {
      const orgName = (user.user_metadata?.org_name as string | undefined) || 'マイワークスペース'
      const { data: newWorkspace } = await supabase
        .from('workspaces')
        .insert({ name: orgName, owner_id: user.id })
        .select()
        .single()
      workspace = newWorkspace
    }
  } else {
    // Editor: get workspace from membership
    const { data: memberRow } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(*)')
      .eq('user_id', user.id)
      .eq('is_accepted', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (memberRow?.workspaces) {
      workspace = Array.isArray(memberRow.workspaces)
        ? memberRow.workspaces[0]
        : memberRow.workspaces
    }
  }

  // Editor with no workspace: show waiting screen
  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-6">
        <div className="w-16 h-16 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-[#444]" />
        </div>
        <h2 className="text-white font-semibold text-lg mb-2">組織への参加を待っています</h2>
        <p className="text-[#666] text-sm max-w-xs leading-relaxed">
          ディレクターから招待リンクを受け取ったら、そのリンクを開いて組織に参加してください。
        </p>
      </div>
    )
  }

  // Fetch videos with latest version and comment count
  const { data: videos } = await supabase
    .from('videos')
    .select(`
      *,
      video_versions(id, version_number, file_size, file_name, is_deleted, created_at),
      comments(id)
    `)
    .eq('workspace_id', workspace.id)
    .order('updated_at', { ascending: false })

  const enrichedVideos = (videos ?? []).map((v) => {
    const versions = (v.video_versions ?? []).sort(
      (a: { version_number: number }, b: { version_number: number }) => b.version_number - a.version_number
    )
    return {
      ...v,
      video_versions: versions,
      latestVersion: versions[0] ?? null,
      commentCount: v.comments?.length ?? 0,
    }
  })

  const summary = {
    total: enrichedVideos.length,
    review: enrichedVideos.filter((v) => v.status === 'review').length,
    revision_requested: enrichedVideos.filter((v) => v.status === 'revision_requested').length,
    approved: enrichedVideos.filter((v) => v.status === 'approved').length,
  }

  const isDirector = workspace.owner_id === user.id

  return (
    <DashboardClient
      videos={enrichedVideos as Parameters<typeof DashboardClient>[0]['videos']}
      workspace={workspace}
      summary={summary}
      isDirector={isDirector}
    />
  )
}
