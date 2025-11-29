# Week 6-1: Notes/Pages フックの Repository 移行

**作成日**: 2025-11-29
**対応 Issue**: [#204](https://github.com/otomatty/for-all-learners/issues/204) Phase D-2

## 概要

Week 6-1 のタスクとして、Notes および Pages 関連フックの Repository パターンへの移行を実施しました。

## 実施内容

### Notes フック移行（5/5 完了）✅

| フック | 移行内容 | 状態 |
|--------|----------|------|
| `useNote.ts` | `notesRepository.getBySlug()` を使用 | ✅ |
| `useUpdateNote.ts` | `notesRepository.update()` を使用 | ✅ |
| `useDeleteNote.ts` | `notesRepository.getById()` + `delete()` を使用 | ✅ |
| `useDefaultNote.ts` | `notesRepository.getDefaultNote()` を使用 | ✅ |
| `useCreateDefaultNote.ts` | `notesRepository.createDefaultNote()` を使用 | ✅ |

### Pages フック移行（6/7 完了）✅

| フック | 移行内容 | 状態 |
|--------|----------|------|
| `usePage.ts` | `pagesRepository.getById()` を使用 | ✅ |
| `useUpdatePage.ts` | `pagesRepository.updateMetadata()` を使用 | ✅ |
| `useDeletePage.ts` | `pagesRepository.delete()` を使用 | ✅ |
| `usePagesByNote.ts` | `pagesRepository.getByNoteId()` を使用 | ✅ |
| `useUserPages.ts` | `pagesRepository.getAll()` を使用 | ✅ |
| `useNotePages.ts` | Note 解決のみ Repository 化（RPC pagination 維持） | ✅ 部分 |
| `useCreatePage.ts` | Link Groups 同期ロジックが複雑 | ⏳ Phase D-5 へ延期 |

### Repository 更新

- `lib/repositories/notes-repository.ts`
  - `createDefaultNote()` メソッドを追加
  - `RepositoryError` import を追加

## 変更ファイル一覧

### フックファイル
- `hooks/notes/useNote.ts`
- `hooks/notes/useUpdateNote.ts`
- `hooks/notes/useDeleteNote.ts`
- `hooks/notes/useDefaultNote.ts`
- `hooks/notes/useCreateDefaultNote.ts`
- `hooks/notes/useNotePages.ts`
- `hooks/pages/usePage.ts`
- `hooks/pages/useUpdatePage.ts`
- `hooks/pages/useDeletePage.ts`
- `hooks/pages/usePagesByNote.ts`
- `hooks/pages/useUserPages.ts`

### Repository ファイル
- `lib/repositories/notes-repository.ts`

### ドキュメント
- `DEVELOPMENT_SCHEDULE.md` - Week 6-1 進捗更新

## 技術的判断

### useCreatePage.ts の延期理由

`useCreatePage.ts` は以下の複雑なロジックを含んでおり、単純な Repository 移行では対応できないため Phase D-5 へ延期しました：

1. **Link Groups 同期**: `extractLinksFromContent()` でリンクを抽出し、`linkGroupService.syncLinksForPage()` でサーバー側と同期
2. **デフォルトノートへのリンク**: `useLinkPageToDefaultNote()` を使用
3. **サムネイル生成**: `uploadThumbnail()` でサーバーへアップロード

これらはサーバー側 API に依存しており、オフライン対応には別途設計が必要です。

### useNotePages.ts の部分移行

`useNotePages.ts` は RPC 関数 `get_note_pages_with_total` を使用してページネーションを行っています。このRPC関数はサーバー側で最適化されたページネーションを提供するため、現時点では維持しました。

Note の解決部分のみ Repository に移行：
- `notesRepository.getBySlug()` - スラッグからノートを取得
- `notesRepository.getDefaultNote()` - デフォルトノートを取得

## テスト状況

### 現状
- テストは Supabase クライアントのモックを使用
- Repository 移行後、テストが失敗している（28件）

### 次週対応
- テストファイルを Repository モック方式に更新
- `vi.mock("@/lib/repositories/notes-repository")` 等を追加

## 次回作業（Week 6-2）

1. **テスト更新**: Notes/Pages フックテストの Repository モック化
2. **Decks フック移行**: `useDeck`, `useDeleteDeck`, `useDuplicateDeck`
3. **Cards フック移行**: 9件のフック

## 気づき・学び

1. **型マッピングの重要性**: LocalNote/LocalPage と従来の型（NoteDetail, UserPageSummary 等）の間でマッピング関数が必要
2. **サーバー依存ロジックの分離**: Link Groups や RPC pagination などサーバー API に依存する処理は、段階的に移行する必要がある
3. **DEPENDENCY MAP の有用性**: 移行前にフック間の依存関係を確認することで、影響範囲を正確に把握できた

## 関連ドキュメント

- [DEVELOPMENT_SCHEDULE.md](/DEVELOPMENT_SCHEDULE.md) - 開発スケジュール
- [Issue #204](https://github.com/otomatty/for-all-learners/issues/204) - Phase D-2 Issue
