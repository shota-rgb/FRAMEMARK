import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronLeft, Clock, CheckCircle2, Circle } from 'lucide-react'
import { formatTimecode, formatRelativeTime } from '@/lib/utils'
import type { Comment, VideoVersion } from '@/lib/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function HistoryPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: video } = await supabase
    .from('videos')
    .select('*, video_versions(*)')
    .eq('id', id)
    .single()

  if (!video) notFound()

  const { data: comments } = await supabase
    .from('comments')
    .select('*')
    .eq('video_id', id)
    .order('created_at', { ascending: true })

  const versions: VideoVersion[] = (video.video_versions ?? []).sort(
    (a: VideoVersion, b: VideoVersion) => a.version_number - b.version_number
  )

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/videos/${id}`} className="text-[#666] hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-white font-bold text-lg">{video.title}</h1>
          <p className="text-[#666] text-sm">修正履歴</p>
        </div>
      </div>

      <div className="space-y-6">
        {versions.map((version) => {
          const vComments = (comments ?? []).filter(
            (c: Comment) => c.video_version_id === version.id
          )
          return (
            <div key={version.id} className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded">
                  V{version.version_number}
                </div>
                <span className="text-[#666] text-sm">{formatRelativeTime(version.created_at)}</span>
                {version.is_deleted && (
                  <span className="text-xs text-[#444] bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-0.5 rounded">
                    ファイル削除済み
                  </span>
                )}
              </div>

              {vComments.length === 0 ? (
                <p className="text-[#444] text-sm pl-4">このバージョンのコメントはありません</p>
              ) : (
                <div className="space-y-2 pl-4 border-l border-[#2a2a2a]">
                  {vComments.map((c: Comment) => (
                    <div key={c.id} className="bg-[#1a1a1a] border border-[#222] rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        {c.is_resolved
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          : <Circle className="w-3.5 h-3.5 text-[#444]" />
                        }
                        {c.timecode != null && (
                          <span className="text-indigo-400 text-xs font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimecode(c.timecode)}
                          </span>
                        )}
                        <span className="text-[#555] text-xs ml-auto">{formatRelativeTime(c.created_at)}</span>
                      </div>
                      <p className="text-sm text-[#ccc] whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
