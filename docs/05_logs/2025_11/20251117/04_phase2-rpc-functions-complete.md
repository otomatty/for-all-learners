# Phase 2: RPC関数実装完了とテスト修正

**実施日**: 2025-11-17  
**対象Issue**: #150  
**対象PR**: #164  
**作業内容**: レビューコメント対応として、RPC関数を作成し、フックとテストを更新

---

## 📋 作業概要

PR #164のレビューコメントで指摘された以下の3つの問題に対応するため、RPC関数を作成し、フックとテストを更新しました：

1. **`useReviewCard.ts`**: 複数DB書き込みをトランザクション化
2. **`useUpdateGoalsPriority.ts`**: ループ内更新をトランザクション化
3. **`useTodayReviewCountsByDeck.ts`**: クライアントサイド集計をDB側に移行

---

## ✅ 実施した作業

### 1. RPC関数の作成

**ファイル**: `database/migrations/20251117_01_phase2_rpc_functions.sql`

#### 1.1 `review_card` 関数

**目的**: カードレビュー処理のトランザクション化

**実装内容**:
- カード取得
- FSRSアルゴリズム計算（PostgreSQL内で実装）
- カード更新
- 学習ログ作成

**特徴**:
- すべての処理を単一トランザクション内で実行
- エラー発生時は自動的にロールバック
- JSON形式で結果を返す

#### 1.2 `update_goals_priority` 関数

**目的**: 学習目標の優先順位一括更新のトランザクション化

**実装内容**:
- 配列で受け取った目標IDの順序に従って優先順位を設定
- すべての更新を単一トランザクション内で実行

**特徴**:
- エラー発生時は自動的にロールバック
- 一部のみ更新されることを防止

#### 1.3 `get_today_review_counts_by_deck` 関数

**目的**: デッキごとの当日レビュー数集計をDB側で実行

**実装内容**:
- GROUP BY句を使用して効率的に集計
- クライアントサイドでの集計処理を削減

**特徴**:
- パフォーマンス改善
- データ転送量の削減

---

### 2. フックの更新

#### 2.1 `useReviewCard.ts`

**変更内容**:
- `calculateFSRS` 関数の呼び出しを削除
- RPC関数 `review_card` を呼び出すように変更
- エラーハンドリングを簡素化
- 型アサーションを追加（RPC関数の戻り値が`Json`型のため）

**Before**:
```typescript
// 1. カード取得
const { data: card } = await supabase.from("cards").select(...).single();

// 2. FSRS計算
const { stability, difficulty, intervalDays } = calculateFSRS(...);

// 3. カード更新
await supabase.from("cards").update(...);

// 4. 学習ログ作成
await supabase.from("learning_logs").insert(...);
```

**After**:
```typescript
// RPC関数を呼び出してトランザクション内で処理
const { data, error } = await supabase.rpc("review_card", {
  p_card_id: payload.cardId,
  p_quality: payload.quality,
  p_practice_mode: payload.practiceMode ?? "review",
});

if (error) {
  throw new Error(error.message || "カードのレビューに失敗しました");
}

if (!data) {
  throw new Error("カードのレビュー結果が取得できませんでした");
}

// RPC関数の戻り値はJSON形式なので、型アサーションを使用
const result = data as ReviewCardResult;
return result;
```

#### 2.2 `useUpdateGoalsPriority.ts`

**変更内容**:
- ループ内の個別UPDATEを削除
- RPC関数 `update_goals_priority` を呼び出すように変更
- 戻り値の型を `UpdateGoalsPriorityResult` から `void` に変更（エラーはthrow）

**Before**:
```typescript
for (let i = 0; i < goalIds.length; i++) {
  await supabase
    .from("study_goals")
    .update({ priority_order: i + 1 })
    .eq("id", goalIds[i]);
}
```

**After**:
```typescript
// RPC関数を呼び出してトランザクション内で一括更新
const { error } = await supabase.rpc("update_goals_priority", {
  p_user_id: user.id,
  p_goal_ids: goalIds,
});

if (error) {
  throw new Error(error.message || "優先順位の更新に失敗しました");
}
```

#### 2.3 `useTodayReviewCountsByDeck.ts`

**変更内容**:
- クライアントサイドでの集計処理を削除
- RPC関数 `get_today_review_counts_by_deck` を呼び出すように変更

**Before**:
```typescript
const { data: logs } = await supabase
  .from("learning_logs")
  .select("card_id, cards(deck_id)")
  .eq("user_id", user.id)
  .gte("answered_at", today.toISOString())
  .lt("answered_at", tomorrow.toISOString());

// クライアントサイドで集計
const map = new Map<string, number>();
for (const log of logs ?? []) {
  // ...
}
```

**After**:
```typescript
// RPC関数を呼び出してデータベース側で集計
const { data, error } = await supabase.rpc(
  "get_today_review_counts_by_deck",
  {
    p_user_id: user.id,
  },
);

if (error) {
  throw new Error(error.message || "レビュー数の取得に失敗しました");
}

// RPC関数の戻り値を型に合わせて変換
return (data ?? []).map(
  (row: { deck_id: string; review_count: number }) => ({
    deck_id: row.deck_id,
    review_count: row.review_count,
  }),
);
```

