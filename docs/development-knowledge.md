# FRAMEMARK 開発ナレッジ
## Claude × Next.js × Supabase フルスタック開発の学び

> このドキュメントは今後のAI補助開発の参照データとして作成。
> 「なぜそうしたか」の背景と「どこでつまづいたか」を中心に記録する。

---

## 1. プロジェクト構成・技術スタック

### 採用技術と選定理由

| 技術 | バージョン | 選定理由・注意点 |
|---|---|---|
| Next.js | 16.2.6 | App Router。**SWCコード署名エラー（macOS）のため webpack モードが必須** |
| TypeScript | latest | 型安全性 |
| Tailwind CSS | v4 | **設定ファイル（tailwind.config.js）不要。`globals.css` の `@theme {}` で管理** |
| Supabase | latest | DB + Auth + Storage を一括管理。RLS でサーバーレスでも安全 |
| Vercel | - | Supabase との相性が良い。Hobby プランは**プライベートリポジトリで複数コントリビューター不可** |

### ディレクトリ構成の原則

```
src/app/
  (auth)/   → 認証不要ページ（login）
  (app)/    → 認証必須ページ（layout.tsx で認証チェック）
  lp/       → LP（proxy.ts で公開パスに明示的に追加が必要）
  api/      → Route Handler
  join/     → 招待リンク（公開パス）
```

### Server / Client 分離パターン（必須）

```
page.tsx（Server Component）
  └─ DB アクセス・認証確認・Signed URL 生成
  └─ *Client.tsx（Client Component）
       └─ useState / useEffect / イベントハンドラ
```

**失敗パターン：** Client Component 内で直接 DB アクセスしようとすると、
`createClient` のサーバー/クライアント使い分けを間違えてエラーになる。

---

## 2. Next.js 16 固有の注意点（重要）

### ① middleware.ts は使わない → proxy.ts

```
❌ src/middleware.ts  （Next.js 16 で非推奨）
✅ src/proxy.ts       （認証プロキシをここに実装）
```

### ② params は必ず await する

```tsx
// ✅ 正しい
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}

// ❌ エラーになる
export default async function Page({ params }: { params: { id: string } }) {
  const id = params.id  // 同期アクセスは NG
}
```

### ③ Supabase を使うレイアウトには force-dynamic が必須

```ts
export const dynamic = 'force-dynamic'
```

これがないと静的生成されてしまい、認証状態が取れない。

### ④ ビルドコマンドは必ず npm 経由

```bash
✅ npm run dev    # 内部: next dev --webpack
✅ npm run build

❌ npx next dev   # SWC コード署名エラーで失敗（macOS）
```

---

## 3. Supabase パターン集

### クライアントの使い分け

```ts
// Server Component / Route Handler / Server Action
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()  // await が必要

// Client Component
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()  // 同期
```

### Storage：Signed URL を必ず使う

```ts
// ✅ プライベートバケットのファイルアクセス
const { data } = await supabase.storage.from('videos').createSignedUrl(path, 3600)
// → data.signedUrl を使う

// ❌ getPublicUrl は使わない（バケットが非公開なので無効）
```

### バッチ署名で N+1 を防ぐ

```ts
// 複数ファイルは createSignedUrls（複数形）でまとめて取得
const { data } = await supabase.storage.from('images').createSignedUrls(paths, 3600)
signedImages?.forEach(({ path, signedUrl }) => { urlMap[path] = signedUrl })
```

### RLS の注意点

- 全テーブルに RLS を有効化する
- `workspaces` ↔ `workspace_members` の相互参照は無限再帰になる
  → `SECURITY DEFINER` 関数で回避（schema.sql 参照）
- 新しいポリシーを追加するときは**必ず再帰の有無を確認**

### データ取得は並列化する

```ts
// ✅ Promise.all で並列
const [videos, members] = await Promise.all([
  supabase.from('videos').select('*'),
  supabase.from('workspace_members').select('*'),
])

// ❌ 直列は遅い
const videos = await supabase.from('videos').select('*')
const members = await supabase.from('workspace_members').select('*')
```

