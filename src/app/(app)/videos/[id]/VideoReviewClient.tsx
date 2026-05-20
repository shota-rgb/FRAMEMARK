'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, Pen, Send, Image as ImageIcon, Clock,
  AlertCircle, CheckCircle, MoreHorizontal, History, ChevronDown, Upload, X
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import VideoPlayer from '@/components/video/VideoPlayer'
import AnnotationToolbar, { type AnnotationTool, type AnnotationColor } from '@/components/video/AnnotationToolbar'
import CommentPanel from '@/components/video/CommentPanel'
import StatusBadge from '@/components/dashboard/StatusBadge'
import { createClient } from '@/lib/supabase/client'
import { formatTimecode, formatFileSize, STATUS_LABELS } from '@/lib/utils'
import type { Video, VideoVersion, Comment, CommentTemplate, VideoStatus, Annotation } from '@/lib/types'
import type { AnnotationCanvasRef, DrawShape } from '@/components/video/AnnotationCanvas'

const AnnotationCanvas = dynamic(() => import('@/components/video/AnnotationCanvas'), { ssr: false })

interface VideoReviewClientProps {
  video: Video
  versions: VideoVersion[]
  latestVersion: VideoVersion | null
  videoUrl: string | null
  comments: Comment[]
  templates: CommentTemplate[]
  currentUser: { id: string; email: string; display_name?: string | null }
  isDirector: boolean
}

// Director: which statuses allow which one-click transitions
const DIRECTOR_TRANSITIONS: Partial<Record<VideoStatus, { label: string; next: VideoStatus; color: string }>> = {
  review:  { label: '修正依頼を送る', next: 'revision_requested', color: 'bg-red-600 hover:bg-red-500' },
  revised: { label: '再レビューする', next: 'review',             color: 'bg-amber-600 hover:bg-amber-500' },
}

