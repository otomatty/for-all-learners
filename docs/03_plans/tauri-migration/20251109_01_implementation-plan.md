# Tauri 2.0 移行実装計画書

## 概要

**目的**: Next.js 16 アプリケーションを Tauri 2.0 ネイティブアプリ化するための実装計画書

**期間**: 約6-8週間（フェーズ別に段階的実装）

**前提条件**:
- Next.js 16 + React + TypeScript
- Supabase をバックエンドとして使用
- 111個のServer Actionsファイルをクライアント側に移行

---

## 参照ドキュメント

### 技術調査
- [Tauri移行計画](../../01_issues/open/2025_11/20251109_01_tauri-native-migration.md) - 全体計画とプラットフォーム別対応
- [Server Actions移行戦略](../../02_research/2025_11/20251109_01_server-actions-migration-strategy.md) - Server Actionsの移行パターンと戦略
- [Supabase Tauri統合戦略](../../02_research/2025_11/20251109_02_supabase-tauri-integration.md) - Supabase認証・セッション管理・同期戦略

### 関連実装計画
- 実装計画: `docs/03_plans/tauri-migration/`（このディレクトリ）
- 作業ログ: `docs/05_logs/2025_11/`

---

## 実装フェーズ

## テスト駆動開発（TDD）アプローチ

**重要**: すべてのフェーズで**テスト駆動開発（TDD）のアプローチを採用**します。

### TDDのワークフロー

1. **Red（赤）**: 既存のServer Actionを分析し、テストケースを先に作成（テストは失敗する）
2. **Green（緑）**: テストが通るようにカスタムフックを実装
3. **Refactor（リファクタ）**: コードを改善し、テストが引き続き通ることを確認

### テスト作成のガイドライン

- **既存のServer Actionを参考**: テストは既存のServer Actionの動作を再現するように記述
- **テストヘルパーの活用**: `hooks/{feature}/__tests__/helpers.ts` に共通のモックやヘルパー関数を定義
- **テスト構造**: Notes関連のテスト（`hooks/notes/__tests__/`）を参考にする
- **カバレッジ**: 正常系・異常系・エッジケースを網羅

### Phase 0: 準備・環境構築（1週間）

**目標**: Tauri開発環境のセットアップと基盤整備

#### タスク

1. **Tauri環境のセットアップ** (2-3日)
   - [ ] Rust toolchain インストール確認
   - [ ] Tauri CLI インストール (`bun add -D @tauri-apps/cli`)
   - [ ] `bunx tauri init` 実行
   - [ ] `src-tauri/tauri.conf.json` の基本設定
   - [ ] アイコンアセット準備（`.icns`, `.ico`, `.png`）

2. **TanStack Query のセットアップ** (1日)
   - [ ] `@tanstack/react-query` インストール確認（既にインストール済み）
   - [ ] `components/providers.tsx` の確認・最適化
   - [ ] QueryClient の設定確認（デフォルトオプション）
   - [ ] DevTools の設定確認

3. **Supabase クライアントの Tauri 対応** (2-3日)
   - [ ] `lib/supabase/client.ts` の確認
   - [ ] Tauri環境検出ロジックの実装
   - [ ] カスタムスキーム対応の準備
   - [ ] localStorage ベースのセッション管理準備

4. **プロジェクト構造の確認** (1日)
   - [ ] Server Actions ファイルの棚卸し
   - [ ] 依存関係のマッピング
   - [ ] 移行優先度の決定

#### 参照ファイル

- `package.json` - 依存関係確認
- `components/providers.tsx` - TanStack Query設定
- `lib/supabase/client.ts` - Supabaseクライアント
- `app/_actions/` - Server Actions一覧

#### 完了条件

- Tauri開発環境が動作する
- TanStack Queryが正しく設定されている
- SupabaseクライアントがTauri環境を検出できる

---

### Phase 1: CRUD操作の移行（2週間）

**目標**: 基本的なデータベース操作をクライアント側に移行

**移行パターン**: パターン1（クライアント側Supabase直接アクセス）

#### Phase 1.1: Notes関連の移行（1週間）

**対象ファイル** (29ファイル):
```
app/_actions/notes/
├── createNote.ts
├── updateNote.ts
├── deleteNote.ts
├── getNotesList.ts
├── getNoteDetail.ts
├── getNotePages.ts
├── linkPageToNote.ts
├── unlinkPageFromNote.ts
├── shareNote.ts
├── unshareNote.ts
├── generateNoteShareLink.ts
├── revokeNoteShareLink.ts
├── joinNoteByLink.ts
├── joinNotePublic.ts
├── moveToTrash.ts
├── restoreFromTrash.ts
├── getTrashItems.ts
├── deletePagesPermanently.ts
├── batchMovePages.ts
├── checkPageConflict.ts
├── checkBatchConflicts.ts
├── createDefaultNote.ts
├── getDefaultNote.ts
├── getAllUserPages.ts
├── migrateOrphanedPages.ts
└── types.ts
```

