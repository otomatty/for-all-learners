# 開発スケジュール（2025年11月〜2026年1月）

> **最終更新**: 2025-11-29 更新
> **対象マイルストーン**: v0.4.0 - Tauri移行 & 国際化対応

## 📋 概要

本ドキュメントは、v0.4.0 リリースに向けた2つの主要タスクの並行開発スケジュールを整理したものです。

| タスク | GitHub Issue | 期間 |
|--------|--------------|------|
| **Hybrid DB Strategy** | [#189](https://github.com/otomatty/for-all-learners/issues/189) | 約7週間 |
| **国際化対応 (i18n)** | [#119](https://github.com/otomatty/for-all-learners/issues/119) | 2025-11 ~ 2026-01 |

### Phase D 細分化 Issue 一覧

| Issue | タイトル | 対象 | 期間 |
|-------|----------|------|------|
| [#204](https://github.com/otomatty/for-all-learners/issues/204) | [Phase D-2] Notes/Pages フックの Repository 移行 | Notes/Pages 12件 | Week 6-1 |
| [#205](https://github.com/otomatty/for-all-learners/issues/205) | [Phase D-3] Decks/Cards フックの Repository 移行 | Decks/Cards 12件 | Week 6-2 |
| [#206](https://github.com/otomatty/for-all-learners/issues/206) | [Phase D-4] StudyGoals/LearningLogs/Milestones フックの移行 | 学習系 19件 | Week 7-1 |
| [#207](https://github.com/otomatty/for-all-learners/issues/207) | [Phase D-5] Notes/Decks 共有・管理フックの移行 | 共有・管理 27件 | Week 7-2 |

---

## 🗓️ 週次スケジュール

### Week 1: 2025/11/26 〜 2025/12/02 ✅ 完了

```
┌─────────────────────────────────────────────────────────────────┐
│  Hybrid DB: Phase A 開始 ✅                                      │
│  ├─ #190 IndexedDB クライアント実装 ✅                            │
│  └─ #191 SQLite スキーマ設計・Rust実装 ✅                         │
│                                                                  │
│  i18n: Phase 1 進行中 ✅                                          │
│  ├─ next-intl 導入 ✅                                             │
│  ├─ middleware 統合 ✅                                            │
│  └─ 翻訳辞書ローダーと型定義 ✅                                    │
│                                                                  │
│  状態: Week 1 目標達成 🎉                                         │
└─────────────────────────────────────────────────────────────────┘
```

**今週のゴール**:
- [x] IndexedDB クライアント基盤完成 ✅ (2025-11-26)
- [x] SQLite スキーマ定義完了 ✅ (2025-11-26)
- [x] i18n 基盤セットアップ完了 ✅ (2025-11-26)

<details>
<summary>📝 Week 1 完了作業詳細</summary>

#### IndexedDB クライアント (#190)
- `lib/db/types.ts` - 同期用型定義（SyncableEntity, LocalNote等）
- `lib/db/indexeddb-client.ts` - CRUD操作実装
- `lib/db/hybrid-client.ts` - Web/Tauri環境判定
- テスト: 36テスト（indexeddb-client: 22, hybrid-client: 14）

#### SQLite スキーマ (#191)
- `src-tauri/src/db/schema.rs` - 全13テーブルのスキーマ定義
- `src-tauri/src/db/mod.rs` - LocalDB構造体 + Notes CRUD
- `src-tauri/src/db/models.rs` - Rust構造体定義
- `src-tauri/src/db/error.rs` - エラー型定義
- テスト: 3テスト（cargo test）

#### i18n 基盤 (#119)
- `i18n/config.ts`, `i18n/request.ts` - next-intl設定
- `messages/ja.json`, `messages/en.json` - 翻訳辞書（119エントリー）
- `middleware.ts` - next-intl統合
- `components/LocaleSwitcher.tsx` - 言語切替UI
- テスト: 36テスト（config: 10, messages: 18, LocaleSwitcher: 8）

</details>

---

### Week 2: 2025/12/03 〜 2025/12/09 ✅ 進行中

```
┌─────────────────────────────────────────────────────────────────┐
│  Hybrid DB: Phase A 継続 ✅                                      │
│  └─ #192 Tauri Commands (SQLite操作) 実装 ✅                      │
│                                                                  │
│  i18n: Phase 2 開始                                              │
│  └─ Notes セクションの翻訳対応                                    │
│                                                                  │
│  状態: Week 2 Tauri Commands 完了 🎉                             │
└─────────────────────────────────────────────────────────────────┘
```

**今週のゴール**:
- [x] Tauri SQLite Commands 実装完了 ✅ (2025-11-26)
- [ ] Notes UI の翻訳キー適用開始

<details>
<summary>📝 Week 2 Tauri Commands 完了作業詳細</summary>

#### Rust側 Commands モジュール (#192)
- `src-tauri/src/commands/mod.rs` - コマンドモジュール定義
- `src-tauri/src/commands/notes_commands.rs` - Notes CRUD コマンド (10関数)
- `src-tauri/src/commands/pages_commands.rs` - Pages CRUD コマンド (8関数)
- `src-tauri/src/commands/decks_commands.rs` - Decks CRUD コマンド (5関数)
- `src-tauri/src/commands/cards_commands.rs` - Cards CRUD コマンド (6関数)
- `src-tauri/src/commands/study_goals_commands.rs` - Study Goals コマンド (5関数)
- `src-tauri/src/commands/learning_logs_commands.rs` - Learning Logs コマンド (4関数)
- `src-tauri/src/commands/milestones_commands.rs` - Milestones コマンド (5関数)
- `src-tauri/src/commands/user_settings_commands.rs` - User Settings コマンド (3関数)

#### DB CRUD 追加実装
- `src-tauri/src/db/mod.rs` - Pages, StudyGoals, LearningLogs, Milestones, UserSettings CRUD追加
- `src-tauri/src/db/models.rs` - PageUpdate 構造体追加

#### TypeScript側クライアント
- `lib/db/tauri-sqlite-client.ts` - 全エンティティの Tauri invoke クライアント
- `lib/db/tauri-sqlite-client.test.ts` - 20テストケース（全テストパス）

</details>

---

### Week 3: 2025/12/10 〜 2025/12/16 ✅ 完了

```
┌─────────────────────────────────────────────────────────────────┐
│  Hybrid DB: Phase B 完了 ✅                                      │
│  ├─ #193 同期マネージャー実装 ✅                                  │
│  └─ #194 競合解決ロジック実装 ✅                                  │
│                                                                  │
│  i18n: Phase 2 継続 ✅                                           │
│  └─ Decks / Learn / Goals / Sync の翻訳対応 ✅                    │
│                                                                  │
│  状態: Week 3 目標達成 🎉                                        │
└─────────────────────────────────────────────────────────────────┘
```

**今週のゴール**:
- [x] SyncManager 基本動作確認 ✅ (2025-11-26)
- [x] Last Write Wins 競合解決実装 ✅ (2025-11-26)
- [x] 主要機能の翻訳対応 50% 完了 ✅ (2025-11-26)

<details>
<summary>📝 Week 3 完了作業詳細</summary>

#### 同期マネージャー (#193)
- `lib/sync/types.ts` - 同期関連の型定義
- `lib/sync/sync-manager.ts` - SyncManager クラス（プッシュ/プル/イベント管理）
- `lib/sync/sync-queue.ts` - SyncQueue クラス（オフライン時のキュー管理）
- `lib/sync/sync-triggers.ts` - 同期トリガー管理
- `lib/sync/index.ts` - エントリーポイント
- テスト: 49テスト（conflict-resolver: 13, sync-queue: 19, sync-manager: 17）

#### 競合解決ロジック (#194)
- `lib/sync/conflict-resolver.ts` - ConflictResolver クラス（LWW方式）
- resolve() - ローカル/サーバーの比較
- merge() - データのマージ
- isServerNewer() - サーバーが新しいか判定
- hasLocalChanges() - ローカル変更の有無判定

#### i18n 翻訳追加
- `messages/ja.json` - 同期、ページ、マイルストーン、学習目標、学習ログの翻訳追加
- `messages/en.json` - 同上の英語翻訳追加
- 翻訳キー数: 167 → 230+ エントリー

</details>

---

### Week 4: 2025/12/17 〜 2025/12/23 ✅ 完了

```
┌─────────────────────────────────────────────────────────────────┐
│  Hybrid DB: Phase C 完了 ✅                                      │
│  ├─ #195 Repository 基盤設計 ✅                                   │
│  ├─ #196 Notes/Pages Repository ✅                                │
│  └─ #197 Decks/Cards Repository ✅                                │
│                                                                  │
│  i18n: Phase 2 継続 ✅                                            │
│  └─ 公開ページ（Landing / Auth）翻訳対応 ✅                       │
│                                                                  │
│  状態: Week 4 目標達成 🎉                                        │
└─────────────────────────────────────────────────────────────────┘
```

**今週のゴール**:
- [x] Repository パターン基盤完成 ✅ (2025-11-26)
- [x] Notes/Pages/Decks/Cards Repository 実装 ✅ (2025-11-26)
- [x] エラーコード方式でi18n対応準備 ✅ (2025-11-26)
- [x] 公開ページ翻訳対応 ✅ (2025-11-26)

<details>
<summary>📝 Week 4 完了作業詳細</summary>

#### Repository基盤 (#195)
- `lib/repositories/types.ts` - Repository, RepositoryOptions, RepositoryErrorCode 型定義
- `lib/repositories/base-repository.ts` - BaseRepository 抽象クラス, RepositoryError
- テスト: 16テスト（CRUD, 同期, バックグラウンド同期）

#### Notes Repository (#196)
- `lib/repositories/notes-repository.ts` - NotesRepository クラス
- 固有メソッド: getBySlug(), getDefaultNote()
- テスト: 6テスト

#### Pages Repository (#196)
- `lib/repositories/pages-repository.ts` - PagesRepository クラス
- 固有メソッド: getByNoteId(), updateMetadata()
- テスト: 5テスト

#### Decks Repository (#197)
- `lib/repositories/decks-repository.ts` - DecksRepository クラス
- テスト: 3テスト

#### Cards Repository (#197)
- `lib/repositories/cards-repository.ts` - CardsRepository クラス
- 固有メソッド: getByDeckId(), getDueCards(), updateReviewResult(), createBatch()
- FSRS初期値設定: ease_factor=2.5, repetition_count=0 等
- テスト: 5テスト

#### テスト結果
- 全35テスト成功（5ファイル）

#### 公開ページ翻訳対応
- `messages/ja.json` - Auth セクション拡張（12キー）、Landing セクション追加（100+キー）
- `messages/en.json` - 同上の英語翻訳追加
- Auth コンポーネント: `LoginForm.tsx`, `GoogleLoginForm.tsx`, `MagicLinkForm.tsx`, `page.tsx`
- Landing コンポーネント: `hero-section.tsx`, `value-proposition-section.tsx`, `feature-section.tsx`, `pricing-section.tsx`, `faq-section.tsx`, `testimonial-section.tsx`, `cta-section.tsx`
- 動的データ対応: `testimonials` と `faq` は配列データとして翻訳ファイルから取得

</details>

---

### Week 5: 2025/12/24 〜 2025/12/30 ✅ 完了

```
┌─────────────────────────────────────────────────────────────────┐
│  Hybrid DB: Phase D 完了 ✅                                      │
│  └─ #198 既存フックの Repository 移行 ✅                         │
│                                                                  │
│  i18n: Phase 2 完了 ✅                                           │
│  └─ バリデーション・通知メッセージの共通化 ✅                     │
│                                                                  │
│  状態: Week 5 目標達成 🎉                                        │
└─────────────────────────────────────────────────────────────────┘
```

**今週のゴール**:
- [x] useNotes, useDecks フック移行完了 ✅ (2025-11-26)
- [x] i18n Phase 2 完了 ✅ (2025-11-26)
- [x] 翻訳キー適用済みのエラー表示 ✅ (2025-11-26)

<details>
<summary>📝 Week 5 完了作業詳細</summary>

#### フックの Repository 移行 (#198)
- `hooks/notes/useNotes.ts` - NotesRepository を使用するように移行
- `hooks/notes/useCreateNote.ts` - NotesRepository.create を使用
- `hooks/decks/useDecks.ts` - DecksRepository を使用するように移行
- `hooks/decks/useCreateDeck.ts` - DecksRepository.create を使用
- `hooks/decks/useUpdateDeck.ts` - DecksRepository.update を使用

#### i18n エラーメッセージ対応
- `messages/ja.json` - Repository エラー翻訳キー追加（errors.repository.*）
- `messages/en.json` - 同上の英語翻訳追加
- `lib/repositories/error-messages.ts` - エラーメッセージユーティリティ
- `lib/hooks/use-repository-error.ts` - i18n対応エラーハンドリングフック

#### テスト更新
- `hooks/notes/__tests__/helpers.tsx` - LocalNote 型対応
- `hooks/notes/__tests__/useNotes.test.ts` - Repository モック追加
- `hooks/notes/__tests__/useCreateNote.test.ts` - Repository モック追加
- `hooks/decks/__tests__/helpers.tsx` - LocalDeck 同期メタデータ追加
- `hooks/decks/__tests__/useDecks.test.ts` - Repository モック追加
- `hooks/decks/__tests__/useCreateDeck.test.ts` - Repository モック追加
- `hooks/decks/__tests__/useUpdateDeck.test.ts` - Repository モック追加
- テスト結果: 149テスト成功（34ファイル）

</details>

---

### Week 6-1: 2025/12/03 〜 2025/12/06 ✅ 完了

```
┌─────────────────────────────────────────────────────────────────┐
│  Hybrid DB: Phase D-2 (#204)                                    │
│  ├─ Notes 基本CRUD フック移行 ✅                                  │
│  │   ├─ useNote.ts → notesRepository.getBySlug() ✅              │
│  │   ├─ useUpdateNote.ts → notesRepository.update() ✅           │
│  │   ├─ useDeleteNote.ts → notesRepository.delete() ✅           │
│  │   ├─ useDefaultNote.ts → notesRepository.getDefaultNote() ✅  │
│  │   └─ useCreateDefaultNote.ts → notesRepository.create() ✅    │
│  │                                                               │
│  └─ Pages 基本CRUD フック移行 ✅                                  │
│      ├─ usePage.ts → pagesRepository.getById() ✅                │
│      ├─ useCreatePage.ts → ⏳ Phase D-5へ延期（複雑ロジック）     │
│      ├─ useUpdatePage.ts → pagesRepository.updateMetadata() ✅   │
│      ├─ useDeletePage.ts → pagesRepository.delete() ✅           │
│      ├─ usePagesByNote.ts → pagesRepository.getByNoteId() ✅     │
│      ├─ useUserPages.ts → pagesRepository.getAll() ✅            │
│      └─ useNotePages.ts → 部分移行（RPC pagination維持）✅        │
│                                                                  │
│  状態: ✅ 完了（テスト更新は Week 6-2 で対応）                    │
└─────────────────────────────────────────────────────────────────┘
```

**Week 6-1 のゴール**:
- [x] Notes 基本 CRUD フック移行完了（5/5件）✅
- [x] Pages 基本 CRUD フック移行完了（6/7件、1件は Phase D-5 へ延期）✅
- [ ] テスト更新 → Week 6-2 で対応

<details>
<summary>📝 Week 6-1 完了作業詳細</summary>

#### Notes フック移行
- `hooks/notes/useNote.ts` - `notesRepository.getBySlug()` を使用
- `hooks/notes/useUpdateNote.ts` - `notesRepository.update()` を使用
- `hooks/notes/useDeleteNote.ts` - `notesRepository.getById()` + `delete()` を使用
- `hooks/notes/useDefaultNote.ts` - `notesRepository.getDefaultNote()` を使用
- `hooks/notes/useCreateDefaultNote.ts` - `notesRepository.createDefaultNote()` を使用

#### Pages フック移行
- `hooks/pages/usePage.ts` - `pagesRepository.getById()` を使用
- `hooks/pages/useUpdatePage.ts` - `pagesRepository.updateMetadata()` を使用
- `hooks/pages/useDeletePage.ts` - `pagesRepository.delete()` を使用
- `hooks/pages/usePagesByNote.ts` - `pagesRepository.getByNoteId()` を使用
- `hooks/pages/useUserPages.ts` - `pagesRepository.getAll()` + `toUserPageSummary()` マッピング
- `hooks/notes/useNotePages.ts` - Note解決のみ Repository化（RPC paginationは維持）

#### Repository 更新
- `lib/repositories/notes-repository.ts` - `createDefaultNote()` メソッド追加

#### 延期対応
- `hooks/pages/useCreatePage.ts` - Link Groups同期ロジックが複雑なため Phase D-5 へ延期

#### テスト更新（次週対応）
- Notes/Pages フックテストの Repository モック化が必要
- テストは Supabase モックから Repository モックへの更新が必要

</details>

---

### Week 6-2: 2025/12/07 〜 2025/12/09 🔄 進行中

```
┌─────────────────────────────────────────────────────────────────┐
│  Hybrid DB: Phase D-3 (#205)                                    │
│  ├─ Notes/Pages テスト更新（Week 6-1 の残作業）                  │
│  │   ├─ useNote.test.ts → Repository モック化                    │
│  │   ├─ useUpdateNote.test.ts → Repository モック化              │
│  │   ├─ useDeleteNote.test.ts → Repository モック化              │
│  │   ├─ useDefaultNote.test.ts → Repository モック化             │
│  │   ├─ useCreateDefaultNote.test.ts → Repository モック化       │
│  │   └─ Pages関連テスト → Repository モック化                    │
│  │                                                               │
│  ├─ Decks 残りCRUD フック移行                                    │
│  │   ├─ useDeck.ts → decksRepository.getById()                   │
│  │   ├─ useDeleteDeck.ts → decksRepository.delete()              │
│  │   └─ useDuplicateDeck.ts → decksRepository.create()           │
│  │                                                               │
│  └─ Cards 全CRUD フック移行                                      │
│      ├─ useCardsByDeck.ts → cardsRepository.getByDeckId()        │
│      ├─ useCard.ts → cardsRepository.getById()                   │
│      ├─ useCreateCard.ts → cardsRepository.create()              │
│      ├─ useCreateCards.ts → cardsRepository.createBatch()        │
│      ├─ useUpdateCard.ts → cardsRepository.update()              │
│      ├─ useDeleteCard.ts → cardsRepository.delete()              │
│      ├─ useDueCardsByDeck.ts → cardsRepository.getDueCards()     │
│      ├─ useCardsByUser.ts → cardsRepository.getAll()             │
│      └─ useAllDueCountsByUser.ts → 新規メソッド追加              │
│                                                                  │
│  i18n: Phase 3 開始                                              │
│  └─ プラグイン API へのロケールコンテキスト注入                   │
│                                                                  │
│  状態: ⬜ 未着手                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Week 6-2 のゴール**:
- [ ] Notes/Pages テスト更新（Repository モック化）
- [ ] Decks 残り CRUD フック移行完了（3件）
- [ ] Cards 全 CRUD フック移行完了（9件）
- [ ] プラグイン i18n 対応開始

---

### Week 7-1: 2025/12/31 〜 2026/01/03

```
┌─────────────────────────────────────────────────────────────────┐
│  Hybrid DB: Phase D-4 (#206)                                    │
│  ├─ Repository 新規作成                                          │
│  │   ├─ StudyGoalsRepository 作成                                │
│  │   ├─ LearningLogsRepository 作成                              │
│  │   └─ MilestonesRepository 作成                                │
│  │                                                               │
│  ├─ StudyGoals フック移行（7件）                                 │
│  │   ├─ useStudyGoals.ts                                         │
│  │   ├─ useCreateStudyGoal.ts                                    │
│  │   ├─ useUpdateStudyGoal.ts                                    │
│  │   ├─ useDeleteStudyGoal.ts                                    │
│  │   ├─ useCompleteStudyGoal.ts                                  │
│  │   ├─ useUpdateGoalsPriority.ts                                │
│  │   └─ useGoalLimits.ts                                         │
│  │                                                               │
│  ├─ LearningLogs フック移行（8件）                               │
│  │   ├─ useLearningLogs.ts                                       │
│  │   ├─ useLearningLog.ts                                        │
│  │   ├─ useCreateLearningLog.ts                                  │
│  │   ├─ useUpdateLearningLog.ts                                  │
│  │   ├─ useDeleteLearningLog.ts                                  │
│  │   ├─ useRecentActivity.ts                                     │
│  │   ├─ useReviewCards.ts                                        │
│  │   └─ useTodayReviewCountsByDeck.ts                            │
│  │                                                               │
│  └─ Milestones フック移行（4件）                                 │
│      ├─ useMilestones.ts                                         │
│      ├─ useCreateMilestone.ts                                    │
│      ├─ useUpdateMilestone.ts                                    │
│      └─ useDeleteMilestone.ts                                    │
│                                                                  │
│  i18n: Phase 3 継続                                              │
│  └─ Tauri コマンドでの翻訳利用                                   │
│                                                                  │
│  状態: ⬜ 未着手                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Week 7-1 のゴール**:
- [ ] 3つの Repository クラス新規作成
- [ ] StudyGoals フック移行完了（7件）
- [ ] LearningLogs フック移行完了（8件）
- [ ] Milestones フック移行完了（4件）

---

### Week 7-2: 2026/01/04 〜 2026/01/06

```
┌─────────────────────────────────────────────────────────────────┐
│  Hybrid DB: Phase D-5 (#207)                                    │
│  ├─ Notes 共有関連（8件）                                        │
│  │   ├─ useShareNote.ts                                          │
│  │   ├─ useUnshareNote.ts                                        │
│  │   ├─ useNoteShares.ts                                         │
│  │   ├─ useNoteShareLinks.ts                                     │
│  │   ├─ useGenerateNoteShareLink.ts                              │
│  │   ├─ useRevokeNoteShareLink.ts                                │
│  │   ├─ useJoinNoteByLink.ts                                     │
│  │   └─ useJoinNotePublic.ts                                     │
│  │                                                               │
│  ├─ Notes ゴミ箱関連（4件）                                      │
│  │   ├─ useMoveNoteToTrash.ts                                    │
│  │   ├─ useRestoreNoteFromTrash.ts                               │
│  │   ├─ useTrashItems.ts                                         │
│  │   └─ useDeletePagesPermanently.ts                             │
│  │                                                               │
│  ├─ Notes ページリンク関連（8件）                                │
│  │   ├─ useLinkPageToNote.ts                                     │
│  │   ├─ useLinkPageToDefaultNote.ts                              │
│  │   ├─ useUnlinkPageFromNote.ts                                 │
│  │   ├─ useBatchMovePages.ts                                     │
│  │   ├─ useCheckBatchConflicts.ts                                │
│  │   ├─ useCheckPageConflict.ts                                  │
│  │   ├─ useMigrateOrphanedPages.ts                               │
│  │   └─ useAllUserPages.ts                                       │
│  │                                                               │
│  ├─ Decks 共有関連（4件）                                        │
│  │   ├─ useSharedDecks.ts                                        │
│  │   ├─ useDeckPermissions.ts                                    │
│  │   ├─ useNoteDeckLinks.ts                                      │
│  │   └─ useSyncDeckLinks.ts                                      │
│  │                                                               │
│  └─ Pages 追加機能（3件）                                        │
│      ├─ useSharedPages.ts                                        │
│      ├─ usePageVisits.ts                                         │
│      └─ usePageBacklinks.ts                                      │
│                                                                  │
│  i18n: Phase 3 継続                                              │
│  └─ 通知・ダイアログの多言語化                                   │
│                                                                  │
│  状態: ⬜ 未着手                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Week 7-2 のゴール**:
- [ ] Notes 共有・ゴミ箱・ページリンク関連フック移行（20件）
- [ ] Decks 共有関連フック移行（4件）
- [ ] Pages 追加機能フック移行（3件）
- [ ] 通知・ダイアログのi18n対応

---

### Week 8: 2026/01/07 〜 2026/01/13

```
┌─────────────────────────────────────────────────────────────────┐
│  Hybrid DB: Phase E 開始                                        │
│  ├─ #199 Yjs + Supabase Realtime 統合                            │
│  └─ #200 Tiptap Collaboration Extension                          │
│                                                                  │
│  i18n: Phase 3 継続                                              │
│  └─ 通知・ダイアログの多言語化                                   │
│                                                                  │
│  ⚠️ 同期ポイント: リアルタイム編集UIでi18n適用                    │
└─────────────────────────────────────────────────────────────────┘
```

**今週のゴール**:
- [ ] Yjs + Supabase Realtime 接続確立
- [ ] Tiptap Collaboration 基本動作確認
- [ ] 接続ステータス表示のi18n対応

---

### Week 8: 2026/01/07 〜 2026/01/13

```
┌─────────────────────────────────────────────────────────────────┐
│  Hybrid DB: Phase E 開始                                        │
│  ├─ #199 Yjs + Supabase Realtime 統合                            │
│  └─ #200 Tiptap Collaboration Extension                          │
│                                                                  │
│  i18n: Phase 3 継続                                              │
│  └─ リアルタイム編集UIのi18n対応                                 │
│                                                                  │
│  ⚠️ 同期ポイント: 接続ステータス表示でi18n適用                    │
└─────────────────────────────────────────────────────────────────┘
```

**Week 8 のゴール**:
- [ ] Yjs + Supabase Realtime 接続確立
- [ ] Tiptap Collaboration 基本動作確認
- [ ] 接続ステータス表示のi18n対応

---

### Week 9: 2026/01/14 〜 2026/01/20

```
┌─────────────────────────────────────────────────────────────────┐
│  Hybrid DB: Phase E 継続                                        │
│  └─ #201 プレゼンス・カーソル共有                                │
│                                                                  │
│  i18n: Phase 3 完了                                              │
│  └─ sandbox worker 用翻訳ブリッジ完成                            │
│                                                                  │
│  ⚠️ 同期ポイント: 「〇〇さんが編集中」等の表示でi18n適用          │
└─────────────────────────────────────────────────────────────────┘
```

**今週のゴール**:
- [ ] プレゼンス機能完成
- [ ] カーソル共有実装
- [ ] 「{name}さんが編集中」の翻訳対応

---

### Week 9: 2026/01/14 〜 2026/01/20

```
┌─────────────────────────────────────────────────────────────────┐
│  Hybrid DB: Phase E 継続                                        │
│  └─ #201 プレゼンス・カーソル共有                                │
│                                                                  │
│  i18n: Phase 3 完了                                              │
│  └─ sandbox worker 用翻訳ブリッジ完成                            │
│                                                                  │
│  ⚠️ 同期ポイント: 「〇〇さんが編集中」等の表示でi18n適用          │
└─────────────────────────────────────────────────────────────────┘
```

**Week 9 のゴール**:
- [ ] プレゼンス機能完成
- [ ] カーソル共有実装
- [ ] 「{name}さんが編集中」の翻訳対応

---

### Week 10: 2026/01/21 〜 2026/01/31

```
┌─────────────────────────────────────────────────────────────────┐
│  Hybrid DB: 統合テスト・最終調整                                 │
│  ├─ オフライン→オンライン同期テスト                              │
│  ├─ 競合解決シナリオテスト                                       │
│  └─ パフォーマンス最適化                                         │
│                                                                  │
│  i18n: Phase 4                                                   │
│  ├─ 自動テスト整備（Vitest + Playwright）                        │
│  ├─ 翻訳ファイル CI パイプライン構築                              │
│  └─ 初期ロケール（日本語・英語）翻訳完了                         │
│                                                                  │
│  状態: 統合テスト・リリース準備                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Week 10 のゴール**:
- [ ] v0.4.0 リリース候補完成
- [ ] 全機能の統合テスト完了
- [ ] 日本語・英語翻訳完了

---

## 📊 依存関係マトリクス

### Hybrid DB → i18n への依存

| Hybrid DB Phase | i18n 依存 | 理由 |
|-----------------|-----------|------|
| Phase A (#190, #191, #192) | なし | データ層のみ |
| Phase B (#193, #194) | 低 | エラーメッセージは後から対応可能 |
| Phase C (#195, #196, #197) | 中 | エラーコード設計時にi18n考慮推奨 |
| Phase D (#198) | 高 | UI更新時にi18n適用が効率的 |
| Phase E (#199, #200, #201) | 高 | ステータス表示等でi18n必須 |

### i18n → Hybrid DB への依存

| i18n Phase | Hybrid DB 依存 | 理由 |
|------------|----------------|------|
| Phase 1 | なし | 基盤構築のみ |
| Phase 2 | なし | 既存UIの翻訳 |
| Phase 3 | 中 | Tauri Commands のエラーメッセージ翻訳 |
| Phase 4 | 低 | テスト時に統合確認 |

---

## ⚡ クイックリファレンス

### Phase A〜C 完了済み（i18n待ち不要）

```
✅ #190 IndexedDB Client     → 完了 (2025-11-26)
✅ #191 SQLite Schema (Rust) → 完了 (2025-11-26) ※Notes CRUD実装済み
✅ #192 Tauri Commands       → 完了 (2025-11-26) ※全エンティティCRUD実装済み
✅ #193 Sync Manager         → 完了 (2025-11-26) ※SyncManager, SyncQueue, SyncTriggers実装済み
✅ #194 Conflict Resolution  → 完了 (2025-11-26) ※LWW方式の競合解決実装済み
✅ #195 Repository Base      → 完了 (2025-11-26) ※BaseRepository, RepositoryError実装済み
✅ #196 Notes/Pages Repo     → 完了 (2025-11-26) ※NotesRepository, PagesRepository実装済み
✅ #197 Decks/Cards Repo     → 完了 (2025-11-26) ※DecksRepository, CardsRepository実装済み
```

### Phase D 進行状況

```
✅ #198 Hook Migration (Part 1) → 完了 (2025-11-26)
   - useNotes, useCreateNote, useDecks, useCreateDeck, useUpdateDeck 移行済み

🔄 #204 Phase D-2 Notes/Pages   → Week 6-1 (2025/12/03〜12/06)
   - Notes 基本CRUD: useNote, useUpdateNote, useDeleteNote, useDefaultNote, useCreateDefaultNote
   - Pages 基本CRUD: usePage, useCreatePage, useUpdatePage, useDeletePage, usePagesByNote, useUserPages, useNotePages

⬜ #205 Phase D-3 Decks/Cards   → Week 6-2 (2025/12/07〜12/09)
   - Decks 残り: useDeck, useDeleteDeck, useDuplicateDeck
   - Cards 全件: useCardsByDeck, useCard, useCreateCard, useCreateCards, useUpdateCard, useDeleteCard, useDueCardsByDeck, useCardsByUser, useAllDueCountsByUser

⬜ #206 Phase D-4 学習系        → Week 7-1 (2025/12/31〜01/03)
   - Repository新規作成: StudyGoalsRepository, LearningLogsRepository, MilestonesRepository
   - StudyGoals: 7件, LearningLogs: 8件, Milestones: 4件

⬜ #207 Phase D-5 共有・管理    → Week 7-2 (2026/01/04〜01/06)
   - Notes共有: 8件, ゴミ箱: 4件, ページリンク: 8件
   - Decks共有: 4件, Pages追加: 3件
```

### Phase E（i18n Phase 3 以降と並行）

```
⬜ #199 Yjs + Realtime          → Week 8 (2026/01/07〜01/13)
⬜ #200 Tiptap Collaboration    → Week 8 (2026/01/07〜01/13)
⬜ #201 Presence & Cursor       → Week 9 (2026/01/14〜01/20)
```

### フック移行 全体サマリー

| Phase | Issue | 対象フック数 | 状態 |
|-------|-------|-------------|------|
| D-1 | #198 | 5件 | ✅ 完了 |
| D-2 | #204 | 12件 | 🔄 Week 6-1 |
| D-3 | #205 | 12件 | ⬜ Week 6-2 |
| D-4 | #206 | 19件 | ⬜ Week 7-1 |
| D-5 | #207 | 27件 | ⬜ Week 7-2 |
| **合計** | - | **75件** | 約6.7%完了 |

---

## 🔗 関連ドキュメント

- [Hybrid DB Epic Issue #189](https://github.com/otomatty/for-all-learners/issues/189)
- [国際化対応 Issue #119](https://github.com/otomatty/for-all-learners/issues/119)
- **Phase D 細分化 Issue**:
  - [#204 Phase D-2 Notes/Pages](https://github.com/otomatty/for-all-learners/issues/204)
  - [#205 Phase D-3 Decks/Cards](https://github.com/otomatty/for-all-learners/issues/205)
  - [#206 Phase D-4 StudyGoals/LearningLogs/Milestones](https://github.com/otomatty/for-all-learners/issues/206)
  - [#207 Phase D-5 共有・管理フック](https://github.com/otomatty/for-all-learners/issues/207)
- [Tauri移行計画](docs/03_plans/tauri-migration/20251109_01_implementation-plan.md)
- [国際化実装計画](docs/03_plans/internationalization/20251109_01_internationalization-plan.md)
- [Supabase-Tauri統合リサーチ](docs/02_research/2025_11/20251109_02_supabase-tauri-integration.md)

---

## 📝 更新履歴

| 日付 | 更新内容 |
|------|----------|
| 2025-11-26 | 初版作成 |
| 2025-11-26 | Week 1 完了: IndexedDB基盤、SQLiteスキーマ、i18n基盤（#190, #191, #119） |
| 2025-11-26 | Week 2 Tauri Commands完了: Rust Commands実装、TypeScriptクライアント実装（#192） |
| 2025-11-26 | Week 3 完了: 同期マネージャー、競合解決ロジック、翻訳追加（#193, #194） |
| 2025-11-26 | Week 4 Phase C完了: Repository基盤、Notes/Pages/Decks/Cards Repository（#195, #196, #197） |
| 2025-11-26 | Week 4 i18n完了: 公開ページ（Landing / Auth）翻訳対応完了 |
| 2025-11-26 | Week 5 Phase D完了: フックのRepository移行、i18nエラーメッセージ対応（#198） |
| 2025-11-29 | Week 6〜7 スケジュール細分化: Phase D を D-2〜D-5 に分割 |
| 2025-11-29 | 新規Issue作成: #204, #205, #206, #207（残タスク整理） |

