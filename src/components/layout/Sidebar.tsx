'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Film, LayoutDashboard, Upload, Users, Settings, LogOut, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface SidebarProps {
  unreadCount?: number
  userRole?: string
}

export default function Sidebar({ unreadCount = 0, userRole }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const isEditor = userRole === 'editor'

  const navItems = [
    { href: '/dashboard',  icon: LayoutDashboard, label: 'ダッシュボード', show: true },
    { href: '/upload',     icon: Upload,          label: 'アップロード',   show: isEditor },
    { href: '/members',    icon: Users,           label: 'メンバー管理',   show: !isEditor },
    { href: '/settings',   icon: Settings,        label: '設定',           show: true },
  ]

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-[#111] border-r border-[#222] h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-[#222]">
        <Film className="w-5 h-5 text-indigo-400" />
        <span className="text-[15px] font-bold text-white tracking-wide">FRAMEMARK</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.filter((item) => item.show).map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                ? 'bg-[#1e1e1e] text-white'
                : 'text-[#888] hover:text-white hover:bg-[#1a1a1a]'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 pb-4 border-t border-[#222] pt-3">
        {unreadCount > 0 && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#888] mb-1">
            <Bell className="w-4 h-4" />
            <span>通知</span>
            <span className="ml-auto bg-indigo-600 text-white text-xs font-medium rounded-full px-1.5 py-0.5">
              {unreadCount}
            </span>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#888] hover:text-white hover:bg-[#1a1a1a] transition-colors"
        >
          <LogOut className="w-4 h-4" />
          ログアウト
        </button>
      </div>
    </aside>
  )
}