**実装手順（TDDアプローチ）**:

1. **既存Server Actionの分析** (0.5日)
   - [x] `app/_actions/notes/` の各関数を分析（完了）
   - [x] 入力・出力・エラーハンドリングを確認（完了）

2. **テストケースの作成** (1日)
   - [x] `hooks/notes/__tests__/` ディレクトリ作成（完了）
   - [x] `hooks/notes/__tests__/helpers.ts` - テストヘルパー作成（完了）
   - [x] 各カスタムフックのテストファイル作成（完了）
   - [x] 各テストは既存のServer Actionの動作を再現するように記述（完了）

3. **カスタムフックの作成** (2-3日)
   - [x] `hooks/notes/` ディレクトリ配下に各カスタムフックを個別ファイルとして作成
   - [x] `useNotes()` - ノート一覧取得 (`hooks/notes/useNotes.ts`)
   - [x] `useNote(slug)` - ノート詳細取得 (`hooks/notes/useNote.ts`)
   - [x] `useCreateNote()` - ノート作成 (`hooks/notes/useCreateNote.ts`)
   - [x] `useUpdateNote()` - ノート更新 (`hooks/notes/useUpdateNote.ts`)
   - [x] `useDeleteNote()` - ノート削除 (`hooks/notes/useDeleteNote.ts`)
   - [x] `useLinkPageToNote()` - ページ紐付け (`hooks/notes/useLinkPageToNote.ts`)
   - [x] `useUnlinkPageFromNote()` - ページ紐付け解除 (`hooks/notes/useUnlinkPageFromNote.ts`)
   - [x] `useShareNote()` - ノート共有 (`hooks/notes/useShareNote.ts`)
   - [x] `useUnshareNote()` - 共有解除 (`hooks/notes/useUnshareNote.ts`)
   - [x] `useNoteShareLinks()` - 共有リンク取得 (`hooks/notes/useNoteShareLinks.ts`)
   - [x] `useGenerateNoteShareLink()` - 共有リンク生成 (`hooks/notes/useGenerateNoteShareLink.ts`)
   - [x] `useRevokeNoteShareLink()` - 共有リンク失効 (`hooks/notes/useRevokeNoteShareLink.ts`)
   - [x] `useJoinNoteByLink()` - リンクでノート参加 (`hooks/notes/useJoinNoteByLink.ts`)
   - [x] `useJoinNotePublic()` - 公開ノート参加 (`hooks/notes/useJoinNotePublic.ts`)
   - [x] `useMoveNoteToTrash()` - ゴミ箱へ移動 (`hooks/notes/useMoveNoteToTrash.ts`)
   - [x] `useRestoreNoteFromTrash()` - ゴミ箱から復元 (`hooks/notes/useRestoreNoteFromTrash.ts`)
   - [x] `useTrashItems()` - ゴミ箱アイテム取得 (`hooks/notes/useTrashItems.ts`)
   - [x] `useDeletePagesPermanently()` - ページ完全削除 (`hooks/notes/useDeletePagesPermanently.ts`)
   - [x] `useBatchMovePages()` - ページ一括移動 (`hooks/notes/useBatchMovePages.ts`)
   - [x] `useCheckPageConflict()` - ページ競合チェック (`hooks/notes/useCheckPageConflict.ts`)
   - [x] `useCheckBatchConflicts()` - 一括競合チェック (`hooks/notes/useCheckBatchConflicts.ts`)
   - [x] `useCreateDefaultNote()` - デフォルトノート作成 (`hooks/notes/useCreateDefaultNote.ts`)
   - [x] `useDefaultNote()` - デフォルトノート取得 (`hooks/notes/useDefaultNote.ts`)
   - [x] `useAllUserPages()` - 全ユーザーページ取得 (`hooks/notes/useAllUserPages.ts`)
   - [x] `useMigrateOrphanedPages()` - 孤立ページ移行 (`hooks/notes/useMigrateOrphanedPages.ts`)

4. **Server Actions呼び出し箇所の特定と置き換え** (2-3日)
   - [x] `app/(protected)/notes/` 配下のコンポーネントを確認
   - [x] Server Actionsの呼び出し箇所を特定
   - [x] カスタムフックへの置き換え
   - [x] `revalidatePath()` の削除（Notes関連では使用されていなかった）

5. **テスト・動作確認** (1-2日)
   - [x] 各機能の動作確認
   - [x] エラーハンドリングの確認
   - [x] キャッシュ動作の確認
   - [x] テストがすべて通ることを確認（完了）

