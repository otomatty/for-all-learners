# コンポーネント・ロジック依存関係追跡ガイド

**対象:** 全開発者・AI
**最終更新:** 2025-10-22

---

## 概要

このガイドは、コンポーネント・ロジック間の依存関係を明確に記録・可視化する方法を定めます。

ファイルを開いたときに、**親子関係・使用先・依存先が一目瞭然**になることで、以下を実現：

✅ 修正の影響範囲が即座に判定可能
✅ リファクタリングのリスク評価が容易
✅ 新機能実装時の設計判断が明確
✅ デッドコード検出が簡単

---

## 方法 1: ファイルコメント（軽量・最推奨）

### 配置場所

各 TypeScript / JavaScript ファイルの **先頭から 5-10 行目**

### テンプレート

```typescript
/**
 * {Component/Logic Name}
 *
 * DEPENDENCY MAP:
 *
 * Parents (このファイルを import している場所):
 *   ├─ src/components/{ParentComponent}/index.tsx
 *   ├─ src/services/{Service}.ts
 *   └─ src/pages/{Page}.tsx
 *
 * Dependencies (このファイルが import している外部ファイル):
 *   ├─ src/hooks/useAuth.ts
 *   ├─ src/utils/validation.ts
 *   └─ src/types/User.ts
 *
 * Related Files (関連ファイル):
 *   ├─ Spec: ./Button.spec.md
 *   ├─ Tests: ./Button.test.tsx
 *   ├─ Styles: ./Button.module.css
 *   └─ Issues: docs/issues/open/2025_10/20251022_01_button.md
 */
```

### 実装例 1: React コンポーネント

```typescript
// src/components/Button/Button.tsx

/**
 * Button Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ src/components/Form/SubmitButton.tsx
 *   ├─ src/components/Modal/ConfirmDialog.tsx
 *   ├─ src/components/Navigation/NavBar.tsx
 *   └─ src/pages/Dashboard.tsx
 *
 * Dependencies (依存先):
 *   ├─ src/hooks/useClickHandler.ts
 *   ├─ src/utils/classNameBuilder.ts
 *   └─ Button.module.css
 *
 * Related Files:
 *   ├─ Spec: ./Button.spec.md
 *   ├─ Tests: ./Button.test.tsx
 *   └─ Styles: ./Button.module.css
 */

import React from 'react';
import { useClickHandler } from '@/hooks/useClickHandler';
import { classNameBuilder } from '@/utils/classNameBuilder';
import styles from './Button.module.css';

export interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick, disabled }) => {
  const handleClick = useClickHandler(onClick);
  const className = classNameBuilder(styles.button, { [styles.disabled]: disabled });

  return (
    <button className={className} onClick={handleClick} disabled={disabled}>
      {label}
    </button>
  );
};
```

### 実装例 2: ユーティリティ関数

```typescript
// src/utils/calculateTotal.ts

/**
 * Calculate Total Price
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ src/components/Cart/CartSummary.tsx
 *   ├─ src/services/OrderService.ts
 *   └─ src/hooks/useCart.ts
 *
 * Dependencies (依存先):
 *   ├─ src/utils/applyDiscount.ts
 *   ├─ src/types/Item.ts
 *   └─ src/constants/TAX_RATE.ts
 *
 * Related Files:
 *   ├─ Spec: ./calculateTotal.spec.md
 *   ├─ Tests: ./calculateTotal.test.ts
 *   └─ Related: src/utils/applyDiscount.ts (same parent)
 */

import { applyDiscount } from "./applyDiscount";
import type { Item } from "@/types/Item";
import { TAX_RATE } from "@/constants/TAX_RATE";

export function calculateTotal(items: Item[], discountRate: number): number {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discounted = applyDiscount(subtotal, discountRate);
  return discounted * (1 + TAX_RATE);
}
```

### 実装例 3: Custom Hook

```typescript
// src/hooks/useAuth.ts

/**
 * useAuth Hook
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ src/components/Navigation/NavBar.tsx
 *   ├─ src/components/Auth/LoginForm.tsx
 *   ├─ src/pages/Dashboard.tsx
 *   └─ src/components/ProtectedRoute.tsx
 *
 * Dependencies (依存先):
 *   ├─ src/services/AuthService.ts
 *   ├─ src/context/AuthContext.ts
 *   └─ src/types/User.ts
 *
 * Related Files:
 *   ├─ Spec: ./useAuth.spec.md
 *   ├─ Tests: ./useAuth.test.ts
 *   └─ Context: src/context/AuthContext.ts (状態管理)
 */

import { useContext, useCallback } from "react";
import { AuthContext } from "@/context/AuthContext";
import { AuthService } from "@/services/AuthService";
import type { User } from "@/types/User";

export function useAuth() {
  const { user, setUser } = useContext(AuthContext);
  const authService = new AuthService();

  const login = useCallback(
    async (email: string, password: string) => {
      const user = await authService.login(email, password);
      setUser(user);
      return user;
    },
    [setUser],
  );

  return { user, login };
}
```

