'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Film, Video, Scissors } from 'lucide-react'
import { cn } from '@/lib/utils'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [role, setRole] = useState<'director' | 'editor'>('director')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push(next)
        router.refresh()
      } else {
        if (role === 'director' && !orgName.trim()) {
          setError('組織名を入力してください')
          setLoading(false)
          return
        }
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${location.origin}/api/auth/callback`,
            data: {
              role,
              org_name: role === 'director' ? orgName.trim() : undefined,
            },
          },
        })
        if (error) throw error
        if (signUpData.session) {
          // Email confirmation disabled — user is signed in immediately
          router.push(next)
          router.refresh()
        } else {
          setError('確認メールを送信しました。メールを確認してください。')
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm px-6 relative">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin h-10 w-10 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-[#aaa]">処理中...</span>
          </div>
        </div>
      )}
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Film className="w-7 h-7 text-indigo-400" />
          <span className="text-2xl font-bold text-white tracking-wide">FRAMEMARK</span>
        </div>
        <p className="text-[#888] text-sm">フレーム単位で指示を届ける動画レビューツール</p>
      </div>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        <h1 className="text-lg font-semibold text-white mb-5">
          {mode === 'login' ? 'ログイン' : 'アカウント作成'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role selection (signup only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-sm text-[#888] mb-2">アカウントの種類</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('director')}
                  className={cn(
                    'flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border text-sm transition-colors',
                    role === 'director'
                      ? 'border-indigo-500 bg-indigo-950/40 text-white'
                      : 'border-[#333] text-[#666] hover:border-[#444] hover:text-white'
                  )}
                >
                  <Video className="w-5 h-5" />
                  <span className="font-medium">ディレクター</span>
                  <span className="text-xs text-[#666] leading-tight text-center">動画をレビューする</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('editor')}
                  className={cn(
                    'flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border text-sm transition-colors',
                    role === 'editor'
                      ? 'border-indigo-500 bg-indigo-950/40 text-white'
                      : 'border-[#333] text-[#666] hover:border-[#444] hover:text-white'
                  )}
                >
                  <Scissors className="w-5 h-5" />
                  <span className="font-medium">編集者</span>
                  <span className="text-xs text-[#666] leading-tight text-center">動画を編集・納品する</span>
                </button>
              </div>
            </div>
          )}

          {/* Org name (director signup only) */}
          {mode === 'signup' && role === 'director' && (
            <div>
              <label className="block text-sm text-[#888] mb-1.5">組織名</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="例：〇〇プロダクション"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-[#888] mb-1.5">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-[#888] mb-1.5">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className={`text-sm ${error.includes('送信') ? 'text-green-400' : 'text-red-400'}`}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {loading ? '処理中...' : mode === 'login' ? 'ログイン' : 'アカウント作成'}
          </button>
        </form>

        <p className="text-center text-sm text-[#666] mt-4">
          {mode === 'login' ? 'アカウントをお持ちでない方は' : 'すでにアカウントをお持ちの方は'}{' '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {mode === 'login' ? '新規登録' : 'ログイン'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm px-6 text-[#666] text-sm text-center">読み込み中...</div>}>
      <LoginForm />
    </Suspense>
  )
}