**参照ファイル**:
- `app/_actions/notes/*` - 移行元Server Actions
- `app/(protected)/notes/` - 使用箇所
- `hooks/notes/*` - 新規作成（29個のフックファイル）

**注意**: カスタムフックはルートの `hooks/` ディレクトリ配下に配置。各フックを個別ファイルとして作成。**テスト駆動開発（TDD）のアプローチを採用**し、テストを先に作成してから実装を行う。

**実装例**:
```typescript
// hooks/notes/useNotes.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function useNotes() {
  const supabase = createClient();
  
  return useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateNote() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: CreateNotePayload) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("notes")
        .insert([{ owner_id: user.id, ...payload }])
        .select("*")
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}
```

#### Phase 1.2: Decks関連の移行（2-3日）

**対象ファイル**:
- `app/_actions/decks.ts`

**対象Server Actions**:
- `getDecksByUser(userId: string)` - ユーザーのデッキ一覧取得
- `getDeckById(id: string)` - デッキ詳細取得
- `createDeck(deck)` - デッキ作成
- `updateDeck(id, updates)` - デッキ更新
- `deleteDeck(id: string)` - デッキ削除（関連データも削除）
- `getSharedDecksByUser(userId: string)` - 共有デッキ一覧取得
- `createDeckAction(formData)` - フォームからデッキ作成（revalidatePath含む）
- `syncDeckLinks(deckId: string)` - デッキ内カードのリンク同期

**実装手順（TDDアプローチ）**:

1. **既存Server Actionの分析** (0.5日)
   - [ ] `app/_actions/decks.ts` の各関数を分析
   - [ ] 入力・出力・エラーハンドリングを確認
   - [ ] 依存関係（`syncCardLinks`, `revalidatePath`）を確認

2. **テストケースの作成** (1日)
   - [ ] `hooks/decks/__tests__/` ディレクトリ作成
   - [ ] `hooks/decks/__tests__/helpers.ts` - テストヘルパー作成
   - [ ] `hooks/decks/__tests__/useDecks.test.ts` - `useDecks()` のテスト
   - [ ] `hooks/decks/__tests__/useDeck.test.ts` - `useDeck(id)` のテスト
   - [ ] `hooks/decks/__tests__/useCreateDeck.test.ts` - `useCreateDeck()` のテスト
   - [ ] `hooks/decks/__tests__/useUpdateDeck.test.ts` - `useUpdateDeck()` のテスト
   - [ ] `hooks/decks/__tests__/useDeleteDeck.test.ts` - `useDeleteDeck()` のテスト
   - [ ] `hooks/decks/__tests__/useSharedDecks.test.ts` - `useSharedDecks()` のテスト
   - [ ] 各テストは既存のServer Actionの動作を再現するように記述
   - [ ] テストは最初は失敗する（Red）

3. **カスタムフックの実装** (1日)
   - [ ] `hooks/decks/` ディレクトリ配下に各カスタムフックを個別ファイルとして作成
   - [ ] `useDecks()` - デッキ一覧取得 (`hooks/decks/useDecks.ts`)
   - [ ] `useDeck(id)` - デッキ詳細取得 (`hooks/decks/useDeck.ts`)
   - [ ] `useCreateDeck()` - デッキ作成 (`hooks/decks/useCreateDeck.ts`)
   - [ ] `useUpdateDeck()` - デッキ更新 (`hooks/decks/useUpdateDeck.ts`)
   - [ ] `useDeleteDeck()` - デッキ削除 (`hooks/decks/useDeleteDeck.ts`)
   - [ ] `useSharedDecks()` - 共有デッキ一覧取得 (`hooks/decks/useSharedDecks.ts`)
   - [ ] テストが通るまで実装を繰り返す（Green）
   - [ ] リファクタリング（Refactor）

4. **Server Actions呼び出し箇所の置き換え** (0.5日)
   - [ ] `app/(protected)/decks/` 配下のコンポーネントを確認
   - [ ] Server Actionsの呼び出し箇所を特定
   - [ ] カスタムフックへの置き換え
   - [ ] `revalidatePath()` の削除

**注意**: Phase 1.1と同様に、各フックを個別ファイルとして `hooks/decks/` 配下に配置。**テスト駆動開発（TDD）のアプローチを採用**し、テストを先に作成してから実装を行う。

#### Phase 1.3: Pages関連の移行（2-3日）

**対象ファイル**:
- `app/_actions/pages.ts`
- `app/_actions/pages/get-backlinks.ts`