---

## 方法 2: `.dependency.md` ファイル（詳細版）

### 配置場所

各コンポーネント / ロジックディレクトリに配置：

```
src/components/Button/
├── index.ts
├── Button.tsx
├── Button.spec.md           ← 仕様
├── Button.test.tsx          ← テスト
├── Button.module.css        ← スタイル
└── Button.dependency.md     ← 依存関係詳細（NEW）
```

### テンプレート

```markdown
# Button.dependency.md

## コンポーネント情報

- **ファイルパス**: `src/components/Button/Button.tsx`
- **作成日**: 2025-10-22
- **最終更新**: 2025-10-22
- **カテゴリ**: UI Component

---

## 依存関係マップ

### 親コンポーネント / 使用先 (Dependents)

このコンポーネントを import している場所（**修正時に影響を受ける先**）：

| 使用先        | ファイルパス                           | 用途                         | テスト状況 |
| ------------- | -------------------------------------- | ---------------------------- | ---------- |
| SubmitButton  | src/components/Form/SubmitButton.tsx   | フォーム送信ボタンのラッパー | ✅ Tested  |
| ConfirmDialog | src/components/Modal/ConfirmDialog.tsx | 確認ダイアログのボタン       | ✅ Tested  |
| NavBar        | src/components/Navigation/NavBar.tsx   | ナビゲーションバーのボタン   | ✅ Tested  |
| Dashboard     | src/pages/Dashboard.tsx                | ページ内のアクション         | ⚠️ Partial |

**リスク評価**: 4 か所で使用 → **修正時の影響範囲は大きい**

---

### 依存コンポーネント / インポート先 (Dependencies)

このコンポーネントが import している外部ファイル（**修正時に依存する先**）：

| 依存先            | ファイルパス                  | 用途                 | 必須度      |
| ----------------- | ----------------------------- | -------------------- | ----------- |
| useClickHandler   | src/hooks/useClickHandler.ts  | クリックハンドリング | 🔴 Critical |
| classNameBuilder  | src/utils/classNameBuilder.ts | クラス名生成         | 🟡 High     |
| Button.module.css | ./Button.module.css           | スタイリング         | 🟡 High     |

**リスク評価**: useClickHandler に依存 → **Hook の修正時に影響を受ける**

---

## 関連ファイル

### 同じ機能に関連
```

src/components/Button/
├── Button.tsx ← Main component
├── Button.spec.md ← 仕様定義
├── Button.test.tsx ← テストコード
├── Button.module.css ← スタイル
└── Button.dependency.md ← このファイル

```

### 仕様・ドキュメント

- **仕様書**: `Button.spec.md`
- **実装計画**: `docs/03_plans/button-component/20251022_01_implementation-plan.md`
- **関連 Issue**: `docs/01_issues/open/2025_10/20251022_01_button-component.md`

---

## 依存グラフ

```

┌──────────────────────────────────────────────────────────┐
│ Button Component │
├──────────────────────────────────────────────────────────┤
│ │
│ INCOMING (このコンポーネントを使用): │
│ ┌─ SubmitButton ─┐ │
│ ├─ ConfirmDialog ┤ │
│ ├─ NavBar ───────┤ │
│ └─ Dashboard ────┘ │
│ │ │
│ │ (修正時の影響範囲) │
│ ▼ │
│ ┌──────────────────────────────────────┐ │
│ │ Button.tsx │ │
│ │ (このファイル) │ │
│ └──────────────────────────────────────┘ │
│ ▲ │
│ │ (修正時に依存) │
│ │ │
│ OUTGOING (このコンポーネントが使用): │
│ ┌─ useClickHandler ┐ │
│ ├─ classNameBuilder┤ │
│ └─ Button.css ────┘ │
│ │
└──────────────────────────────────────────────────────────┘

````

---

## 使用場面別ガイド

### 修正するとき

このコンポーネントを修正する際、**親コンポーネント** の列を確認：

> ✅ **チェック項目**:
> 1. SubmitButton でテストが通るか
> 2. ConfirmDialog でテストが通るか
> 3. NavBar でテストが通るか
> 4. Dashboard でテストが通るか

**対応**: 修正後、親コンポーネントのテストを全て実行

---

### 削除するとき

削除前に親コンポーネント を確認して、依存関係を解決：

> ⚠️ **削除不可**: 4 か所で使用中
>
> 対応:
> 1. 使用先 4 か所を新しい実装に置き換え
> 2. テストを全て pass させる
> 3. その後に削除

---

### リファクタリング

依存関係を分析してリファクタリング計画を立案：

