@AGENTS.md

# FRAMEMARK — 動画レビュープラットフォーム

YouTubeチャンネルのディレクター（発注者）と動画編集者（受注者）の間で
タイムコード付き修正指示を送り合うための動画レビューWebアプリ。

---

## 現在の状態

- コード実装：**完了**（ビルド通過済み）
- Supabase 接続：**設定済み**（本番環境で稼働中）
- DB スキーマ：**実行済み**（`supabase/schema.sql` を Supabase Dashboard で実行済み）
- Storage バケット：**作成済み**（`videos` / `images`）
- デプロイ：**未設定**（Vercel への設定が残タスク）

---

## 技術スタック

| 項目 | 内容 |
|---|---|
| フレームワーク | Next.js 16.2.6（App Router、**webpack モード**） |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS v4 |
| バックエンド | Supabase（DB + Auth + Storage） |
| デプロイ先 | Vercel（予定） |

---

## 重要な注意点（このプロジェクト固有の制約）

### 1. ビルドは必ず `--webpack` フラグを付ける

```bash
npm run dev    # 内部: next dev --webpack
npm run build  # 内部: next build --webpack
```

- `npx next dev` / `npx next build` は SWC コード署名エラーで失敗する（macOS）
- `package.json` の scripts に設定済みなので、必ず npm 経由で実行すること

### 2. `middleware.ts` は使わない → `proxy.ts` を使う

- Next.js 16 では middleware ファイル規約が非推奨になり `proxy.ts` に変更
- 認証プロキシは `src/proxy.ts` に実装済み
- 未認証ユーザーを `/login?next=<元のパス>` にリダイレクト

### 3. Tailwind は v4（設定ファイルなし）

- `tailwind.config.js` は存在しない
- カスタム設定は `src/app/globals.css` の `@theme {}` に記述する

### 4. 動的レンダリングの設定

- Supabase を使うレイアウトには `export const dynamic = 'force-dynamic'` が必要
- `(auth)/layout.tsx` と `(app)/layout.tsx` に設定済み
- 新しいルートグループを追加する場合は同様に設定すること

### 5. `params` は非同期（Next.js 16 の破壊的変更）

```tsx
// ✅ 正しい
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```

### 6. Supabase クライアントの使い分け

- `src/lib/supabase/server.ts` → Server Component / Route Handler / Server Action
- `src/lib/supabase/client.ts` → Client Component

---

## ディレクトリ構成

```
src/
├── app/
│   ├── actions.ts                    # Server Actions（markVideoSeen など）
│   ├── (auth)/login/                 # ログイン・サインアップ（ロール選択）
│   ├── (app)/
│   │   ├── layout.tsx                # 共通レイアウト（サイドバー・バッジカウント）
│   │   ├── dashboard/                # 動画一覧（グリッド/リスト・フィルタ）
│   │   ├── upload/                   # 動画アップロード（サムネイル自動生成）
│   │   ├── videos/[id]/              # 動画レビュー画面（メイン機能）
│   │   │   └── history/              # 修正履歴
│   │   ├── members/                  # メンバー管理（招待リンク発行）
│   │   └── settings/                 # テンプレート設定
│   ├── join/[token]/                 # 招待リンク受諾ページ
│   └── api/auth/callback/            # Supabase Auth コールバック
├── components/
│   ├── video/
│   │   ├── VideoPlayer.tsx           # カスタム動画プレイヤー（forcePause プロップあり）
│   │   ├── AnnotationCanvas.tsx      # Canvas 2D アノテーション（loadShapes メソッドあり）
│   │   ├── AnnotationToolbar.tsx     # 描画ツールバー（ペン/テキスト/四角/消去）
│   │   └── CommentPanel.tsx          # コメント一覧（画像表示・返信・解決）
│   ├── dashboard/
│   │   ├── VideoCard.tsx             # グリッド/リスト表示（thumbnailUrl プロップ）
│   │   └── StatusBadge.tsx
│   └── layout/Sidebar.tsx            # サイドバー（unreadCount・userRole プロップ）
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── types.ts                      # VideoStatus に 'cancelled' 含む
│   └── utils.ts                      # STATUS_LABELS / STATUS_COLORS 含む
└── proxy.ts                          # 認証プロキシ（旧 middleware）
```