**対象Server Actions**:
- `getPagesByNote(noteId: string)` - ノート内のページ一覧取得
- `getPageById(id: string)` - ページ詳細取得
- `createPage(page, autoGenerateThumbnail)` - ページ作成（サムネイル自動生成付き）
- `updatePage(id, updates)` - ページ更新
- `deletePage(id: string)` - ページ削除
- `getSharedPagesByUser(userId: string)` - 共有ページ一覧取得

**実装手順（TDDアプローチ）**:

1. **既存Server Actionの分析** (0.5日)
   - [ ] `app/_actions/pages.ts` の各関数を分析
   - [ ] 入力・出力・エラーハンドリングを確認
   - [ ] 依存関係（`syncLinkGroupsForPage`, `connectLinkGroupToPage`, `linkPageToDefaultNote`）を確認
   - [ ] サムネイル自動生成ロジックの確認

2. **テストケースの作成** (1日)
   - [ ] `hooks/pages/__tests__/` ディレクトリ作成
   - [ ] `hooks/pages/__tests__/helpers.ts` - テストヘルパー作成
   - [ ] `hooks/pages/__tests__/usePagesByNote.test.ts` - `usePagesByNote()` のテスト
   - [ ] `hooks/pages/__tests__/usePage.test.ts` - `usePage(id)` のテスト
   - [ ] `hooks/pages/__tests__/useCreatePage.test.ts` - `useCreatePage()` のテスト
   - [ ] `hooks/pages/__tests__/useUpdatePage.test.ts` - `useUpdatePage()` のテスト
   - [ ] `hooks/pages/__tests__/useDeletePage.test.ts` - `useDeletePage()` のテスト
   - [ ] `hooks/pages/__tests__/useSharedPages.test.ts` - `useSharedPages()` のテスト
   - [ ] 各テストは既存のServer Actionの動作を再現するように記述
   - [ ] テストは最初は失敗する（Red）

3. **カスタムフックの実装** (1日)
   - [ ] `hooks/pages/` ディレクトリ配下に各カスタムフックを個別ファイルとして作成
   - [ ] `usePagesByNote(noteId)` - ノート内のページ一覧取得 (`hooks/pages/usePagesByNote.ts`)
   - [ ] `usePage(id)` - ページ詳細取得 (`hooks/pages/usePage.ts`)
   - [ ] `useCreatePage()` - ページ作成 (`hooks/pages/useCreatePage.ts`)
   - [ ] `useUpdatePage()` - ページ更新 (`hooks/pages/useUpdatePage.ts`)
   - [ ] `useDeletePage()` - ページ削除 (`hooks/pages/useDeletePage.ts`)
   - [ ] `useSharedPages()` - 共有ページ一覧取得 (`hooks/pages/useSharedPages.ts`)
   - [ ] テストが通るまで実装を繰り返す（Green）
   - [ ] リファクタリング（Refactor）

4. **Server Actions呼び出し箇所の置き換え** (0.5日)
   - [ ] `app/(protected)/pages/` 配下のコンポーネントを確認
   - [ ] Server Actionsの呼び出し箇所を特定
   - [ ] カスタムフックへの置き換え

**注意**: Phase 1.1と同様に、各フックを個別ファイルとして `hooks/pages/` 配下に配置。**テスト駆動開発（TDD）のアプローチを採用**し、テストを先に作成してから実装を行う。

#### Phase 1.4: Cards関連の移行（2-3日）

**対象ファイル**:
- `app/_actions/cards.ts`
- `app/_actions/syncCardLinks.ts`

**対象Server Actions**:
- `getCardsByDeck(deckId: string)` - デッキ内のカード一覧取得
- `getCardById(id: string)` - カード詳細取得
- `createCard(card)` - カード作成（バックグラウンド問題生成含む）
- `updateCard(id, updates)` - カード更新（バックグラウンド問題生成含む）
- `deleteCard(id: string)` - カード削除
- `getCardsByUser(userId: string)` - ユーザーのカード一覧取得
- `createCards(cards)` - カード一括作成
- `getDueCardsByDeck(deckId, userId)` - 期限切れカード取得
- `getAllDueCountsByUser(userId)` - ユーザーの期限切れカード数取得

**実装手順（TDDアプローチ）**:

1. **既存Server Actionの分析** (0.5日)
   - [ ] `app/_actions/cards.ts` の各関数を分析
   - [ ] 入力・出力・エラーハンドリングを確認
   - [ ] 依存関係（`getUserPlanFeatures`, `isUserPaid`, Edge Functions）を確認
   - [ ] バックグラウンド処理の扱いを確認

