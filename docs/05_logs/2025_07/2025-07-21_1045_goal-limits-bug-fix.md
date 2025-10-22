# Goal Limits Bug Fix

**Work Date**: 2025-07-21  
**Time**: 10:45  
**Author**: Claude Code  

## Overview
無料ユーザーが有料ユーザーの目標制限（10個）になってしまう問題を調査・修正。

## Problem Description
- 無料ユーザーが目標作成時に10個制限（有料プラン）として判定されていた
- UI上でも有料ユーザーとして表示されていた
- 実際は無料プラン（3個制限）であるべき

## Root Cause Analysis
デバッグログにより以下が判明：
- `subscriptions` テーブルに無料プランでも `status: 'active'` のレコードが存在
- `plan_id: 'price_xxxxxxxxxxxxxx_free'` だが、`isUserPaid` 関数が単純に subscription の存在のみで有料判定していた

## Implementation Details

### 1. デバッグ機能追加
- `app/_actions/subscriptions.ts:34-56`: `isUserPaid` 関数にデバッグログ追加
- `app/_actions/study_goals.ts:86-139`: `getUserGoalLimits` 関数にデバッグログ追加
- ユーザーID検証機能追加

### 2. 有料/無料判定ロジック修正
**Before:**
```typescript
const isPaid = subscription !== null;
```

**After:**
```typescript
const isPaid = subscription !== null && !subscription.plan_id.includes('_free');
```

### 3. React Hook依存関係修正
- `components/user-nav.tsx:81`: useEffect 依存配列から不要な `plan` を削除
- `components/goals/add-goal-dialog.tsx`: 
  - `fetchGoalLimits` を `useCallback` でメモ化
  - useEffect 依存配列に `fetchGoalLimits` 追加

### 4. TypeScript型エラー修正
`goalLimits && !goalLimits.canAddMore` を `goalLimits ? !goalLimits.canAddMore : false` に変更し、null型エラーを解決

## Files Modified
- `app/_actions/subscriptions.ts`
- `app/_actions/study_goals.ts`  
- `components/user-nav.tsx`
- `components/goals/add-goal-dialog.tsx`
- `CLAUDE.md` (作業ログ命名規則の詳細化)

## Test Points
- [x] 無料ユーザーでログインして目標が3個制限になることを確認
- [x] 無料ユーザーでUI上に「無料プラン」と表示されることを確認
- [x] 有料ユーザーでログインして目標が10個制限になることを確認
- [x] 目標作成ダイアログで適切な制限表示がされることを確認
- [x] TypeScript エラーが解消されていることを確認
- [x] React Hook lint エラーが解消されていることを確認

## Impact Analysis
- **ユーザーエクスペリエンス**: 無料ユーザーが正しい制限で利用可能
- **ビジネスロジック**: 適切なプラン制限の適用
- **開発効率**: デバッグ機能により今後の問題特定が容易

## Technical Notes
- デバッグログは開発環境でのみ出力
- plan_id の `_free` 文字列での判定は一時的な解決策
- より堅牢な実装には plans テーブルの `features` フィールドや専用の `is_free` フラグの使用を検討

## Future Improvements
1. プラン判定ロジックをより堅牢に（plans.features 使用）
2. サブスクリプション状態の統一的な管理
3. 無料プランでの subscription レコード作成の必要性見直し
4. デバッグ機能の本番環境での管理方法検討