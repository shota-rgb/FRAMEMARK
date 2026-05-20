import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FRAMEMARK — 動画レビュープラットフォーム',
  description: 'フレーム単位で指示を届ける動画フィードバックツール',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  )
}