// Editor: which statuses allow which one-click transitions
const EDITOR_TRANSITIONS: Partial<Record<VideoStatus, { label: string; next: VideoStatus; color: string }>> = {
  draft: { label: 'レビュー申請', next: 'review', color: 'bg-indigo-600 hover:bg-indigo-500' },
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
  const [activeTool, setActiveTool] = useState<AnnotationTool>('select')
  const [activeColor, setActiveColor] = useState<AnnotationColor>('#ef4444')
  const [commentText, setCommentText] = useState('')
  const [attachTimecode, setAttachTimecode] = useState(true)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [videoStatus, setVideoStatus] = useState<VideoStatus>(video.status)
  const [showVersions, setShowVersions] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadFileInputRef = useRef<HTMLInputElement>(null)
  const [videoContainerSize, setVideoContainerSize] = useState({ w: 0, h: 0 })
  const [pendingAnnotation, setPendingAnnotation] = useState<DrawShape[] | null>(null)

  const handleSeek = useCallback((time: number, annotation?: Annotation | null) => {
    setSeekTo(time)
    if (annotation?.canvas_data) {
      const data = annotation.canvas_data as { shapes?: DrawShape[] }
      if (data.shapes?.length) {
        if (videoContainerRef.current) {
          setVideoContainerSize({
            w: videoContainerRef.current.clientWidth,
            h: videoContainerRef.current.clientHeight,
          })
        }
        setAnnotationMode(true)
        setPendingAnnotation(data.shapes)
      }
    }
  }, [])

  // アノテーションモードが有効になった後、保留中のシェイプをキャンバスにロード
  useEffect(() => {
    if (annotationMode && pendingAnnotation !== null && annotationRef.current) {
      annotationRef.current.loadShapes(pendingAnnotation)
      setPendingAnnotation(null)
    }
  }, [annotationMode, pendingAnnotation])

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
        author: { display_name: currentUser.display_name ?? null, email: currentUser.email },
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

  async function handleV2Upload() {
    if (!uploadFile) return
    setUploading(true)
    setUploadError(null)
    try {
      const nextVersion = (versions[0]?.version_number ?? 0) + 1
      const ext = uploadFile.name.split('.').pop()
      const path = `${video.workspace_id}/${video.id}/v${nextVersion}_${Date.now()}.${ext}`

      const { error: storageErr } = await supabase.storage.from('videos').upload(path, uploadFile)
      if (storageErr) throw new Error('動画のアップロードに失敗しました')

      const { error: versionErr } = await supabase.from('video_versions').insert({
        video_id: video.id,
        version_number: nextVersion,
        storage_path: path,
        file_name: uploadFile.name,
        file_size: uploadFile.size,
        uploaded_by: currentUser.id,
      })
      if (versionErr) {
        await supabase.storage.from('videos').remove([path])
        throw new Error('バージョン情報の保存に失敗しました')
      }

      await handleStatusChange('revised')
      setShowUploadModal(false)
      setUploadFile(null)
      router.refresh()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setUploading(false)
    }
  }

  function insertTemplate(content: string) {
    setCommentText((prev) => prev ? `${prev}\n${content}` : content)
  }

  const directorTransition = DIRECTOR_TRANSITIONS[videoStatus]
  const editorTransition = EDITOR_TRANSITIONS[videoStatus]

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

        {/* ── Editor actions ── */}
        {!isDirector && editorTransition && (
          <button
            onClick={() => handleStatusChange(editorTransition.next)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors ${editorTransition.color}`}
          >
            {editorTransition.label}
          </button>
        )}
        {!isDirector && videoStatus === 'revision_requested' && (
          <button
            onClick={() => { setShowUploadModal(true); setUploadError(null) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            修正版をアップロード
          </button>
        )}

        {/* ── Director actions ── */}
        {isDirector && directorTransition && (
          <button
            onClick={() => handleStatusChange(directorTransition.next)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors ${directorTransition.color}`}
          >
            {directorTransition.label}
          </button>
        )}
        {isDirector && (videoStatus === 'review' || videoStatus === 'revised') && (
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
            className="relative flex-1 bg-black overflow-hidden flex items-center justify-center"
            onMouseEnter={() => {
              if (videoContainerRef.current) {
                setVideoContainerSize({
                  w: videoContainerRef.current.clientWidth,
                  h: videoContainerRef.current.clientHeight,
                })
              }
            }}
          >
            {/* Annotation mode notice — shown above the canvas, z-20 */}
            {annotationMode && (
              <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between bg-black/85 backdrop-blur-sm px-3 py-2 pointer-events-auto">
                <div className="flex items-center gap-1.5 text-xs text-white/70">
                  <Pen className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                  <span>描画モード中 — 再生・シーク操作は停止しています</span>
                </div>
                <button
                  onClick={() => setAnnotationMode(false)}
                  className="flex items-center gap-1 text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-colors flex-shrink-0 ml-3"
                >
                  <X className="w-3 h-3" />
                  閉じて動画操作へ
                </button>
              </div>
            )}

            {videoUrl ? (
              <VideoPlayer
                src={videoUrl}
                onTimeUpdate={setCurrentTime}
                onSeek={handleSeek}
                seekTo={seekTo}
                forcePause={annotationMode}
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

            {replyTo && (() => {
              const parent = comments.find((c) => c.id === replyTo)
              return (
                <div className="flex items-center gap-2 text-xs mb-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2">
                  <ChevronRight className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <span className="text-[#888] truncate flex-1">
                    {parent?.author?.display_name ?? parent?.author?.email ?? '不明'}:&nbsp;{parent?.content}
                  </span>
                  <button onClick={() => setReplyTo(null)} className="text-[#555] hover:text-white flex-shrink-0 ml-1">×</button>
                </div>
              )
            })()}

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
            onReply={(id) => setReplyTo(id)}
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

      {/* V2 Upload modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 max-w-sm w-full mx-4">
            <h2 className="text-white font-semibold text-lg mb-1">修正版をアップロード</h2>
            <p className="text-[#666] text-sm mb-4">
              修正した動画を選択してください。アップロード後、ステータスが「修正済み」になります。
            </p>

            {!uploadFile ? (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#333] rounded-xl p-8 cursor-pointer hover:border-indigo-500 transition-colors">
                <Upload className="w-8 h-8 text-[#555] mb-2" />
                <span className="text-[#666] text-sm">クリックして動画を選択</span>
                <input
                  ref={uploadFileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                />
              </label>
            ) : (
              <div className="bg-[#111] rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
                <Upload className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{uploadFile.name}</p>
                  <p className="text-[#555] text-xs mt-0.5">{formatFileSize(uploadFile.size)}</p>
                </div>
                <button
                  onClick={() => setUploadFile(null)}
                  className="text-[#555] hover:text-white text-xs flex-shrink-0"
                  disabled={uploading}
                >
                  ×
                </button>
              </div>
            )}

            {uploading && (
              <div className="mt-3 mb-2">
                <div className="h-1.5 bg-[#333] rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full animate-pulse w-full" />
                </div>
                <p className="text-xs text-[#666] mt-1.5 text-center">アップロード中...</p>
              </div>
            )}

            {uploadError && (
              <p className="text-red-400 text-xs mt-2 mb-1">{uploadError}</p>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadError(null) }}
                disabled={uploading}
                className="flex-1 bg-[#2a2a2a] hover:bg-[#333] text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-40"
              >
                キャンセル
              </button>
              <button
                onClick={handleV2Upload}
                disabled={!uploadFile || uploading}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                アップロード
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
