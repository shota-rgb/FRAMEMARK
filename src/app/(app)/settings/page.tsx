import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!workspace) {
    return <div className="p-8 text-[#666]">ディレクターのみ設定を変更できます</div>
  }

  const { data: templates } = await supabase
    .from('comment_templates')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('sort_order')

  return (
    <SettingsClient
      workspace={workspace}
      templates={templates ?? []}
    />
  )
}
