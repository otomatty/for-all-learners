# Phase 2: RPC関数実装とトランザクション管理

**実施日**: 2025-11-17  
**対象Issue**: #150  
**対象PR**: #164  
**作業内容**: レビューコメント対応として、RPC関数を作成し、トランザクション管理とパフォーマンス改善を実装

---

## 📋 作業概要

PR #164のレビューコメントで指摘された以下の3つの問題に対応するため、RPC関数を作成し、フックを更新しました：

1. **`useReviewCard.ts`**: 複数DB書き込みをトランザクション化
2. **`useUpdateGoalsPriority.ts`**: ループ内更新をトランザクション化
3. **`useTodayReviewCountsByDeck.ts`**: クライアントサイド集計をDB側に移行

---

## ✅ 実施した作業

### 1. RPC関数の作成

**ファイル**: `database/migrations/20251117_01_phase2_rpc_functions.sql`

#### 1.1 `review_card` 関数

**目的**: カードレビュー処理のトランザクション化

**機能**:
- カード取得
- FSRSアルゴリズム計算（PostgreSQL内で実装）
- カード更新
- 学習ログ作成

**特徴**:
- すべての処理を単一トランザクション内で実行
- エラー発生時は自動的にロールバック
- JSON形式で結果を返す

**実装内容**:
```sql
CREATE OR REPLACE FUNCTION public.review_card(
  p_card_id uuid,
  p_quality integer,
  p_practice_mode text DEFAULT 'review'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
```

#### 1.2 `update_goals_priority` 関数

**目的**: 学習目標の優先順位一括更新のトランザクション化

**機能**:
- 配列で受け取った目標IDの順序に従って優先順位を設定
- すべての更新を単一トランザクション内で実行

**特徴**:
- エラー発生時は自動的にロールバック
- 一部のみ更新されることを防止

**実装内容**:
```sql
CREATE OR REPLACE FUNCTION public.update_goals_priority(
  p_user_id uuid,
  p_goal_ids uuid[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
```

#### 1.3 `get_today_review_counts_by_deck` 関数

**目的**: デッキごとの当日レビュー数集計をDB側で実行

**機能**:
- GROUP BY句を使用して効率的に集計
- クライアントサイドでの集計処理を削減

**特徴**:
- パフォーマンス改善
- データ転送量の削減

**実装内容**:
```sql
CREATE OR REPLACE FUNCTION public.get_today_review_counts_by_deck(
  p_user_id uuid
)
RETURNS TABLE(deck_id uuid, review_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
```

---

### 2. フックの更新

#### 2.1 `useReviewCard.ts`

**変更内容**:
- `calculateFSRS` 関数の呼び出しを削除
- RPC関数 `review_card` を呼び出すように変更
- エラーハンドリングを簡素化

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

## 📝 変更ファイル

### 新規作成

1. `database/migrations/20251117_01_phase2_rpc_functions.sql`
   - `review_card` 関数
   - `update_goals_priority` 関数
   - `get_today_review_counts_by_deck` 関数

### 更新

1. `hooks/review/useReviewCard.ts`
   - RPC関数呼び出しに変更
   - FSRS計算ロジックを削除

2. `hooks/study_goals/useUpdateGoalsPriority.ts`
   - RPC関数呼び出しに変更
   - 戻り値の型を変更

3. `hooks/learning_logs/useTodayReviewCountsByDeck.ts`
   - RPC関数呼び出しに変更
   - クライアントサイド集計を削除

4. `app/(protected)/goals/_components/GoalsList.tsx`
   - Server Actionをフックに置き換え

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

---

## ⚠️ 注意事項

### 1. FSRSアルゴリズムの実装

PostgreSQL内でFSRSアルゴリズムを実装しましたが、TypeScript版の `calculateFSRS` 関数と同じロジックを使用しています。将来的にFSRSアルゴリズムを改善する場合は、両方の実装を同期する必要があります。

### 2. テストの更新

RPC関数を使用するように変更したため、既存のテストを更新する必要があります。テストでは、RPC関数の呼び出しをモックする必要があります。

### 3. マイグレーションの実行

`database/migrations/20251117_01_phase2_rpc_functions.sql` をSupabaseに適用する必要があります。

---

## 🔄 次のステップ

1. **マイグレーションの実行**
   - SupabaseにRPC関数を適用

2. **テストの更新**
   - `hooks/review/__tests__/useReviewCard.test.ts`
   - `hooks/study_goals/__tests__/useUpdateGoalsPriority.test.ts`
   - `hooks/learning_logs/__tests__/useTodayReviewCountsByDeck.test.ts`

3. **動作確認**
   - カードレビュー機能の動作確認
   - 優先順位更新機能の動作確認
   - レビュー数集計機能の動作確認

---

## 📚 参考資料

- [PR #164 レビューコメント分析](./02_pr164-review-comments-analysis.md)
- [Phase 1.5 移行コンポーネント一覧](./01_phase1-5-migrated-components.md)
- [実装計画書](../../03_plans/tauri-migration/20251109_01_implementation-plan.md)

