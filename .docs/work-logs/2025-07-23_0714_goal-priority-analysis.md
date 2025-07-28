# 作業ログ: ゴール優先順位機能の分析と実装提案

**作業日時**: 2025-07-23 07:14  
**概要**: ゴール選択機能への優先順位設定機能追加の分析と実装提案

## 要件
- 現在のgoal-select.tsxを修正して、ゴールの優先順位を設定可能にする
- /goalsページのゴール管理機能と連携した実装
- Supabaseの既存データ構造を考慮した設計

## 実装分析

### 現在のコード構造
1. **goal-select.tsx** (`app/(protected)/dashboard/_components/goal-summary/goal-select.tsx`)
   - シンプルなSelect UIコンポーネント
   - StudyGoal interface: `{ id: string; title: string; }`
   - 新規ゴール追加ダイアログとの連携

2. **study_goalsテーブル構造**
   - `id` (uuid, PK)
   - `user_id` (uuid, FK)
   - `title` (text)
   - `description` (text, nullable)
   - `created_at`, `updated_at` (timestamp)
   - `deadline` (timestamp, nullable)
   - `progress_rate` (integer, default: 0)
   - `status` (varchar, default: 'not_started')
   - `completed_at` (timestamp, nullable)

3. **goals管理ページ** (`app/(protected)/goals/`)
   - GoalsList コンポーネント: フィルタ・ソート機能付き
   - 現在のソートオプション: 作成日、期限、進捗率
   - GoalItem コンポーネント: 個別ゴール表示・編集

## 実装提案

### 1. データベース設計変更
```sql
-- study_goalsテーブルに優先順位フィールド追加
ALTER TABLE study_goals ADD COLUMN priority_order INTEGER DEFAULT 0;

-- パフォーマンス向上のためのインデックス追加
CREATE INDEX idx_study_goals_priority_user ON study_goals(user_id, priority_order);
```

### 2. Server Actions拡張 (`app/_actions/study_goals.ts`)
```typescript
// 優先順位付きゴール取得
export async function getStudyGoalsByUser(
  userId: string, 
  orderBy: 'priority' | 'created_at' = 'created_at'
) {
  const supabase = await createClient();
  const query = supabase
    .from("study_goals")
    .select("*")
    .eq("user_id", userId);
  
  if (orderBy === 'priority') {
    query.order('priority_order', { ascending: true })
         .order('created_at', { ascending: false });
  } else {
    query.order('created_at', { ascending: false });
  }
  
  return query;
}

// 優先順位更新
export async function updateGoalPriority(goalId: string, newPriority: number) {
  const supabase = await createClient();
  return await supabase
    .from("study_goals")
    .update({ priority_order: newPriority })
    .eq("id", goalId);
}
```

### 3. UI コンポーネント拡張

#### goal-select.tsx
- StudyGoal interfaceに`priority_order?: number`を追加
- Select内で優先順位バッジ表示
- 優先順位順でのゴール表示

#### goals-list.tsx
- ソートオプションに「優先順位」を追加
- 優先順位編集UI（数値入力またはドラッグ&ドロップ）
- 優先順位に応じた視覚的インジケーター

### 4. 段階的実装計画

**Phase 1: 基本機能**
1. データベースマイグレーション
2. Server Actions更新
3. goals-listに優先順位ソート追加

**Phase 2: UI改善**
1. goal-selectに優先順位表示
2. goals管理ページに優先順位編集機能
3. 数値ベースの優先順位設定

**Phase 3: UX向上**
1. ドラッグ&ドロップによる順序変更
2. 自動優先順位調整機能
3. ダッシュボードでの優先順位順表示

## 技術的考慮事項

### データ整合性
- 優先順位重複時の処理ロジック
- ゴール削除時の優先順位自動調整
- 新規ゴール作成時の自動優先順位設定

### パフォーマンス
- priority_orderフィールドへのインデックス追加
- 大量ゴール対応の効率的ソート処理

### ユーザビリティ
- 直感的な優先順位設定（1-10 または High/Medium/Low）
- リアルタイム更新とフィードバック
- 優先順位変更時の視覚的フィードバック

## 影響範囲

### 修正ファイル
- `database/`: 新規マイグレーションファイル
- `app/_actions/study_goals.ts`: Server Actions拡張
- `app/(protected)/dashboard/_components/goal-summary/goal-select.tsx`: UI拡張
- `app/(protected)/goals/_components/goals-list.tsx`: ソート機能追加
- `types/database.types.ts`: 型定義更新（`bun run gen:types`実行）

### 新規ファイル候補
- `app/(protected)/goals/_components/priority-editor.tsx`: 優先順位編集コンポーネント
- `hooks/useGoalPriority.ts`: 優先順位管理ロジック

## テストポイント

1. **データベース**
   - マイグレーション実行後のデータ整合性
   - priority_orderフィールドの正常動作

2. **Server Actions**
   - 優先順位付きゴール取得の正常動作
   - 優先順位更新処理の検証

3. **UI コンポーネント**
   - goal-selectでの優先順位表示
   - goals-listでの優先順位ソート
   - 優先順位編集機能の動作

4. **ユーザーフロー**
   - ゴール作成時の自動優先順位設定
   - 既存ゴールの優先順位変更
   - ダッシュボードでの優先順位反映

## 今後の改善案

1. **高度なソート機能**
   - 複数条件による並び替え（優先順位 + 期限など）
   - カスタムソート順の保存

2. **優先順位の自動調整**
   - 期限に基づく自動優先順位提案
   - 進捗率を考慮した動的優先順位

3. **視覚的改善**
   - 優先順位に応じた色分け
   - アニメーション付きの順序変更
   - モバイル対応のタッチ操作