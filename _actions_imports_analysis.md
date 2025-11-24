# _actions インポート使用箇所の分析

このドキュメントは、`@/app/_actions`からインポートしている全てのファイルをリストアップしています。
これらは全てサーバーアクション（`"use server"`ディレクティブを使用）を使用しているため、Tauri環境への移行時にAPIエンドポイントまたはRPC関数に置き換える必要があります。

## インポート元ファイル一覧

### app/ ディレクトリ

#### API Routes
- `app/api/cards/save/route.ts` - `generateCardsFromPage`
- `app/api/cards/save/__tests__/route.test.ts` - `generateCardsFromPage`
- `app/api/plugins/security/audit-logs/route.ts` - `isAdmin`
- `app/api/plugins/security/audit-logs/__tests__/route.test.ts` - `isAdmin`
- `app/api/plugins/security/alerts/route.ts` - `isAdmin`
- `app/api/plugins/security/alerts/__tests__/route.test.ts` - `isAdmin`
- `app/api/plugins/security/alerts/statistics/route.ts` - `isAdmin`
- `app/api/plugins/security/alerts/run-detection/route.ts` - `isAdmin`
- `app/api/plugins/security/alerts/[alertId]/route.ts` - `isAdmin`
- `app/api/batch/unified/route.ts` - `audioBatchProcessing`, `multiFileBatchProcessing`, `transcribeImageBatch`
- `app/api/batch/multi-file/route.ts` - `multiFileBatchProcessing`
- `app/api/notes/[slug]/pages/route.ts` - `getNotePages`
- `app/api/gyazo/callback/route.ts` - `handleGyazoCallback`

#### Route Handlers
- `app/(protected)/notes/default/new/route.ts` - `getDefaultNote`
- `app/auth/callback/route.ts` - `createAccount`, `getAccountById`, `createDefaultNote`, `initializeUserPromptTemplates`, `getUserSettings`

#### Pages
- `app/(protected)/notes/[slug]/page.tsx` - `note-deck-links`, `getDefaultNote`, `getNoteDetail`
- `app/(protected)/notes/[slug]/[id]/page.tsx` - `getAllUserPages`, `getLastPageVisit`, `recordPageVisit`, `linkGroups`
- `app/(protected)/notes/explorer/page.tsx` - `getNotesList`
- `app/(protected)/notes/explorer/_components/notes-explorer.tsx` - `notes`
- `app/(protected)/goals/page.tsx` - `getAccountById`, `study_goals`
- `app/(protected)/learn/page.tsx` - `getQuizQuestions`, `QuizParams`
- `app/admin/milestone/page.tsx` - `getMilestones`
- `app/admin/changelog/page.tsx` - `ChangeLogEntry`
- `app/admin/plugins/signatures/page.tsx` - `plugin-signatures`
- `app/admin/plugins/security-audit/page.tsx` - `getSecurityAuditLogs`
- `app/admin/plugins/security-alerts/page.tsx` - `plugin-security-alerts`
- `app/(protected)/settings/plugins/page.tsx` - `plugins`
- `app/(protected)/settings/page.tsx` - `getUserCosenseProjects`, `getUserSettings`
- `app/(protected)/profile/page.tsx` - `createAccount`, `getAccountById`
- `app/admin/page.tsx` - `isAdmin`

#### Layouts
- `app/layout.tsx` - `getUserSettings`
- `app/(protected)/layout.tsx` - `isAdmin`, `getCurrentUser`, `getUserPlan`, `getHelpVideoAudioSetting`
- `app/admin/layout.tsx` - `isAdmin`, `getCurrentUser`, `getUserPlan`

#### Components
- `app/auth/login/_components/MagicLinkForm.tsx` - `loginWithMagicLink`
- `app/auth/login/_components/GoogleLoginForm.tsx` - `loginWithGoogle`
- `app/(protected)/notes/_components/CreateNoteForm.tsx` - `CreateNotePayload`, `validateSlug`
- `app/(protected)/goals/_components/GoalItem/GoalItem.tsx` - `completeStudyGoal`
- `app/(protected)/goals/_components/GoalItem/EditGoalDialog.tsx` - `updateStudyGoal`
- `app/(protected)/goals/_components/GoalItem/DeleteGoalDialog.tsx` - `deleteStudyGoal`
- `app/(protected)/learn/_components/QuizSession.tsx` - `QuizMode`
- `app/(protected)/decks/[deckId]/audio/_components/AudioCardGenerator.tsx` - `createAudioTranscription`, `transcribeAudio`
- `app/(protected)/decks/[deckId]/ocr/_components/ImageCardGenerator.tsx` - `GeneratedCard`, `createRawInput`, `transcribeImage`
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
- `components/pages/_hooks/useLinkGroupState.ts` - `getLinkGroupInfo`
- `components/pages/_hooks/useSplitPage.ts` - `splitPageSelection`
- `components/pages/_hooks/useSmartThumbnailSync.ts` - `updatePage`
- `components/pages/BacklinksGrid.tsx` - `getPageBacklinks`
- `components/quiz-settings-dialog.tsx` - `startQuizAction`
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

## 次のステップ

1. 各サーバーアクションをAPIエンドポイントまたはRPC関数に置き換える
2. クライアント側のコードを更新して、新しいエンドポイント/RPC関数を使用するように変更
3. 型定義は別の場所（例: `types/`ディレクトリ）に移動する

