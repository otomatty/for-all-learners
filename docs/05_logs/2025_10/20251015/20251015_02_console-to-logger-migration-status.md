# console → logger 移行作業 進捗状況

## 作業概要

**作業日**: 2025 年 10 月 15 日  
**作業者**: AI Assistant  
**対象ブランチ**: `feature/unified-link-migration-an| `app/(protected)/learn/_components/cloze-quiz.tsx`                          | 6 箇所 (error/warn) | ✅   | 穴埋めクイズ       |

**小計**: 10 ファイル、22 箇所（22箇所完了、0箇所残り）✅hase 3.5完了日**: 2025年10月16日  
**Phase 3.6完了日**: 2025年10月16日

#### 3.5 ノート管理 (6 ファイル) ✅ 完了dd`

プロジェクト全体の console 文を logger に置き換える作業の進捗状況をまとめました。

## 全体進捗サマリー

### 完了したフェーズ

- ✅ **Phase 1.1**: PDF Processing Actions (10 ファイル完了)
- ✅ **Phase 1.2**: External Integration Actions (3 ファイル完了)
- ✅ **Phase 1.3**: Notes/Page Management Actions (14 ファイル完了)
- ✅ **Phase 1.4**: Other Important Actions (19 ファイル完了)
- ✅ **Phase 1.5**: API Routes (7 ファイル完了)

**Phase 1 完了**: 合計 53 ファイル、200 箇所以上の置き換え完了 ✅

- ✅ **Phase 2**: Tiptap Extensions (2 ファイル、5 箇所完了)

**Phase 2 完了**: 合計 2 ファイル、5 箇所の置き換え完了 ✅

- ✅ **Phase 3.1**: Authentication (1 ファイル、4 箇所完了)
- ✅ **Phase 3.2**: Page Creation (2 ファイル、5 箇所完了)
- ✅ **Phase 3.3**: UI Components (10 ファイル、11 箇所完了)
- ✅ **Phase 3.4**: Decks & Cards Management (10 ファイル、16 箇所完了)
- ✅ **Phase 3.5**: Notes Management (6 ファイル、13 箇所完了)
- ✅ **Phase 3.6**: Dashboard & Profile (4 ファイル、6 箇所完了)
- ✅ **Phase 3.7**: Cloze Quiz (1 ファイル、6 箇所完了)

**Phase 3 部分完了**: 合計 34 ファイル、61 箇所の置き換え完了 ✅

### 残り作業フェーズ

- ⏳ **Phase 2 残り**: Hooks & Libraries (10 ファイル、35 箇所)
- ⏳ **Phase 3 残り**: UI Components (13 ファイル、34 箇所)
- ⏳ **Phase 4**: その他ユーティリティ (8 ファイル、10 箇所)

---

## Phase 2: Hooks & Libraries (残作業)

### 対象ファイルと console 使用箇所

#### Hooks (2 ファイル)

| ファイル                                         | console 箇所数           | 優先度 | 備考                          |
| ------------------------------------------------ | ------------------------ | ------ | ----------------------------- |
| `hooks/use-active-users.ts`                      | 1 箇所 (warn)            | Medium | コメントアウト済み (line 219) |
| `lib/tiptap-extensions/gyazo-image.ts`           | 9 箇所 (log)             | High   | デバッグログ大量              |
| `lib/tiptap-extensions/gyazo-image-nodeview.tsx` | 12 箇所 (error/warn/log) | High   | OCR 処理のエラーハンドリング  |
| `lib/tiptap-extensions/latex-inline-node.ts`     | 2 箇所 (error)           | Medium | LaTeX 処理エラー              |

**Hooks 小計**: 4 ファイル、24 箇所

#### Libraries (4 ファイル)

