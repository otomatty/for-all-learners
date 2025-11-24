# _actions インポート使用箇所の分析

このドキュメントは、`@/app/_actions`からインポートしている全てのファイルをリストアップしています。
これらは全てサーバーアクション（`"use server"`ディレクティブを使用）を使用しているため、Tauri環境への移行時にAPIエンドポイントまたはRPC関数に置き換える必要があります。

**更新日**: 2025-01-XX
**ステータス**: 優先度の高いファイルの修正を完了。レイアウトファイル、設定ページ、プロフィールページ、管理者ページ、セキュリティ関連API Routes、目標管理ページ、ノートエクスプローラーページも修正済み。残りのファイルは型定義のみのインポートまたはクライアントコンポーネント。

## 修正済みファイル（✅）

以下のファイルは既に修正済みで、直接SupabaseクライアントまたはAPIエンドポイントを使用するように変更されています：

### API Routes
- ✅ `app/api/cards/save/route.ts` - `convertTextToTiptapJSON`と直接Supabaseクエリに置き換え
- ✅ `app/api/batch/unified/route.ts` - バッチ処理関数を直接実装
- ✅ `app/api/batch/multi-file/route.ts` - マルチファイル処理を直接実装
- ✅ `app/api/notes/[slug]/pages/route.ts` - RPC関数を直接呼び出し
- ✅ `app/api/gyazo/callback/route.ts` - OAuthコールバック処理を直接実装
- ✅ `app/api/audio/transcribe/route.ts` - 新規作成: 単一音声文字起こし用API Route
- ✅ `app/api/image/ocr/route.ts` - 新規作成: 単一画像OCR用API Route
- ✅ `app/api/plugins/security/audit-logs/route.ts` - `isAdmin`を直接Supabaseクエリに置き換え
- ✅ `app/api/plugins/security/alerts/route.ts` - `isAdmin`を直接Supabaseクエリに置き換え
- ✅ `app/api/plugins/security/alerts/statistics/route.ts` - `isAdmin`を直接Supabaseクエリに置き換え
- ✅ `app/api/plugins/security/alerts/run-detection/route.ts` - `isAdmin`を直接Supabaseクエリに置き換え
- ✅ `app/api/plugins/security/alerts/[alertId]/route.ts` - `isAdmin`を直接Supabaseクエリに置き換え

### Route Handlers
- ✅ `app/(protected)/notes/default/new/route.ts` - 直接Supabaseクエリに置き換え
- ✅ `app/auth/callback/route.ts` - 直接Supabaseクエリに置き換え

### Pages
- ✅ `app/(protected)/notes/[slug]/page.tsx` - 直接Supabaseクエリに置き換え
- ✅ `app/(protected)/notes/[slug]/[id]/page.tsx` - 直接Supabaseクエリに置き換え
- ✅ `app/(protected)/settings/page.tsx` - `getUserSettings`と`getUserCosenseProjects`を直接Supabaseクエリに置き換え
- ✅ `app/(protected)/profile/page.tsx` - `createAccount`, `getAccountById`を直接Supabaseクエリに置き換え
- ✅ `app/admin/page.tsx` - `isAdmin`を直接Supabaseクエリに置き換え

### Layouts
- ✅ `app/layout.tsx` - `getUserSettings`を直接Supabaseクエリに置き換え
- ✅ `app/(protected)/layout.tsx` - `isAdmin`, `getCurrentUser`, `getUserPlan`, `getHelpVideoAudioSetting`を直接Supabaseクエリに置き換え
- ✅ `app/admin/layout.tsx` - `isAdmin`, `getCurrentUser`, `getUserPlan`を直接Supabaseクエリに置き換え

### Components
- ✅ `app/auth/login/_components/MagicLinkForm.tsx` - クライアント側Supabaseクライアントに置き換え
- ✅ `app/auth/login/_components/GoogleLoginForm.tsx` - クライアント側Supabaseクライアントに置き換え
- ✅ `app/(protected)/decks/[deckId]/audio/_components/AudioCardGenerator.tsx` - API Route呼び出しとSupabaseクエリに置き換え
- ✅ `app/(protected)/decks/[deckId]/ocr/_components/ImageCardGenerator.tsx` - API Route呼び出しとSupabaseクエリに置き換え

