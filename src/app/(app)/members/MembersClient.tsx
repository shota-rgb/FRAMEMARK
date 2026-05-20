'use client'

import { useState } from 'react'
import { UserPlus, Mail, Users, Trash2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Workspace, WorkspaceMember } from '@/lib/types'

interface MembersClientProps {
  workspace: Workspace
  members: WorkspaceMember[]
  currentUserId: string
}

export default function MembersClient({ workspace, members: initialMembers, currentUserId }: MembersClientProps) {
  const supabase = createClient()
  const [members, setMembers] = useState(initialMembers)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    setError('')
    setSuccess(false)

    try {
      const token = crypto.randomUUID()
      const { data, error: err } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: null,
          role: 'editor',
          invited_email: email.trim(),
          invitation_token: token,
          is_accepted: false,
          display_name: email.split('@')[0],
        })
        .select()
        .single()

      if (err) throw err

      setMembers((prev) => [...prev, data])
      setEmail('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '招待に失敗しました')
    } finally {
      setSending(false)
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm('このメンバーを削除しますか？')) return
    const { error } = await supabase.from('workspace_members').delete().eq('id', memberId)
    if (!error) setMembers((prev) => prev.filter((m) => m.id !== memberId))
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-5 h-5 text-[#666]" />
        <div>
          <h1 className="text-white font-bold text-lg">メンバー管理</h1>
          <p className="text-[#666] text-sm">{workspace.name}</p>
        </div>
      </div>

      {/* Invite form */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 mb-6">
        <h2 className="text-white font-medium mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-indigo-400" />
          編集者を招待
        </h2>
        <form onSubmit={handleInvite} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="編集者のメールアドレス"
            className="flex-1 bg-[#252525] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={sending || !email.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            {sending ? '送信中...' : '招待'}
          </button>
        </form>
        {success && (
          <p className="flex items-center gap-2 text-green-400 text-sm mt-2">
            <CheckCircle2 className="w-4 h-4" />
            招待を送信しました
          </p>
        )}
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      {/* Members list */}
      <div className="space-y-2">
        <h2 className="text-[#666] text-sm font-medium mb-3">メンバー ({members.length + 1}名)</h2>

        {/* Owner (current user) */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl">
          <div className="w-8 h-8 bg-indigo-900/60 rounded-full flex items-center justify-center text-indigo-400 text-sm font-bold">
            D
          </div>
          <div className="flex-1">
            <p className="text-white text-sm font-medium">あなた</p>
            <p className="text-[#555] text-xs">ディレクター（オーナー）</p>
          </div>
          <span className="text-xs text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded">ディレクター</span>
        </div>

        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl">
            <div className="w-8 h-8 bg-[#252525] rounded-full flex items-center justify-center text-[#666] text-sm font-bold">
              {(m.display_name ?? m.invited_email ?? 'E')[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-white text-sm">{m.display_name ?? m.invited_email}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {m.invited_email && (
                  <span className="flex items-center gap-1 text-[#555] text-xs">
                    <Mail className="w-3 h-3" />
                    {m.invited_email}
                  </span>
                )}
                {!m.is_accepted && (
                  <span className="text-xs text-amber-500">招待中</span>
                )}
              </div>
            </div>
            <span className="text-xs text-[#555] bg-[#252525] px-2 py-0.5 rounded">編集者</span>
            <button
              onClick={() => handleRemove(m.id)}
              className="text-[#444] hover:text-red-400 transition-colors ml-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