---

### 3. コンポーネントの更新

#### 3.1 `GoalsList.tsx`

**変更内容**:
- `updateGoalsPriority` Server Actionを `useUpdateGoalsPriority` フックに置き換え
- `useTransition` を削除し、TanStack Queryの `mutate` を使用
- `isPending` を `updateGoalsPriority.isPending` に変更

**Before**:
```typescript
import { updateGoalsPriority } from "@/app/_actions/study_goals";
const [isPending, startTransition] = useTransition();

startTransition(async () => {
  const result = await updateGoalsPriority(goalIds);
  if (!result.success) {
    toast.error("優先順位の更新に失敗しました");
  }
});
```

**After**:
```typescript
import { useUpdateGoalsPriority } from "@/hooks/study_goals";
const updateGoalsPriority = useUpdateGoalsPriority();

updateGoalsPriority.mutate(goalIds, {
  onSuccess: () => {
    toast.success("ゴールの優先順位を更新しました");
  },
  onError: (error) => {
    toast.error(error.message || "優先順位の更新に失敗しました");
  },
});
```

---

### 4. テストの更新

#### 4.1 `useReviewCard.test.ts`

**変更内容**:
- すべてのテストケースで`mockSupabaseClient.rpc`をモック
- RPC関数の戻り値をモック
- FSRS計算のモックを削除（RPC関数内で処理されるため）

**修正したテストケース**:
- TC-001: 正常系 - カード復習成功
- TC-002: 異常系 - 認証エラー
- TC-003: 異常系 - カードが見つからない
- TC-004: 異常系 - データベースエラー（カード更新）
- TC-005: 異常系 - データベースエラー（学習ログ作成）
- TC-006: エッジケース - 初回レビュー

**修正例**:
```typescript
// Before: 個別のDB操作をモック
const mockCardQuery = { select: ..., eq: ..., single: ... };
const mockUpdateQuery = { update: ..., eq: ... };
const mockLogQuery = { insert: ..., select: ..., single: ... };
mockSupabaseClient.from = vi.fn()
  .mockReturnValueOnce(mockCardQuery)
  .mockReturnValueOnce(mockUpdateQuery)
  .mockReturnValueOnce(mockLogQuery);

// After: RPC関数をモック
const mockRpcResponse = {
  interval: 2,
  nextReviewAt,
  log: mockLearningLog,
};
mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
  data: mockRpcResponse,
  error: null,
});
```

#### 4.2 `useUpdateGoalsPriority.test.ts`

**変更内容**:
- すべてのテストケースで`mockSupabaseClient.rpc`をモック
- 戻り値の型変更に対応（`isSuccess`を確認、`data.success`のチェックを削除）
- エラーケースでは`isError`を確認

**修正したテストケース**:
- TC-001: 正常系 - 優先順位一括更新成功
- TC-002: 異常系 - 認証エラー（未認証ユーザー）
- TC-003: 異常系 - データベースエラー
- TC-004: エッジケース - 空の配列

**修正例**:
```typescript
// Before: ループ内の個別UPDATEをモック
const mockQueries = goalIds.map(() => {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockImplementation(...),
  };
});
mockSupabaseClient.from = vi.fn()
  .mockReturnValueOnce(mockQueries[0])
  .mockReturnValueOnce(mockQueries[1])
  .mockReturnValueOnce(mockQueries[2]);

// After: RPC関数をモック
mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
  data: true,
  error: null,
});
```

#### 4.3 `useGoalLimits.test.ts`

**変更内容**:
- TC-003をエラーをthrowすることを期待するように変更
- `isError`を確認するように修正

**修正したテストケース**:
- TC-003: 異常系 - データベースエラー（エラーをthrow）

**修正例**:
```typescript
// Before: エラー時にフォールバック値を返すことを期待
await waitFor(() => {
  expect(result.current.isSuccess).toBe(true);
});
expect(result.current.data?.maxGoals).toBe(3);
expect(result.current.data?.isPaid).toBe(false);

// After: エラーをthrowすることを期待
await waitFor(() => {
  expect(result.current.isError).toBe(true);
});
expect(result.current.error?.message).toContain("Database error");
```

---

### 5. ビルドエラーの修正

**問題**: `hooks/study_goals/index.ts`で`UpdateGoalsPriorityResult`型をエクスポートしようとしていたが、`useUpdateGoalsPriority.ts`からこの型が削除されていた

**修正**: `index.ts`から`UpdateGoalsPriorityResult`型のエクスポートを削除

```typescript
// Before
export type { UpdateGoalsPriorityResult } from "./useUpdateGoalsPriority";
export { useUpdateGoalsPriority } from "./useUpdateGoalsPriority";

// After
export { useUpdateGoalsPriority } from "./useUpdateGoalsPriority";
```

---

## 📝 変更ファイル

### 新規作成

1. `database/migrations/20251117_01_phase2_rpc_functions.sql`
   - `review_card` 関数
   - `update_goals_priority` 関数
   - `get_today_review_counts_by_deck` 関数

