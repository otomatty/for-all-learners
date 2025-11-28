# Notes Repository Specification

## Related Files

- Implementation: `lib/repositories/notes-repository.ts`
- Tests: `lib/repositories/__tests__/notes-repository.test.ts`
- Base: `lib/repositories/base-repository.ts`

## Related Documentation

- Issue: https://github.com/otomatty/for-all-learners/issues/196
- Parent Issue: https://github.com/otomatty/for-all-learners/issues/189
- Base Repository Spec: `lib/repositories/repository.spec.md`

## Requirements

### 責務

Notes Repository は Notes データの CRUD 操作と Notes 固有のクエリを提供する：

1. **基本CRUD操作**（BaseRepository から継承）
   - getAll(userId): ユーザーのノート一覧取得
   - getById(id): ID でノート取得
   - create(userId, payload): ノート作成
   - update(id, updates): ノート更新
   - delete(id): ノート論理削除

2. **Notes 固有の操作**
   - getBySlug(slug): スラッグでノート取得
   - getByOwner(ownerId): オーナーIDでノート一覧取得
   - getDefaultNote(userId): デフォルトノート取得

### データ型

```typescript
interface LocalNote extends SyncableEntity {
  id: string;
  owner_id: string;
  slug: string;
  title: string;
  description: string | null;
  visibility: NoteVisibility;
  created_at: string;
  updated_at: string;
  page_count: number;
  participant_count: number;
  is_default_note: boolean | null;
}

interface CreateNotePayload {
  title: string;
  slug: string;
  description?: string | null;
  visibility?: NoteVisibility;
}

interface UpdateNotePayload {
  title?: string;
  description?: string | null;
  visibility?: NoteVisibility;
}
```

## Test Cases

### TC-001: getBySlug - 存在するスラッグ

- **Given**: ローカルDBに特定のスラッグのノートが存在
- **When**: `getBySlug(userId, slug)` を実行
- **Then**: 該当ノートが返される

### TC-002: getBySlug - 存在しないスラッグ

- **Given**: ローカルDBに該当スラッグのノートが存在しない
- **When**: `getBySlug(userId, slug)` を実行
- **Then**: `undefined` が返される

### TC-003: getDefaultNote - デフォルトノート存在

- **Given**: ユーザーのデフォルトノート（is_default_note: true）が存在
- **When**: `getDefaultNote(userId)` を実行
- **Then**: デフォルトノートが返される

### TC-004: getDefaultNote - デフォルトノート不存在

- **Given**: ユーザーのデフォルトノートが存在しない
- **When**: `getDefaultNote(userId)` を実行
- **Then**: `undefined` が返される

### TC-005: create - ノート作成

- **Given**: 新規ノートのペイロード
- **When**: `create(userId, payload)` を実行
- **Then**: ノートが作成され、同期メタデータが設定される

### TC-006: 継承メソッド - getAll

- **Given**: ユーザーが複数のノートを所有
- **When**: `getAll(userId)` を実行
- **Then**: ユーザーの全ノートが返される

