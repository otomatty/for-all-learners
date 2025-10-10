# 目標数制限機能の実装作業ログ

## 作業日時
2025年1月21日

## 作業概要
無料ユーザーの目標設定を3個まで、有料ユーザーを10個まで制限する機能を実装

## 要件
- 無料ユーザー：最大3個の目標まで設定可能
- 有料ユーザー：最大10個の目標まで設定可能
- UI上で制限状況を明確に表示
- 制限に達した場合のアップグレード誘導

## 実装内容

### 1. サーバーサイド実装（`app/_actions/study_goals.ts`）

#### 変更点
- 既存の`addStudyGoal`関数に制限チェック機能を追加
- `getUserGoalLimits`ヘルパー関数を新規作成

#### 追加されたコード
```typescript
// 制限チェックロジック
const currentGoals = await getStudyGoalsByUser(user.id);
const isPaid = await isUserPaid(user.id);
const maxGoals = isPaid ? 10 : 3;

if (currentGoals.length >= maxGoals) {
    const planType = isPaid ? "有料プラン" : "無料プラン";
    return { 
        success: false, 
        error: `${planType}では最大${maxGoals}個の目標まで設定できます。` 
    };
}

// ヘルパー関数
export async function getUserGoalLimits(userId: string) {
    const [currentGoals, isPaid] = await Promise.all([
        getStudyGoalsByUser(userId),
        isUserPaid(userId)
    ]);

    const maxGoals = isPaid ? 10 : 3;
    const currentCount = currentGoals.length;
    const canAddMore = currentCount < maxGoals;

    return {
        currentCount,
        maxGoals,
        canAddMore,
        isPaid,
        remainingGoals: maxGoals - currentCount
    };
}
```

### 2. UI実装（`components/goals/add-goal-dialog.tsx`）

#### 変更点
- 制限情報を表示するUI要素を追加
- エラーハンドリングの改善
- ボタンの状態管理

#### 追加された機能
1. **制限情報の表示**
   - 現在の目標数 / 最大目標数
   - プランタイプバッジ（無料/有料プラン）

2. **制限に達した場合の処理**
   - アラート表示
   - ボタンの無効化
   - わかりやすいメッセージ表示

3. **アップグレード誘導**
   - 無料プランユーザー向けの有料プラン案内
   - 制限に近づいた時の注意喚起

#### 追加されたUI要素
```typescript
{/* 目標制限の表示 */}
{goalLimits && (
    <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>目標数</span>
            <div className="flex items-center gap-2">
                <Badge variant={goalLimits.isPaid ? "default" : "secondary"}>
                    {goalLimits.isPaid ? "有料プラン" : "無料プラン"}
                </Badge>
                <span>
                    {goalLimits.currentCount} / {goalLimits.maxGoals}
                </span>
            </div>
        </div>
        
        {!goalLimits.canAddMore && (
            <Alert>
                <AlertDescription>
                    {goalLimits.isPaid 
                        ? "有料プランの目標上限（10個）に達しています。"
                        : "無料プランの目標上限（3個）に達しています。有料プランにアップグレードすると10個まで設定できます。"
                    }
                </AlertDescription>
            </Alert>
        )}
    </div>
)}
```

### 3. 依存関係の追加
- `getUserGoalLimits`関数のインポート
- `Alert`、`AlertDescription`、`Badge`コンポーネントの追加
- `createClient`のインポート（クライアントサイドSupabase操作用）

## 実装した機能の詳細

### 制限チェックフロー
1. ユーザーが目標追加ボタンをクリック
2. ダイアログ開放時に現在の制限情報を取得
3. フォーム送信時にサーバーサイドで制限チェック
4. 制限に達している場合はエラーメッセージを表示

### エラーハンドリング
- サーバーサイドでの制限チェック
- フロントエンドでの制限状況表示
- エラーメッセージの日本語対応

### UX改善点
- リアルタイムでの制限状況表示
- 制限に達した場合の明確なフィードバック
- 有料プランのメリット訴求
- ボタン無効化による誤操作防止

## 影響範囲
- `app/_actions/study_goals.ts`：制限チェックロジック追加
- `components/goals/add-goal-dialog.tsx`：UI改善とエラーハンドリング

## テスト観点
1. 無料ユーザーで3個目標作成後、4個目が作成できないことを確認
2. 有料ユーザーで10個目標作成後、11個目が作成できないことを確認
3. 制限に近づいた時の警告メッセージ表示確認
4. プラン変更後の制限値更新確認

## 今後の改善案
- 目標削除時の制限情報リアルタイム更新
- プラン変更時の制限値即座反映
- 制限情報のキャッシュ機能
- 目標数の進捗バー表示

## 関連ファイル
- `/app/_actions/study_goals.ts`
- `/app/_actions/subscriptions.ts`
- `/components/goals/add-goal-dialog.tsx`
- `/components/ui/alert.tsx`
- `/components/ui/badge.tsx`