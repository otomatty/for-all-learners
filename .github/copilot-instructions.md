# AI 駆動開発 共通ガイドライン

詳細なコーディング規則については、以下を参照してください：

> **参照**: [`docs/rules/`](../docs/rules/README.md) - 開発規則の詳細

このガイドでは、プロジェクト全体で共有される開発原則と、ドキュメント駆動開発のワークフローを説明します。

## 開発の基本原則

詳しくは [`docs/rules/code-quality-standards.md`](../docs/rules/code-quality-standards.md) を参照してください。

### コード品質と保守性

- 動くコードを書くだけでなく、品質・保守性・安全性を常に意識する
- プロジェクトの段階（プロトタイプ、MVP、本番環境）に応じて適切なバランスを取る
- 問題を見つけたら放置せず、必ず対処または明示的に記録する
- ボーイスカウトルール: コードを見つけた時よりも良い状態で残す

### 言語規則

詳しくは [`docs/rules/language-rules.md`](../docs/rules/language-rules.md) を参照してください。

- **コード内のコメント**: 英語で記述
- **ドキュメントファイル**: 日本語で記述
- **コミットメッセージ**: 英語で記述（コンベンショナルコミット形式）
- **関数・変数名**: 英語で記述
- **エラーメッセージ**: ユーザー向けは日本語、ログやデバッグ用は英語

## ドキュメント駆動開発

### 概要

詳しくは [`docs/rules/ai-documentation.md`](../docs/rules/ai-documentation.md) を参照してください。

このプロジェクトでは、以下の5種類のドキュメントを中心とした**ドキュメント駆動開発** + **テスト駆動開発**を実践します。

#### ドキュメント5種類

1. **Prompt（プロンプト）**: `docs/00_prompts/` - AI・開発者への指示書
2. **Issue（問題・要件）**: `docs/01_issues/open/YYYY_MM/` - 問題・要件定義
3. **Research（技術調査）**: `docs/02_research/YYYY_MM/` - 技術選定・調査結果
4. **Plan（実装計画）**: `docs/03_plans/{機能名}/` - 段階的な実装計画
5. **Test（仕様書）**: `src/{path}/{FileName}.spec.md` - 仕様定義＋テストケース定義
6. **Log（作業ログ）**: `docs/05_logs/YYYY_MM/YYYYMMDD/` - 作業記録

### 実装フロー

```
PROMPT → ISSUE → RESEARCH → PLAN → SPEC+TEST → IMPLEMENTATION → LOG
```

詳細なワークフローについては、[`docs/rules/ai-documentation.md` の実装フロー](../docs/rules/ai-documentation.md)を参照してください。

### ドキュメント構造

プロジェクトのドキュメントは `docs/` 配下にソフトウェア開発ライフサイクルに沿って整理されています。

詳しくは [`docs/README.md`](../docs/README.md) を参照してください。

## ファイルとドキュメントの同期

### 重要な原則

**ファイルを修正したら、必ず関連ドキュメントも更新してください。**

この原則により、コードとドキュメントの整合性を保ち、軽量なAIモデルでも正確な情報を参照できるようにします。

### 更新が必要なドキュメント

#### 1. コンポーネント・ロジックファイルを修正した場合

```
修正ファイル: src/components/Button/Button.tsx
↓ 必ず更新
関連ドキュメント:
  - src/components/Button/Button.spec.md（仕様書）
  - src/components/Button/Button.test.tsx（テストケース）
  - docs/03_plans/button-component/（実装計画）
```

**更新手順:**
1. `.spec.md` の「Requirements」セクションを更新
2. `.spec.md` の「Test Cases」に新規テストケースを追加
3. `.test.tsx` に対応するテストを追加
4. 実装計画の進捗状況を更新

#### 2. 新機能を追加した場合

```
新規ファイル: src/features/NewFeature/NewFeature.tsx
↓ 必ず作成
関連ドキュメント:
  - src/features/NewFeature/NewFeature.spec.md（新規作成）
  - docs/01_issues/open/YYYY_MM/YYYYMMDD_01_new-feature.md
  - docs/03_plans/new-feature/（新規作成）
  - docs/05_logs/YYYY_MM/YYYYMMDD/01_new-feature-implementation.md
```

#### 3. バグ修正した場合

```
修正ファイル: src/utils/helper.ts
↓ 必ず更新
関連ドキュメント:
  - src/utils/helper.spec.md（バグを再現するテストケース追加）
  - docs/01_issues/open/ → docs/01_issues/resolved/ へ移動
  - docs/05_logs/YYYY_MM/YYYYMMDD/XX_bugfix-helper.md
```