---

## 起動手順

### 1. 環境変数を設定

```bash
cp .env.local.example .env.local
# .env.local を開いて Supabase URL と anon key を記入
```

### 2. DB スキーマを実行

Supabase Dashboard → **SQL Editor** に `supabase/schema.sql` の内容をコピペして実行。

> **オプション**：ファイル末尾の `video_status_seen` セクションも実行すると、
> バッジの既読処理がデバイス間でも同期される（未実行でも Cookie で動作する）。

### 3. Storage バケットを作成

Supabase Dashboard → Storage → New bucket:
- `videos`（Public: OFF、最大 5000 MB）
- `images`（Public: OFF、最大 50 MB）

### 4. Auth の設定

Supabase Dashboard → Authentication → Email → **「Confirm email」を OFF**

### 5. 開発サーバー起動

```bash
npm run dev
```

---

## 主要な DB テーブル

| テーブル | 説明 |
|---|---|
| `workspaces` | ワークスペース（ディレクター単位） |
| `workspace_members` | メンバー（role: director / editor、invitation_token 含む） |
| `videos` | 動画メタデータ・ステータス管理 |
| `video_versions` | V1, V2 バージョン管理（storage_path / thumbnail_path） |
| `comments` | タイムコード付きコメント・返信（parent_id）・画像パス |
| `annotations` | Canvas 描画データ（JSONB） |
| `comment_templates` | 修正指示テンプレート |
| `notifications` | ツール内通知 |
| `video_status_seen` | バッジ既読管理（**オプション**、schema.sql 末尾参照） |

---

## 実装済みの主要機能

### VideoStatus の遷移

```
'draft' → 'review' → 'revision_requested' → 'revised' → 'approved'
                ↑__________________________|
                                   任意のタイミングで → 'cancelled'
```

### バッジ（要対応カウント）のしくみ

1. `(app)/layout.tsx` で毎リクエスト時に計算
2. `get_unseen_action_count` RPC を優先使用（SQL マイグレーション必要）
3. RPC が失敗した場合は Cookie ベースのフォールバックで計算
   - `src/app/actions.ts > markVideoSeen()` が Cookie に既読情報を書き込む
   - `VideoReviewClient.tsx` のマウント時に自動で `markVideoSeen` を呼び出す

### サムネイル生成のしくみ

- アップロード時にブラウザの Canvas API で先頭フレームをキャプチャ
- `onloadeddata` イベントで取得（`onseeked` は使わない）
- 10 秒タイムアウトで失敗時は null（サムネイルなし状態で続行）
- `images` バケットの `thumbnails/<workspaceId>/<videoId>/vN.jpg` に保存

### アノテーション

- `AnnotationCanvas` は `ref` で `getCanvasData()` / `loadShapes()` / `clear()` / `undo()` を公開
- `VideoReviewClient` でタイムコードをクリックしたとき `pendingAnnotation` state 経由でキャンバスにロード
- `forcePause` プロップで描画モード中は動画を自動停止

### 招待フロー

1. ディレクターが MembersClient でメールを入力 → `invitation_token` を生成して DB 保存
2. 招待リンク（`/join/<token>`）を発行・コピー
3. 編集者がリンクを開く → `get_workspace_invite` RPC で招待情報取得
4. 「参加する」→ `accept_workspace_invite` RPC で `user_id` をセット
5. 未ログインの場合は `proxy.ts` が `/login?next=/join/<token>` にリダイレクト

---

## 残タスク・改善候補

- [ ] Vercel デプロイ設定（環境変数追加のみで動くはず）
- [ ] プロフィール設定 UI（display_name の変更、アバター）
- [ ] リアルタイム通知（Supabase Realtime 購読）
- [ ] `video_status_seen` SQL マイグレーション実行（デバイス間バッジ同期）
- [ ] 動画削除機能（ダッシュボードから動画自体を削除）
- [ ] モバイル対応
- [ ] アップロード進捗の正確な表示