2. **テストケースの作成** (1日)
   - [ ] `hooks/cards/__tests__/` ディレクトリ作成
   - [ ] `hooks/cards/__tests__/helpers.ts` - テストヘルパー作成
   - [ ] `hooks/cards/__tests__/useCardsByDeck.test.ts` - `useCardsByDeck()` のテスト
   - [ ] `hooks/cards/__tests__/useCard.test.ts` - `useCard(id)` のテスト
   - [ ] `hooks/cards/__tests__/useCreateCard.test.ts` - `useCreateCard()` のテスト
   - [ ] `hooks/cards/__tests__/useUpdateCard.test.ts` - `useUpdateCard()` のテスト
   - [ ] `hooks/cards/__tests__/useDeleteCard.test.ts` - `useDeleteCard()` のテスト
   - [ ] `hooks/cards/__tests__/useCardsByUser.test.ts` - `useCardsByUser()` のテスト
   - [ ] `hooks/cards/__tests__/useCreateCards.test.ts` - `useCreateCards()` のテスト
   - [ ] `hooks/cards/__tests__/useDueCardsByDeck.test.ts` - `useDueCardsByDeck()` のテスト
   - [ ] `hooks/cards/__tests__/useAllDueCountsByUser.test.ts` - `useAllDueCountsByUser()` のテスト
   - [ ] 各テストは既存のServer Actionの動作を再現するように記述
   - [ ] テストは最初は失敗する（Red）

3. **カスタムフックの実装** (1日)
   - [ ] `hooks/cards/` ディレクトリ配下に各カスタムフックを個別ファイルとして作成
   - [ ] `useCardsByDeck(deckId)` - デッキ内のカード一覧取得 (`hooks/cards/useCardsByDeck.ts`)
   - [ ] `useCard(id)` - カード詳細取得 (`hooks/cards/useCard.ts`)
   - [ ] `useCreateCard()` - カード作成 (`hooks/cards/useCreateCard.ts`)
   - [ ] `useUpdateCard()` - カード更新 (`hooks/cards/useUpdateCard.ts`)
   - [ ] `useDeleteCard()` - カード削除 (`hooks/cards/useDeleteCard.ts`)
   - [ ] `useCardsByUser()` - ユーザーのカード一覧取得 (`hooks/cards/useCardsByUser.ts`)
   - [ ] `useCreateCards()` - カード一括作成 (`hooks/cards/useCreateCards.ts`)
   - [ ] `useDueCardsByDeck()` - 期限切れカード取得 (`hooks/cards/useDueCardsByDeck.ts`)
   - [ ] `useAllDueCountsByUser()` - ユーザーの期限切れカード数取得 (`hooks/cards/useAllDueCountsByUser.ts`)
   - [ ] テストが通るまで実装を繰り返す（Green）
   - [ ] リファクタリング（Refactor）

4. **Server Actions呼び出し箇所の置き換え** (0.5日)
   - [ ] `app/(protected)/decks/[deckId]/` 配下のコンポーネントを確認
   - [ ] Server Actionsの呼び出し箇所を特定
   - [ ] カスタムフックへの置き換え

**注意**: Phase 1.1と同様に、各フックを個別ファイルとして `hooks/cards/` 配下に配置。**テスト駆動開発（TDD）のアプローチを採用**し、テストを先に作成してから実装を行う。バックグラウンド処理（Edge Functions呼び出し）は、テストではモックする。

#### Phase 1.5: その他のCRUD操作（2-3日）

**対象ファイル**:
- `app/_actions/study_goals.ts`
- `app/_actions/learning_logs.ts`
- `app/_actions/milestone.ts`
- `app/_actions/review.ts`

**実装手順（TDDアプローチ）**:

1. **既存Server Actionの分析** (0.5日)
   - [ ] 各ファイルのServer Actionsを分析
   - [ ] 入力・出力・エラーハンドリングを確認
   - [ ] 依存関係を確認

2. **テストケースの作成** (1日)
   - [ ] 各機能のテストディレクトリ作成
   - [ ] `hooks/study_goals/__tests__/` - 学習目標のテスト
   - [ ] `hooks/learning_logs/__tests__/` - 学習ログのテスト
   - [ ] `hooks/milestone/__tests__/` - マイルストーンのテスト
   - [ ] `hooks/review/__tests__/` - 復習のテスト
   - [ ] 各テストは既存のServer Actionの動作を再現するように記述
   - [ ] テストは最初は失敗する（Red）

3. **カスタムフックの実装** (1日)
   - [ ] 各機能のカスタムフック作成
   - [ ] テストが通るまで実装を繰り返す（Green）
   - [ ] リファクタリング（Refactor）

4. **Server Actions呼び出し箇所の置き換え** (0.5日)
   - [ ] Server Actionsの呼び出し箇所を特定
   - [ ] カスタムフックへの置き換え
   - [ ] テスト・動作確認

**注意**: **テスト駆動開発（TDD）のアプローチを採用**し、テストを先に作成してから実装を行う。

#### 完了条件

