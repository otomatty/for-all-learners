# Pages Repository Specification

## Related Files

- Implementation: `lib/repositories/pages-repository.ts`
- Tests: `lib/repositories/__tests__/pages-repository.test.ts`
- Base: `lib/repositories/base-repository.ts`

## Related Documentation

- Issue: https://github.com/otomatty/for-all-learners/issues/196
- Parent Issue: https://github.com/otomatty/for-all-learners/issues/189
- Base Repository Spec: `lib/repositories/repository.spec.md`

## Requirements

### 責務

Pages Repository は Pages データの CRUD 操作と Pages 固有のクエリを提供する：

1. **基本CRUD操作**（BaseRepository から継承）
   - getAll(userId): ユーザーのページ一覧取得
   - getById(id): ID でページ取得
   - create(userId, payload): ページ作成
   - update(id, updates): ページ更新
   - delete(id): ページ論理削除

2. **Pages 固有の操作**
   - getByNoteId(noteId): ノート内のページ一覧取得
   - updateMetadata(id, updates): メタデータのみ更新（content_tiptap除外）

### 重要な制約

Pages テーブルの `content_tiptap` フィールドはリアルタイム同期（Yjs）で管理されるため、
ローカルDBには保存しない。

| フィールド | ローカルDB | リアルタイム |
|-----------|-----------|-------------|
| id | ✅ | - |
| note_id | ✅ | - |
| user_id | ✅ | - |
| title | ✅ | - |
| thumbnail_url | ✅ | - |
| is_public | ✅ | - |
| created_at | ✅ | - |
| updated_at | ✅ | - |
| content_tiptap | ❌ | ✅ (Yjs) |

### データ型

```typescript
interface LocalPage extends SyncableEntity {
  id: string;
  user_id: string;
  note_id: string | null;
  title: string;
  thumbnail_url: string | null;
  is_public: boolean;
  scrapbox_page_id: string | null;
  scrapbox_page_list_synced_at: string | null;
  scrapbox_page_content_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CreatePagePayload {
  title: string;
  note_id?: string | null;
  is_public?: boolean;
  thumbnail_url?: string | null;
}

interface UpdatePagePayload {
  title?: string;
  note_id?: string | null;
  is_public?: boolean;
  thumbnail_url?: string | null;
}
```

## Test Cases

### TC-001: getByNoteId - ノート内ページ取得

- **Given**: 特定のノートに複数のページが存在
- **When**: `getByNoteId(noteId)` を実行
- **Then**: そのノートの全ページが返される

### TC-002: getByNoteId - ページなし

- **Given**: 特定のノートにページが存在しない
- **When**: `getByNoteId(noteId)` を実行
- **Then**: 空配列が返される

### TC-003: updateMetadata - メタデータ更新

- **Given**: 既存のページが存在
- **When**: `updateMetadata(id, { title: "New Title" })` を実行
- **Then**: タイトルのみが更新される

### TC-004: create - ページ作成

- **Given**: 新規ページのペイロード
- **When**: `create(userId, payload)` を実行
- **Then**: ページが作成され、同期メタデータが設定される

### TC-005: 継承メソッド - getAll

- **Given**: ユーザーが複数のページを所有
- **When**: `getAll(userId)` を実行
- **Then**: ユーザーの全ページが返される

