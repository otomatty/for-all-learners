# Decks Repository Specification

## Related Files

- Implementation: `lib/repositories/decks-repository.ts`
- Tests: `lib/repositories/__tests__/decks-repository.test.ts`
- Base: `lib/repositories/base-repository.ts`

## Related Documentation

- Issue: https://github.com/otomatty/for-all-learners/issues/197
- Parent Issue: https://github.com/otomatty/for-all-learners/issues/189
- Base Repository Spec: `lib/repositories/repository.spec.md`

## Requirements

### 責務

Decks Repository は Decks データの CRUD 操作と Decks 固有のクエリを提供する：

1. **基本CRUD操作**（BaseRepository から継承）
   - getAll(userId): ユーザーのデッキ一覧取得
   - getById(id): ID でデッキ取得
   - create(userId, payload): デッキ作成
   - update(id, updates): デッキ更新
   - delete(id): デッキ論理削除

2. **Decks 固有の操作**
   - getPublicDecks(): 公開デッキ一覧取得

### データ型

```typescript
interface LocalDeck extends SyncableEntity {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateDeckPayload {
  title: string;
  description?: string | null;
  is_public?: boolean;
}

interface UpdateDeckPayload {
  title?: string;
  description?: string | null;
  is_public?: boolean;
}
```

## Test Cases

### TC-001: create - デッキ作成

- **Given**: 新規デッキのペイロード
- **When**: `create(userId, payload)` を実行
- **Then**: デッキが作成され、同期メタデータが設定される

### TC-002: 継承メソッド - getAll

- **Given**: ユーザーが複数のデッキを所有
- **When**: `getAll(userId)` を実行
- **Then**: ユーザーの全デッキが返される

### TC-003: 継承メソッド - update

- **Given**: 既存のデッキが存在
- **When**: `update(id, updates)` を実行
- **Then**: デッキが更新される

