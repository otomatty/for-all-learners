# テストエラー調査レポート

**日付**: 2025-12-24  
**問題**: 32個のテストスイートが失敗  
**エラー**: `Failed to resolve import "@/app/_actions/..." from "...". Does the file exist?`  
**関連Issue**: [#188](https://github.com/otomatty/for-all-learners/issues/188)

---

## 問題の概要

32個のテストスイートが、存在しない `app/_actions/` 配下のファイルをインポートしようとして失敗しています。

### エラーパターン

すべてのエラーは以下のパターンです：
```
Error: Failed to resolve import "@/app/_actions/[ファイル名]" from "[テストファイル]". Does the file exist?
```

---

## 現状の `app/_actions/` ディレクトリ構造

現在、`app/_actions/` ディレクトリには以下の4つのファイルのみが存在します：

```
app/_actions/
├── admin.ts                          ✅ 存在
├── plugin-security-alerts.ts         ✅ 存在
├── plugin-security-audit-logs.ts     ✅ 存在
└── plugin-signatures.ts              ✅ 存在
```

**注意**: テストファイル（`__tests__/`）と仕様書（`.spec.md`）は存在しますが、実装ファイルが存在しません。

---

## 存在しないファイル一覧

テストファイルがインポートしようとしているが、実際には存在しないファイル：

### 1. CRUD操作関連
- ❌ `app/_actions/pages.ts` - ページ管理（`createPage`, `updatePage`, `deletePage` など）
- ❌ `app/_actions/generateCards.ts` - カード生成
- ❌ `app/_actions/generateCardsFromPage.ts` - ページからカード生成
- ❌ `app/_actions/generatePageInfo.ts` - ページ情報生成
- ❌ `app/_actions/generateTitle.ts` - タイトル生成
- ❌ `app/_actions/page-visits.ts` - ページ訪問記録

### 2. 認証・サブスクリプション関連
- ❌ `app/_actions/subscriptions.ts` - サブスクリプション管理（`isUserPaid` など）
- ❌ `app/_actions/ai/apiKey.ts` - APIキー管理
- ❌ `app/_actions/ai/getUserAPIKey.ts` - ユーザーAPIキー取得

### 3. プラグイン関連
- ❌ `app/_actions/plugin-widgets.ts` - プラグインウィジェット
- ❌ `app/_actions/plugin-storage.ts` - プラグインストレージ

### 4. その他
- ❌ `app/_actions/syncCardLinks.ts` - カードリンク同期
- ❌ `app/_actions/autoSetThumbnail.ts` - サムネイル自動設定
- ❌ `app/_actions/multiFileBatchProcessing.ts` - マルチファイルバッチ処理
- ❌ `app/_actions/activity_calendar.ts` - アクティビティカレンダー

---

## 影響を受けているテストファイル

以下の32個のテストファイルが影響を受けています：

### コンポーネントテスト
1. `components/__tests__/create-page-dialog.test.tsx` → `@/app/_actions/pages`

### ライブラリテスト
2. `lib/__tests__/generateQuestions.test.ts` → `@/app/_actions/ai/getUserAPIKey`
3. `lib/llm/__tests__/factory.test.ts` → `@/app/_actions/ai/getUserAPIKey`
4. `lib/utils/__tests__/thumbnailExtractor.pageView.test.ts` → `@/app/_actions/autoSetThumbnail`
5. `lib/plugins/__tests__/plugin-api.test.ts` → `@/app/_actions/plugin-storage`
6. `lib/plugins/__tests__/plugin-loader.test.ts` → `@/app/_actions/plugin-storage`
7. `lib/plugins/__tests__/ui-registry.test.ts` → `@/app/_actions/plugin-storage`
8. `lib/plugins/plugin-loader/__tests__/worker-message-handler.test.ts` → `@/app/_actions/plugin-storage`

### Server Actionsテスト
9. `app/_actions/__tests__/generateCards.test.ts` → `../generateCards`
10. `app/_actions/__tests__/generateCardsFromPage.test.ts` → `../generateCardsFromPage`
11. `app/_actions/__tests__/generatePageInfo.test.ts` → `../generatePageInfo`
12. `app/_actions/__tests__/page-visits.test.ts` → `../page-visits`
13. `app/_actions/__tests__/plugin-widgets.test.ts` → `../plugin-widgets`

### API Routesテスト
14. `app/api/ai/api-key/__tests__/route.test.ts` → `@/app/_actions/ai/apiKey`
15. `app/api/ai/generate-cards/__tests__/route.test.ts` → `@/app/_actions/generateCards`
16. `app/api/ai/generate-cards-from-page/__tests__/route.test.ts` → `@/app/_actions/generateCardsFromPage`
17. `app/api/ai/generate-page-info/__tests__/route.test.ts` → `@/app/_actions/generatePageInfo`
18. `app/api/ai/generate-title/__tests__/route.test.ts` → `@/app/_actions/generateTitle`
19. `app/api/cards/save/__tests__/route.test.ts` → `@/app/_actions/generateCardsFromPage`
20. `app/api/batch/multi-file/__tests__/route.test.ts` → `@/app/_actions/multiFileBatchProcessing`
21. `app/api/batch/unified/__tests__/route.test.ts` → `@/app/_actions/multiFileBatchProcessing`

### Hooksテスト
22. `hooks/cards/__tests__/useCreateCard.test.ts` → `@/app/_actions/subscriptions`
23. `hooks/cards/__tests__/useUpdateCard.test.ts` → `@/app/_actions/subscriptions`
24. `hooks/decks/__tests__/useSyncDeckLinks.test.ts` → `@/app/_actions/syncCardLinks`
25. `hooks/study_goals/__tests__/useCreateStudyGoal.test.ts` → `@/app/_actions/subscriptions`
26. `hooks/study_goals/__tests__/useGoalLimits.test.ts` → `@/app/_actions/subscriptions`
27. `hooks/plugins/__tests__/usePluginWidgets.test.ts` → `@/app/_actions/plugin-widgets`

### コンポーネントテスト（設定）
28. `components/settings/__tests__/LLMSettingsIntegrated.test.tsx` → `@/app/_actions/ai/apiKey`

### ダッシュボードコンポーネントテスト
29. `app/(protected)/dashboard/_components/ActivityCalendar/__tests__/DayDetailPanel.test.tsx` → `@/app/_actions/activity_calendar`

### プラグインコンポーネントテスト
30. `app/(protected)/settings/plugins/_components/__tests__/InstalledPluginCard.test.tsx` → `@/app/_actions/plugin-storage`

---

## 根本原因

### 1. Tauri 2.0移行によるServer Actions削除

ドキュメント（`docs/02_research/2025_11/20251109_01_server-actions-migration-strategy.md`）によると、プロジェクトは **Tauri 2.0への移行** を進めており、Next.js Server Actionsは静的エクスポートでは動作しないため、削除または移行されています。

### 2. 移行プロセスの未完了

`scripts/prepare-static-export.ts` のコメントには以下のように記載されています：

```typescript
// Note: Server Actions have been removed (except admin-related ones)
// Admin-related Server Actions are kept for web app only
```

つまり、**Server Actionsは削除されたが、テストファイルはまだ更新されていない**状態です。

### 3. 実装ファイルとテストファイルの不整合

- ✅ テストファイル（`__tests__/`）は存在
- ✅ 仕様書（`.spec.md`）は存在
- ❌ 実装ファイル（`.ts`）が存在しない

---

## 実際に使用されている箇所（テスト以外）

以下のファイルが、存在しないServer Actionsを実際にインポートしています：

### コンポーネント
1. `components/create-page-dialog.tsx` → `@/app/_actions/pages`
2. `components/pages/EditPageForm.tsx` → `@/app/_actions/pages`
3. `components/settings/LLMSettingsIntegrated.tsx` → `@/app/_actions/ai/apiKey`
4. `app/(protected)/notes/[slug]/[id]/page.tsx` → `@/app/_actions/pages`
5. `app/(protected)/decks/[deckId]/ocr/_components/ImageCardGenerator.tsx` → `@/app/_actions/generateCards`
6. `app/(protected)/settings/_components/prompt-templates/index.tsx` → `@/app/_actions/promptService`

### Hooks
7. `hooks/decks/useSyncDeckLinks.ts` → `@/app/_actions/syncCardLinks`
8. `hooks/cards/utils.ts` → `@/app/_actions/subscriptions`
9. `hooks/study_goals/useGoalLimits.ts` → `@/app/_actions/subscriptions`
10. `hooks/study_goals/useCreateStudyGoal.ts` → `@/app/_actions/subscriptions`
11. `lib/hooks/use-load-plugin.ts` → `@/app/_actions/plugin-widgets`

### API Routes
12. `app/api/ai/api-key/route.ts` → `@/app/_actions/ai/apiKey`
13. `app/api/ai/generate-cards/route.ts` → `@/app/_actions/generateCards`
14. `app/api/ai/generate-cards-from-page/route.ts` → `@/app/_actions/generateCardsFromPage`
15. `app/api/ai/generate-page-info/route.ts` → `@/app/_actions/generatePageInfo`
16. `app/api/ai/generate-title/route.ts` → `@/app/_actions/generateTitle`
17. `app/api/cards/save/route.ts` → `@/app/_actions/generateCardsFromPage`
18. `app/api/batch/multi-file/route.ts` → `@/app/_actions/multiFileBatchProcessing`
19. `app/api/batch/unified/route.ts` → `@/app/_actions/multiFileBatchProcessing`

### ライブラリ
20. `lib/plugins/plugin-api.ts` → `@/app/_actions/plugin-storage`（動的インポート）

### レイアウト
21. `app/(protected)/layout.tsx` → `@/app/_actions/subscriptions`
22. `app/admin/layout.tsx` → `@/app/_actions/subscriptions`

**合計**: 22個のファイル（テストファイルを除く）が存在しないServer Actionsをインポートしています。

**注意**: これらのファイルは、ビルド時または実行時にエラーを発生させる可能性があります。

---

## 問題の影響範囲

### テスト実行
- ❌ 32個のテストスイートが実行できない
- ✅ 227個のテストスイートは正常に実行されている

### ビルド・実行時
- ⚠️ 実際のコードが存在しないServer Actionsをインポートしている場合、ビルドエラーまたは実行時エラーが発生する可能性がある

---

## 推奨される対応方針

### オプション1: テストファイルの更新（推奨）

存在しないServer Actionsの代わりに、以下を実施：

1. **モックの更新**: テストファイルで、存在しないServer Actionsをモックする
2. **テストのスキップ**: 該当機能が移行中の場合、テストを一時的にスキップする
3. **テストの削除**: 該当機能が完全に削除された場合、テストファイルも削除する

### オプション2: 実装ファイルの復元

Tauri移行が完了していない場合：

1. **実装ファイルの復元**: Git履歴から実装ファイルを復元する
2. **移行の完了**: Server Actionsからクライアント側実装への移行を完了する

### オプション3: 段階的な対応

1. **緊急対応**: テストをスキップしてビルドを可能にする
2. **中期的対応**: 各機能の移行状況を確認し、適切な対応を決定する
3. **長期的対応**: すべてのServer Actionsをクライアント側実装に移行する

---

## 次のステップ

1. **各機能の移行状況を確認**
   - どの機能が既に移行済みか
   - どの機能が移行中か
   - どの機能が削除予定か

2. **実際のコードの影響を確認**
   - テスト以外のファイルで、存在しないServer Actionsをインポートしている箇所を特定
   - ビルドエラーが発生するか確認

3. **対応方針の決定**
   - 上記のオプションから適切なものを選択
   - 優先順位を決定

---

## 関連ドキュメント

- `docs/02_research/2025_11/20251109_01_server-actions-migration-strategy.md` - Server Actions移行戦略
- `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md` - Tauri移行実装計画
- `scripts/prepare-static-export.ts` - 静的エクスポート準備スクリプト

---

**調査完了日**: 2025-12-24  
**調査者**: AI Assistant

