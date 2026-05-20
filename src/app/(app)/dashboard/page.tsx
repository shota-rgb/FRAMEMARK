import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get or create workspace
  let workspace = null
  const { data: ownedWorkspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (ownedWorkspace) {
    workspace = ownedWorkspace
  } else {
    const { data: memberWorkspace } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(*)')
      .eq('user_id', user.id)
      .single()
    if (memberWorkspace?.workspaces) {
      workspace = Array.isArray(memberWorkspace.workspaces)
        ? memberWorkspace.workspaces[0]
        : memberWorkspace.workspaces
    }
  }

  // If no workspace, create one
  if (!workspace) {
    const { data: newWorkspace } = await supabase
      .from('workspaces')
      .insert({ name: 'マイワークスペース', owner_id: user.id })
      .select()
      .single()
    workspace = newWorkspace
  }

  if (!workspace) return <div className="p-8 text-[#888]">ワークスペースの読み込みに失敗しました</div>

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

  // Status summary
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
