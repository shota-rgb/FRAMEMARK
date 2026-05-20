import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { VideoStatus } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimecode(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

export function parseTimecode(tc: string): number {
  const parts = tc.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0]
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)

  if (diffMin < 1) return 'たった今'
  if (diffMin < 60) return `${diffMin}分前`
  if (diffH < 24) return `${diffH}時間前`
  if (diffD < 7) return `${diffD}日前`
  return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
}

export const STATUS_LABELS: Record<VideoStatus, string> = {
  draft: '初稿',
  review: 'レビュー中',
  revision_requested: '修正依頼済',
  revised: '修正済み',
  approved: '校了',
}

export const STATUS_COLORS: Record<VideoStatus, string> = {
  draft: 'bg-zinc-700 text-zinc-300',
  review: 'bg-amber-900/60 text-amber-400',
  revision_requested: 'bg-red-900/60 text-red-400',
  revised: 'bg-blue-900/60 text-blue-400',
  approved: 'bg-green-900/60 text-green-400',
}