---

## 4. つまづいたポイントと解決策（重要）

### ① サイドバーのバッジが表示されない

**問題：**
`get_unseen_action_count` という RPC 関数が DB に存在しなかった（SQL マイグレーションを実行していなかった）。
RPC が失敗すると `rpcData` が null になりカウントが 0 になっていた。

**解決策：**
RPC エラー時のフォールバック処理を `(app)/layout.tsx` に追加。
```ts
const { data: rpcData, error: rpcError } = await supabase.rpc('get_unseen_action_count', { uid: user.id })
if (!rpcError && rpcData !== null) {
  actionCount = rpcData as number
} else {
  // fallback: videos テーブルを直接カウント
}
```

**教訓：** RPC や DB 関数に依存する機能は、**関数が存在しない場合のフォールバックをセットで実装**する。

---

### ② バッジを開いても消えない

**問題：**
`video_status_seen` テーブルが DB に存在しなかった（オプションのマイグレーションを未実行）。
Supabase クライアントから `upsert` しても無言で失敗。バッジが永遠に消えない。

**解決策：**
DB テーブルに依存せず、**Cookie ベースの既読管理**を実装。
```ts
// src/app/actions.ts（Server Action）
export async function markVideoSeen(videoId: string, status: string) {
  const cookieStore = await cookies()
  // 'seen_videos' cookie に JSON で保存（最大300件）
  cookieStore.set('seen_videos', JSON.stringify(seen.slice(-300)), {
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
  })
}
```

```tsx
// VideoReviewClient.tsx でマウント時に呼び出す
useEffect(() => {
  markVideoSeen(video.id, video.status)
}, [])  // マウント時1回のみ
```

**教訓：**
- オプションの DB マイグレーションに依存する機能はフォールバックが必要
- **Cookie は DB なしで使える即効性のある既読管理手段**
- `httpOnly: true` で XSS から保護する

---

### ③ 動画サムネイルが表示されない

**問題：**
`onseeked` イベントでサムネイルをキャプチャしようとしていたが、
動画フォーマットや環境によって `onseeked` が発火しないケースがあった。

**解決策：**
`onloadeddata` イベントに変更 + 10秒タイムアウト。

```ts
const doCapture = () => {
  // canvas にフレームを描画して Blob 化
}
video.onloadeddata = doCapture  // ✅ onseeked より信頼性が高い
// タイムアウト: 10秒で諦めて null を返す（サムネイルなしで続行）
const timer = setTimeout(() => { cleanup(); resolve(null) }, 10000)
```

**教訓：** 動画操作イベントの信頼性：`onloadeddata` > `onseeked`

---

### ④ コメントの添付画像が表示されない

**問題：**
`image_path` は DB に保存されているが、Signed URL を生成していなかった。
プライベートバケットなのでパスをそのまま `<img src>` に使っても表示されない。

**解決策：**
2つのパスで対応：
1. **既存コメント（page.tsx）：** バッチで Signed URL を生成して `imageUrl` として props に渡す
2. **新規コメント投稿後（Client）：** 投稿直後に `createSignedUrl` を呼んで state にセット

```ts
// page.tsx（Server Side）
const imagePaths = comments.filter(c => c.image_path).map(c => c.image_path)
const { data: signed } = await supabase.storage.from('images').createSignedUrls(imagePaths, 3600)
```

**教訓：** プライベートバケットを使う場合、**表示する全ての箇所で Signed URL の生成が必要**。
追加する機能で画像を使うたびに確認する。

---

### ⑤ 版管理で過去バージョンの動画が再生できない

**問題：**
ビデオレビュー画面でバージョンを切り替えても、常に最新版の動画が再生されていた。
各バージョンの Signed URL を1つしか生成していなかった。

**解決策：**
```ts
// page.tsx で全バージョン分の Signed URL を生成
const versionUrls: Record<string, string> = {}
for (const v of versions) {
  if (v.storage_path && !v.is_deleted) {
    const { data } = await supabase.storage.from('videos').createSignedUrl(v.storage_path, 3600)
    if (data?.signedUrl) versionUrls[v.id] = data.signedUrl
  }
}
```