| ファイル                                   | console 箇所数     | 優先度 | 備考                       |
| ------------------------------------------ | ------------------ | ------ | -------------------------- |
| `lib/utils/editor/legacy-link-migrator.ts` | 1 箇所 (log)       | Medium | レガシーリンク移行ログ     |
| `lib/utils/editor/content-sanitizer.ts`    | 1 箇所 (log)       | Medium | コンテンツサニタイズログ   |
| `lib/utils/markdownTableParser.ts`         | 1 箇所 (warn)      | Medium | テーブルパースの警告       |
| `lib/utils/transformMarkdownTables.ts`     | 1 箇所 (error)     | High   | テーブル変換エラー         |
| `lib/utils/smartThumbnailUpdater.ts`       | 5 箇所 (log)       | Low    | サムネイル更新デバッグログ |
| `lib/utils/ocrTableProcessor.ts`           | 4 箇所 (log/error) | Medium | OCR テーブル処理           |
| `lib/utils/pdfUtils.ts`                    | 1 箇所 (log)       | Low    | PDF 処理ログ               |
| `lib/metrics/pageLinkMetrics.ts`           | 2 箇所 (debug)     | Low    | ページリンクメトリクス     |

**Libraries 小計**: 8 ファイル、16 箇所

### Phase 2 合計

**合計**: 12 ファイル、40 箇所

---

## Phase 3: UI Components (残作業)

### カテゴリ別分類

#### 3.1 エラーハンドリング重要度: High (23 ファイル)

| ファイル                                                                     | console 箇所数 | 状態 | 備考                       |
| ---------------------------------------------------------------------------- | -------------- | ---- | -------------------------- |
| `components/create-page-dialog.tsx`                                          | 1 箇所 (error) | ✅   | ページ作成エラー           |
| `components/search-bar.tsx`                                                  | 1 箇所 (error) | ✅   | 検索エラー                 |
| `components/ShareSettingsModal.tsx`                                          | 1 箇所 (error) | ✅   | 共有設定エラー             |
| `components/user-nav.tsx`                                                    | 1 箇所 (error) | ✅   | ユーザーナビゲーション     |
| `components/goals/add-goal-dialog.tsx`                                       | 1 箇所 (error) | ✅   | 目標追加エラー             |
| `components/ui/user-icon.tsx`                                                | 1 箇所 (error) | ✅   | アイコン取得エラー         |
| `app/(public)/milestones/_components/milestone-detail.tsx`                   | 1 箇所 (error) | ✅   | マイルストーン画像読み込み |
| `app/(public)/inquiry/page.tsx`                                              | 1 箇所 (error) | ✅   | 問い合わせカテゴリ取得     |
| `app/(public)/inquiry/_components/image-uploader.tsx`                        | 1 箇所 (error) | ✅   | 画像アップロード           |
| `app/(protected)/profile/_components/profile-form.tsx`                       | 1 箇所 (error) | ✅   | プロフィール保存           |
| `app/(protected)/pages/new/route.ts`                                         | 2 箇所 (error) | ✅   | 新規ページ作成             |
| `app/(protected)/notes/[slug]/new/route.ts`                                  | 3 箇所 (error) | ✅   | ノート内新規ページ         |
| `app/(protected)/notes/[slug]/page-client.tsx`                               | 1 箇所 (error) | ✅   | ページ一覧取得             |
| `app/(protected)/dashboard/page.tsx`                                         | 1 箇所 (error) | ✅   | デッキ取得                 |
| `app/(protected)/dashboard/_components/deck-selection-dialog.tsx`            | 2 箇所 (error) | ✅   | デッキ選択・作成           |
| `app/(protected)/dashboard/_components/goal-summary/goal-summary-client.tsx` | 2 箇所 (error) | ✅   | 目標サマリー               |
| `app/(protected)/notes/explorer/_components/pages-list.tsx`                  | 1 箇所 (error) | ✅   | ページ一覧                 |
| `app/(protected)/notes/explorer/_components/trash-panel.tsx`                 | 3 箇所 (error) | ✅   | ゴミ箱操作                 |
| `app/(protected)/notes/explorer/_components/notes-explorer.tsx`              | 3 箇所 (error) | ✅   | ノートエクスプローラー     |
| `app/(protected)/notes/_components/notes-layout-client.tsx`                  | 2 箇所 (error) | ✅   | ページ移動                 |
| `app/(protected)/notes/_components/create-note-form.tsx`                     | 3 箇所 (error) | ✅   | ノート作成・共有           |
| `app/auth/callback/route.ts`                                                 | 4 箇所 (error) | ✅   | 認証コールバック           |
| `components/magicui/confetti.tsx`                                            | 3 箇所 (error) | ✅   | Confetti エフェクト        |

