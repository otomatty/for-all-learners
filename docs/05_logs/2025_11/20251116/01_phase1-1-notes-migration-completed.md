# Phase 1.1: Notes関連の移行完了ログ

**日付**: 2025-11-16  
**Issue**: #146  
**関連計画**: `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md`

---

## 概要

Tauri移行計画のPhase 1.1として、Notes関連の29ファイルのServer ActionsをTanStack Queryフックに移行しました。これにより、Tauri環境でも動作するクライアント側実装に変換しました。

---

## 実装内容

### 1. カスタムフックの作成

**配置場所**: `hooks/notes/` ディレクトリ配下

各カスタムフックを個別ファイルとして作成しました。

#### Query Hooks (データ取得) - 8個

- `useNotes.ts` - ノート一覧取得（`getNotesList` の置き換え）
- `useNote.ts` - ノート詳細取得（`getNoteDetail` の置き換え）
- `useNotePages.ts` - ノートのページ一覧取得（`getNotePages` の置き換え）
- `useTrashItems.ts` - ゴミ箱アイテム取得（`getTrashItems` の置き換え）
- `useDefaultNote.ts` - デフォルトノート取得（`getDefaultNote` の置き換え）
- `useAllUserPages.ts` - 全ユーザーページ取得（`getAllUserPages` の置き換え）
- `useNoteShareLinks.ts` - 共有リンク一覧取得（`getNoteShareLinks` の置き換え）
- `useNoteShares.ts` - 共有ユーザー一覧取得（`getNoteShares` の置き換え）

#### Mutation Hooks (データ変更) - 21個

- `useCreateNote.ts` - ノート作成（`createNote` の置き換え）
- `useUpdateNote.ts` - ノート更新（`updateNote` の置き換え）
- `useDeleteNote.ts` - ノート削除（`deleteNote` の置き換え）
- `useLinkPageToNote.ts` - ページ紐付け（`linkPageToNote` の置き換え）
- `useUnlinkPageFromNote.ts` - ページ紐付け解除（`unlinkPageFromNote` の置き換え）
- `useShareNote.ts` - ノート共有（`shareNote` の置き換え）
- `useUnshareNote.ts` - 共有解除（`unshareNote` の置き換え）
- `useGenerateNoteShareLink.ts` - 共有リンク生成（`generateNoteShareLink` の置き換え）
- `useRevokeNoteShareLink.ts` - 共有リンク失効（`revokeNoteShareLink` の置き換え）
- `useJoinNoteByLink.ts` - リンクでノート参加（`joinNoteByLink` の置き換え）
- `useJoinNotePublic.ts` - 公開ノート参加（`joinNotePublic` の置き換え）
- `useMoveNoteToTrash.ts` - ゴミ箱へ移動（`moveToTrash` の置き換え）
- `useRestoreNoteFromTrash.ts` - ゴミ箱から復元（`restoreFromTrash` の置き換え）
- `useDeletePagesPermanently.ts` - ページ完全削除（`deletePagesPermanently` の置き換え）
- `useBatchMovePages.ts` - ページ一括移動（`batchMovePages` の置き換え）
- `useCheckPageConflict.ts` - ページ競合チェック（`checkPageConflict` の置き換え）
- `useCheckBatchConflicts.ts` - 一括競合チェック（`checkBatchConflicts` の置き換え）
- `useCreateDefaultNote.ts` - デフォルトノート作成（`createDefaultNote` の置き換え）
- `useMigrateOrphanedPages.ts` - 孤立ページ移行（`migrateOrphanedPages` の置き換え）

**合計**: 29個のカスタムフック

### 2. Server Componentの置き換え

以下のServer ComponentをClient Component化し、カスタムフックを使用するように変更しました。

- `app/(protected)/notes/page.tsx`
  - `getNotesList()` → `useNotes()`
  - ローディング状態とエラーハンドリングを追加

- `app/(protected)/notes/layout.tsx`
  - `getNotesList()` → `useNotes()`
  - サイドバー用のノート一覧を取得

### 3. Client Component内のServer Actions置き換え

以下のClient Component内のServer Actions呼び出しをカスタムフックに置き換えました。

- `app/(protected)/notes/_components/create-note-form.tsx`
  - `createNote()` → `useCreateNote()`
  - `shareNote()` → `useShareNote()`
  - `useTransition()` を削除し、`useMutation` の `isPending` を使用

- `app/(protected)/notes/_components/notes-layout-client.tsx`
  - `batchMovePages()` → `useBatchMovePages()`
  - `checkBatchConflicts()` → `useCheckBatchConflicts()`

- `app/(protected)/notes/explorer/_components/trash-panel.tsx`
  - `getTrashItems()` → `useTrashItems()`
  - `restoreFromTrash()` → `useRestoreNoteFromTrash()`
  - `deletePagesPermanently()` → `useDeletePagesPermanently()`