- すべてのCRUD操作がクライアント側で動作する
- TanStack Queryのキャッシュが正しく機能する
- `revalidatePath()` がすべて削除されている

---

### Phase 2: 認証・セッション管理の移行（1週間）

**目標**: OAuth認証とセッション管理をTauri環境に対応

**移行パターン**: パターン1 + Tauri Deep Link対応

#### 対象ファイル

- `app/_actions/auth.ts`

#### 実装手順

1. **Tauri Deep Link設定** (1-2日)
   - [ ] `src-tauri/tauri.conf.json` にDeep Link設定追加
   - [ ] Rust側のDeep Linkハンドラー実装
   - [ ] TypeScript側のDeep Linkハンドラー実装

2. **SupabaseクライアントのTauri対応** (1-2日)
   - [ ] `lib/supabase/tauri-client.ts` 作成
   - [ ] カスタムスキーム対応
   - [ ] localStorage ベースのセッション管理実装

3. **認証フローの実装** (2-3日)
   - [ ] `lib/auth/tauri-auth-handler.ts` 作成
   - [ ] `lib/auth/tauri-login.ts` 作成（Google OAuth）
   - [ ] `lib/auth/tauri-magic-link.ts` 作成（Magic Link）
   - [ ] `lib/hooks/use-auth.ts` 作成（セッション状態管理）
   - [ ] `app/layout.tsx` にDeep Linkハンドラー設定

4. **既存認証コードの置き換え** (1-2日)
   - [ ] `app/_actions/auth.ts` の呼び出し箇所を特定
   - [ ] 新しい認証フックへの置き換え
   - [ ] テスト・動作確認

#### 参照ファイル

- `app/_actions/auth.ts` - 移行元Server Actions
- `lib/supabase/client.ts` - Supabaseクライアント
- `app/(public)/auth/` - 認証ページ
- `lib/auth/tauri-auth-handler.ts` - 新規作成
- `lib/auth/tauri-login.ts` - 新規作成
- `lib/auth/tauri-magic-link.ts` - 新規作成
- `lib/hooks/use-auth.ts` - 新規作成

#### 参照ドキュメント

- [Supabase Tauri統合戦略](../../02_research/2025_11/20251109_02_supabase-tauri-integration.md) - セクション2, 3, 4を参照

#### 完了条件

- OAuth認証がTauri環境で動作する
- Magic Link認証がTauri環境で動作する
- セッションがlocalStorageに正しく保存される
- Deep Linkが正しく処理される

---

### Phase 3: ファイルアップロード・ストレージの移行（1週間）

**目標**: ファイルアップロード機能をクライアント側に移行

**移行パターン**: パターン1（Supabase Storage直接アクセス）

#### 対象ファイル

- `app/_actions/storage.ts` - 画像アップロード
- `app/_actions/pdfUpload.ts` - PDFアップロード
- `app/_actions/audio_recordings.ts` - 音声ファイル管理
- `app/_actions/audio_transcriptions.ts` - 音声文字起こし

#### 実装手順

1. **Tauriファイルダイアログの統合** (1-2日)
   - [ ] `@tauri-apps/api/dialog` のインストール
   - [ ] `lib/utils/tauri-file-dialog.ts` 作成
   - [ ] ファイル選択ダイアログの実装

2. **ストレージフックの作成** (2-3日)
   - [ ] `lib/hooks/use-storage.ts` 作成
   - [ ] `useUploadImage()` - 画像アップロード
   - [ ] `useUploadPdf()` - PDFアップロード
   - [ ] `useUploadAudio()` - 音声ファイルアップロード
   - [ ] `useGetSignedUrl()` - Signed URL取得
   - [ ] 進捗表示の実装

3. **既存コードの置き換え** (2-3日)
   - [ ] Server Actions呼び出し箇所の特定
   - [ ] 新しいフックへの置き換え
   - [ ] ファイルサイズ制限のクライアント側チェック実装
   - [ ] テスト・動作確認

#### 参照ファイル

- `app/_actions/storage.ts` - 移行元Server Actions
- `app/_actions/pdfUpload.ts` - 移行元Server Actions
- `app/_actions/audio_recordings.ts` - 移行元Server Actions
- `lib/hooks/use-storage.ts` - 新規作成
- `lib/utils/tauri-file-dialog.ts` - 新規作成

#### 実装例

```typescript
// lib/hooks/use-storage.ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { open } from "@tauri-apps/api/dialog";

export function useUploadImage() {
  const supabase = createClient();
  
  return useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      // ファイルサイズチェック（10MB制限）
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("ファイルサイズが10MBを超えています");
      }
      
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from("images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });
      
      if (error) throw error;
      
      // Signed URL取得
      const { data: urlData } = await supabase.storage
        .from("images")
        .createSignedUrl(fileName, 3600);
      
      return urlData?.signedUrl;
    },
  });
}
```