## インポート元ファイル一覧

### app/ ディレクトリ

#### API Routes
- ✅ `app/api/cards/save/route.ts` - **修正済み**: `convertTextToTiptapJSON`と直接Supabaseクエリに置き換え
- ⚠️ `app/api/cards/save/__tests__/route.test.ts` - `generateCardsFromPage` (テストファイル)
- ✅ `app/api/plugins/security/audit-logs/route.ts` - **修正済み**: `isAdmin`を直接Supabaseクエリに置き換え
- ⚠️ `app/api/plugins/security/audit-logs/__tests__/route.test.ts` - `isAdmin` (テストファイル)
- ✅ `app/api/plugins/security/alerts/route.ts` - **修正済み**: `isAdmin`を直接Supabaseクエリに置き換え
- ⚠️ `app/api/plugins/security/alerts/__tests__/route.test.ts` - `isAdmin` (テストファイル)
- ✅ `app/api/plugins/security/alerts/statistics/route.ts` - **修正済み**: `isAdmin`を直接Supabaseクエリに置き換え
- ✅ `app/api/plugins/security/alerts/run-detection/route.ts` - **修正済み**: `isAdmin`を直接Supabaseクエリに置き換え
- ✅ `app/api/plugins/security/alerts/[alertId]/route.ts` - **修正済み**: `isAdmin`を直接Supabaseクエリに置き換え
- ✅ `app/api/batch/unified/route.ts` - **修正済み**: バッチ処理関数を直接実装
- ✅ `app/api/batch/multi-file/route.ts` - **修正済み**: マルチファイル処理を直接実装
- ✅ `app/api/notes/[slug]/pages/route.ts` - **修正済み**: RPC関数を直接呼び出し
- ✅ `app/api/gyazo/callback/route.ts` - **修正済み**: OAuthコールバック処理を直接実装

#### Route Handlers
- ✅ `app/(protected)/notes/default/new/route.ts` - **修正済み**: 直接Supabaseクエリに置き換え
- ✅ `app/auth/callback/route.ts` - **修正済み**: 直接Supabaseクエリに置き換え

#### Pages
- ✅ `app/(protected)/notes/[slug]/page.tsx` - **修正済み**: 直接Supabaseクエリに置き換え
- ✅ `app/(protected)/notes/[slug]/[id]/page.tsx` - **修正済み**: 直接Supabaseクエリに置き換え（`syncLinkGroupsForPage`, `getLinkGroupsForPage`も直接実装）
- ✅ `app/(protected)/notes/explorer/page.tsx` - **修正済み**: `getNotesList`を直接Supabaseクエリに置き換え
- `app/(protected)/notes/explorer/_components/notes-explorer.tsx` - `notes`
- ✅ `app/(protected)/goals/page.tsx` - **修正済み**: `getAccountById`, `getStudyGoalsByUser`, `getUserGoalLimits`を直接Supabaseクエリに置き換え
- `app/(protected)/learn/page.tsx` - `getQuizQuestions`, `QuizParams`
- `app/admin/milestone/page.tsx` - `getMilestones`
- `app/admin/changelog/page.tsx` - `ChangeLogEntry`
- `app/admin/plugins/signatures/page.tsx` - `plugin-signatures`
- `app/admin/plugins/security-audit/page.tsx` - `getSecurityAuditLogs`
- `app/admin/plugins/security-alerts/page.tsx` - `plugin-security-alerts`
- `app/(protected)/settings/plugins/page.tsx` - `plugins`
- ✅ `app/(protected)/settings/page.tsx` - **修正済み**: `getUserSettings`と`getUserCosenseProjects`を直接Supabaseクエリに置き換え
- ✅ `app/(protected)/profile/page.tsx` - **修正済み**: `createAccount`, `getAccountById`を直接Supabaseクエリに置き換え
- ✅ `app/admin/page.tsx` - **修正済み**: `isAdmin`を直接Supabaseクエリに置き換え
- ✅ `app/(protected)/goals/page.tsx` - **修正済み**: `getAccountById`, `getStudyGoalsByUser`, `getUserGoalLimits`を直接Supabaseクエリに置き換え
- ✅ `app/(protected)/notes/explorer/page.tsx` - **修正済み**: `getNotesList`を直接Supabaseクエリに置き換え
- ✅ `app/admin/milestone/page.tsx` - **修正済み**: `getMilestones`を直接Supabaseクエリに置き換え
- ✅ `app/(protected)/notes/_components/CreateNoteForm.tsx` - **修正済み**: `validateSlug`を直接Supabaseクエリに置き換え