- `app/(protected)/notes/[slug]/_components/note-header.tsx`
  - `deleteNote()` → `useDeleteNote()`

### 4. ファイル配置の変更

**変更前**: `lib/hooks/notes/`  
**変更後**: `hooks/notes/`

すべてのカスタムフックをルートの `hooks/` ディレクトリ配下に移動しました。これにより、プロジェクト全体で統一されたフック配置規則が確立されました。

**インポートパスの変更**:
- `@/lib/hooks/notes/*` → `@/hooks/notes/*`

---

## 技術的な実装詳細

### 移行パターン

**パターン1**: クライアント側Supabase直接アクセス

すべてのフックで `createClient()` を使用してSupabaseクライアントを取得し、直接データベース操作を実行します。

### TanStack Queryの活用

- **Query Hooks**: `useQuery` を使用してデータ取得
- **Mutation Hooks**: `useMutation` を使用してデータ変更
- **キャッシュ管理**: `queryClient.invalidateQueries()` でキャッシュを無効化
- **`revalidatePath()` の削除**: Server Actionsの `revalidatePath()` は不要になり、TanStack Queryのキャッシュ無効化で代替

### エラーハンドリング

- すべてのフックで適切なエラーハンドリングを実装
- 認証チェックを各フック内で実行
- ユーザーフレンドリーなエラーメッセージを提供

---

## 完了したタスク

- [x] 29個のカスタムフックを作成
- [x] Server ComponentをClient Component化
- [x] Client Component内のServer Actionsをフックに置き換え
- [x] `revalidatePath()` の削除（Notes関連では使用されていなかった）
- [x] ファイル配置を `hooks/notes/` に統一

---

## 注意事項・制約事項

### 未実装機能

1. **ユーザーページ自動作成機能**
   - `useJoinNoteByLink` と `useJoinNotePublic` では、Server Actionsの `ensureUserPageInNote` に相当する機能が未実装
   - TODOコメントを追加済み
   - 別途実装が必要

### 残存するServer Component

- `app/(protected)/notes/[slug]/page.tsx`
  - `getDefaultNote()` と `getNoteDetail()` の置き換えが必要
  - ただし、`getAvailableDecksForNote` と `getDecksLinkedToNote` がまだServer Actionsのため、別issueで対応が必要

---

## 今後の作業

詳細は `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md` を参照してください。

### Phase 1.2: Decks関連の移行

- `app/_actions/decks.ts` をカスタムフックに移行
- 配置場所: `hooks/decks/`

### Phase 1.3: Pages関連の移行

- `app/_actions/pages.ts` をカスタムフックに移行
- 配置場所: `hooks/pages/`

### Phase 1.4: Cards関連の移行

- `app/_actions/cards.ts` をカスタムフックに移行
- 配置場所: `hooks/cards/`

### Phase 1.5: その他のCRUD操作

- `app/_actions/study_goals.ts`
- `app/_actions/learning_logs.ts`
- `app/_actions/milestone.ts`
- `app/_actions/review.ts`
- など

---

## 関連ファイル

### 作成したファイル

- `hooks/notes/index.ts` - Barrel file
- `hooks/notes/useNotes.ts` など29個のフックファイル

### 変更したファイル

- `app/(protected)/notes/page.tsx`
- `app/(protected)/notes/layout.tsx`
- `app/(protected)/notes/_components/create-note-form.tsx`
- `app/(protected)/notes/_components/notes-layout-client.tsx`
- `app/(protected)/notes/explorer/_components/trash-panel.tsx`
- `app/(protected)/notes/[slug]/_components/note-header.tsx`

### 参照ドキュメント

- 実装計画: `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md`
- Issue: #146
- 親Issue: #120

---

## まとめ

Phase 1.1のNotes関連の移行を完了しました。29個のServer Actionsを29個のカスタムフックに移行し、Tauri環境でも動作するクライアント側実装に変換しました。

すべてのフックは `hooks/notes/` ディレクトリ配下に配置され、プロジェクト全体で統一されたフック配置規則が確立されました。

次のPhase 1.2以降も同様のパターンで移行を進めます。

---

## 補足: ハイブリッドアプローチの検討

Phase 1.1完了後、**Web版ではServer Actionsを継続使用し、Tauri版でのみTanStack Queryを使用する**というハイブリッドアプローチの可能性について検討しました。

**結論**: 技術的には可能ですが、**統一アプローチ（すべての環境でTanStack Queryを使用）を推奨**します。

詳細は以下のドキュメントを参照してください：
- `docs/02_research/2025_11/20251116_01_hybrid-approach-server-actions-tanstack-query.md`