**小計**: 23 ファイル、39 箇所（39箇所完了、0箇所残り）✅

**Phase 3.1完了日**: 2025年10月15日  
**Phase 3.2完了日**: 2025年10月15日  
**Phase 3.3完了日**: 2025年10月16日  
**Phase 3.4完了日**: 2025年10月16日  
**Phase 3.5完了日**: 2025年10月16日  
**Phase 3.6完了日**: 2025年10月16日

#### 3.2 デッキ・カード管理 (10 ファイル) ✅ 完了

| ファイル                                                                                    | console 箇所数      | 状態 | 備考               |
| ------------------------------------------------------------------------------------------- | ------------------- | ---- | ------------------ |
| `app/(protected)/decks/[deckId]/_components/audio-card-generator.tsx`                       | 4 箇所 (error)      | ✅   | 音声カード生成     |
| `app/(protected)/decks/[deckId]/_components/pdf-card-generator/pdf-generated-card-list.tsx` | 1 箇所 (error)      | ✅   | PDF カード保存     |
| `app/(protected)/decks/[deckId]/_components/image-card-generator.tsx`                       | 2 箇所 (error)      | ✅   | 画像カード生成     |
| `app/(protected)/decks/[deckId]/_components/card-form.tsx`                                  | 3 箇所 (error)      | ✅   | カード作成・編集   |
| `app/(protected)/decks/[deckId]/_components/action-menu.tsx`                                | 2 箇所 (error)      | ✅   | デッキ操作メニュー |
| `app/(protected)/decks/[deckId]/_components/cards-list.tsx`                                 | 1 箇所 (error)      | ✅   | カードリスト       |
| `app/(protected)/decks/[deckId]/_components/sync-button.tsx`                                | 1 箇所 (error)      | ✅   | 同期ボタン         |
| `app/(protected)/decks/[deckId]/_components/card-item.tsx`                                  | 1 箇所 (error)      | ✅   | カードアイテム     |
| `app/(protected)/decks/_components/deck-form.tsx`                                           | 1 箇所 (error)      | ✅   | デッキフォーム     |
| `app/(protected)/learn/_components/cloze-quiz.tsx`                                          | 6 箇所 (error/warn) | ⏳   | 穴埋めクイズ       |

**小計**: 10 ファイル、22 箇所（16箇所完了、6箇所残り）

**Phase 3.4完了日**: 2025年10月16日  
**Phase 3.7完了日**: 2025年10月16日

#### 3.5 ノート管理 (6 ファイル) ✅ 完了

| ファイル                                                             | console 箇所数 | 状態 | 備考                 |
| -------------------------------------------------------------------- | -------------- | ---- | -------------------- |
| `app/(protected)/notes/[slug]/page-client.tsx`                       | 1 箇所 (error) | ✅   | ページフェッチ       |
| `app/(protected)/notes/_components/create-note-form.tsx`             | 3 箇所 (error) | ✅   | ノート作成・共有     |
| `app/(protected)/notes/_components/notes-layout-client.tsx`          | 2 箇所 (error) | ✅   | バッチページ移動     |
| `app/(protected)/notes/explorer/_components/pages-list.tsx`          | 1 箇所 (error) | ✅   | ページ一覧           |
| `app/(protected)/notes/explorer/_components/trash-panel.tsx`         | 3 箇所 (error) | ✅   | ゴミ箱操作           |
| `app/(protected)/notes/explorer/_components/notes-explorer.tsx`      | 3 箇所 (error) | ✅   | ノートエクスプローラ |