```tsx
// Client で activeVersionId state を持ち、切り替え時に URL を変更
const [activeVersionId, setActiveVersionId] = useState(latestVersion?.id ?? '')
const currentVideoUrl = versionUrls[activeVersionId] ?? videoUrl
```

**教訓：** バージョン管理など「複数リソースの選択」機能は、
**全候補の URL を事前に生成して Map で持つパターン**が扱いやすい。

---

### ⑥ Vercel デプロイが Co-Authored-By でブロックされる

**問題：**
Claude Code がコミットメッセージに `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` を付与。
Vercel Hobby プランはプライベートリポジトリで複数コントリビューターを検知するとデプロイをブロックする。

**解決策（優先順）：**
1. コミットメッセージから `Co-Authored-By` を削除（Claude Code への指示で対応）
2. リポジトリを Public に変更（Hobby でも複数コントリビューター許可）
3. Vercel Pro にアップグレード（月 $20）

今回は最終的にリポジトリを **Public** に変更して解決。
コードに機密情報がないこと（`.env.local` は `.gitignore` 済み、Supabase anon key は元々公開前提）を確認済み。

**教訓：**
- Vercel Hobby × プライベートリポジトリ × 複数コントリビューター = デプロイブロック
- Claude Code でコミットするときは `Co-Authored-By` を入れない
- Supabase の `NEXT_PUBLIC_` 付きキーはブラウザに露出する設計なので Public リポジトリでも安全

---

### ⑦ `/lp` が未ログインでアクセスできない

**問題：**
`proxy.ts` の `isPublicPath` に `/lp` が含まれておらず、未ログインユーザーが `/login` にリダイレクトされていた。

**解決策：**
```ts
// proxy.ts
const isPublicPath = pathname.startsWith('/api/auth')
  || pathname === '/'
  || pathname.startsWith('/lp')  // ← 追加
```

**教訓：** 新しい公開ページを追加するときは**必ず `proxy.ts` の `isPublicPath` を確認**する。

---

### ⑧ ダッシュボードで「ファイル削除後もサムネイルを表示」

**問題：**
動画の「フロー終了」でファイルを削除したあと、ダッシュボードのサムネイルも消えていた。
`is_deleted` フラグでフィルタリングしていたため。

**解決策：**
サムネイルの取得ロジックで `!v.is_deleted` の条件を削除。
動画ファイルが削除されてもサムネイルパスは `video_versions` に残るため、サムネイルは別管理。

**教訓：** 「ファイル削除」と「メタデータ削除」を混同しない。soft delete パターンでは**何を削除して何を残すかを明示する**。

---

## 5. Supabase Free プランの制約

| 項目 | 制限 |
|---|---|
| DB ストレージ | 500 MB |
| Storage（ファイル）| **1 GB 合計** |
| 同時接続数 | 60 |
| 帯域 | 5 GB/月 |

**1 GB ストレージの実用的な上限：**
- 動画1本 = 平均 100〜500 MB と仮定
- 実質 2〜10 本しかアップロードできない
- MVPテスト用途には十分だが、本番運用には Pro プランへのアップグレードを検討

---

## 6. AIツールの使い分けと注意点

### Claude（Claude Code）

**得意なこと：**
- フルスタックのコード生成（Next.js / TypeScript / SQL）
- エラーの原因特定と修正
- DB スキーマ設計・RLS ポリシー設計
- ドキュメント生成

**注意点：**
- Next.js 16 など学習データが少ない最新バージョンは誤情報を出すことがある → **AGENTS.md / CLAUDE.md でプロジェクト固有のルールを明示する**
- 会話が長くなると過去のコンテキストが薄れる → **重要な決定は CLAUDE.md に記録する**
- コミットメッセージに `Co-Authored-By` を自動付与する → **明示的に禁止する**

### GPT image2

**得意なこと：**
- ビジュアルデザインの生成（LP・UIモック）