#### Layouts
- ✅ `app/layout.tsx` - **修正済み**: `getUserSettings`を直接Supabaseクエリに置き換え
- ✅ `app/(protected)/layout.tsx` - **修正済み**: `isAdmin`, `getCurrentUser`, `getUserPlan`, `getHelpVideoAudioSetting`を直接Supabaseクエリに置き換え
- ✅ `app/admin/layout.tsx` - **修正済み**: `isAdmin`, `getCurrentUser`, `getUserPlan`を直接Supabaseクエリに置き換え

#### Components
- ✅ `app/auth/login/_components/MagicLinkForm.tsx` - **修正済み**: クライアント側Supabaseクライアントに置き換え
- ✅ `app/auth/login/_components/GoogleLoginForm.tsx` - **修正済み**: クライアント側Supabaseクライアントに置き換え
- ✅ `app/(protected)/notes/_components/CreateNoteForm.tsx` - **修正済み**: `validateSlug`を直接Supabaseクエリに置き換え（`CreateNotePayload`は型定義のみ）
- `app/(protected)/goals/_components/GoalItem/GoalItem.tsx` - `completeStudyGoal`
- `app/(protected)/goals/_components/GoalItem/EditGoalDialog.tsx` - `updateStudyGoal`
- `app/(protected)/goals/_components/GoalItem/DeleteGoalDialog.tsx` - `deleteStudyGoal`
- `app/(protected)/learn/_components/QuizSession.tsx` - `QuizMode`
- ✅ `app/(protected)/decks/[deckId]/audio/_components/AudioCardGenerator.tsx` - **修正済み**: API Route呼び出しとSupabaseクエリに置き換え
- ✅ `app/(protected)/decks/[deckId]/ocr/_components/ImageCardGenerator.tsx` - **修正済み**: API Route呼び出しとSupabaseクエリに置き換え（`GeneratedCard`型のインポート元も修正）
- `app/(protected)/decks/[deckId]/_components/DeckPageClient.tsx` - `note-deck-links`
- `app/(protected)/decks/[deckId]/_components/DeckNoteManager.tsx` - `note-deck-links`
- `app/(protected)/notes/[slug]/_components/note-deck-manager.tsx` - `note-deck-links`
- `app/admin/inquiries/_components/InquiriesTableClient.tsx` - `GetAllInquiriesOptions`
- `app/admin/inquiries/_components/InquiriesTableContainer.tsx` - `GetAllInquiriesOptions`, `inquiries`
- `app/admin/inquiries/_components/InquiriesTable.tsx` - `FormattedInquiryListItem`
- `app/admin/changelog/_components/CommitHistorySection.tsx` - `version`
- `app/admin/changelog/_components/ChangelogForm.tsx` - `Change`, `ChangeLogEntry`
- `app/admin/changelog/_components/ChangelogEntryItem.tsx` - `Change`, `ChangeLogEntry`
- `app/admin/changelog/_components/ChangeTypeBadge.tsx` - `Change`
- `app/(public)/changelog/_components/ChangelogClient.tsx` - `ChangeLogEntry`
- `app/admin/plugins/signatures/_components/SignatureVerificationLogsTable.tsx` - `SignatureVerificationLog`
- `app/admin/plugins/signatures/_components/SignPluginDialog.tsx` - `generatePluginSignature`
- `app/admin/plugins/signatures/_components/PluginSignaturesTable.tsx` - `PluginSignatureInfo`
- `app/admin/plugins/security-audit/_utils.ts` - `plugin-security-audit-logs`
- `app/admin/plugins/security-audit/_components/SecurityAuditLogsTable.tsx` - `SecurityAuditLogEntry`
- `app/admin/plugins/security-alerts/_components/SecurityAlertsTable.tsx` - `PluginSecurityAlert`, `updateAlertStatus`
- `app/admin/users/[id]/_components/Settings.tsx` - `getUserSettingsByUser`
- `app/admin/users/[id]/_components/Questions.tsx` - `getQuestionsByUser`
- `app/admin/users/[id]/_components/Profile.tsx` - `getAccountById`
- `app/admin/users/[id]/_components/LearningActivity.tsx` - `learning_logs`
- `app/admin/users/[id]/_components/Goals.tsx` - `getGoalDecks`, `getStudyGoalsByUser`
- `app/admin/users/[id]/_components/DecksAndCards.tsx` - `getCardsByUser`, `getDecksByUser`, `getSharedDecksByUser`
- `app/admin/users/[id]/_components/AudioRecordings.tsx` - `AudioRecording`, `getAudioRecordingsByUser`
- `app/admin/_components/ThumbnailBatchUpdate.tsx` - `batchUpdateThumbnails`
- `app/(protected)/settings/_components/prompt-templates/index.tsx` - `generatePageInfo`, `promptTemplate`
- `app/(protected)/settings/_components/external-sync-settings/cosense-sync-settings.tsx` - `cosense`
- `app/(protected)/profile/_components/profile-form.tsx` - `updateAccount`, `uploadAvatar`
- `app/(protected)/notes/explorer/_components/pages-list.tsx` - `getNotePages`