**小計**: 6 ファイル、13 箇所（完了）

**Phase 3.5完了日**: 2025年10月16日

#### 3.6 Dashboard & Profile (4 ファイル) ✅ 完了

| ファイル                                                                     | console 箇所数 | 状態 | 備考                   |
| ---------------------------------------------------------------------------- | -------------- | ---- | ---------------------- |
| `app/(protected)/profile/_components/profile-form.tsx`                       | 1 箇所 (error) | ✅   | プロフィール保存       |
| `app/(protected)/dashboard/page.tsx`                                         | 1 箇所 (error) | ✅   | デッキ取得             |
| `app/(protected)/dashboard/_components/deck-selection-dialog.tsx`            | 2 箇所 (error) | ✅   | デッキ選択・作成       |
| `app/(protected)/dashboard/_components/goal-summary/goal-summary-client.tsx` | 2 箇所 (error) | ✅   | 目標サマリー           |

**小計**: 4 ファイル、6 箇所（完了）

**Phase 3.6完了日**: 2025年10月16日

#### 3.7 Cloze Quiz (1 ファイル) ✅ 完了

| ファイル                                           | console 箇所数      | 状態 | 備考                 |
| -------------------------------------------------- | ------------------- | ---- | -------------------- |
| `app/(protected)/learn/_components/cloze-quiz.tsx` | 6 箇所 (error/warn) | ✅   | 穴埋めクイズ検証     |

**小計**: 1 ファイル、6 箇所（完了）

**Phase 3.7完了日**: 2025年10月16日

#### 3.8 設定画面 (5 ファイル) ✅ 完了

| ファイル                                                                                | console 箇所数 | 状態 | 備考                   |
| --------------------------------------------------------------------------------------- | -------------- | ---- | ---------------------- |
| `app/(protected)/settings/_components/prompt-templates/index.tsx`                       | 3 箇所 (error) | ✅   | プロンプトテンプレート |
| `app/(protected)/settings/_components/llm-settings/index.tsx`                           | 1 箇所 (error) | ✅   | LLM 設定               |
| `app/(protected)/settings/_components/external-sync-settings/gyazo-sync-settings.tsx`   | 2 箇所 (error) | ✅   | Gyazo 同期設定         |
| `app/(protected)/settings/_components/external-sync-settings/cosense-sync-settings.tsx` | 3 箇所 (error) | ✅   | Cosense 同期設定       |
| `app/_actions/pages.ts`                                                                 | 1 箇所 (log)   | ✅   | ページアクション       |

**小計**: 5 ファイル、10 箇所（完了）

**Phase 3.8完了日**: 2025年10月17日

#### 3.4 管理画面 (3 ファイル)

| ファイル                                                   | console 箇所数      | 備考                   |
| ---------------------------------------------------------- | ------------------- | ---------------------- |
| `app/admin/_components/ThumbnailBatchUpdate.tsx`           | 3 箇所 (log/error)  | サムネイル一括更新     |
| `app/admin/milestone/_components/milestone-admin-view.tsx` | 3 箇所 (warn/error) | マイルストーン管理     |
| `app/admin/changelog/_components/CommitHistorySection.tsx` | 6 箇所 (error)      | コミット履歴・変更ログ |

**小計**: 3 ファイル、12 箇所

### Phase 3 合計

**合計**: 52 ファイル、107 箇所（61箇所完了、46箇所残り）

---

## Phase 4: その他ユーティリティ・バックアップファイル (残作業)

### 対象ファイル

