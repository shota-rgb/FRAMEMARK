'use client'

import { useState } from 'react'
import { UserPlus, Link, Users, Trash2, Copy, Check } from 'lucide-react'
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
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [newInviteLink, setNewInviteLink] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setAdding(true)
    setError('')
    setNewInviteLink(null)

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
      setNewInviteLink(`${window.location.origin}/join/${token}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '追加に失敗しました')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm('このメンバーを削除しますか？')) return
    const { error } = await supabase.from('workspace_members').delete().eq('id', memberId)
    if (!error) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
      if (newInviteLink) setNewInviteLink(null)
    }
  }

  function copyLink(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
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

      {/* Add member form */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 mb-6">
        <h2 className="text-white font-medium mb-1 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-indigo-400" />
          編集者を追加
        </h2>
        <p className="text-[#555] text-xs mb-4">メールアドレスを入力すると招待リンクが発行されます。そのリンクを編集者に共有してください。</p>
        <form onSubmit={handleAddMember} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="編集者のメールアドレス"
            className="flex-1 bg-[#252525] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={adding || !email.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            {adding ? '追加中...' : '追加'}
          </button>
        </form>

        {/* New invite link */}
        {newInviteLink && (
          <div className="mt-3 bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Link className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs text-indigo-400 font-medium">招待リンクが発行されました</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#888] flex-1 truncate font-mono bg-[#1a1a1a] px-2 py-1.5 rounded-lg">
                {newInviteLink}
              </span>
              <button
                onClick={() => copyLink(newInviteLink, 'new')}
                className="flex items-center gap-1 text-xs text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
              >
                {copiedId === 'new' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedId === 'new' ? 'コピー済み' : 'コピー'}
              </button>
            </div>
            <p className="text-xs text-[#555] mt-2">このリンクを編集者に送ってください。リンクを開くと組織に参加できます。</p>
          </div>
        )}

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      {/* Members list */}
      <div className="space-y-2">
        <h2 className="text-[#666] text-sm font-medium mb-3">
          メンバー ({members.length + 1}名)
        </h2>

        {/* Owner */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl">
          <div className="w-8 h-8 bg-indigo-900/60 rounded-full flex items-center justify-center text-indigo-400 text-sm font-bold">
            D
          </div>
          <div className="flex-1">
            <p className="text-white text-sm font-medium">あなた（オーナー）</p>
          </div>
          <span className="text-xs text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded">ディレクター</span>
        </div>

        {members.map((m) => {
          const inviteLink = m.invitation_token
            ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${m.invitation_token}`
            : null
          const copyId = `member-${m.id}`

          return (
            <div key={m.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 bg-[#252525] rounded-full flex items-center justify-center text-[#666] text-sm font-bold">
                  {(m.display_name ?? m.invited_email ?? 'E')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{m.display_name ?? m.invited_email}</p>
                  {m.invited_email && m.display_name !== m.invited_email.split('@')[0] && (
                    <p className="text-[#555] text-xs truncate">{m.invited_email}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {m.is_accepted ? (
                    <span className="text-xs text-green-500 bg-green-950/40 px-2 py-0.5 rounded">参加済み</span>
                  ) : (
                    <span className="text-xs text-amber-500 bg-amber-950/40 px-2 py-0.5 rounded">招待中</span>
                  )}
                  <span className="text-xs text-[#555] bg-[#252525] px-2 py-0.5 rounded">編集者</span>
                  <button
                    onClick={() => handleRemove(m.id)}
                    className="text-[#444] hover:text-red-400 transition-colors ml-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Invite link for pending members */}
              {!m.is_accepted && inviteLink && (
                <div className="border-t border-[#222] px-4 py-2.5 flex items-center gap-2 bg-[#111]">
                  <Link className="w-3 h-3 text-[#555] flex-shrink-0" />
                  <span className="text-xs text-[#666] flex-1 truncate font-mono">{inviteLink}</span>
                  <button
                    onClick={() => copyLink(inviteLink, copyId)}
                    className="flex items-center gap-1 text-xs text-[#666] hover:text-white transition-colors flex-shrink-0"
                  >
                    {copiedId === copyId ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === copyId ? 'コピー済み' : 'コピー'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