### components/ ディレクトリ

- `components/pages/EditPageForm.tsx` - `autoSetThumbnailOnPageView`, `duplicatePage`, `uploadAndSaveGyazoImage`, `deletePage`
- ✅ `components/pages/_hooks/useLinkGroupState.ts` - **既に修正済み**: `getLinkGroupInfoByKeys`を使用（`lib/services/linkGroupService.ts`）
- ⚠️ `components/pages/_hooks/useSplitPage.ts` - **コメントアウト済み**: `splitPageSelection`のインポートはコメントアウト済み
- `components/pages/_hooks/useSmartThumbnailSync.ts` - `updatePage`
- `components/pages/BacklinksGrid.tsx` - `getPageBacklinks`
- ⚠️ `components/quiz-settings-dialog.tsx` - **コメントアウト済み**: `startQuizAction`のインポートはコメントアウト済み
- `components/layouts/UserNav.tsx` - `logout`, `getUserGoalLimits`
- `components/ShareSettingsModal.tsx` - `notes`
- `components/layouts/PageHelpButton.tsx` - `toggleHelpVideoAudioSetting`

### hooks/ ディレクトリ

- `hooks/notes/useUpdateNote.ts` - `UpdateNotePayload` (型のみ)
- `hooks/notes/useCreateNote.ts` - `CreateNotePayload` (型のみ)
- `hooks/notes/__tests__/useUpdateNote.test.ts` - `UpdateNotePayload` (型のみ)
- `hooks/notes/__tests__/useCreateNote.test.ts` - `CreateNotePayload` (型のみ)
- `hooks/use-pdf-processing.ts` - `pdfBatchOcr`, `generateCardsFromDualPdfData`, `pdfUpload`, `pdfOcr`
- `hooks/use-image-ocr.ts` - `processGyazoImageOcr`

### lib/ ディレクトリ

- `lib/hooks/use-load-plugin.ts` - `getAllPluginStorage`
- `lib/utils.ts` - `FormattedInquiryListItem` (型のみ)

### types/ ディレクトリ

- `types/pdf-card-generator.ts` - `pdfProcessing` (型のみ)

## インポートされているサーバーアクションファイル一覧

以下のファイルが`_actions`ディレクトリからインポートされていますが、現在`app/_actions/`には`admin.ts`のみが存在します。
他のファイルは削除されたか、まだ作成されていない可能性があります。

### 確認済み（存在する）
- `admin.ts` - `isAdmin`

