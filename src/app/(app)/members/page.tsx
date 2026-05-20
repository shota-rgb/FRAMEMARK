import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MembersClient from './MembersClient'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!workspace) {
    return (
      <div className="p-8 text-center text-[#666]">
        メンバー管理はディレクター（ワークスペースオーナー）のみ利用できます
      </div>
    )
  }

  const { data: members } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('created_at')

  return (
    <MembersClient
      workspace={workspace}
      members={members ?? []}
      currentUserId={user.id}
    />
  )
}
