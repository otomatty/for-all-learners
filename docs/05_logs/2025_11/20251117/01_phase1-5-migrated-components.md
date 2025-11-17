# Phase 1.5: カスタムフック移行コンポーネント一覧

**日付**: 2025-11-17  
**Issue**: #150  
**PR**: #164  
**関連計画**: `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md`

---

## 概要

Phase 1.5として、以下のServer Actionsをクライアントサイドのカスタムフック（TanStack Query使用）に移行しました。このドキュメントでは、移行したコンポーネントと使用しているカスタムフックの一覧をまとめます。

---

## 移行したコンポーネント一覧

### 1. 学習目標（Study Goals）関連

#### `components/goals/AddGoalDialog.tsx`

**変更内容**:
- Server Actions `addStudyGoal` と `getUserGoalLimits` をカスタムフックに置き換え

**使用しているカスタムフック**:
- `useCreateStudyGoal` - 学習目標の作成
- `useGoalLimits` - ユーザーの目標制限情報取得（現在の目標数、最大数、有料プラン判定など）

**主な変更点**:
- `useCreateStudyGoal` の `mutate` メソッドを使用して目標を作成
- `useGoalLimits` で取得した制限情報を基に、目標追加ボタンの無効化を制御
- エラーハンドリングを `onError` コールバックで処理
- `isPending` 状態を使用してローディング状態を管理

---

### 2. カードレビュー（Review）関連

#### `app/(protected)/learn/_components/MultipleChoiceQuiz.tsx`

**変更内容**:
- Server Action `reviewCard` をカスタムフックに置き換え

**使用しているカスタムフック**:
- `useReviewCard` - カードのレビュー処理（FSRS計算含む）

**主な変更点**:
- クイズ終了時に `useReviewCard` の `mutate` メソッドを使用して各カードをレビュー
- `useEffect` の依存配列から `results` を削除し、パフォーマンスを改善
- エラーハンドリングは TanStack Query の標準的な方法で処理

#### `app/(protected)/learn/_components/FlashcardQuiz.tsx`

**変更内容**:
- Server Action `reviewCard` をカスタムフックに置き換え

**使用しているカスタムフック**:
- `useReviewCard` - カードのレビュー処理（FSRS計算含む）

**主な変更点**:
- フラッシュカードクイズ終了時に `useReviewCard` の `mutate` メソッドを使用
- `useEffect` の依存配列から `results` を削除し、パフォーマンスを改善
- 練習モードは `"one"` を指定

#### `app/(protected)/learn/_components/ClozeQuiz.tsx`

**変更内容**:
- Server Action `reviewCard` をカスタムフックに置き換え

**使用しているカスタムフック**:
- `useReviewCard` - カードのレビュー処理（FSRS計算含む）

**主な変更点**:
- 穴埋めクイズ終了時に `useReviewCard` の `mutate` メソッドを使用
- `useEffect` の依存配列から `results` を削除し、パフォーマンスを改善
- 練習モードは `"fill"` を指定

---

### 3. マイルストーン（Milestones）関連

#### `app/admin/milestone/_components/MilestoneAdminView.tsx`

**変更内容**:
- Server Actions `createMilestone`, `updateMilestone`, `deleteMilestone` をカスタムフックに置き換え

**使用しているカスタムフック**:
- `useCreateMilestone` - マイルストーンの作成
- `useUpdateMilestone` - マイルストーンの更新
- `useDeleteMilestone` - マイルストーンの削除

**主な変更点**:
- フォーム送信時に各 mutation フックの `mutate` メソッドを使用
- `onSuccess`, `onError`, `onSettled` コールバックでエラーハンドリングとローディング状態を管理
- 不要な `try...catch` ブロックを削除（`mutate` は同期的に呼び出されるため）
- `router.refresh()` の呼び出しを削除（TanStack Query のキャッシュ無効化で対応）

---

## カスタムフック一覧

### Study Goals 関連フック

**配置場所**: `hooks/study_goals/`

- `useStudyGoals` - 学習目標一覧取得
- `useCreateStudyGoal` - 学習目標作成
- `useUpdateStudyGoal` - 学習目標更新
- `useDeleteStudyGoal` - 学習目標削除
- `useCompleteStudyGoal` - 学習目標完了
- `useGoalLimits` - 目標制限情報取得
- `useUpdateGoalsPriority` - 優先順位一括更新

