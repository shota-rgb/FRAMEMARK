import Link from 'next/link'
import { MessageSquare, HardDrive, Clock } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { formatFileSize, formatRelativeTime } from '@/lib/utils'
import type { Video } from '@/lib/types'

interface VideoCardProps {
  video: Video & {
    latestVersion?: { file_size: number; version_number: number } | null
    commentCount?: number
  }
  view: 'grid' | 'list'
}

export default function VideoCard({ video, view }: VideoCardProps) {
  if (view === 'list') {
    return (
      <Link
        href={`/videos/${video.id}`}
        className="flex items-center gap-4 px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl hover:border-[#444] hover:bg-[#1e1e1e] transition-all group"
      >
        <div className="w-28 h-16 bg-[#252525] rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
          <span className="text-[#444] text-xs">動画</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate group-hover:text-indigo-300 transition-colors">
            {video.title}
          </p>
          <p className="text-[#666] text-xs mt-0.5">{formatRelativeTime(video.updated_at)}</p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <StatusBadge status={video.status} />
          <div className="flex items-center gap-1 text-[#666] text-xs">
            <MessageSquare className="w-3.5 h-3.5" />
            {video.commentCount ?? 0}
          </div>
          {video.latestVersion && (
            <div className="flex items-center gap-1 text-[#555] text-xs">
              <HardDrive className="w-3.5 h-3.5" />
              {formatFileSize(video.latestVersion.file_size)}
            </div>
          )}
          {video.latestVersion && (
            <span className="text-xs text-[#555]">V{video.latestVersion.version_number}</span>
          )}
        </div>
      </Link>
    )
  }

  return (
    <Link
      href={`/videos/${video.id}`}
      className="block bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden hover:border-[#444] hover:bg-[#1e1e1e] transition-all group"
    >
      <div className="aspect-video bg-[#252525] flex items-center justify-center relative">
        <span className="text-[#444] text-sm">動画</span>
        <div className="absolute top-2 right-2">
          <StatusBadge status={video.status} />
        </div>
      </div>
      <div className="p-3">
        <p className="text-white font-medium text-sm truncate group-hover:text-indigo-300 transition-colors">
          {video.title}
        </p>
        <div className="flex items-center gap-3 mt-2 text-xs text-[#666]">
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {video.commentCount ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(video.updated_at)}
          </span>
          {video.latestVersion && (
            <span className="flex items-center gap-1 ml-auto">
              <HardDrive className="w-3 h-3" />
              {formatFileSize(video.latestVersion.file_size)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
