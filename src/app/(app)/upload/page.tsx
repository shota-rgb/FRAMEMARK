import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import UploadClient from './UploadClient'

export default async function UploadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Determine role
  const userRole = user.user_metadata?.role as string | undefined
  let isDirector = userRole === 'director'
  if (!userRole) {
    const { data: owned } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .single()
    isDirector = !!owned
  }

  if (isDirector) {
    redirect('/dashboard')
  }

  // Get editor's workspace
  const { data: memberRow } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('is_accepted', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!memberRow) {
    return (
      <div className="p-8 text-center text-[#666]">
        <p className="text-sm">まだ組織に参加していません。</p>
        <p className="text-sm mt-1">ディレクターから招待リンクを受け取って組織に参加してください。</p>
      </div>
    )
  }

  return <UploadClient workspaceId={memberRow.workspace_id} userId={user.id} />
}