### Review 関連フック

**配置場所**: `hooks/review/`

- `useReviewCard` - カードレビュー（FSRS計算含む）

### Milestones 関連フック

**配置場所**: `hooks/milestones/`

- `useMilestones` - マイルストーン一覧取得
- `useCreateMilestone` - マイルストーン作成
- `useUpdateMilestone` - マイルストーン更新
- `useDeleteMilestone` - マイルストーン削除

### Learning Logs 関連フック

**配置場所**: `hooks/learning_logs/`

- `useLearningLogs` - 学習ログ一覧取得
- `useLearningLog` - 学習ログ単一取得
- `useCreateLearningLog` - 学習ログ作成
- `useUpdateLearningLog` - 学習ログ更新
- `useDeleteLearningLog` - 学習ログ削除
- `useReviewCards` - レビュー対象カード取得
- `useRecentActivity` - 最近の学習活動取得
- `useTodayReviewCountsByDeck` - 今日のレビュー数取得

---

## 移行パターン

### 1. Server Action → Mutation Hook

**Before**:
```typescript
import { addStudyGoal } from "@/app/_actions/study_goals";

const result = await addStudyGoal(formData);
if (!result.success) {
  setError(result.error);
}
```

**After**:
```typescript
import { useCreateStudyGoal } from "@/hooks/study_goals";

const createGoal = useCreateStudyGoal();

createGoal.mutate(formData, {
  onSuccess: () => {
    // 成功時の処理
  },
  onError: (err) => {
    setError(err.message);
  },
});
```

### 2. Server Action → Query Hook

**Before**:
```typescript
import { getUserGoalLimits } from "@/app/_actions/study_goals";

const limits = await getUserGoalLimits();
```

**After**:
```typescript
import { useGoalLimits } from "@/hooks/study_goals";

const { data: goalLimits, isLoading, error } = useGoalLimits();
```

### 3. エラーハンドリングの統一

すべてのフックで、エラー発生時は例外をthrowするように統一しました。これにより、TanStack Queryの標準的なエラーハンドリングパターンに従うことができます。

---

## 主な改善点

### 1. エラーハンドリングの統一

- エラー時に `null` や空配列を返すのではなく、エラーをthrowするように統一
- `onError` コールバックでエラーを一元管理

### 2. コードの重複削減

- `mapRowToEntry` 関数を `hooks/milestones/utils.ts` に抽出し、重複を解消

### 3. パフォーマンス改善

- `useEffect` の依存配列を最適化（quiz components で `results` を削除）

### 4. 不要なコードの削除

- `revalidatePath()` の呼び出しを削除（TanStack Query のキャッシュ無効化で対応）
- 不要な `try...catch` ブロックを削除

---

## テスト

すべてのカスタムフックに対して包括的なテストケースを追加しました。

- **テストファイル**: `hooks/{feature}/__tests__/`
- **テストヘルパー**: `hooks/{feature}/__tests__/helpers.tsx`
- **テストカバレッジ**: 正常系・異常系・エッジケースを網羅

---

## 関連ファイル

### 作成したファイル

- `hooks/study_goals/` - Study Goals 関連フック（7個）
- `hooks/review/` - Review 関連フック（1個）
- `hooks/milestones/` - Milestones 関連フック（4個 + utils.ts）
- `hooks/learning_logs/` - Learning Logs 関連フック（8個）

### 変更したファイル

- `components/goals/AddGoalDialog.tsx`
- `app/(protected)/learn/_components/MultipleChoiceQuiz.tsx`
- `app/(protected)/learn/_components/FlashcardQuiz.tsx`
- `app/(protected)/learn/_components/ClozeQuiz.tsx`
- `app/admin/milestone/_components/MilestoneAdminView.tsx`

---

## 今後の作業

詳細は `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md` を参照してください。

### Phase 2: 認証・セッション管理の移行

- `app/_actions/auth.ts` の移行
- Tauri Deep Link 対応
- Supabase クライアントの Tauri 互換性対応

---

## 参考資料

- [実装計画書](../../03_plans/tauri-migration/20251109_01_implementation-plan.md)
- [Phase 1.1 完了ログ](../20251116/01_phase1-1-notes-migration-completed.md)
- [PR #164](https://github.com/otomatty/for-all-learners/pull/164)