**注意点：**
- テキストが不正確なことが多い（「コメンド」など誤字）→ コーディング時に修正する
- 生成された画像をそのまま使うのは難しい → **切り出し加工が必要**（ImageMagick 等）
- 複数の画面を1枚の画像に含めて生成させると効率的

---

## 7. コーディング規約（この開発で確立したルール）

### コメントは「なぜ」だけ書く

```ts
// ✅ 非自明な理由があるときだけ
// onloadeddata を使う（onseeked は動画フォーマットによって発火しないため）
video.onloadeddata = doCapture

// ❌ 何をしているかの説明は書かない
// ビデオのキャプチャを実行する
video.onloadeddata = doCapture
```

### エラーハンドリングは境界にのみ

- ユーザー入力・外部 API の境界のみ
- 内部ロジックには不要

### 抽象化は3箇所以上の重複から

- 早期抽象化しない
- まずコピペで書いて、3箇所になったらまとめる

---

## 8. Git / デプロイ規約

```bash
# コミットメッセージのフォーマット
git commit -m "feat: add xxx feature"
git commit -m "fix: resolve xxx bug"
git commit -m "docs: add xxx documentation"

# ❌ Co-Authored-By は絶対に入れない（Vercel Hobby でデプロイブロックになる）
```

- 作業の区切りごとに commit → push まで実行
- Vercel は GitHub の main ブランチへの push で自動デプロイ

---

## 9. Notionへの保存と今後のClaude参照方法

### 推奨：CLAUDE.md に要約を書く（最も手軽）

Claude Code はプロジェクトルートの `CLAUDE.md` を**会話開始時に自動で読み込む**。
次のプロジェクトで使いたい知識は、そのプロジェクトの `CLAUDE.md` に転記する。

```markdown
# CLAUDE.md に書くべき内容
- 技術スタックとバージョン固有の注意点
- 使わないコマンド・ファイルの禁止事項
- プロジェクト固有のアーキテクチャルール
```

### グローバル設定：~/.claude/CLAUDE.md

**全プロジェクト共通のルール**（Co-Authored-By 禁止など）は
`~/.claude/CLAUDE.md` に書くとすべての Claude Code セッションで参照される。

```bash
# 例：~/.claude/CLAUDE.md
## Git ルール
- コミットメッセージに Co-Authored-By を付けない
- Vercel Hobby + プライベートリポジトリで自動デプロイが壊れるため
```

### Notion 保存後の参照方法

**方法 A：ファイルを @ で参照（Claude Code）**
```
このドキュメントを @docs/development-knowledge.md として保存済み。
Claude Code で「@docs/development-knowledge.md を参照して」と指示できる。
```

**方法 B：Notion MCP サーバー（高度）**
Claude Code に [Notion MCP](https://github.com/modelcontextprotocol/servers) を設定すると、
Claude が直接 Notion を読み書きできる。
設定ファイル: `~/.claude/claude_desktop_config.json`

**方法 C：Skills（Claude Code の `/` コマンド）**
Skills は「特定のワークフローを実行する手順書」に向いている。
参照データ（ナレッジベース）には不向き。CLAUDE.md や @ 参照の方が適切。

### 結論：この開発ナレッジの活用方法

```
1. このファイル（docs/development-knowledge.md）をそのままNotionに貼る
   → Notion の URL を CLAUDE.md に記載しておく

2. 次の Next.js × Supabase プロジェクト開始時：
   → CLAUDE.md にこのファイルから「技術スタック固有の注意点」を転記
   → 特に「2. Next.js 16 固有の注意点」「3. Supabase パターン集」が再利用しやすい

3. Claude に渡すとき：
   → 「@docs/development-knowledge.md を参照してください」と指示
   → または CLAUDE.md に要約を書いておく（自動参照されるため指示不要）
```

---

*記録日：2026年5月*
*プロジェクト：FRAMEMARK（Next.js 16 × Supabase × Vercel）*
*開発担当AI：Claude Sonnet 4.6（Claude Code）*
