# AI エージェント向けルール — FRAMEMARK

## これはあなたが知っている Next.js ではありません

このプロジェクトは **Next.js 16.2.6** を使用しています。  
学習データにある Next.js 13〜15 とは API・規約・ファイル構成が異なります。  
コードを書く前に `node_modules/next/dist/docs/` の該当ガイドを必ず参照し、  
deprecation 警告を無視しないでください。

---

## 必ず守るルール

### ビルド

```bash
# ✅ 常にこれを使う
npm run dev
npm run build

# ❌ 直接実行は SWC エラーで失敗する
npx next dev
npx next build
```

### ファイル規約

| やること | やらないこと |
|---|---|
| `src/proxy.ts` を編集（認証プロキシ） | `middleware.ts` を作成 |
| `globals.css` の `@theme {}` を編集 | `tailwind.config.js` を作成 |
| `params: Promise<{ id: string }>` を await | params を同期で参照 |

### Supabase クライアント

```ts
// Server Component / Route Handler / Server Action
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// Client Component
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```

### 動的レンダリング

Supabase にアクセスする新しいルートグループの `layout.tsx` には必ず追加：

```ts
export const dynamic = 'force-dynamic'
```

---

## アーキテクチャの原則

### Server / Client の分離

```
page.tsx（Server Component）
  └─ DB アクセス・認証確認・signed URL 生成
  └─ *Client.tsx（Client Component）に props として渡す
       └─ インタラクション・state・イベントハンドラ
```

### RLS（Row Level Security）の注意点

- 全テーブルに RLS が有効
- `workspaces` ↔ `workspace_members` の相互参照は SECURITY DEFINER 関数で回避済み
- 新しいポリシーを追加する場合は無限再帰に注意

### 型定義

`src/lib/types.ts` に全テーブルの型が定義されています。  
`VideoStatus` に `'cancelled'` が含まれることに注意（draft / review / revision_requested / revised / approved / cancelled）。

---

## 主要コンポーネントのインターフェース

### VideoPlayer

```tsx
<VideoPlayer
  src={signedUrl}
  onTimeUpdate={(time) => {}}
  onSeek={(time, annotation?) => {}}
  seekTo={number | null}
  forcePause={boolean}  // アノテーションモード中は true
/>
```

### AnnotationCanvas（ref 経由）

```ts
annotationRef.current.getCanvasData()  // 現在の描画データを取得
annotationRef.current.loadShapes(shapes)  // 保存済みシェイプをロード
annotationRef.current.clear()
annotationRef.current.undo()
```

### VideoCard

```tsx
<VideoCard
  video={...}  // thumbnailUrl?: string | null を含む
  view="grid" | "list"
  requiresAction={boolean}
/>
```

### Sidebar

```tsx
<Sidebar
  unreadCount={number}   // 要対応動画数（0 のときバッジ非表示）
  userRole="director" | "editor"
/>
```

---

## ストレージ（Supabase Storage）

- バケット `videos`：動画ファイル（プライベート）
- バケット `images`：サムネイル・コメント画像（プライベート）
- ファイルアクセスには必ず `createSignedUrl` / `createSignedUrls` を使う
- `getPublicUrl` は使用しない（バケットが非公開のため無効）

### パスの命名規則

```
videos: <workspaceId>/<videoId>/vN.<ext>
images/thumbnails: thumbnails/<workspaceId>/<videoId>/vN.jpg
images/comments: <workspaceId>/<videoId>/comments/<timestamp>.<ext>
```

---

## コード品質のガイドライン

- コメントは「なぜ（Why）」が非自明な場合のみ書く。「何をしているか（What）」は書かない
- エラーハンドリングは境界（ユーザー入力・外部 API）にのみ実装する
- 抽象化は3箇所以上で重複するまで行わない
- Server Component でのデータ取得は並列化を意識する（`Promise.all`）