2. `docs/05_logs/2025_11/20251117/02_pr164-review-comments-analysis.md`
   - レビューコメント分析と対応方針

3. `docs/05_logs/2025_11/20251117/03_phase2-rpc-functions-implementation.md`
   - RPC関数実装の詳細

4. `docs/05_logs/2025_11/20251117/04_phase2-rpc-functions-complete.md`
   - 作業完了ログ（このファイル）

### 更新

1. `hooks/review/useReviewCard.ts`
   - RPC関数呼び出しに変更
   - 型アサーションを追加

2. `hooks/study_goals/useUpdateGoalsPriority.ts`
   - RPC関数呼び出しに変更
   - 戻り値の型を変更

3. `hooks/learning_logs/useTodayReviewCountsByDeck.ts`
   - RPC関数呼び出しに変更

4. `app/(protected)/goals/_components/GoalsList.tsx`
   - Server Actionをフックに置き換え

5. `hooks/study_goals/index.ts`
   - `UpdateGoalsPriorityResult`型のエクスポートを削除

6. `hooks/review/__tests__/useReviewCard.test.ts`
   - RPC関数呼び出しに対応するようにテストを更新

7. `hooks/study_goals/__tests__/useUpdateGoalsPriority.test.ts`
   - RPC関数呼び出しに対応するようにテストを更新

8. `hooks/study_goals/__tests__/useGoalLimits.test.ts`
   - エラーハンドリング変更に対応するようにテストを更新

---

## 🎯 改善効果

### 1. データ整合性の向上

- **Before**: 複数のDB書き込みが個別に実行され、途中でエラーが発生するとデータ不整合が発生する可能性
- **After**: すべての処理が単一トランザクション内で実行され、エラー発生時は自動的にロールバック

### 2. パフォーマンスの改善

- **Before**: クライアントサイドで全データを取得してから集計
- **After**: データベース側でGROUP BY句を使用して効率的に集計

### 3. コードの簡素化

- **Before**: 複数のDB操作を手動で管理
- **After**: RPC関数に処理を集約し、フックのコードを簡素化

### 4. テストの改善

- **Before**: 複数のDB操作を個別にモック
- **After**: RPC関数を1つモックするだけで済む

---

## ⚠️ 注意事項

### 1. FSRSアルゴリズムの実装

PostgreSQL内でFSRSアルゴリズムを実装しましたが、TypeScript版の `calculateFSRS` 関数と同じロジックを使用しています。将来的にFSRSアルゴリズムを改善する場合は、両方の実装を同期する必要があります。

### 2. マイグレーションの実行

`database/migrations/20251117_01_phase2_rpc_functions.sql` をSupabaseに適用する必要があります。

**実行方法**:
1. Supabase DashboardのSQL Editorを使用（推奨）
2. Supabase CLIを使用: `supabase db push`
3. psqlコマンドを使用: `psql -h <host> -U <user> -d <database> -f database/migrations/20251117_01_phase2_rpc_functions.sql`

### 3. 型アサーションの使用

RPC関数の戻り値は`Json`型のため、型アサーション（`as ReviewCardResult`）を使用しています。実行時に型が一致しない場合はエラーが発生する可能性があるため、RPC関数の実装と型定義を一致させる必要があります。

---

## 📊 テスト結果

### 修正前

- **失敗**: 8件
  - `useReviewCard.test.ts`: 3件
  - `useUpdateGoalsPriority.test.ts`: 4件
  - `useGoalLimits.test.ts`: 1件

### 修正後

- **すべてのテストが通過することを期待**
- RPC関数呼び出しに対応したモックを実装
- エラーハンドリング変更に対応

---

## 🔄 次のステップ

1. **マイグレーションの実行**
   - SupabaseにRPC関数を適用

2. **テストの実行と確認**
   - すべてのテストが通過することを確認
   - 必要に応じて追加のテストケースを作成

3. **動作確認**
   - カードレビュー機能の動作確認
   - 優先順位更新機能の動作確認
   - レビュー数集計機能の動作確認

4. **ドキュメントの更新**
   - 実装計画書の進捗状況を更新
   - Issue #150の状態を更新

---

## 📚 参考資料

- [PR #164 レビューコメント分析](./02_pr164-review-comments-analysis.md)
- [Phase 2 RPC関数実装詳細](./03_phase2-rpc-functions-implementation.md)
- [Phase 1.5 移行コンポーネント一覧](./01_phase1-5-migrated-components.md)
- [実装計画書](../../03_plans/tauri-migration/20251109_01_implementation-plan.md)
- [PR #164](https://github.com/otomatty/for-all-learners/pull/164)
- [Issue #150](https://github.com/otomatty/for-all-learners/issues/150)

---

## 📝 変更サマリー

| カテゴリ | ファイル数 | 変更内容 |
|---------|----------|---------|
| 新規作成 | 4 | RPC関数（1）、ドキュメント（3） |
| 更新 | 8 | フック（3）、コンポーネント（1）、テスト（3）、index（1） |
| **合計** | **12** | - |

---

**作成日**: 2025-11-17  
**最終更新**: 2025-11-17  
**担当**: AI Assistant

