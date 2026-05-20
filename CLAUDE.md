@AGENTS.md

# FRAMEMARK — 動画レビュープラットフォーム

YouTubeチャンネルのディレクター（発注者）と動画編集者（受注者）の間で
タイムコード付き修正指示を送り合うための動画レビューWebアプリ。

---

## 現在の状態

- コード実装：**完了**（ビルド通過済み）
- Supabase 接続：**未設定**（`.env.local` が必要）
- DB スキーマ：**未実行**（`supabase/schema.sql` を Supabase Dashboard で実行する必要あり）
- Storage バケット：**未作成**

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

1. **ビルドは必ず `--webpack` フラグを付ける**
   - `npm run dev` / `npm run build` はすでに `--webpack` 付きに設定済み
   - 理由：SWC ネイティブバイナリのコード署名エラー（macOS）

2. **`middleware.ts` は使わない → `proxy.ts` を使う**
   - Next.js 16 では `middleware` ファイル規約が非推奨になり `proxy.ts` に変更
   - 認証プロキシは `src/proxy.ts` に実装済み

3. **Tailwind は v4（設定ファイルなし）**
   - `tailwind.config.js` は存在しない
   - カスタム設定は `globals.css` の `@theme` に記述する

4. **動的レンダリングの設定**
   - Supabase を使うレイアウトには `export const dynamic = 'force-dynamic'` が必要
   - `(auth)/layout.tsx` と `(app)/layout.tsx` に設定済み

---

## ディレクトリ構成

```
src/
├── app/
│   ├── (auth)/login/         # ログイン・サインアップ
│   ├── (app)/
│   │   ├── dashboard/        # 動画一覧（グリッド/リスト表示）
│   │   ├── upload/           # 動画アップロード
│   │   ├── videos/[id]/      # 動画レビュー画面（メイン機能）
│   │   │   └── history/      # 修正履歴
│   │   ├── members/          # メンバー管理
│   │   └── settings/         # テンプレート設定
│   └── api/auth/callback/    # Supabase Auth コールバック
├── components/
│   ├── video/
│   │   ├── VideoPlayer.tsx       # カスタム動画プレイヤー
│   │   ├── AnnotationCanvas.tsx  # Canvas 2D アノテーション
│   │   ├── AnnotationToolbar.tsx # 描画ツールバー
│   │   └── CommentPanel.tsx      # コメント一覧パネル
│   ├── dashboard/
│   │   ├── VideoCard.tsx
│   │   └── StatusBadge.tsx
│   └── layout/Sidebar.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts   # ブラウザ用クライアント
│   │   └── server.ts   # サーバー用クライアント
│   ├── types.ts
│   └── utils.ts
└── proxy.ts            # 認証プロキシ（旧 middleware）
```

---

## 起動手順

### 1. 環境変数を設定

```bash
cp .env.local.example .env.local
# .env.local を開いて Supabase URL と anon key を記入
# Supabase Dashboard → Settings → API から取得
```

### 2. DB スキーマを実行

Supabase Dashboard → **SQL Editor** に `supabase/schema.sql` の内容をコピペして実行

### 3. Storage バケットを作成

Supabase Dashboard → Storage → New bucket:
- `videos`（Public: OFF、最大 5000MB）
- `images`（Public: OFF、最大 50MB）

### 4. 開発サーバー起動

```bash
npm run dev
# → http://localhost:3000
```

---

## 主要な DB テーブル

- `workspaces` — ワークスペース（ディレクター単位）
- `workspace_members` — メンバー（ロール: director / editor）
- `videos` — 動画メタデータ・ステータス管理
- `video_versions` — V1, V2... バージョン管理
- `comments` — タイムコード付きコメント
- `annotations` — Canvas 描画データ（JSON）
- `comment_templates` — 修正指示テンプレート
- `notifications` — ツール内通知

---

## 残タスク・改善候補

- [ ] `.env.local` の設定（ユーザーが行う）
- [ ] Supabase Storage のバケット作成（ユーザーが行う）
- [ ] ユーザー名（display_name）の設定UI
- [ ] V2アップロード機能（修正版の再アップロード）
- [ ] リアルタイム通知（Supabase Realtime を使う）
- [ ] サムネイル自動生成
- [ ] Vercel デプロイ設定