> **現在の構造**:
> - Button → useClickHandler → AuthService
>
> **リスク**: useClickHandler 修正時に Button も影響
>
> **対応**: 依存関係を緩和する設計変更を検討

---

## 更新ルール

### いつ更新するか

✅ **必ず更新**:
- 新しい親コンポーネント が使用を開始
- 依存ファイルを追加・削除
- 大規模リファクタリング

❌ **更新不要**:
- コンポーネント内のロジックのみ修正
- CSS の細かい調整

### 更新手順

1. ファイル先頭の DEPENDENCY MAP コメントを更新
2. `.dependency.md` のテーブルも更新
3. 関連する他の `.dependency.md` も確認・更新

---

## 自動化ツール

### Tool 1: madge (依存グラフ自動生成)

```bash
# インストール
npm install --save-dev madge

# グラフ生成
npx madge --extensions ts,tsx src/components/Button/Button.tsx

# ビジュアル出力
npx madge --image deps.svg src/
````

### Tool 2: デバッグスクリプト

```bash
# 親コンポーネント検索
grep -r "from.*Button" src/ --include="*.tsx"

# 依存先検索
grep "^import\|^from" src/components/Button/Button.tsx
```

### Tool 3: VS Code 拡張機能

推奨:

- **Dependency Cruiser**: 依存関係ビジュアライザー
- **Import Cost**: インポート影響度表示

---

## ベストプラクティス

### ✅ Good

```typescript
/**
 * Button Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ SubmitButton
 *   └─ NavBar
 *
 * Dependencies (依存先):
 *   ├─ useClickHandler
 *   └─ styles.css
 */
```

### ❌ Bad

```typescript
// No dependency information
// 何にも使われてない？わからない

export const Button = () => {};
```

---

## チェックリスト

新規コンポーネント作成時：

- [ ] ファイル先頭に DEPENDENCY MAP コメントがあるか
- [ ] Parents (使用先) を記載したか（作成時は空でも OK）
- [ ] Dependencies (依存先) を記載したか
- [ ] Related Files を記載したか
- [ ] `.dependency.md` を作成したか（大規模コンポーネントの場合）

修正・リファクタリング時：

- [ ] DEPENDENCY MAP を更新したか
- [ ] 親コンポーネントのテストを実行したか
- [ ] 依存先の変更がないか確認したか

---

## 実装例一覧

- [Button Component](#実装例-1-react-コンポーネント) (React コンポーネント)
- [calculateTotal](#実装例-2-ユーティリティ関数) (ユーティリティ)
- [useAuth](#実装例-3-custom-hook) (Custom Hook)

---

## 自動化ツール

### 依存関係を自動的に可視化

軽量版（ファイルコメント）で日々の開発を実施しつつ、定期的に自動ツールでプロジェクト全体の依存関係を分析・可視化します。

#### 推奨ツール: **Madge**

```bash
# インストール
npm install --save-dev madge

# 循環依存をチェック（開発時）
npx madge src/ --circular

# ダイアグラムを生成（定期的）
npx madge src/ --image dist/dependencies.svg

# JSON 出力（プログラム処理用）
npx madge src/ --json > deps.json
```

#### その他のツール

| ツール                 | 用途                             | 推奨度     |
| ---------------------- | -------------------------------- | ---------- |
| **Madge**              | 依存グラフの可視化・循環依存検出 | ⭐⭐⭐⭐⭐ |
| **Dependency Cruiser** | 詳細ルール検証・高度な分析       | ⭐⭐⭐⭐   |
| **depcheck**           | 未使用依存関係の検出             | ⭐⭐⭐     |
| **Graphviz**           | 手動ダイアグラム生成             | ⭐⭐⭐⭐   |

詳細は [依存関係ダイアグラム自動生成ツール](./dependency-visualization-tools.md) を参照。

### npm scripts 例

```json
{
  "scripts": {
    "analyze:deps": "madge src/",
    "analyze:circular": "madge src/ --circular",
    "visualize:deps": "madge src/ --image dist/dependencies.svg",
    "check:deps": "npm run analyze:circular -- --exit 1"
  }
}
```

### CI パイプライン統合

```yaml
# .github/workflows/dependency-check.yml
- name: Check circular dependencies
  run: npx madge src/ --circular --exit 1

- name: Generate dependency graph
  run: npx madge src/ --image graph.svg
```

---

## 🔗 関連ドキュメント

- [命名規則](./naming-conventions.md)
- [AI ドキュメント駆動開発ガイド](./ai-documentation.md)
- [コード品質基準](./code-quality-standards.md)
- [依存関係ダイアグラム自動生成ツール](./dependency-visualization-tools.md) ← 詳細な使用方法

---

**最終更新:** 2025-10-22
**作成者:** AI (Grok Code Fast 1)
