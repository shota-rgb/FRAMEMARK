# FRAMEMARK — 動画レビュープラットフォーム

YouTubeチャンネルのディレクター（発注者）と動画編集者（受注者）の間で、  
**タイムコード付き修正指示**を送り合うための動画レビュー Web アプリ。

> **⚠️ MVP（最小実用製品）段階です**  
> 現在 Supabase Free プランを使用しており、ストレージ上限は **1 GB** です。  
> 動画の保存容量に限りがあるため、**校了・フロー終了後は必ずファイル削除を選択**してください。  
> 本格運用時は Supabase Pro プラン（$25/月・100 GB）への移行を推奨します。

---

## 目次

1. [機能一覧](#機能一覧)
2. [操作ガイド](#操作ガイド)
3. [ストレージの注意点](#ストレージの注意点)
4. [開発環境セットアップ](#開発環境セットアップ)
5. [技術スタック](#技術スタック)
6. [ディレクトリ構成](#ディレクトリ構成)
7. [データベース設計](#データベース設計)
8. [既知の制限・残タスク](#既知の制限残タスク)

---

## 機能一覧

| 機能 | ディレクター | 編集者 |
|---|:---:|:---:|
| アカウント作成（ロール選択） | ✅ | ✅ |
| 組織（ワークスペース）の作成 | ✅ | — |
| 編集者を招待リンクで招待 | ✅ | — |
| 動画アップロード（V1） | — | ✅ |
| 修正版アップロード（V2〜） | — | ✅ |
| サムネイル自動生成 | — | ✅ |
| ダッシュボード（グリッド/リスト） | ✅ | ✅ |
| 動画レビュー（タイムコード付きコメント） | ✅ | ✅ |
| 画像・マーキング付きコメント | ✅ | ✅ |
| コメントへの返信 | ✅ | ✅ |
| アノテーション（ペン/テキスト/四角） | ✅ | ✅ |
| バージョン切り替え再生 | ✅ | ✅ |
| ステータス管理・ワークフロー | ✅ | ✅ |
| 校了（ファイル保持 or 削除） | ✅ | — |
| フロー終了（キャンセル） | ✅ | ✅ |
| 修正履歴 | ✅ | ✅ |
| コメントテンプレート管理 | ✅ | — |
| 要対応バッジ（サイドバー・ダッシュボード） | ✅ | ✅ |

---

## 操作ガイド

### アカウント作成とロール

`/login` → 「新規登録」タブから作成します。

- **ディレクター**：組織名を入力して登録。組織（ワークスペース）が自動作成されます
- **編集者**：ロールを「編集者」に切り替えて登録。登録後はディレクターから招待を受けるまでダッシュボードに動画が表示されません

### ディレクターの操作フロー

```
1. メンバー管理 → 編集者のメールアドレスを入力 → 招待リンクを発行・共有
2. 編集者がリンクを開いて組織に参加
3. 編集者がアップロードした動画をダッシュボードで確認
4. 動画を開いてタイムコード付きコメントで修正指示
5. 「修正依頼を送る」でステータスを変更
6. 修正版が届いたら再レビュー → 問題なければ「校了」
```

### 編集者の操作フロー

```
1. ディレクターから招待リンクを受け取って組織に参加
2. アップロード → 動画を選択・タイトルを入力してアップロード
3. 「レビュー申請」でディレクターに送付
4. 修正依頼が届いたらコメントを確認
5. 修正版をアップロード（「修正版をアップロード」ボタン）
```

### ワークフロー（ステータス遷移）

```
初稿 → レビュー中 → 修正依頼済 → 修正済み → 校了
                ↑___________________________|
                         任意で「フロー終了」→ 終了（両ロール実行可）
```

| ステータス | 説明 | 操作者 |
|---|---|---|
| 初稿 | アップロード直後 | — |
| レビュー中 | 編集者が「レビュー申請」を実行 | 編集者 |
| 修正依頼済 | ディレクターが「修正依頼を送る」 | ディレクター |
| 修正済み | 編集者が修正版をアップロード | 編集者 |
| 校了 | ディレクターが承認 | ディレクター |
| 終了 | 「フロー終了」ボタンで強制終了 | ディレクター or 編集者 |

### コメント・アノテーション

- **タイムコード付き**：再生中に入力すると、現在の再生時刻が自動でセット
- **マーキング**（鉛筆アイコン）：ペン・テキスト・四角ツールで動画にアノテーションを描画して送信
- **画像添付**：スクリーンショット等を添付可能
- **返信**：コメントに「返信」ボタンでスレッド形式で返信

マーキング中は「描画モード」になり、再生・シーク操作は停止します。  
「閉じて動画操作へ」ボタンで描画モードを終了できます。

### 要対応バッジ

- サイドバーの「ダッシュボード」に未確認の要対応動画数が表示されます
- 対象の動画を開くと自動でバッジが消えます（Cookie ベース、デバイス間非同期）

---

## ストレージの注意点

**Supabase Free プラン：ストレージ合計 1 GB**

| 動画品質 | ファイルサイズ目安 | 1 GB で保存できる本数 |
|---|---|---|
| 1080p（高品質） | 200〜500 MB/本 | 2〜5 本 |
| 720p（標準） | 100〜200 MB/本 | 5〜10 本 |
| 圧縮済み | 50〜100 MB/本 | 10〜20 本 |

**MVP 期間中の運用ルール**

- 校了またはフロー終了時は **「ファイル削除」** を選択してください
- ファイルを削除してもコメント・修正履歴・サムネイルは保持されます
- 容量が逼迫した場合は Supabase Dashboard → Storage で個別削除も可能

---

## 開発環境セットアップ

### 前提条件

- Node.js 18 以上
- Supabase アカウント

### 手順

#### 1. リポジトリのクローン

```bash
git clone https://github.com/shota-rgb/FRAMEMARK.git
cd FRAMEMARK
npm install
```

#### 2. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を開き、Supabase の値を入力します：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Supabase Dashboard → Settings → API から取得。

#### 3. DB スキーマの実行

Supabase Dashboard → **SQL Editor** を開き、`supabase/schema.sql` の内容を全てコピペして実行します。

> **オプション（推奨）**：ファイル末尾の `video_status_seen` セクションも実行すると、  
> バッジの既読処理がデバイス間でも同期されます（未実行でも Cookie で動作します）。

#### 4. Storage バケットの作成

Supabase Dashboard → Storage → New bucket で2つ作成：

| バケット名 | Public | ファイルサイズ上限 |
|---|---|---|
| `videos` | OFF | 5000 MB |
| `images` | OFF | 50 MB |

#### 5. Supabase Auth の設定

Supabase Dashboard → Authentication → Providers → Email：
- **「Confirm email」を OFF** にする（招待フローでメール確認が干渉するため）

#### 6. 開発サーバー起動

```bash
npm run dev
# → http://localhost:3000
```

> **必ず `npm run dev` を使うこと**（内部で `--webpack` フラグが付いています）。  
> `npx next dev` は SWC コード署名エラーで起動しません。

---

## 技術スタック

| 項目 | 内容 |
|---|---|
| フレームワーク | Next.js 16.2.6（App Router） |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS v4 |
| バックエンド | Supabase（PostgreSQL + Auth + Storage） |
| デプロイ | Vercel（予定） |

### プロジェクト固有の制約（重要）

#### ビルド時は必ず `--webpack` フラグ

```bash
npm run dev    # 内部: next dev --webpack
npm run build  # 内部: next build --webpack
```

macOS 上で SWC ネイティブバイナリのコード署名エラーが発生するため、webpack モードを強制しています。`package.json` の scripts に設定済みです。

#### `middleware.ts` ではなく `proxy.ts`

Next.js 16 では middleware ファイルの規約が変更され、`src/proxy.ts` が認証プロキシとして動作しています。

#### Tailwind CSS v4（設定ファイルなし）

`tailwind.config.js` は存在しません。カスタムテーマは `src/app/globals.css` の `@theme {}` ブロックに記述します。

#### `params` は非同期（Next.js 16）

```tsx
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```

---

## ディレクトリ構成

```
FRAMEMARK/
├── src/
│   ├── app/
│   │   ├── actions.ts                    # Server Actions（markVideoSeen など）
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   └── login/page.tsx            # ログイン・新規登録（ロール選択付き）
│   │   ├── (app)/
│   │   │   ├── layout.tsx                # 共通レイアウト（サイドバー・バッジカウント）
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx              # Server Component（動画取得・サムネイルURL生成）
│   │   │   │   └── DashboardClient.tsx   # 検索・フィルタ・表示切替
│   │   │   ├── upload/
│   │   │   │   ├── page.tsx
│   │   │   │   └── UploadClient.tsx      # ドラッグ&ドロップ・サムネイル生成
│   │   │   ├── videos/[id]/
│   │   │   │   ├── page.tsx              # 動画取得・権限確認・既読記録
│   │   │   │   ├── VideoReviewClient.tsx # メインレビュー画面（Client Component）
│   │   │   │   └── history/page.tsx      # 修正履歴
│   │   │   ├── members/
│   │   │   │   ├── page.tsx
│   │   │   │   └── MembersClient.tsx     # 招待リンク発行・メンバー管理
│   │   │   └── settings/
│   │   │       ├── page.tsx
│   │   │       └── SettingsClient.tsx    # ワークスペース名・テンプレート管理
│   │   ├── join/[token]/page.tsx         # 招待リンク受諾ページ
│   │   └── api/auth/callback/route.ts    # Supabase Auth コールバック
│   ├── components/
│   │   ├── video/
│   │   │   ├── VideoPlayer.tsx           # カスタム動画プレイヤー
│   │   │   ├── AnnotationCanvas.tsx      # Canvas 2D アノテーション
│   │   │   ├── AnnotationToolbar.tsx     # 描画ツールバー
│   │   │   └── CommentPanel.tsx          # コメント一覧（画像・返信表示）
│   │   ├── dashboard/
│   │   │   ├── VideoCard.tsx             # グリッド/リスト表示カード（サムネイル付き）
│   │   │   └── StatusBadge.tsx
│   │   └── layout/
│   │       └── Sidebar.tsx               # サイドバー（ロール別メニュー・バッジ）
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                 # ブラウザ用クライアント
│   │   │   └── server.ts                 # サーバー用クライアント
│   │   ├── types.ts                      # 共通型定義
│   │   └── utils.ts                      # フォーマット関数・STATUS_LABELS など
│   └── proxy.ts                          # 認証プロキシ（旧 middleware）
├── supabase/
│   └── schema.sql                        # DB スキーマ・RLS ポリシー・関数定義
├── CLAUDE.md                             # Claude Code 向けプロジェクト指示
├── AGENTS.md                             # AI エージェント向けルール
└── README.md                             # このファイル
```

---

## データベース設計

### テーブル一覧

| テーブル | 説明 |
|---|---|
| `workspaces` | ワークスペース（ディレクター1人につき1つ） |
| `workspace_members` | メンバー管理（role: director / editor、招待トークン含む） |
| `videos` | 動画メタデータ・ステータス |
| `video_versions` | バージョン管理（V1, V2 …）・storage_path・thumbnail_path 含む |
| `comments` | タイムコード付きコメント・返信（parent_id）・画像パス |
| `annotations` | Canvas アノテーション JSON（comment_id に紐づく） |
| `comment_templates` | 修正指示テンプレート（ワークスペース単位） |
| `notifications` | 通知レコード |
| `video_status_seen` | バッジ既読管理（**オプション**・schema.sql 末尾参照） |

### VideoStatus の遷移

```
'draft' → 'review' → 'revision_requested' → 'revised' → 'approved'
                ↑__________________________|
                                   どこからでも → 'cancelled'
```

### SECURITY DEFINER 関数

RLS の相互参照ループ回避のため、以下の関数が SECURITY DEFINER で定義されています：

| 関数 | 用途 |
|---|---|
| `is_workspace_member(ws_id, uid)` | RLS ループ回避ヘルパー |
| `is_workspace_owner(ws_id, uid)` | RLS ループ回避ヘルパー |
| `get_user_emails(user_ids)` | auth.users からメール取得 |
| `get_workspace_invite(invite_token)` | 招待情報取得（RLS バイパス） |
| `accept_workspace_invite(invite_token)` | 招待受諾（user_id をセット） |
| `get_unseen_action_count(uid)` | 未既読の要対応動画数（オプション） |

---

## 既知の制限・残タスク

### MVP 期間の制限事項

| 項目 | 制限 | 対処 |
|---|---|---|
| ストレージ | 合計 1 GB | 校了・終了時にファイル削除を徹底 |
| リアルタイム通知 | 未実装 | ページリロードで最新化 |
| 表示名変更 | 未実装 | メールアドレスが表示される |
| バッジ既読同期 | Cookie ベース | デバイス間で同期されない |
| アップロード進捗 | 擬似表示 | Supabase SDK に進捗 API なし |

### 残タスク

- [ ] プロフィール設定（display_name 変更 UI）
- [ ] Vercel デプロイ設定
- [ ] リアルタイム通知（Supabase Realtime）
- [ ] `video_status_seen` SQL マイグレーション実行（デバイス間バッジ同期）
- [ ] 動画削除機能（ダッシュボードから動画自体を削除）
- [ ] モバイル対応