| ファイル                                   | console 箇所数              | 優先度 | 備考                          |
| ------------------------------------------ | --------------------------- | ------ | ----------------------------- |
| `vitest.setup.ts`                          | 3 箇所 (コメントアウト済み) | Low    | テスト用モック                |
| `lib/utils/transformMarkdownTables.ts.bak` | 1 箇所 (error)              | Low    | バックアップファイル          |
| `lib/utils/pdfClientUtils.ts.bak`          | 3 箇所 (error/warn)         | Low    | バックアップファイル          |
| `components/search-bar.tsx.bak`            | 1 箇所?                     | Low    | バックアップファイル (要確認) |
| `components/ShareSettingsModal.tsx.bak`    | 1 箇所?                     | Low    | バックアップファイル (要確認) |
| `components/user-nav.tsx.bak`              | 1 箇所?                     | Low    | バックアップファイル (要確認) |
| `components/create-page-dialog.tsx.bak`    | 1 箇所?                     | Low    | バックアップファイル (要確認) |

**Phase 4 合計**: 7 ファイル、約 10 箇所

---

## 残作業の全体統計

| フェーズ                      | ファイル数 | console 箇所数 | 優先度 |
| ----------------------------- | ---------- | -------------- | ------ |
| Phase 2: Hooks & Libraries    | 12         | 40             | High   |
| Phase 3: UI Components        | 13         | 34             | High   |
| Phase 4: その他・バックアップ | 7          | 10             | Low    |
| **合計**                      | **32**     | **84**         | -      |

---

## 作業の優先順位

### 1. 最優先 (High Priority)

**理由**: エラーハンドリングの品質向上、本番環境での問題追跡の改善

- `lib/tiptap-extensions/gyazo-image.ts` (9 箇所)
- `lib/tiptap-extensions/gyazo-image-nodeview.tsx` (12 箇所)
- `lib/utils/transformMarkdownTables.ts` (1 箇所)
- Phase 3 残りのエラーハンドリング重要ファイル:
  - 設定画面 (5 ファイル、10 箇所)
  - 管理画面 (3 ファイル、12 箇所)

### 2. 中優先 (Medium Priority)

**理由**: デバッグログの削除、警告ログの構造化

- `lib/tiptap-extensions/latex-inline-node.ts` (2 箇所)
- `lib/utils/editor/*.ts` (3 ファイル)
- `lib/utils/markdownTableParser.ts` (1 箇所)
- `lib/utils/ocrTableProcessor.ts` (4 箇所)
- Phase 3 のデッキ・カード管理 (10 ファイル、21 箇所)
- Phase 3 の設定画面 (5 ファイル、10 箇所)

### 3. 低優先 (Low Priority)

**理由**: デバッグログ、テスト用コード、バックアップファイル

- `hooks/use-active-users.ts` (1 箇所、コメントアウト済み)
- `lib/utils/smartThumbnailUpdater.ts` (5 箇所)
- `lib/utils/pdfUtils.ts` (1 箇所)
- `lib/metrics/pageLinkMetrics.ts` (2 箇所)
- Phase 3 の管理画面 (3 ファイル、12 箇所)
- Phase 4 のバックアップファイル (7 ファイル、10 箇所)

---

## 推奨作業順序

### ステップ 1: Phase 2 の高優先度ファイル (2-3 時間)

1. `lib/tiptap-extensions/gyazo-image.ts` - デバッグログ 9 箇所削除
2. `lib/tiptap-extensions/gyazo-image-nodeview.tsx` - エラー/警告 12 箇所置き換え
3. `lib/utils/transformMarkdownTables.ts` - エラー 1 箇所置き換え
4. `lib/tiptap-extensions/latex-inline-node.ts` - エラー 2 箇所置き換え

**成果**: 24 箇所の置き換え完了

### ステップ 2: Phase 3 のエラーハンドリング重要ファイル (4-5 時間)

23 ファイル、39 箇所のエラーハンドリングを構造化ログに置き換え。

**重点ファイル**:

- 認証: `app/auth/callback/route.ts` (4 箇所)
- ノート・ページ作成: `app/(protected)/notes/`, `app/(protected)/pages/` (9 ファイル、12 箇所)
- デッキ・カード: `app/(protected)/decks/` (10 ファイル、21 箇所)

**成果**: 39 箇所の置き換え完了

### ステップ 3: Phase 2 の中優先度ファイル (1-2 時間)

残りのユーティリティファイル 6 ファイル、16 箇所を処理。

