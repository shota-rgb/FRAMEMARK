import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VideoReviewClient from './VideoReviewClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function VideoReviewPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: video } = await supabase
    .from('videos')
    .select(`
      *,
      video_versions(*)
    `)
    .eq('id', id)
    .single()

  if (!video) notFound()

  const versions = (video.video_versions ?? []).sort(
    (a: { version_number: number }, b: { version_number: number }) => b.version_number - a.version_number
  )
  const latestVersion = versions[0] ?? null

  // Get signed URL for latest version (bucket is private)
  let videoUrl: string | null = null
  if (latestVersion?.storage_path && !latestVersion.is_deleted) {
    const { data } = await supabase.storage
      .from('videos')
      .createSignedUrl(latestVersion.storage_path, 60 * 60) // 1時間有効
    videoUrl = data?.signedUrl ?? null
  }

  // Fetch comments with author profiles
  const { data: commentsRaw } = await supabase
    .from('comments')
    .select(`
      *,
      annotations(*)
    `)
    .eq('video_id', id)
    .order('timecode', { ascending: true, nullsFirst: false })

  // Get author display names and emails
  const authorIds = [...new Set((commentsRaw ?? []).map((c) => c.author_id))]
  const authorMap: Record<string, { display_name: string | null; email: string }> = {}

  if (authorIds.length > 0) {
    const [{ data: members }, { data: authEmails }] = await Promise.all([
      supabase
        .from('workspace_members')
        .select('user_id, display_name')
        .eq('workspace_id', video.workspace_id)
        .in('user_id', authorIds),
      supabase.rpc('get_user_emails', { user_ids: authorIds }),
    ])

    ;(members ?? []).forEach((m) => {
      if (m.user_id) authorMap[m.user_id] = { display_name: m.display_name, email: '' }
    })
    ;(authEmails ?? []).forEach((u: { id: string; email: string }) => {
      if (authorMap[u.id]) {
        authorMap[u.id].email = u.email
      } else {
        authorMap[u.id] = { display_name: null, email: u.email }
      }
    })
  }

  const comments = (commentsRaw ?? []).map((c) => ({
    ...c,
    annotation: c.annotations?.[0] ?? null,
    author: authorMap[c.author_id] ?? { display_name: null, email: '不明' },
  }))

  // Fetch templates
  const { data: templates } = await supabase
    .from('comment_templates')
    .select('*')
    .eq('workspace_id', video.workspace_id)
    .order('sort_order')

  // Check role
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', video.workspace_id)
    .single()

  const isDirector = workspace?.owner_id === user.id

  // Mark this video as seen at its current status (clears the sidebar badge for action-required statuses)
  if (['review', 'revised', 'revision_requested'].includes(video.status)) {
    await supabase.from('video_status_seen').upsert(
      { user_id: user.id, video_id: id, seen_status: video.status, seen_at: new Date().toISOString() },
      { onConflict: 'user_id,video_id' }
    )
  }

  return (
    <VideoReviewClient
      video={video}
      versions={versions}
      latestVersion={latestVersion}
      videoUrl={videoUrl}
      comments={comments}
      templates={templates ?? []}
      currentUser={{ id: user.id, email: user.email ?? '', display_name: authorMap[user.id]?.display_name ?? null }}
      isDirector={isDirector}
    />
  )
}
