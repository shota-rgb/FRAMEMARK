'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, Pen, Send, Image as ImageIcon, Clock,
  AlertCircle, CheckCircle, MoreHorizontal, History, ChevronDown
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import VideoPlayer from '@/components/video/VideoPlayer'
import AnnotationToolbar, { type AnnotationTool, type AnnotationColor } from '@/components/video/AnnotationToolbar'
import CommentPanel from '@/components/video/CommentPanel'
import StatusBadge from '@/components/dashboard/StatusBadge'
import { createClient } from '@/lib/supabase/client'
import { formatTimecode, formatFileSize, STATUS_LABELS } from '@/lib/utils'
import type { Video, VideoVersion, Comment, CommentTemplate, VideoStatus } from '@/lib/types'
import type { AnnotationCanvasRef } from '@/components/video/AnnotationCanvas'

const AnnotationCanvas = dynamic(() => import('@/components/video/AnnotationCanvas'), { ssr: false })

interface VideoReviewClientProps {
  video: Video
  versions: VideoVersion[]
  latestVersion: VideoVersion | null
  videoUrl: string | null
  comments: Comment[]
  templates: CommentTemplate[]
  currentUser: { id: string; email: string }
  isDirector: boolean
}

const STATUS_TRANSITIONS: Partial<Record<VideoStatus, { label: string; next: VideoStatus; color: string }>> = {
  review: { label: '修正依頼を送る', next: 'revision_requested', color: 'bg-red-600 hover:bg-red-500' },
  revised: { label: '再レビューする', next: 'review', color: 'bg-amber-600 hover:bg-amber-500' },
  revision_requested: { label: '修正済みにする', next: 'revised', color: 'bg-blue-600 hover:bg-blue-500' },
}