#### 完了条件

- 画像アップロードが動作する
- PDFアップロードが動作する
- 音声ファイルアップロードが動作する
- Tauri環境でのファイル選択ダイアログが動作する
- 進捗表示が正しく機能する

---

### Phase 4: バッチ処理・AI処理の移行（2-3週間）

**目標**: バッチ処理とAI処理を適切なパターンに移行

**移行パターン**: パターン2（API Routes）または パターン3（Tauri Command）

#### Phase 4.1: バッチ処理の移行（1-2週間）

**対象ファイル**:
- `app/_actions/audioBatchProcessing.ts` - 音声ファイルのバッチ文字起こし
- `app/_actions/transcribeImageBatch.ts` - 画像のバッチOCR
- `app/_actions/pdfBatchOcr.ts` - PDFページのバッチOCR
- `app/_actions/pdfJobManager.ts` - PDF処理ジョブ管理
- `app/_actions/unifiedBatchProcessor.ts` - 統合バッチプロセッサー
- `app/_actions/multiFileBatchProcessing.ts` - 複数ファイルバッチ処理

**判断基準**:
- **API Routes**: 外部API（Gemini API）との連携が必要な場合
- **Tauri Command**: パフォーマンスが重要、オフライン処理が必要な場合

**実装手順**:
- [ ] 各バッチ処理の要件分析
- [ ] 移行パターンの決定（API Routes / Tauri Command）
- [ ] API Routes実装 または Tauri Command実装
- [ ] クライアント側の呼び出し実装
- [ ] 進捗管理の実装
- [ ] テスト・動作確認

#### Phase 4.2: AI処理の移行（1週間）

**対象ファイル**:
- `app/_actions/generateCards.ts` - カード自動生成
- `app/_actions/generatePageInfo.ts` - ページ情報生成
- `app/_actions/generateTitle.ts` - タイトル生成
- `app/_actions/generateCardsFromPage.ts` - ページからカード生成
- `app/_actions/ai/getUserAPIKey.ts` - APIキー取得
- `app/_actions/ai/apiKey.ts` - APIキー設定

**実装手順**:
- [ ] API Routesへの移行（機密情報を扱うため）
- [ ] `app/api/ai/` 配下にAPI Routes作成
- [ ] クライアント側の呼び出し実装
- [ ] APIキー管理の実装
- [ ] テスト・動作確認

#### 参照ファイル

- `app/_actions/audioBatchProcessing.ts` - 移行元
- `app/_actions/transcribeImageBatch.ts` - 移行元
- `app/_actions/generateCards.ts` - 移行元
- `app/api/ai/` - 新規作成（API Routes）
- `lib/hooks/use-ai.ts` - 新規作成

#### 完了条件

- バッチ処理が正しく動作する
- AI処理が正しく動作する
- 進捗管理が正しく機能する
- APIキーが安全に管理される

---

### Phase 5: その他の機能の移行（1-2週間）

**目標**: 残りのServer Actionsを移行

#### Phase 5.1: プラグイン管理（1週間）

**対象ファイル**:
- `app/_actions/plugins.ts` - プラグインCRUD
- `app/_actions/plugin-publish.ts` - プラグイン公開
- `app/_actions/plugin-signatures.ts` - 署名検証
- `app/_actions/plugin-security-audit-logs.ts` - セキュリティ監査ログ
- `app/_actions/plugin-security-alerts.ts` - セキュリティアラート
- `app/_actions/plugin-ratings-reviews.ts` - 評価・レビュー
- `app/_actions/plugin-storage.ts` - プラグインストレージ
- `app/_actions/plugin-widgets.ts` - プラグインウィジェット
- `app/_actions/plugins-dev.ts` - 開発用プラグイン管理

**移行パターン**: パターン1 + パターン2のハイブリッド

**実装手順**:
- [ ] プラグインCRUDのクライアント側移行
- [ ] プラグイン公開のAPI Routes移行
- [ ] 署名検証のAPI Routes移行
- [ ] セキュリティ関連のAPI Routes移行

#### Phase 5.2: その他のユーティリティ（1週間）

**対象ファイル**:
- `app/_actions/dashboardStats.ts` - ダッシュボード統計
- `app/_actions/actionLogs.ts` - アクションログ記録
- `app/_actions/syncLinkGroups.ts` - リンクグループ同期
- `app/_actions/changelog.ts` - 変更履歴
- `app/_actions/user_settings.ts` - ユーザー設定
- `app/_actions/subscriptions.ts` - サブスクリプション管理
- `app/_actions/inquiries.ts` - お問い合わせ
- その他多数