### インポートされているが存在しない可能性があるファイル
- `generateCardsFromPage`
- `notes` (複数の関数)
- `auth` (複数の関数)
- `accounts` (複数の関数)
- `promptTemplate`
- `user_settings` (複数の関数)
- `note-deck-links` (複数の関数)
- `page-visits` (複数の関数)
- `linkGroups`
- `audio_transcriptions`
- `transcribe`
- `generateCards`
- `rawInputs`
- `transcribeImage`
- `audioBatchProcessing`
- `multiFileBatchProcessing`
- `transcribeImageBatch`
- `milestone`
- `quiz`
- `study_goals` (複数の関数)
- `inquiries`
- `changelog`
- `version`
- `plugins`
- `plugin-signatures`
- `plugin-security-audit-logs`
- `plugin-security-alerts`
- `autoSetThumbnail`
- `duplicatePage`
- `gyazo`
- `pages` (複数の関数)
- `startQuiz`
- `splitPageSelection`
- `updatePage`
- `cosense`
- `generatePageInfo`
- `questions`
- `learning_logs`
- `goal-decks`
- `cards`
- `decks`
- `audio_recordings`
- `batchUpdateThumbnails`
- `pdfBatchOcr`
- `pdfProcessing`
- `pdfUpload`
- `pdfOcr`
- `plugin-storage`
- `subscriptions`
- `slug`

## 修正状況サマリー

### 修正済み（✅）
- 主要なサーバーコンポーネント（Pages、Route Handlers）
- 認証関連のコンポーネント
- カード保存API Route
- ノート関連のページコンポーネント
- レイアウトファイル（`app/layout.tsx`, `app/(protected)/layout.tsx`, `app/admin/layout.tsx`）
- 設定ページ（`app/(protected)/settings/page.tsx`）
- バッチ処理API Routes
- 音声・画像処理コンポーネント

### 残りの作業（⚠️）

#### 優先度: 高（実行時エラーが発生する可能性）
- ✅ `app/api/batch/unified/route.ts` - **修正済み**
- ✅ `app/api/batch/multi-file/route.ts` - **修正済み**
- ✅ `app/api/notes/[slug]/pages/route.ts` - **修正済み**
- ✅ `app/api/gyazo/callback/route.ts` - **修正済み**
- ✅ `app/api/plugins/security/audit-logs/route.ts` - **修正済み**
- ✅ `app/api/plugins/security/alerts/route.ts` - **修正済み**
- ✅ `app/api/plugins/security/alerts/statistics/route.ts` - **修正済み**
- ✅ `app/api/plugins/security/alerts/run-detection/route.ts` - **修正済み**
- ✅ `app/api/plugins/security/alerts/[alertId]/route.ts` - **修正済み**
- ✅ `app/(protected)/decks/[deckId]/audio/_components/AudioCardGenerator.tsx` - **修正済み**
- ✅ `app/(protected)/decks/[deckId]/ocr/_components/ImageCardGenerator.tsx` - **修正済み**
- ✅ `app/layout.tsx` - **修正済み**
- ✅ `app/(protected)/layout.tsx` - **修正済み**
- ✅ `app/admin/layout.tsx` - **修正済み**
- ✅ `app/(protected)/settings/page.tsx` - **修正済み**
- ✅ `app/(protected)/profile/page.tsx` - **修正済み**
- ✅ `app/admin/page.tsx` - **修正済み**
- ✅ `app/(protected)/goals/page.tsx` - **修正済み**
- ✅ `app/(protected)/notes/explorer/page.tsx` - **修正済み**
- ✅ `app/admin/milestone/page.tsx` - **修正済み**
- ✅ `app/(protected)/notes/_components/CreateNoteForm.tsx` - **修正済み**

#### 優先度: 中（型定義のみ、またはコメントアウト済み）
- 型定義のみのインポート（`import type`）は実行時エラーにはならないが、型定義ファイルの移動が必要
- コメントアウト済みのインポートは既に対応済み

#### 優先度: 低（存在するサーバーアクション）
- `isAdmin` - `app/_actions/admin.ts`に存在するため問題なし

## 次のステップ

1. ✅ 主要なサーバーコンポーネントとAPI Routesの修正（完了）
2. ✅ 優先度の高いAPI Routesとクライアントコンポーネントの修正（完了）
3. ✅ レイアウトファイルと設定ページの修正（完了）
4. ⚠️ 残りのAPI Routesとクライアントコンポーネントの修正（優先度: 中）
5. ⚠️ 型定義の移動（`types/`ディレクトリへ）
6. ⚠️ テストファイルの更新

