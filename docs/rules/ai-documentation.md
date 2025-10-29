# AI ドキュメント駆動開発ガイド

## 概要

このプロジェクトでは、以下の5種類のドキュメントを中心とした**ドキュメント駆動開発** + **テスト駆動開発**を実践します。

すべてのフェーズで統一された Prompt を使用し、AI が明確なコンテキストのもとで高品質なコードを生成できるようにしています。

---

## 📚 ドキュメント5種類

### 1. **Prompt（プロンプト / 指示書）**

**用途**: 全フェーズで使用、AI・開発者への指示
**作成場所**: `docs/00_prompts/*.md`
**内容例**:

- プロジェクトコンテキスト
- 実装タスクの詳細
- 遵守すべきルール
- 参照すべきドキュメント
- 期待される出力形式

**参考**: [AI ドキュメント駆動開発 - Prompt テンプレート](./ai-documentation.md#prompt-テンプレート)

---

### 2. **Issue（問題・要件）**

**用途**: 実装開始前、問題発見時
**作成場所**: `docs/01_issues/open/YYYY_MM/YYYYMMDD_{番号}_{内容}.md`
**内容例**:

- 発見場所（ファイルパス、行番号）
- 問題の詳細
- 影響範囲
- 重要度（Critical / High / Medium / Low）
- 提案する解決策

**テンプレート**: `docs/01_issues/templates/issue-template.md`

---

### 3. **Research（技術調査・リサーチ）**

**用途**: 技術選定、ベストプラクティス確認時
**作成場所**: `docs/02_research/YYYY_MM/YYYYMMDD_{番号}_{内容}.md`
**内容例**:

- 調査目的
- 調査結果の概要
- メリット・デメリット
- ベンチマーク結果
- 推奨事項
- 参考資料

**セクション例**:

```
## 調査対象: React ステート管理ライブラリ選定

### 候補
1. Redux
2. Zustand
3. Recoil

### 比較結果
| 項目 | Redux | Zustand | Recoil |
|------|-------|---------|--------|
| バンドルサイズ | 大 | 小 | 中 |
| 学習コスト | 高 | 低 | 中 |

### 推奨: Zustand
理由: バンドルサイズが小さく、学習コストが低い
```

**参考**: [ドキュメント管理ガイド - 調査・研究の記録](./documentation-management.md#調査研究の記録)

---

### 4. **Plan（実装計画）**

**用途**: 実装前の設計、段階的な実装計画
**作成場所**: `docs/03_plans/{機能名}/YYYYMMDD_{番号}_{内容}.md`
**内容例**:

- 実装の概要
- 実装範囲（Phase 1, 2, ...）
- 各フェーズの詳細
- 依存関係
- リスク・対策
- マイルストーン

**セクション例**:

```
## Button コンポーネント実装計画

### Phase 1: 基本機能 (2025-10-22 - 2025-10-25)
- [ ] 基本的なボタンレンダリング
- [ ] onClick ハンドリング
- [ ] disabled 状態
- [ ] 基本テスト実装

### Phase 2: スタイリング・バリエーション (2025-10-26 - 2025-10-28)
- [ ] size バリエーション（small, medium, large）
- [ ] variant バリエーション（primary, secondary, ...）
- [ ] ホバー・フォーカス状態

### Phase 3: 高度な機能 (2025-10-29 - 2025-10-31)
- [ ] loading 状態
- [ ] アクセシビリティ対応
- [ ] ドキュメント作成
```

---

### 5. **Test（テストケース + 仕様書）**

**用途**: テスト駆動開発の指針、実装の仕様定義
**作成場所**: `src/{path}/{FileName}.spec.md`, `docs/04_tests/{機能名}/*.md`
**内容例**:

```
# Button.spec.md

## Specifications
- 3つのサイズをサポート
- 5つのバリアント
- disabled 状態対応
- onClick イベント

## Test Cases

### TC-001: 基本レンダリング
入力: <Button>Click me</Button>
期待: button タグが正しくレンダリング

### TC-002: disabled 状態
入力: <Button disabled>Disabled</Button>
期待: disabled 属性が設定、onClick 呼ばれない

### TC-003: onClick イベント
入力: onClick のモック関数を実行
期待: onClick が正確に1回呼ばれる
```

**重要**: spec.md は、test.tsx と implementation.tsx の両方の基準になります。

**テンプレート**: [`.spec.md` 仕様書テンプレート](./spec-template.md)

---

### 6. **Log（作業ログ）**

**用途**: 作業の記録、進捗管理、学び・気づきの記録
**作成場所**: `docs/05_logs/YYYY_MM/YYYYMMDD/{番号}_{内容}.md`
**内容例**:

```
# 20251022_01_Button コンポーネント実装

## 実施した作業
- [ ] spec.md の作成
- [ ] test.tsx の実装
- [ ] 基本的なレンダリング機能の実装

## 変更ファイル
- src/components/Button/Button.spec.md (新規)
- src/components/Button/Button.test.tsx (新規)
- src/components/Button/Button.tsx (新規)

## テスト結果
✅ TC-001 (基本レンダリング)
✅ TC-002 (disabled 状態)
❌ TC-003 (onClick イベント) - WIP

## 気づき
- Recoil との状態管理統合時に注意が必要
- エラーハンドリングの方針を確認した

## 次回の作業
- [ ] TC-003, TC-004 の実装
- [ ] エラーハンドリングの追加
```

**テンプレート**: `docs/templates/worklog-template.md`

---

## 🔄 実装フロー（Issue → Research → Plan → Test → Log）

### **全体フロー図**

```
┌─────────────────────────────────────────────────────────────┐
│ PROMPT: 要件・背景・ルールを明確化                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ ISSUE: 実装すべき機能・問題を定義                           │
│ 場所: docs/01_issues/open/YYYY_MM/YYYYMMDD_{番号}_{内容}   │
│ 内容: 何を、なぜ実装するか                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ RESEARCH: 技術調査・ベストプラクティス確認                  │
│ 場所: docs/02_research/YYYY_MM/YYYYMMDD_{番号}_{内容}      │
│ 内容: 技術選定、メリット・デメリット比較                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PLAN: 実装計画を作成                                        │
│ 場所: docs/03_plans/{機能名}/YYYYMMDD_{番号}_{内容}        │
│ 内容: フェーズ分割、段階的な実装計画                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ SPEC + TEST: 仕様書 + テストケース定義（TDD開始）           │
│ 場所: src/{path}/{File}.spec.md                            │
│ 内容: 要件仕様、テストケース（TC-001～）、実装ノート        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ TEST CODE: テストコード実装                                 │
│ 場所: src/{path}/{File}.test.tsx                           │
│ ルール: spec.md の TC-* に厳密に従う                       │
│ 目標: すべてのテストが FAIL 状態                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ IMPLEMENTATION: 本体実装（テストをパスさせる）               │
│ 場所: src/{path}/{File}.tsx                                │
│ ルール: すべてのテストが PASS するまで実装                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ LOG: 作業ログを記録                                         │
│ 場所: docs/05_logs/YYYY_MM/YYYYMMDD/{番号}_{内容}          │
│ 内容: 実施内容、変更ファイル、学び、次回予定                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 実装例: Button コンポーネント

### ステップ 1: Issue を作成

**ファイル**: `docs/01_issues/open/2025_10/20251022_01_button-component.md`

```markdown
# Button コンポーネント実装

## 概要

基本的なボタンコンポーネントを実装し、UIライブラリの基礎を構築する。

## 要件

- [ ] 複数のサイズ（small, medium, large）をサポート
- [ ] 複数のバリアント（primary, secondary, danger）をサポート
- [ ] disabled 状態に対応
- [ ] loading 状態に対応
- [ ] onClick イベントハンドリング
- [ ] アクセシビリティ対応

## 関連ドキュメント

- 設計: docs/03_design/features/button-design.md
- 調査: docs/02_research/2025_10/20251022_01_ui-library-research.md
```

---

### ステップ 2: Research を作成

**ファイル**: `docs/02_research/2025_10/20251022_01_ui-library-research.md`

```markdown
# UI ライブラリ設計調査

## 調査目的

Button コンポーネント実装時に、スタイリング・レイアウト手法を決定する

## 調査結果

### CSS ソリューション比較

| 項目           | Tailwind | CSS Modules | Styled Components       |
| -------------- | -------- | ----------- | ----------------------- |
| パフォーマンス | ✅ 良好  | ✅ 良好     | ⚠️ 実行時オーバーヘッド |
| 保守性         | ✅ 高    | ✅ 高       | ⚠️ 中                   |
| 学習コスト     | ⚠️ 中    | ✅ 低       | ⚠️ 中                   |

### 推奨: Tailwind + CSS Modules 組み合わせ

- Tailwind: ユーティリティクラスで素早く実装
- CSS Modules: 複雑なスタイルはモジュール化

## 参考資料

- Tailwind CSS 公式: https://tailwindcss.com/
- CSS Modules: https://github.com/css-modules/css-modules
```

---

### ステップ 3: Plan を作成

**ファイル**: `docs/03_plans/button-component/20251022_01_implementation-plan.md`

```markdown
# Button コンポーネント実装計画

## 概要

シンプルなボタンコンポーネントから開始し、段階的に高度な機能を追加

## Phase 1: 基本機能 (2025-10-22～10-24)

- [ ] spec.md 作成
- [ ] test.tsx 実装（TC-001～005）
- [ ] Button.tsx 基本実装
- [ ] 単体テスト全 PASS

## Phase 2: バリエーション・スタイリング (2025-10-25～10-26)

- [ ] size, variant サポート
- [ ] CSS モジュール実装
- [ ] ホバー・フォーカス状態

## Phase 3: 高度な機能 (2025-10-27～10-28)

- [ ] loading 状態
- [ ] アクセシビリティ
- [ ] ドキュメント作成

## リスク・対策

| リスク           | 対策                                 |
| ---------------- | ------------------------------------ |
| 過度に複雑な設計 | Phase を細分化、各段階で簡潔性を重視 |
| テスト漏れ       | spec.md でテストケース事前定義       |
```

---

### ステップ 4: Spec + Test ケース定義

**ファイル**: `src/components/Button/Button.spec.md`

[詳細はテンプレートを参照](#spec-テンプレート)

---

### ステップ 5: Test コード実装

**ファイル**: `src/components/Button/Button.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  // TC-001: 基本レンダリング
  test('TC-001: Renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  // TC-002: disabled 状態
  test('TC-002: Disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  // TC-003: onClick イベント
  test('TC-003: Calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    screen.getByRole('button').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

---

### ステップ 6: 本体実装

**ファイル**: `src/components/Button/Button.tsx`

```typescript
import React from 'react';
import styles from './Button.module.css';

interface ButtonProps {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  disabled = false,
  onClick,
}) => {
  return (
    <button
      className={styles.button}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

---

### ステップ 7: 作業ログを記録

**ファイル**: `docs/05_logs/2025_10/20251022_01_button-implementation.md`

```markdown
# 20251022_01 Button コンポーネント実装

## 実施した作業

- [x] spec.md 作成（TC-001～TC-005）
- [x] test.tsx 実装
- [x] Button.tsx 基本実装
- [x] すべてのテスト PASS

## 変更ファイル

- src/components/Button/Button.tsx (新規)
- src/components/Button/Button.test.tsx (新規)
- src/components/Button/Button.spec.md (新規)

## テスト結果

✅ TC-001: 基本レンダリング
✅ TC-002: disabled 状態
✅ TC-003: onClick イベント

## 気づき・学び

- React Testing Library は userEvent を推奨
- disabled 属性は自動的にアクセシビリティ対応

## 次回の作業

- [ ] size, variant バリエーション追加
- [ ] loading 状態の実装
- [ ] アクセシビリティ深掘り
```

---

## 🎯 AI へのプロンプトテンプレート

### **標準プロンプト形式**

```
【実施内容】
1. src/components/Button/Button.spec.md を確認し、仕様を理解
2. spec.md のテストケース（TC-001～TC-005）に基づいて test.tsx を実装
3. すべてのテストが PASS するまで Button.tsx を実装
4. 実装完了後、作業ログを記録

```

---

## ✅ ドキュメント駆動開発のチェックリスト

### 実装前

- [ ] Issue が `docs/01_issues/open/` に記録されているか
- [ ] Research が `docs/02_research/` に記録されているか
- [ ] Plan が `docs/03_plans/` に記録されているか
- [ ] Spec + Test Cases が `.spec.md` に定義されているか

### 実装中

- [ ] すべてのテストが FAIL 状態から開始しているか
- [ ] spec.md の TC-\* に従ってテストを実装しているか
- [ ] テストをパスさせるために本体を実装しているか
- [ ] 予期しない問題が発見されたら `docs/issues/open/` に記録しているか

### 実装後

- [ ] すべてのテストが PASS しているか
- [ ] 作業ログが `docs/05_logs/` に記録されているか
- [ ] 実装内容が設計書と一致しているか
- [ ] ドキュメント間のリンクが正しいか

---

## 📌 重要なポイント

### 🚀 テスト駆動開発の実践

```
spec.md の「Test Cases」が最初の真実
  ↓
test.tsx が spec.md に厳密に従う
  ↓
implementation.tsx がテストをパスさせる
```

### 🎯 AI への効果的な指示

- Prompt では「何を実装するか」を明確に
- 参照ドキュメント（Issue → Research → Plan → Spec）を提供
- 制約条件（言語、テスト、エラーハンドリング）を明記
- 期待される出力形式を指定

### 📚 ドキュメント間の関連付け

```
Issue (問題定義)
  ↓ リンク
Research (技術調査)
  ↓ リンク
Plan (実装計画)
  ↓ リンク
Spec (仕様定義)
  ↓ リンク
Test / Implementation
  ↓ リンク
Log (作業記録)
```

---

## 🔗 関連ドキュメント

- [命名規則](./naming-conventions.md) - `.spec.md` ファイルの位置付け
- [`.spec.md` テンプレート](./spec-template.md) - テンプレート詳細
- [ドキュメント管理ガイド](./documentation-management.md) - ドキュメント構造
- [問題報告ガイド](./issue-reporting.md) - Issue の作成方法

---

**最終更新**: 2025-10-22
**作成者**: AI (Grok Code Fast 1)
