# 目標管理ページの実装

## Work Date and Overview
- **作業日**: 2025-07-21 22:46
- **概要**: 学習目標の管理機能を包括的に実装。既存の目標作成機能を拡張し、編集・削除・進捗管理機能を含む専用管理ページを作成。

## Requirements
既存の目標設定機能は作成のみで、管理機能が不足していた。以下の機能を実装する必要があった：

1. 目標一覧表示・管理画面の作成
2. 目標編集機能の追加
3. 目標削除機能の追加
4. 目標完了機能の実装
5. 進捗管理機能の強化
6. フィルタリング・ソート機能

## Implementation Details

### 1. Server Actions の拡張 (`app/_actions/study_goals.ts`)
既存のServer Actionsファイルに以下の関数を追加：

```typescript
// 目標更新機能
export async function updateStudyGoal({
  goalId, title, description, deadline, status, progressRate
}): Promise<UpdateStudyGoalResult>

// 目標削除機能（関連するgoal_deck_linksも削除）
export async function deleteStudyGoal(goalId: string): Promise<DeleteStudyGoalResult>

// 目標完了設定機能
export async function completeStudyGoal(goalId: string): Promise<UpdateStudyGoalResult>
```

**特徴:**
- 進捗率100%時の自動完了設定
- 関連データの適切な削除処理
- エラーハンドリングの統一

### 2. メインページの実装 (`app/(protected)/goals/page.tsx`)

```typescript
export default async function GoalsPage() {
  // 認証チェック
  // 目標データとデッキ連携情報の取得
  // プラン制限情報の表示
}
```

**機能:**
- サーバーサイドでの認証確認
- 各目標に紐付いたデッキ数の取得
- プラン制限（無料3個、有料10個）の表示

### 3. コンポーネント群の実装

#### 3.1 進捗表示コンポーネント (`goal-progress-bar.tsx`)
```typescript
export function GoalProgressBar({ progress, status, className })
```
- ステータス別のカラーリング（完了：緑、進行中：進捗に応じて青/黄/橙、未開始：灰）
- カスタムProgress実装（Radix UIの制約回避）

#### 3.2 個別目標コンポーネント (`goal-item.tsx`)
```typescript
export function GoalItem({ goal })
```
**機能:**
- ステータスバッジ表示
- ドロップダウンメニューでの操作（編集・完了・削除）
- メタ情報表示（作成日、期限、デッキ数）
- 期限切れの警告表示
- ダッシュボード・学習ページへの導線

#### 3.3 目標一覧コンポーネント (`goals-list.tsx`)
```typescript
export function GoalsList({ goals })
```
**機能:**
- ステータス別統計表示
- フィルタリング（全体・未開始・進行中・完了）
- ソート機能（作成日、期限、進捗率）
- 空状態の適切な表示

#### 3.4 編集ダイアログ (`edit-goal-dialog.tsx`)
```typescript
export function EditGoalDialog({ goal, open, onOpenChange })
```
**機能:**
- 全フィールドの編集対応
- 進捗率スライダー
- 進捗100%時の自動完了設定
- リアルタイムバリデーション

#### 3.5 削除ダイアログ (`delete-goal-dialog.tsx`)
```typescript
export function DeleteGoalDialog({ goal, open, onOpenChange })
```
**機能:**
- 確認ダイアログによる安全な削除
- 関連デッキ数の警告表示
- 非可逆的操作の明示

### 4. ナビゲーション統合
`app/(protected)/navItems.ts`に目標管理ページへのリンクを追加：
```typescript
{ label: "目標", href: "/goals", icon: "Target", status: "enabled" }
```

## Technical Architecture

### データフロー
1. **Server Side**: 目標データ・デッキ連携情報・プラン制限の取得
2. **Client Side**: フィルタリング・ソート・UI操作
3. **Server Actions**: CRUD操作の実行とデータベース更新

### UI/UX設計
- **レスポンシブ対応**: モバイル・デスクトップ両対応
- **一貫性**: 既存の`AddGoalDialog`との統一感
- **アクセシビリティ**: 適切なARIAラベルとキーボード操作
- **フィードバック**: toast通知による操作結果表示

