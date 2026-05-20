'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Film, Users, CheckCircle2, AlertCircle } from 'lucide-react'

interface InviteInfo {
  workspace_name: string
  invited_email: string | null
  is_accepted: boolean
}

export default function JoinPage() {
  const params = useParams()
  const token = params.token as string
  const router = useRouter()
  const supabase = createClient()

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchInvite() {
      const { data } = await supabase.rpc('get_workspace_invite', { invite_token: token })
      setInvite(data ?? null)
      setLoading(false)
    }
    fetchInvite()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleJoin() {
    setJoining(true)
    setError('')
    const { data } = await supabase.rpc('accept_workspace_invite', { invite_token: token })
    if (data?.success) {
      setJoined(true)
      setTimeout(() => router.push('/dashboard'), 1500)
    } else {
      setError('参加に失敗しました。招待リンクが無効または使用済みの可能性があります。')
      setJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center p-6">
      <div className="flex items-center gap-2 mb-8">
        <Film className="w-6 h-6 text-indigo-400" />
        <span className="text-xl font-bold text-white tracking-wide">FRAMEMARK</span>
      </div>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 max-w-sm w-full text-center">
        {loading ? (
          <p className="text-[#666] text-sm">読み込み中...</p>
        ) : !invite ? (
          <>
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h2 className="text-white font-semibold text-lg mb-2">招待リンクが無効です</h2>
            <p className="text-[#666] text-sm">このリンクは無効か、すでに使用済みです。ディレクターに新しいリンクを発行してもらってください。</p>
          </>
        ) : invite.is_accepted ? (
          <>
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <h2 className="text-white font-semibold text-lg mb-2">すでに参加済みです</h2>
            <p className="text-[#666] text-sm mb-5">このリンクはすでに使用済みです。</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
            >
              ダッシュボードへ
            </button>
          </>
        ) : joined ? (
          <>
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <h2 className="text-white font-semibold text-lg mb-2">参加しました！</h2>
            <p className="text-[#666] text-sm">ダッシュボードに移動します...</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 bg-indigo-900/40 border border-indigo-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-indigo-400" />
            </div>
            <h2 className="text-white font-semibold text-xl mb-1">組織への招待</h2>
            <p className="text-[#888] text-sm mb-1">以下の組織に招待されています</p>
            <p className="text-indigo-300 font-semibold text-lg mb-6">{invite.workspace_name}</p>

            {invite.invited_email && (
              <p className="text-[#555] text-xs mb-5">招待メール: {invite.invited_email}</p>
            )}

            {error && (
              <p className="text-red-400 text-sm mb-4">{error}</p>
            )}

            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
            >
              {joining ? '参加中...' : '参加する'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