### ファイル間の関連付け方法

#### 方法1: コメントで明示（推奨）

実装ファイルの先頭に関連ドキュメントを記載：

```typescript
/**
 * Button Component
 *
 * Related Documentation:
 * - Spec: src/components/Button/Button.spec.md
 * - Test: src/components/Button/Button.test.tsx
 * - Plan: docs/03_plans/button-component/20251022_01_implementation-plan.md
 * - Issue: docs/01_issues/resolved/2025_10/20251022_01_button-component.md
 */
export const Button: React.FC<ButtonProps> = (props) => {
  // ...
};
```

#### 方法2: .spec.md に記載

仕様書に実装ファイルへのリンクを記載：

```markdown
# Button.spec.md

## Related Files

- Implementation: `src/components/Button/Button.tsx`
- Tests: `src/components/Button/Button.test.tsx`
- Styles: `src/components/Button/Button.module.css`

## Related Documentation

- Issue: `docs/01_issues/resolved/2025_10/20251022_01_button-component.md`
- Plan: `docs/03_plans/button-component/20251022_01_implementation-plan.md`
```

### 依存関係の明示

#### ファイル先頭に DEPENDENCY MAP を記載

すべてのコンポーネント・ロジックファイルの先頭に、依存関係マップを記載してください：

```typescript
/**
 * Button Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (このファイルを使用している場所):
 *   ├─ src/components/Form/SubmitButton.tsx
 *   ├─ src/components/Modal/ConfirmDialog.tsx
 *   └─ src/pages/Dashboard.tsx
 *
 * Dependencies (このファイルが使用している外部ファイル):
 *   ├─ src/hooks/useClickHandler.ts
 *   ├─ src/utils/classNameBuilder.ts
 *   └─ ./Button.module.css
 *
 * Related Documentation:
 *   ├─ Spec: ./Button.spec.md
 *   ├─ Tests: ./Button.test.tsx
 *   └─ Plan: docs/03_plans/button-component/20251022_01_implementation-plan.md
 */
```

**なぜ必要か:**
- 修正時の影響範囲が即座に判定できる
- リファクタリングのリスク評価が容易
- 軽量AIモデルでも依存関係を理解できる
- デッドコード検出が簡単

**詳細は**: [`docs/rules/dependency-mapping.md`](../docs/rules/dependency-mapping.md) を参照

### 更新チェックリスト

ファイルを修正した際は、以下を必ず確認してください：

- [ ] `.spec.md` の「Requirements」は最新か？
- [ ] `.spec.md` の「Test Cases」に新しいケースを追加したか？
- [ ] `.test.tsx` は `.spec.md` と一致しているか？
- [ ] **DEPENDENCY MAP が最新か？（Parents / Dependencies）**
- [ ] **親ファイル（Parents）の DEPENDENCY MAP も更新したか？**
- [ ] 実装計画の進捗状況を更新したか？
- [ ] 作業ログを記録したか？
- [ ] Issue の状態を更新したか？（open → resolved など）

### AIモデルへの指示例

軽量なモデルでも理解しやすいように、明確な指示を心がけてください：

```
【タスク】Button コンポーネントに size プロパティを追加

【更新するファイル】
1. src/components/Button/Button.tsx
   - size プロパティ実装
   - DEPENDENCY MAP の確認（変更があれば更新）

2. src/components/Button/Button.spec.md
   - Requirements セクションに size 要件追加
   - Test Cases に TC-006 追加

3. src/components/Button/Button.test.tsx
   - TC-006 として size テスト追加

4. 親コンポーネントの確認
   - Button を使用している全ての親コンポーネント（Parents）を確認
   - 必要に応じて親コンポーネントの DEPENDENCY MAP も更新

【参照ドキュメント】
- 仕様書: src/components/Button/Button.spec.md
- 実装計画: docs/03_plans/button-component/20251022_01_implementation-plan.md
- 依存関係: src/components/Button/Button.tsx の DEPENDENCY MAP コメント

【依存関係チェック】
- Parents（このファイルを使用）: SubmitButton, ConfirmDialog, Dashboard
- Dependencies（このファイルが使用）: useClickHandler, classNameBuilder
```

この構造により、AIモデルは以下を理解できます：
- どのファイルを修正すべきか
- どのドキュメントを参照すべきか
- どのドキュメントを更新すべきか
- **どのファイルが影響を受けるか（依存関係）**
- **どのファイルの DEPENDENCY MAP を更新すべきか**
```