### エラーハンドリング
- Server Actionsでの包括的エラー処理
- UIでの適切なエラー表示
- ネットワークエラーに対するフォールバック

## Impact Analysis

### 影響を受けたファイル

**新規作成:**
- `app/(protected)/goals/page.tsx` - メインページ
- `app/(protected)/goals/_components/goals-list.tsx` - 目標一覧
- `app/(protected)/goals/_components/goal-item.tsx` - 個別目標
- `app/(protected)/goals/_components/goal-progress-bar.tsx` - 進捗表示
- `app/(protected)/goals/_components/edit-goal-dialog.tsx` - 編集ダイアログ
- `app/(protected)/goals/_components/delete-goal-dialog.tsx` - 削除ダイアログ

**変更:**
- `app/_actions/study_goals.ts` - Server Actions拡張
- `app/(protected)/navItems.ts` - ナビゲーション追加

### データベースへの影響
- 既存テーブル`study_goals`への操作追加
- `goal_deck_links`テーブルとの連携強化
- 削除時の関連データ整合性保証

### 既存機能への影響
- 既存の目標作成機能との完全互換性
- ダッシュボードでの目標表示機能は継続利用
- 学習機能との連携は維持

## Test Points

### 基本機能テスト
1. **目標一覧表示**
   - 全目標の正確な表示
   - ステータス別統計の正確性
   - デッキ数の正確な表示

2. **フィルタリング・ソート**
   - ステータス別フィルタの動作確認
   - 各ソート条件での正確な並び順
   - フィルタとソートの組み合わせ

3. **目標編集**
   - 全フィールドの更新確認
   - 進捗率変更時のステータス自動更新
   - バリデーションエラーの適切な表示

4. **目標削除**
   - 削除確認ダイアログの表示
   - 関連データ（goal_deck_links）の正確な削除
   - 削除後の一覧更新

5. **目標完了**
   - 完了ボタンでの即座完了
   - 完了日時の正確な記録
   - 完了後のUI表示変更

### レスポンシブテスト
- モバイル端末での操作性確認
- タブレット表示での適切なレイアウト
- デスクトップでの最適化表示

### パフォーマンステスト
- 大量目標データでの表示速度
- フィルタリング・ソート処理速度
- サーバーアクション実行時間

### 権限・セキュリティテスト
- ユーザー認証の確認
- 他ユーザーの目標への不正アクセス防止
- SQL インジェクション対策確認

## Future Improvements

### 機能拡張案
1. **バルク操作**
   - 複数目標の一括編集・削除
   - 一括ステータス変更

2. **目標テンプレート**
   - よく使われる目標パターンのテンプレート化
   - カテゴリ別目標管理

3. **進捗の自動化**
   - 学習実績に基づく進捗率自動更新
   - デッキ完了率との連動

4. **分析機能**
   - 目標達成率の統計表示
   - 学習パターン分析

5. **通知機能**
   - 期限approaching通知
   - 目標達成祝福メッセージ

### UX改善案
1. **ドラッグ&ドロップ**
   - 目標の優先順位変更
   - ステータス間の移動

2. **検索機能**
   - 目標タイトル・説明での検索
   - タグベースの分類

3. **エクスポート機能**
   - 目標一覧のCSV出力
   - 進捗レポートの生成

### パフォーマンス最適化
1. **ページネーション**
   - 大量目標データに対する分割表示
   - 無限スクロールの実装

2. **キャッシュ戦略**
   - 目標データのクライアントサイドキャッシュ
   - 楽観的更新の実装

## Conclusion

目標管理ページの実装により、ユーザーは学習目標を包括的に管理できるようになった。既存の作成機能と新規実装の管理機能が統合され、学習サイクル全体をサポートする完全な目標管理システムが完成した。

実装は既存のアーキテクチャパターンに従い、コードの一貫性と保守性を維持している。フリーミアム制限も適切に考慮され、ユーザーエクスペリエンスを損なうことなく機能提供している。

今後の改善により、さらに使いやすく強力な目標管理システムに発展させることが可能である。