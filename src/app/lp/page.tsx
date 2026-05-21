import Link from 'next/link'
import Image from 'next/image'
import { Film, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080810] text-white">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#080810]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-6 h-6 text-indigo-400" />
            <span className="text-lg font-bold tracking-wide">FRAMEMARK</span>
          </div>
          <Link
            href="/login"
            className="text-sm text-[#aaa] border border-[#333] rounded-lg px-4 py-2 hover:border-[#555] hover:text-white transition-colors"
          >
            サインイン
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-36 pb-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 tracking-tight">
            動画修正を、<br />もっとスマートに。
          </h1>
          <p className="text-lg text-[#999] mb-10 max-w-lg mx-auto leading-relaxed">
            タイムコード付きコメントで、<br />
            ディレクターと編集者のやり取りを一元管理
          </p>
          <div className="flex items-center justify-center gap-4 mb-16">
            <Link
              href="/login"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-7 py-3 rounded-lg transition-colors"
            >
              無料で始める
            </Link>
            <Link
              href="/login"
              className="border border-[#444] hover:border-[#666] text-white font-semibold px-7 py-3 rounded-lg transition-colors flex items-center gap-2"
            >
              <span className="text-indigo-400 text-xs">▶</span> デモを見る
            </Link>
          </div>

          {/* Hero mockup */}
          <div className="relative max-w-4xl mx-auto rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-indigo-900/30">
            <Image
              src="/screenshots/hero.png"
              alt="FRAMEMARKのビデオレビュー画面"
              width={1000}
              height={435}
              className="w-full h-auto"
              unoptimized
            />
          </div>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
          {/* Problems */}
          <div className="bg-[#12121e] border border-[#1e1e1e] rounded-2xl p-8">
            <div className="flex items-center gap-2.5 mb-7">
              <span className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-xs font-bold">✕</span>
              <h2 className="text-sm font-semibold text-red-400 tracking-wide">よくある課題</h2>
            </div>
            <div className="space-y-6">
              {[
                {
                  icon: '📧',
                  title: 'メール・LINEで修正指示がバラバラ',
                  desc: '必要な情報が分散し、見落としが発生',
                },
                {
                  icon: '🎬',
                  title: 'どの場面の話か伝わらない',
                  desc: '時間指定が曖昧で、確認に時間がかかる',
                },
                {
                  icon: '📁',
                  title: 'バージョン管理が混乱する',
                  desc: '最新版がどれか分からず、ミスが起きる',
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-3.5">
                  <span className="text-xl mt-0.5 flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="text-xs text-[#666] mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Solutions */}
          <div className="bg-[#0d0d22] border border-indigo-900/40 rounded-2xl p-8">
            <div className="flex items-center gap-2.5 mb-7">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold">✓</span>
              <h2 className="text-sm font-semibold text-indigo-400 tracking-wide">FRAMEMARKなら解決できます</h2>
            </div>
            <div className="space-y-6">
              {[
                {
                  icon: '🗂️',
                  title: 'すべての指示を一元管理',
                  desc: 'プラットフォーム上で完結し、見落としゼロ',
                },
                {
                  icon: '⏱️',
                  title: 'タイムコードで正確に伝わる',
                  desc: '該当シーンにピンポイントで指示可能',
                },
                {
                  icon: '🔖',
                  title: 'バージョンを自動で整理',
                  desc: '最新版が明確で、常にすぐ分かる',
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-3.5">
                  <span className="text-xl mt-0.5 flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="text-xs text-[#666] mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-14">主な機能</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'タイムコード付きコメント',
                desc: '正確な時間を指定して、的確に指示',
                src: '/screenshots/feature-timecode.png',
                w: 530, h: 331,
              },
              {
                title: 'マーキング & アノテーション',
                desc: '映像に直接書き込み、視覚的に共有',
                src: '/screenshots/feature-annotation.png',
                w: 580, h: 265,
              },
              {
                title: 'バージョン管理',
                desc: 'バージョンの履歴とステータスを可視化',
                src: '/screenshots/feature-version.png',
                w: 530, h: 225,
              },
            ].map((feature) => (
              <div key={feature.title} className="bg-[#12121e] border border-[#1e1e1e] rounded-2xl overflow-hidden">
                <Image
                  src={feature.src}
                  alt={feature.title}
                  width={feature.w}
                  height={feature.h}
                  className="w-full h-auto border-b border-[#1a1a1a]"
                  unoptimized
                />
                <div className="p-5">
                  <h3 className="font-semibold text-white mb-1.5 text-sm">{feature.title}</h3>
                  <p className="text-xs text-[#666] leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Review Flow */}
      <section className="py-20 px-6 bg-[#0a0a14]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">レビューの流れ</h2>

          <div className="flex gap-6 items-start">
            {/* Director */}
            <div className="flex flex-col items-center gap-2 pt-1 flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-indigo-900/50 border border-indigo-700/50 flex items-center justify-center">
                <span className="text-xl">👤</span>
              </div>
              <span className="text-xs text-[#888] font-medium">ディレクター</span>
            </div>

            {/* Steps */}
            <div className="flex-1 space-y-3">
              {[
                { num: 1, label: 'アップロード', sub: '映像ファイルをアップロード', side: 'left' },
                { num: 2, label: 'レビュー申請', sub: 'レビューを依頼', side: 'left' },
                { num: 3, label: '修正依頼', sub: 'タイムコード付きで指示', side: 'right' },
                { num: 4, label: '修正版アップロード', sub: '修正した映像を再アップロード', side: 'right' },
                { num: 5, label: '校了', sub: '最終確認して承認', side: 'left' },
              ].map((step) => (
                <div
                  key={step.num}
                  className={`flex items-center gap-3 ${step.side === 'right' ? 'flex-row-reverse' : ''}`}
                >
                  <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {step.num}
                  </span>
                  <div className={`bg-[#12121e] border border-[#1e1e1e] rounded-xl px-4 py-3 flex-1 ${step.side === 'right' ? 'text-right' : ''}`}>
                    <p className="text-sm font-medium text-white">{step.label}</p>
                    <p className="text-xs text-[#555] mt-0.5">{step.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Editor */}
            <div className="flex flex-col items-center gap-2 pt-1 flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center">
                <span className="text-xl">👤</span>
              </div>
              <span className="text-xs text-[#888] font-medium">編集者</span>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">ダッシュボード</h2>
          <div className="rounded-2xl overflow-hidden border border-white/8 shadow-2xl shadow-indigo-900/10">
            <Image
              src="/screenshots/dashboard.png"
              alt="FRAMEMARKのダッシュボード"
              width={1000}
              height={420}
              className="w-full h-auto"
              unoptimized
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-28 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-700/15 rounded-full blur-[80px]" />
        </div>
        <div className="relative">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">今すぐチームのレビューを改善する</h2>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-10 py-4 rounded-xl transition-colors text-base"
          >
            無料で始める <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#141414] py-8 text-center text-sm text-[#444]">
        © 2025 FRAMEMARK
      </footer>
    </div>
  )
}
