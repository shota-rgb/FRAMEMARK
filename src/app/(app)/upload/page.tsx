import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import UploadClient from './UploadClient'

export default async function UploadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name')
    .or(`owner_id.eq.${user.id}`)
    .single()

  if (!workspace) {
    // Try member workspace
    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    if (!member) return <div className="p-8 text-[#888]">ワークスペースが見つかりません</div>

    return <UploadClient workspaceId={member.workspace_id} userId={user.id} />
  }

  return <UploadClient workspaceId={workspace.id} userId={user.id} />
}
