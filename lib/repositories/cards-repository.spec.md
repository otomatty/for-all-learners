# Cards Repository Specification

## Related Files

- Implementation: `lib/repositories/cards-repository.ts`
- Tests: `lib/repositories/__tests__/cards-repository.test.ts`
- Base: `lib/repositories/base-repository.ts`

## Related Documentation

- Issue: https://github.com/otomatty/for-all-learners/issues/197
- Parent Issue: https://github.com/otomatty/for-all-learners/issues/189
- Base Repository Spec: `lib/repositories/repository.spec.md`

## Requirements

### 責務

Cards Repository は Cards データの CRUD 操作と Cards 固有のクエリを提供する：

1. **基本CRUD操作**（BaseRepository から継承）
   - getAll(userId): ユーザーのカード一覧取得
   - getById(id): ID でカード取得
   - create(userId, payload): カード作成
   - update(id, updates): カード更新
   - delete(id): カード論理削除

2. **Cards 固有の操作**
   - getByDeckId(deckId): デッキ内のカード一覧取得
   - getDueCards(userId): 復習対象カード取得
   - updateReviewResult(id, result): 復習結果更新
   - createBatch(userId, payloads): カード一括作成

### データ型

```typescript
interface LocalCard extends SyncableEntity {
  id: string;
  deck_id: string;
  user_id: string;
  front_content: TiptapContent;
  back_content: TiptapContent;
  source_audio_url: string | null;
  source_ocr_image_url: string | null;
  created_at: string;
  updated_at: string;
  // FSRS関連
  ease_factor: number;
  repetition_count: number;
  review_interval: number;
  next_review_at: string | null;
  stability: number;
  difficulty: number;
  last_reviewed_at: string | null;
}

interface CreateCardPayload {
  deck_id: string;
  front_content: TiptapContent;
  back_content: TiptapContent;
  source_audio_url?: string | null;
  source_ocr_image_url?: string | null;
}

interface UpdateCardPayload {
  front_content?: TiptapContent;
  back_content?: TiptapContent;
  // ... FSRS fields
}
```

## Test Cases

### TC-001: getByDeckId - デッキ内カード取得

- **Given**: 特定のデッキに複数のカードが存在
- **When**: `getByDeckId(deckId)` を実行
- **Then**: そのデッキの全カードが返される

### TC-002: getDueCards - 復習対象カード取得

- **Given**: ユーザーに期限切れのカードが存在
- **When**: `getDueCards(userId)` を実行
- **Then**: 復習対象のカードのみ返される

### TC-003: updateReviewResult - 復習結果更新

- **Given**: 既存のカードが存在
- **When**: `updateReviewResult(id, result)` を実行
- **Then**: FSRS関連フィールドが更新される

### TC-004: createBatch - カード一括作成

- **Given**: 複数のカードペイロード
- **When**: `createBatch(userId, payloads)` を実行
- **Then**: 全カードが作成される

### TC-005: create - カード作成

- **Given**: 新規カードのペイロード
- **When**: `create(userId, payload)` を実行
- **Then**: カードが作成され、FSRS初期値が設定される

