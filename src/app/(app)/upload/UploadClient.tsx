'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Film, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatFileSize } from '@/lib/utils'

interface UploadClientProps {
  workspaceId: string
  userId: string
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

export default function UploadClient({ workspaceId, userId }: UploadClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [state, setState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = (f: File) => {
    setFile(f)
    setTitle(f.name.replace(/\.[^.]+$/, ''))
    setState('idle')
    setError('')
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('video/')) handleFile(f)
  }, [])

  async function handleUpload() {
    if (!file || !title.trim()) return
    setState('uploading')
    setProgress(0)
    setError('')

    try {
      // 1. Create video record
      const { data: video, error: videoErr } = await supabase
        .from('videos')
        .insert({ workspace_id: workspaceId, title: title.trim(), status: 'draft', uploader_id: userId })
        .select()
        .single()
      if (videoErr || !video) throw videoErr ?? new Error('動画レコードの作成に失敗')

      // 2. Upload to Supabase Storage
      const ext = file.name.split('.').pop()
      const storagePath = `${workspaceId}/${video.id}/v1.${ext}`

      // Simulate progress with interval (Supabase Storage doesn't expose native progress)
      const progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 5 : prev))
      }, 200)

      const { error: uploadErr } = await supabase.storage
        .from('videos')
        .upload(storagePath, file, { upsert: false })

      clearInterval(progressInterval)
      setProgress(100)
      if (uploadErr) throw uploadErr

      // 3. Create video version record
      const { error: versionErr } = await supabase
        .from('video_versions')
        .insert({
          video_id: video.id,
          version_number: 1,
          storage_path: storagePath,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: userId,
        })
      if (versionErr) throw versionErr

      // 4. Update video status to review
      await supabase.from('videos').update({ status: 'review' }).eq('id', video.id)

      setState('success')
      setTimeout(() => router.push(`/videos/${video.id}`), 1500)
    } catch (err: unknown) {
      setState('error')
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました')
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-1">動画アップロード</h1>
      <p className="text-[#666] text-sm mb-6">編集した動画をアップロードしてレビューを依頼します</p>

      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center cursor-pointer transition-colors ${
            isDragging ? 'border-indigo-500 bg-indigo-950/20' : 'border-[#2a2a2a] hover:border-[#444] bg-[#1a1a1a]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Upload className="w-12 h-12 text-[#444] mb-4" />
          <p className="text-white font-medium mb-1">動画ファイルをドロップ</p>
          <p className="text-[#555] text-sm">または クリックして選択</p>
          <p className="text-[#444] text-xs mt-3">MP4, MOV, MKV など対応 · 数GB対応</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* File info */}
          <div className="flex items-center gap-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3">
            <Film className="w-5 h-5 text-indigo-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{file.name}</p>
              <p className="text-[#666] text-xs">{formatFileSize(file.size)}</p>
            </div>
            {state === 'idle' && (
              <button
                onClick={() => { setFile(null); setTitle('') }}
                className="text-[#555] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm text-[#888] mb-1.5">動画タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="動画のタイトルを入力"
            />
          </div>

          {/* Progress */}
          {state === 'uploading' && (
            <div>
              <div className="flex justify-between text-xs text-[#666] mb-1.5">
                <span>アップロード中...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {state === 'success' && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              アップロード完了！レビュー画面に移動します...
            </div>
          )}

          {state === 'error' && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {(state === 'idle' || state === 'error') && (
            <button
              onClick={handleUpload}
              disabled={!title.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
            >
              アップロード開始
            </button>
          )}
        </div>
      )}
    </div>
  )
}