export default function VideoReviewClient({
  video, versions, latestVersion, videoUrl,
  comments: initialComments, templates,
  currentUser, isDirector,
}: VideoReviewClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const annotationRef = useRef<AnnotationCanvasRef>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)

  const [comments, setComments] = useState(initialComments)
  const [currentTime, setCurrentTime] = useState(0)
  const [seekTo, setSeekTo] = useState<number | null>(null)
  const [annotationMode, setAnnotationMode] = useState(false)
  const [activeTool, setActiveTool] = useState<AnnotationTool>('rect')
  const [activeColor, setActiveColor] = useState<AnnotationColor>('#ef4444')
  const [commentText, setCommentText] = useState('')
  const [attachTimecode, setAttachTimecode] = useState(true)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [videoStatus, setVideoStatus] = useState<VideoStatus>(video.status)
  const [showVersions, setShowVersions] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [videoContainerSize, setVideoContainerSize] = useState({ w: 0, h: 0 })

  const handleSeek = useCallback((t: number) => setSeekTo(t), [])

  const handleResolve = async (commentId: string, resolved: boolean) => {
    const { error } = await supabase
      .from('comments')
      .update({ is_resolved: resolved })
      .eq('id', commentId)
    if (!error) {
      setComments((prev) =>
        prev.map((c) => c.id === commentId ? { ...c, is_resolved: resolved } : c)
      )
    }
  }

  async function handleSendComment() {
    if (!commentText.trim() && !imageFile && !annotationMode) return
    setSending(true)

    try {
      let imagePath: string | null = null
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `${video.workspace_id}/${video.id}/comments/${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('images').upload(path, imageFile)
        if (!error) imagePath = path
      }

      const annotationData = annotationMode ? annotationRef.current?.getCanvasData() ?? null : null
      const hasAnnotation = !!annotationData

      const { data: newComment, error } = await supabase
        .from('comments')
        .insert({
          video_id: video.id,
          video_version_id: latestVersion?.id ?? null,
          author_id: currentUser.id,
          content: commentText.trim(),
          timecode: attachTimecode ? Math.floor(currentTime) : null,
          parent_id: replyTo,
          has_annotation: hasAnnotation,
          image_path: imagePath,
        })
        .select()
        .single()

      if (error || !newComment) throw error

      if (annotationData) {
        await supabase.from('annotations').insert({
          comment_id: newComment.id,
          canvas_data: annotationData,
        })
      }

      // Create notification
      if (isDirector) {
        // notify editor - simplified (would need editor user_id)
      }

      setComments((prev) => [...prev, {
        ...newComment,
        author: { display_name: null, email: currentUser.email },
        annotation: annotationData ? { id: '', comment_id: newComment.id, canvas_data: annotationData as object, created_at: '' } : null,
      }])

      setCommentText('')
      setImageFile(null)
      setReplyTo(null)
      annotationRef.current?.clear()
      if (annotationMode) setAnnotationMode(false)
    } finally {
      setSending(false)
    }
  }

  async function handleStatusChange(newStatus: VideoStatus) {
    const { error } = await supabase
      .from('videos')
      .update({ status: newStatus })
      .eq('id', video.id)
    if (!error) {
      setVideoStatus(newStatus)
      if (newStatus === 'approved') setShowApproveModal(false)
    }
  }

  function insertTemplate(content: string) {
    setCommentText((prev) => prev ? `${prev}\n${content}` : content)
  }

  const transition = STATUS_TRANSITIONS[videoStatus]

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 h-12 bg-[#111] border-b border-[#222] flex-shrink-0">
        <Link href="/dashboard" className="text-[#666] hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-sm font-medium text-white truncate">{video.title}</h1>
        <StatusBadge status={videoStatus} />

        {latestVersion && (
          <div className="relative">
            <button
              onClick={() => setShowVersions(!showVersions)}
              className="flex items-center gap-1.5 text-xs text-[#666] hover:text-white bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 transition-colors"
            >
              V{latestVersion.version_number}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showVersions && (
              <div className="absolute top-full left-0 mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden z-50 shadow-xl min-w-[200px]">
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 px-3 py-2 hover:bg-[#222] transition-colors">
                    <span className="text-white text-sm">V{v.version_number}</span>
                    <span className="text-[#555] text-xs">{formatFileSize(v.file_size)}</span>
                    {v.is_deleted && <span className="text-xs text-[#444] ml-auto">削除済み</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1" />

        <Link
          href={`/videos/${video.id}/history`}
          className="flex items-center gap-1.5 text-xs text-[#666] hover:text-white transition-colors"
        >
          <History className="w-3.5 h-3.5" />
          履歴
        </Link>

        {isDirector && transition && (
          <button
            onClick={transition.next === 'approved' ? () => setShowApproveModal(true) : () => handleStatusChange(transition.next)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors ${transition.color}`}
          >
            {transition.label}
          </button>
        )}

        {isDirector && videoStatus === 'revised' && (
          <button
            onClick={() => setShowApproveModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-green-700 hover:bg-green-600 transition-colors"
          >
            校了
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Video + Annotations + Comment input */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Video area */}
          <div
            ref={videoContainerRef}
            className="relative flex-1 bg-black overflow-hidden"
            onMouseEnter={() => {
              if (videoContainerRef.current) {
                setVideoContainerSize({
                  w: videoContainerRef.current.clientWidth,
                  h: videoContainerRef.current.clientHeight,
                })
              }
            }}
          >
            {videoUrl ? (
              <VideoPlayer
                src={videoUrl}
                onTimeUpdate={setCurrentTime}
                onSeek={handleSeek}
                seekTo={seekTo}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-[#444]">
                {latestVersion?.is_deleted ? '動画ファイルは削除されています' : '動画を読み込めません'}
              </div>
            )}

            {/* Annotation canvas overlay */}
            {annotationMode && videoContainerSize.w > 0 && (
              <div className="absolute inset-0 pointer-events-auto z-10">
                <AnnotationCanvas
                  ref={annotationRef}
                  activeTool={activeTool}
                  activeColor={activeColor}
                  width={videoContainerSize.w}
                  height={videoContainerSize.h}
                />
              </div>
            )}
          </div>

          {/* Annotation toolbar */}
          {annotationMode && (
            <AnnotationToolbar
              activeTool={activeTool}
              activeColor={activeColor}
              onToolChange={setActiveTool}
              onColorChange={setActiveColor}
              onUndo={() => annotationRef.current?.undo()}
              onClear={() => annotationRef.current?.clear()}
              onClose={() => setAnnotationMode(false)}
            />
          )}

          {/* Comment input area */}
          <div className="flex-shrink-0 border-t border-[#222] bg-[#111] p-3">
            {/* Templates */}
            {templates.length > 0 && (
              <div className="flex gap-1.5 mb-2 flex-wrap">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => insertTemplate(t.content)}
                    className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#444] px-2 py-1 rounded-lg transition-colors truncate max-w-[200px]"
                    title={t.content}
                  >
                    {t.content}
                  </button>
                ))}
              </div>
            )}

            {replyTo && (
              <div className="flex items-center gap-2 text-xs text-[#666] mb-2">
                <span>返信中</span>
                <button onClick={() => setReplyTo(null)} className="text-indigo-400 hover:text-indigo-300">
                  キャンセル
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="コメントを入力..."
                rows={2}
                className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-indigo-500 resize-none transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendComment()
                }}
              />
              <div className="flex flex-col gap-2">
                <div className="flex gap-1.5">
                  {/* Timecode toggle */}
                  <button
                    onClick={() => setAttachTimecode(!attachTimecode)}
                    title={attachTimecode ? `タイムコード付き: ${formatTimecode(currentTime)}` : 'タイムコードなし'}
                    className={`p-2 rounded-lg text-sm transition-colors flex items-center gap-1 ${
                      attachTimecode ? 'bg-indigo-950/60 text-indigo-400' : 'bg-[#1a1a1a] text-[#555] hover:text-white'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {attachTimecode && (
                      <span className="text-xs font-mono">{formatTimecode(currentTime)}</span>
                    )}
                  </button>

                  {/* Annotation toggle */}
                  <button
                    onClick={() => {
                      if (!annotationMode && videoContainerRef.current) {
                        setVideoContainerSize({
                          w: videoContainerRef.current.clientWidth,
                          h: videoContainerRef.current.clientHeight,
                        })
                      }
                      setAnnotationMode(!annotationMode)
                    }}
                    title="マーキング"
                    className={`p-2 rounded-lg transition-colors ${
                      annotationMode ? 'bg-indigo-950/60 text-indigo-400' : 'bg-[#1a1a1a] text-[#555] hover:text-white'
                    }`}
                  >
                    <Pen className="w-3.5 h-3.5" />
                  </button>

                  {/* Image attach */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="画像添付"
                    className={`p-2 rounded-lg transition-colors ${
                      imageFile ? 'bg-indigo-950/60 text-indigo-400' : 'bg-[#1a1a1a] text-[#555] hover:text-white'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  />
                </div>

                <button
                  onClick={handleSendComment}
                  disabled={sending || (!commentText.trim() && !imageFile && !annotationMode)}
                  className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {imageFile && (
              <div className="mt-1.5 flex items-center gap-2 text-xs text-indigo-400">
                <ImageIcon className="w-3 h-3" />
                {imageFile.name}
                <button onClick={() => setImageFile(null)} className="text-[#555] hover:text-white ml-1">×</button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Comment panel */}
        <div className="w-80 flex-shrink-0 border-l border-[#222] flex flex-col overflow-hidden bg-[#111]">
          <CommentPanel
            comments={comments}
            currentVersionId={latestVersion?.id ?? ''}
            onSeek={handleSeek}
            onResolve={handleResolve}
          />
        </div>
      </div>

      {/* Approve modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 max-w-sm w-full mx-4">
            <h2 className="text-white font-semibold text-lg mb-2">校了にしますか？</h2>
            <p className="text-[#666] text-sm mb-4">
              動画ファイルはこのまま保持するか、ストレージから削除できます。
              コメントと修正履歴はすべて保存されます。
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await handleStatusChange('approved')
                  // Delete video files
                  if (latestVersion?.storage_path) {
                    await supabase.storage.from('videos').remove([latestVersion.storage_path])
                    await supabase.from('video_versions').update({ is_deleted: true }).eq('video_id', video.id)
                  }
                }}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                校了 + ファイル削除
              </button>
              <button
                onClick={() => handleStatusChange('approved')}
                className="flex-1 bg-green-700 hover:bg-green-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                校了 + ファイル保持
              </button>
            </div>
            <button
              onClick={() => setShowApproveModal(false)}
              className="w-full text-[#555] hover:text-white text-sm mt-3 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