**実装手順**:
- [ ] 各機能の要件分析
- [ ] 適切な移行パターンの決定
- [ ] 実装・テスト

#### 完了条件

- すべてのServer Actionsが移行完了
- すべての機能がTauri環境で動作する

---

### Phase 6: Next.js静的化とTauri統合（1週間）

**目標**: Next.jsを静的エクスポート可能にし、Tauriと統合

#### 実装手順

1. **Next.js設定の調整** (1-2日)
   - [ ] `next.config.ts` の `output: "export"` 設定
   - [ ] 動的ルートの `generateStaticParams` 実装
   - [ ] 画像最適化の無効化設定

2. **Service Workerの制御** (1-2日)
   - [ ] Tauri環境検出ロジック実装
   - [ ] PWAとTauriの共存テスト
   - [ ] キャッシュ戦略の調整

3. **Tauri設定の完成** (1-2日)
   - [ ] `src-tauri/tauri.conf.json` の最終調整
   - [ ] CSP設定の確認
   - [ ] アイコン・スプラッシュスクリーンの設定

4. **ビルド・テスト** (2-3日)
   - [ ] 静的エクスポートの動作確認
   - [ ] Tauriビルドの動作確認
   - [ ] 各OS向けビルドの動作確認

#### 参照ファイル

- `next.config.ts` - Next.js設定
- `src-tauri/tauri.conf.json` - Tauri設定
- `public/sw.js` - Service Worker
- `app/layout.tsx` - Service Worker登録

#### 完了条件

- Next.jsが静的エクスポートできる
- Tauriアプリが正常にビルドできる
- PWA版とTauri版が共存できる

---

## 実装チェックリスト

### Phase 0: 準備
- [ ] Rust toolchain インストール
- [ ] Tauri CLI セットアップ
- [ ] TanStack Query のセットアップ確認
- [ ] Supabase クライアントの Tauri 環境対応
- [ ] Server Actions ファイルの棚卸し

### Phase 1: CRUD操作
- [x] Notes関連の移行完了（2025-11-16完了）
- [ ] Decks関連の移行完了
- [ ] Pages関連の移行完了
- [ ] Cards関連の移行完了
- [ ] その他のCRUD操作の移行完了
- [ ] `revalidatePath()` の削除完了

### Phase 2: 認証
- [ ] Tauri Deep Link設定
- [ ] SupabaseクライアントのTauri対応
- [ ] OAuth認証フローの実装
- [ ] Magic Link認証フローの実装
- [ ] セッション管理のlocalStorage移行

### Phase 3: ファイルアップロード
- [ ] Tauriファイルダイアログの統合
- [ ] 画像アップロードの移行
- [ ] PDFアップロードの移行
- [ ] 音声ファイルアップロードの移行

### Phase 4: バッチ処理・AI処理
- [ ] バッチ処理の移行完了
- [ ] AI処理の移行完了
- [ ] API Routes実装完了
- [ ] 進捗管理の実装完了

### Phase 5: その他の機能
- [ ] プラグイン管理の移行完了
- [ ] その他のユーティリティの移行完了

### Phase 6: 静的化・統合
- [ ] Next.js静的エクスポート設定
- [ ] Service Worker制御実装
- [ ] Tauri設定完成
- [ ] ビルド・テスト完了

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| Server Actions移行が予想より時間がかかる | 高 | 中 | 段階的な移行、優先度の明確化 |
| Tauri環境でのSupabase認証が動作しない | 高 | 中 | 事前のプロトタイプ検証、Deep Link設定の確認 |
| パフォーマンスの低下 | 中 | 低 | TanStack Queryのキャッシュ最適化、パフォーマンステスト |
| オフライン対応の不備 | 中 | 中 | ハイブリッドDB戦略の実装、オフラインテスト |
| ビルドエラーの発生 | 中 | 低 | 段階的なビルド確認、エラーハンドリングの強化 |

---

## 次のステップ

1. **Phase 0の開始**: 環境構築と準備作業
2. **プロトタイプ作成**: 最小構成での動作確認
3. **Phase 1の開始**: CRUD操作の移行

---

## 関連ドキュメント

- [Tauri移行計画](../../01_issues/open/2025_11/20251109_01_tauri-native-migration.md)
- [Server Actions移行戦略](../../02_research/2025_11/20251109_01_server-actions-migration-strategy.md)
- [Supabase Tauri統合戦略](../../02_research/2025_11/20251109_02_supabase-tauri-integration.md)

---

**作成日**: 2025-11-09  
**最終更新**: 2025-11-16  
**担当**: 開発チーム

## 更新履歴

- 2025-11-16: TDDアプローチを明記。Phase 1.2以降の各フェーズでテストを先に作成してから実装を行うように更新。Phase 1.1（Notes関連）の完了を反映。

