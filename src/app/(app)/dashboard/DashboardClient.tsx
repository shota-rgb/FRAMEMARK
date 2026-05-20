'use client'

import { useState } from 'react'
import { LayoutGrid, List, Search } from 'lucide-react'
import VideoCard from '@/components/dashboard/VideoCard'
import StatusBadge from '@/components/dashboard/StatusBadge'
import { STATUS_LABELS } from '@/lib/utils'
import type { Video, VideoStatus, VideoVersion, Workspace } from '@/lib/types'

type EnrichedVideo = Video & {
  video_versions: VideoVersion[]
  latestVersion: VideoVersion | null
  commentCount: number
  thumbnailUrl?: string | null
}

const STATUS_FILTERS: VideoStatus[] = [
  'draft',
  'review',
  'revision_requested',
  'revised',
  'approved',
  'cancelled',
]

interface DashboardClientProps {
  videos: EnrichedVideo[]
  workspace: Workspace
  summary: { total: number; review: number; revision_requested: number; approved: number }
  isDirector: boolean
}

export default function DashboardClient({ videos, workspace, summary, isDirector }: DashboardClientProps) {
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<VideoStatus | 'all'>('all')

  const actionRequiredStatuses: VideoStatus[] = isDirector
    ? ['review', 'revised']
    : ['revision_requested']
  const pendingCount = videos.filter((v) => actionRequiredStatuses.includes(v.status)).length

  const filtered = videos.filter((v) => {
    const matchSearch = v.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || v.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">{workspace.name}</h1>
        <p className="text-[#666] text-sm mt-0.5">
          {isDirector ? 'ディレクター' : '編集者'} · {summary.total}本の動画
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: '合計',      value: summary.total,                color: 'text-white',     highlight: false },
          { label: 'レビュー中', value: summary.review,               color: 'text-amber-400', highlight: false },
          { label: '修正依頼済', value: summary.revision_requested,   color: 'text-red-400',   highlight: false },
          { label: '校了',      value: summary.approved,             color: 'text-green-400', highlight: false },
          { label: '要対応',    value: pendingCount,                 color: pendingCount > 0 ? 'text-indigo-400' : 'text-[#555]', highlight: pendingCount > 0 },
        ].map(({ label, value, color, highlight }) => (
          <div key={label} className={`rounded-xl px-4 py-3 border transition-colors ${highlight ? 'bg-indigo-950/30 border-indigo-800/50' : 'bg-[#1a1a1a] border-[#2a2a2a]'}`}>
            <p className={`text-xs mb-1 ${highlight ? 'text-indigo-400/70' : 'text-[#666]'}`}>{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
          <input
            type="text"
            placeholder="動画を検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-1">
          {(['all', ...STATUS_FILTERS] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white'
                  : 'text-[#666] hover:text-white'
              }`}
            >
              {s === 'all' ? 'すべて' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-auto bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-1">
          <button
            onClick={() => setView('grid')}
            className={`p-1.5 rounded transition-colors ${view === 'grid' ? 'bg-[#333] text-white' : 'text-[#555] hover:text-white'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-1.5 rounded transition-colors ${view === 'list' ? 'bg-[#333] text-white' : 'text-[#555] hover:text-white'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Video list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-[#555] text-lg mb-2">動画がありません</p>
          <p className="text-[#444] text-sm">動画をアップロードして始めましょう</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((v) => (
            <VideoCard key={v.id} video={v} view="grid" requiresAction={actionRequiredStatuses.includes(v.status)} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((v) => (
            <VideoCard key={v.id} video={v} view="list" requiresAction={actionRequiredStatuses.includes(v.status)} />
          ))}
        </div>
      )}
    </div>
  )
}
