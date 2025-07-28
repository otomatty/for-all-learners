# user-nav.tsx プラン情報表示機能の改善作業ログ

## 作業日時
2025年1月21日

## 作業概要
`user-nav.tsx`コンポーネントにプラン情報と目標制限の詳細表示機能を追加し、ユーザーエクスペリエンスを向上

## 要件
- プラン情報（無料/有料）を明確に表示
- 目標の使用状況をリアルタイムで表示
- 無料ユーザーには有料プランへのアップグレード誘導を提供
- 視覚的にわかりやすいUI設計

## 実装内容

### 1. 追加されたインポート
```typescript
import { Crown, Target } from "lucide-react"; // 新しいアイコン
import { getUserGoalLimits } from "@/app/_actions/study_goals"; // 目標制限取得
import { useEffect, useState } from "react"; // React hooks
import { createClient } from "@/lib/supabase/client"; // クライアントサイドSupabase
```

### 2. 状態管理の追加
```typescript
const [goalLimits, setGoalLimits] = useState<{
    currentCount: number;
    maxGoals: number;
    canAddMore: boolean;
    isPaid: boolean;
    remainingGoals: number;
} | null>(null);
```

### 3. 目標制限情報の取得
```typescript
useEffect(() => {
    const fetchGoalLimits = async () => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const limits = await getUserGoalLimits(user.id);
                setGoalLimits(limits);
            }
        } catch (error) {
            console.error("目標制限の取得に失敗しました:", error);
        }
    };
    fetchGoalLimits();
}, []);
```

### 4. プランバッジの強化
**変更前:**
```typescript
<Badge variant="secondary">{planLabel}</Badge>
```

**変更後:**
```typescript
<Badge variant={isPaid ? "default" : "secondary"} className="flex items-center gap-1">
    {isPaid && <Crown className="w-3 h-3" />}
    {planLabel}
</Badge>
```

### 5. 詳細プラン情報セクションの追加
```typescript
{/* プラン情報の詳細表示 */}
<DropdownMenuLabel className="font-normal">
    <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">プラン</span>
            <Badge variant={isPaid ? "default" : "secondary"} className="text-xs">
                {isPaid && <Crown className="w-3 h-3 mr-1" />}
                {planLabel}
            </Badge>
        </div>
        
        {goalLimits && (
            <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    目標
                </span>
                <span className="font-medium">
                    {goalLimits.currentCount} / {goalLimits.maxGoals}
                </span>
            </div>
        )}
        
        {!isPaid && (
            <div className="text-xs text-muted-foreground">
                有料プランで目標10個まで設定可能
            </div>
        )}
    </div>
</DropdownMenuLabel>
```

### 6. アップグレード誘導メニューの追加
```typescript
{!isPaid && (
    <DropdownMenuItem onClick={() => router.push("/pricing")}>
        <Crown className="w-4 h-4 text-yellow-500" />
        <span className="text-yellow-600 font-medium">有料プランにアップグレード</span>
    </DropdownMenuItem>
)}
```

## 実装した機能の詳細

### UI改善点
1. **プランバッジの視覚的強化**
   - 有料プランには王冠（Crown）アイコンを表示
   - バッジの色を無料プラン：`secondary`、有料プラン：`default`に変更

2. **詳細情報セクション**
   - プランタイプの再表示（アイコン付き）
   - 目標使用状況の表示（🎯 現在数/最大数）
   - 無料ユーザー向けのアップグレード案内メッセージ

3. **アップグレード誘導**
   - 無料ユーザー専用メニュー項目
   - 黄色の王冠アイコンで視覚的に強調
   - 価格ページへの直接リンク

### データフローの改善
- リアルタイムでの目標制限情報取得
- コンポーネントマウント時の自動更新
- エラーハンドリングの実装

## UXの向上点

### 情報の可視性向上
- ユーザーが常に自分のプラン状況を確認可能
- 目標の使用状況がひと目でわかる
- 制限に近づいた時の気づきを提供

### アップセル機会の創出
- 無料ユーザーに対する自然なアップグレード誘導
- 有料プランのメリット（目標10個まで）を明示
- 価格ページへの導線を設置

### 一貫性のあるデザイン
- 既存のデザインシステムに準拠
- アイコンとカラーリングの統一
- レスポンシブ対応の維持

## 影響範囲
- `components/user-nav.tsx`：プラン情報表示とアップグレード誘導機能の追加
- 依存関係：`getUserGoalLimits`アクション、Supabaseクライアント、新しいLucideアイコン

## テスト観点
1. 無料ユーザーでの表示確認
   - 無料プランバッジの表示
   - 目標制限（3個）の表示
   - アップグレードメニューの表示
   
2. 有料ユーザーでの表示確認
   - 有料プランバッジ（王冠アイコン付き）の表示
   - 目標制限（10個）の表示
   - アップグレードメニューの非表示
   
3. 目標数変動時の動的更新確認
4. エラー時の適切なフォールバック動作確認

## 今後の改善案
- プラン有効期限の表示（サブスクリプション情報）
- 使用量に応じたプログレスバーの表示
- プラン変更時のリアルタイム反映
- 他の制限事項（デッキ数など）の表示追加

## 関連ファイル
- `/components/user-nav.tsx`
- `/app/_actions/study_goals.ts`
- `/app/_actions/subscriptions.ts`
- `/lib/supabase/client.ts`