**成果**: 16 箇所の置き換え完了

### ステップ 4: Phase 3 の設定画面・管理画面 (2-3 時間)

設定画面 5 ファイル、管理画面 3 ファイル、合計 22 箇所を処理。

**成果**: 22 箇所の置き換え完了

### ステップ 5: Phase 4 のバックアップファイル・低優先度 (1 時間)

バックアップファイルの処理、またはコメントアウト済みコードの確認。

**成果**: 10 箇所の処理完了

---

## 置き換えパターン

### エラーログの置き換え

```typescript
// Before
console.error("Error message:", error);

// After
import { logger } from "@/lib/logger";
logger.error({ error, userId, contextKey: contextValue }, "Error message");
```

### 警告ログの置き換え

```typescript
// Before
console.warn("Warning message");

// After
import { logger } from "@/lib/logger";
logger.warn({ contextKey: contextValue }, "Warning message");
```

### デバッグログの削除

```typescript
// Before
console.log("Debug info:", data);

// After
// (削除 - 本番環境で不要なデバッグログ)
```

---

## 作業時の確認事項

### コンテキスト情報の追加

すべての logger 呼び出しに以下のコンテキスト情報を含める:

- `userId`: ユーザー ID (可能な場合)
- `pageId`, `noteId`, `deckId`: リソース ID
- `error`: エラーオブジェクト (エラーログの場合)
- その他関連データ (jobId, fileId, imageUrl 等)

### Lint 検証

変更後は必ず lint 検証を実行:

```bash
# 個別ファイル
bun run lint <file-path>

# ディレクトリ全体
./node_modules/.bin/biome check <directory> --write
```

### 確認項目

- ✅ すべての`console.error`が`logger.error`に置き換えられている
- ✅ すべての`console.warn`が`logger.warn`に置き換えられている
- ✅ デバッグ用`console.log`は削除されている
- ✅ 適切なコンテキストオブジェクトが渡されている
- ✅ lint エラーが存在しない
- ✅ 型エラーが存在しない

---

## 除外ファイル

以下のファイルはドキュメント・コメント内の console 参照のため、置き換え対象外:

- `docs/**/*.md` - ドキュメントファイル
- `lib/logger.ts` - Logger ライブラリ本体
- `lib/unilink/__tests__/**` - テストファイル内のコメント
- `lib/tiptap-extensions/unified-link-mark/plugins/__tests__/**` - テストファイル
- `app/_actions/notes/*.ts` - JSDoc コメント内の例示コード
- `.git/logs/**` - Git ログ
- `public/workbox-*.js` - 外部ライブラリ

---

## 次のアクション

### 今すぐ着手すべき作業

1. **Phase 2: Gyazo & TipTap Extensions** (最優先)

   - `lib/tiptap-extensions/gyazo-image.ts`
   - `lib/tiptap-extensions/gyazo-image-nodeview.tsx`
   - `lib/tiptap-extensions/latex-inline-node.ts`

2. **Phase 3: 認証・ページ作成の重要エラー** (最優先)
   - `app/auth/callback/route.ts`
   - `app/(protected)/pages/new/route.ts`
   - `app/(protected)/notes/[slug]/new/route.ts`

### 作業完了後のタスク

- [ ] すべての console 使用箇所が適切に置き換えられたことを確認
- [ ] プロジェクト全体で lint 実行
- [ ] 統合テスト実行
- [ ] 作業完了レポート作成
- [ ] main ブランチへのマージ準備

---

## 関連ドキュメント

- [Phase 1 完了レポート](./20251015_01_phase1-console-to-logger-complete.md)
- [実装計画書](../../04_implementation/plans/console-logger-replacement/20251014_07_console-error-replacement-plan.md)
- [Logger 設計](../../03_design/specifications/logger-design.md)

---

## 備考

- すべての変更は`feature/unified-link-migration-and-tdd`ブランチで実施
- バックアップファイル(.bak)は削除またはアーカイブを検討
- 本番デプロイ前に統合テストを実施予定
