# Phase 3 (Part 1): UI Components - console → logger 置き換え進捗

## 作業概要

**作業日**: 2025 年 10 月 15 日  
**作業者**: AI Assistant  
**対象ブランチ**: `feature/unified-link-migration-and-tdd`

Phase 3 として、UI コンポーネントの console 文を logger に置き換える作業を開始しました。
Phase 3 は規模が大きいため、複数のパートに分けて実施します。

## Phase 3.1: 認証関連 ✅ 完了

### 処理ファイル

**ファイル**: `app/auth/callback/route.ts` (4 箇所)

### 置き換え内容

| 箇所 | Before                                                               | After                                                                               | コンテキスト                    |
| ---- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------- |
| 1    | `console.error("OAuth error:", errorParam, ...)`                     | `logger.error({ error, errorDescription, origin }, "OAuth authentication error")`   | error, errorDescription, origin |
| 2    | `console.error("Error exchanging code for session:", exchangeError)` | `logger.error({ error, code, origin }, "Failed to exchange authorization code...")` | error, code, origin             |
| 3    | `console.error("Error retrieving user:", userError)`                 | `logger.error({ error, origin }, "Failed to retrieve authenticated user")`          | error, origin                   |
| 4    | `console.error("ユーザーにメールアドレスがありません")`              | `logger.error({ userId, origin }, "User has no email address...")`                  | userId, origin                  |

### 追加の修正

- 未使用変数`data`を削除（exchangeCodeForSession の戻り値から）

## Phase 3.2: ページ作成関連 ✅ 完了

### 処理ファイル

1. **`app/(protected)/pages/new/route.ts`** (2 箇所)
2. **`app/(protected)/notes/[slug]/new/route.ts`** (3 箇所)

### 置き換え内容

#### app/(protected)/pages/new/route.ts

| 箇所 | Before                                                            | After                                                                       | コンテキスト                  |
| ---- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------- |
| 1    | `console.error("New page creation error:", pageError)`            | `logger.error({ error, userId, noteId }, "Failed to create new page")`      | error, userId, noteId         |
| 2    | `console.error("Error linking page to default note:", linkError)` | `logger.error({ error, userId, noteId, pageId }, "Failed to link page...")` | error, userId, noteId, pageId |

#### app/(protected)/notes/[slug]/new/route.ts

| 箇所 | Before                                                    | After                                                                                  | コンテキスト                        |
| ---- | --------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------- |
| 1    | `console.error("Note not found:", noteError)`             | `logger.error({ error, slug, userId }, "Note not found for new page creation")`        | error, slug, userId                 |
| 2    | `console.error("Page creation error:", pageError)`        | `logger.error({ error, userId, noteId, slug }, "Failed to create page in note")`       | error, userId, noteId, slug         |
| 3    | `console.error("Linking page to note error:", linkError)` | `logger.error({ error, userId, noteId, pageId, slug }, "Failed to link page to note")` | error, userId, noteId, pageId, slug |

## 完了統計 (Part 1)

### 処理サマリー

- **総処理ファイル数**: 3 ファイル
- **総置き換え箇所数**: 9 箇所
  - console.error → logger.error: 9 箇所

### ファイル別サマリー

| カテゴリ   | ファイル数 | 置き換え箇所 | ステータス  |
| ---------- | ---------- | ------------ | ----------- |
| 認証       | 1          | 4            | ✅ 完了     |
| ページ作成 | 2          | 5            | ✅ 完了     |
| **小計**   | **3**      | **9**        | **✅ 完了** |

## 技術的な改善点

### 1. 認証エラーのコンテキスト強化

OAuth 認証エラー、セッション交換エラー、ユーザー取得エラーすべてに以下を追加:

- `error`: エラーオブジェクト
- `origin`: リクエスト元 URL
- 該当する場合: `code`, `userId`, `errorDescription`

### 2. ページ作成エラーの追跡性向上

ページ作成・リンク作成の失敗時に以下を記録:

- `userId`: ユーザー ID
- `noteId`: ノート ID
- `pageId`: ページ ID（リンク作成時）
- `slug`: ノートスラッグ

### 3. エラーメッセージの日本語対応

日本語のエラーメッセージも適切に英語のログメッセージに変換し、コンテキストで必要な情報を提供。

## 残りの作業 (Phase 3 Part 2 以降)

### Phase 3.3: 重要コンポーネント (予定)

**対象ファイル**: 約 8 ファイル、約 10 箇所

- `components/create-page-dialog.tsx` (1 箇所)
- `components/search-bar.tsx` (1 箇所)
- `components/ShareSettingsModal.tsx` (1 箇所)
- `components/user-nav.tsx` (1 箇所)
- `components/goals/add-goal-dialog.tsx` (1 箇所)
- `components/ui/user-icon.tsx` (1 箇所)
- `app/(public)/milestones/_components/milestone-detail.tsx` (1 箇所)
- `app/(public)/inquiry/page.tsx` (1 箇所)
- その他

### Phase 3.4: デッキ・カード管理 (予定)

**対象ファイル**: 10 ファイル、21 箇所

- `app/(protected)/decks/[deckId]/_components/*.tsx` (複数ファイル)

### Phase 3.5: ノート管理 (予定)

**対象ファイル**: 約 7 ファイル、約 15 箇所

- `app/(protected)/notes/_components/*.tsx`
- `app/(protected)/notes/explorer/_components/*.tsx`

### Phase 3.6: 設定画面 (予定)

**対象ファイル**: 5 ファイル、10 箇所

- `app/(protected)/settings/_components/**/*.tsx`

### Phase 3.7: 管理画面 (予定)

**対象ファイル**: 3 ファイル、12 箇所

- `app/admin/_components/*.tsx`

## 品質確認

### Lint 検証

変更したファイルに対して lint 検証を実行:

```bash
bun run lint app/auth/callback/route.ts \
  app/(protected)/pages/new/route.ts \
  app/(protected)/notes/[slug]/new/route.ts
```

### 確認項目

- ✅ すべての`console.error`が`logger.error`に置き換えられている
- ✅ 適切なコンテキストオブジェクトが渡されている
- ✅ 未使用変数が削除されている
- ✅ lint エラーが存在しない

## 次のステップ

Phase 3.3 以降は、作業量が多いため、以下の方針で進めます:

1. **優先順位順に処理**: エラーハンドリング重要度が高いものから
2. **バッチ処理**: 関連ファイルをまとめて処理
3. **段階的なコミット**: 各 Phase ごとにコミット
4. **継続的な lint 検証**: 変更後は必ず lint 実行

## 関連ドキュメント

- [Phase 1 完了レポート](./20251015_01_phase1-console-to-logger-complete.md)
- [Phase 2 完了レポート](./20251015_03_phase2-tiptap-extensions-complete.md)
- [移行進捗状況](./20251015_02_console-to-logger-migration-status.md)
- [実装計画書](../../04_implementation/plans/console-logger-replacement/20251014_07_console-error-replacement-plan.md)

## 備考

- すべての変更は`feature/unified-link-migration-and-tdd`ブランチで実施
- Phase 3 は規模が大きいため、複数回に分けて実施
- 各パート完了時に中間レポートを作成
- 最終的に Phase 3 全体の完了レポートを作成予定
