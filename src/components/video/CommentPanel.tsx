'use client'

import { useState } from 'react'
import { MessageSquare, Clock, CheckCircle2, Circle, ChevronRight, Image as ImageIcon, Reply } from 'lucide-react'
import { formatTimecode, formatRelativeTime, cn } from '@/lib/utils'
import type { Comment, Annotation } from '@/lib/types'

interface CommentPanelProps {
  comments: Comment[]
  currentVersionId: string
  onSeek: (time: number, annotation?: Annotation | null) => void
  onResolve: (commentId: string, resolved: boolean) => void
  onReply: (commentId: string) => void
}

type Filter = 'all' | 'unresolved' | 'resolved'

function authorLabel(author?: { display_name: string | null; email: string }) {
  return author?.display_name || author?.email || '不明'
}

export default function CommentPanel({ comments, currentVersionId, onSeek, onResolve, onReply }: CommentPanelProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [showTimecode, setShowTimecode] = useState(true)

  const filtered = comments.filter((c) => {
    if (filter === 'unresolved') return !c.is_resolved
    if (filter === 'resolved') return c.is_resolved
    return true
  })

  const topLevel = filtered.filter((c) => !c.parent_id)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#222]">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#666]" />
          <span className="text-sm font-medium text-white">
            コメント <span className="text-[#555]">({comments.length})</span>
          </span>
        </div>
        <button
          onClick={() => setShowTimecode(!showTimecode)}
          className={cn('p-1 rounded text-xs transition-colors flex items-center gap-1',
            showTimecode ? 'text-indigo-400' : 'text-[#555] hover:text-white'
          )}
          title="タイムコード表示切替"
        >
          <Clock className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-[#222]">
        {(['all', 'unresolved', 'resolved'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-2.5 py-1 rounded text-xs transition-colors',
              filter === f ? 'bg-[#2a2a2a] text-white' : 'text-[#555] hover:text-white'
            )}
          >
            {f === 'all' ? 'すべて' : f === 'unresolved' ? '未解決' : '解決済み'}
          </button>
        ))}
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {topLevel.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="w-8 h-8 text-[#333] mb-2" />
            <p className="text-[#555] text-sm">コメントはまだありません</p>
          </div>
        ) : (
          topLevel.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={comments.filter((c) => c.parent_id === comment.id)}
              showTimecode={showTimecode}
              onSeek={onSeek}
              onResolve={onResolve}
              onReply={onReply}
            />
          ))
        )}
      </div>
    </div>
  )
}

function CommentItem({
  comment,
  replies,
  showTimecode,
  onSeek,
  onResolve,
  onReply,
}: {
  comment: Comment
  replies: Comment[]
  showTimecode: boolean
  onSeek: (t: number, annotation?: Annotation | null) => void
  onResolve: (id: string, resolved: boolean) => void
  onReply: (id: string) => void
}) {
  const [showReplies, setShowReplies] = useState(true)

  return (
    <div className={cn(
      'rounded-xl border transition-colors',
      comment.is_resolved
        ? 'bg-[#111] border-[#1e1e1e] opacity-60'
        : 'bg-[#1a1a1a] border-[#2a2a2a]'
    )}>
      <div className="p-3">
        <div className="flex items-start gap-2">
          <button
            onClick={() => onResolve(comment.id, !comment.is_resolved)}
            className={cn(
              'mt-0.5 flex-shrink-0 transition-colors',
              comment.is_resolved ? 'text-green-500' : 'text-[#444] hover:text-green-500'
            )}
            title={comment.is_resolved ? '未解決に戻す' : '解決済みにする'}
          >
            {comment.is_resolved
              ? <CheckCircle2 className="w-4 h-4" />
              : <Circle className="w-4 h-4" />
            }
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-medium text-[#aaa]">
                {authorLabel(comment.author)}
              </span>
              <span className="text-xs text-[#444]">
                {formatRelativeTime(comment.created_at)}
              </span>
            </div>

            {showTimecode && comment.timecode != null && (
              <button
                onClick={() => onSeek(comment.timecode!, comment.annotation)}
                className="inline-flex items-center gap-1 bg-indigo-950/60 text-indigo-400 text-xs font-mono px-2 py-0.5 rounded mb-1.5 hover:bg-indigo-900/60 transition-colors"
              >
                <Clock className="w-3 h-3" />
                {formatTimecode(comment.timecode)}
                {comment.annotation && <span className="text-[10px] ml-0.5 opacity-70">●</span>}
              </button>
            )}

            <p className="text-sm text-[#ddd] leading-relaxed whitespace-pre-wrap">{comment.content}</p>

            {comment.has_annotation && (
              <span className="inline-flex items-center gap-1 text-xs text-[#555] mt-1">
                <ImageIcon className="w-3 h-3" />
                マーキングあり
              </span>
            )}

            <button
              onClick={() => onReply(comment.id)}
              className="inline-flex items-center gap-1 text-xs text-[#555] hover:text-indigo-400 mt-2 transition-colors"
            >
              <Reply className="w-3.5 h-3.5" />
              返信
            </button>
          </div>
        </div>
      </div>

      {replies.length > 0 && (
        <div className="border-t border-[#222] px-3 py-2">
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1 text-xs text-[#555] hover:text-white transition-colors mb-2"
          >
            <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', showReplies && 'rotate-90')} />
            返信 {replies.length}件
          </button>
          {showReplies && (
            <div className="space-y-2 pl-3 border-l border-[#2a2a2a]">
              {replies.map((r) => (
                <div key={r.id} className="py-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-[#888]">{authorLabel(r.author)}</span>
                    <span className="text-xs text-[#444]">{formatRelativeTime(r.created_at)}</span>
                  </div>
                  <p className="text-xs text-[#ccc] leading-relaxed whitespace-pre-wrap">{r.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
