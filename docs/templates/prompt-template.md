# プロンプトテンプレート - [タスク名]

**作成日**: YYYY年MM月DD日
**対象AI**: [Grok Code Fast / Claude / GPT-4 など]
**対象フェーズ**: [Issue / Research / Plan / Implementation など]

---

## プロジェクトコンテキスト

### プロジェクト概要

[このプロジェクトの概要を簡潔に説明]

- **プロジェクト名**: Lichtblick
- **技術スタック**: React, TypeScript, [その他の主要技術]
- **現在のフェーズ**: [開発フェーズの説明]

### 関連する既存機能

[このタスクに関連する既存機能・コンポーネント]

- 機能1: [説明]
- 機能2: [説明]

---

## タスクの背景

### なぜこのタスクが必要か

[タスクの背景・目的を説明]

### 解決したい課題

- [ ] 課題1
- [ ] 課題2
- [ ] 課題3

### 期待される成果

[このタスクが完了したときの成果物・状態]

---

## タスクの詳細

### 実施内容

1. **ステップ1**: [具体的な作業内容]

   - 詳細1
   - 詳細2

2. **ステップ2**: [具体的な作業内容]

   - 詳細1
   - 詳細2

3. **ステップ3**: [具体的な作業内容]
   - 詳細1
   - 詳細2

### 対象ファイル

**修正するファイル**:

- `path/to/file1.tsx` - 修正内容の説明
- `path/to/file2.ts` - 修正内容の説明

**新規作成するファイル**:

- `path/to/newfile1.tsx` - ファイルの説明
- `path/to/newfile2.spec.md` - ファイルの説明

**参照するファイル**:

- `path/to/reference1.tsx` - 参照目的
- `path/to/reference2.ts` - 参照目的

---

## 遵守すべきルール

### コーディング規則

- [ ] コメントは英語で記述
- [ ] 関数名・変数名は英語のキャメルケース
- [ ] エラーハンドリングを必ず実装
- [ ] TypeScript strict モードに準拠
- [ ] テストカバレッジ ≥ 80%

詳細: [`docs/rules/code-quality-standards.md`](../rules/code-quality-standards.md)

### ドキュメント規則

- [ ] `.spec.md` に仕様を定義
- [ ] テストケースを TC-001 から採番
- [ ] DEPENDENCY MAP を記載
- [ ] 作業ログを記録

詳細: [`docs/rules/ai-documentation.md`](../rules/ai-documentation.md)

### 依存関係の明示

- [ ] ファイル先頭に DEPENDENCY MAP コメント
- [ ] Parents（使用先）を記載
- [ ] Dependencies（依存先）を記載
- [ ] Related Files を記載

詳細: [`docs/rules/dependency-mapping.md`](../rules/dependency-mapping.md)

---

## 参照ドキュメント

### 仕様・計画

- **Issue**: `docs/01_issues/open/YYYY_MM/YYYYMMDD_01_[issue-name].md`
- **Research**: `docs/02_research/YYYY_MM/YYYYMMDD_01_[research-name].md`
- **Plan**: `docs/03_plans/[feature-name]/YYYYMMDD_01_[plan-name].md`
- **Spec**: `src/[path]/[FileName].spec.md`

### ルール・ガイド

- [AI ドキュメント駆動開発](../rules/ai-documentation.md)
- [命名規則](../rules/naming-conventions.md)
- [コード品質基準](../rules/code-quality-standards.md)
- [言語規則](../rules/language-rules.md)
- [依存関係追跡](../rules/dependency-mapping.md)

---

## 期待される出力形式

### 1. ファイル実装

```typescript
/**
 * [Component/Function Name]
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ [parent1]
 *   └─ [parent2]
 *
 * Dependencies (依存先):
 *   ├─ [dep1]
 *   └─ [dep2]
 *
 * Related Documentation:
 *   ├─ Spec: ./[FileName].spec.md
 *   ├─ Tests: ./[FileName].test.tsx
 *   └─ Plan: docs/03_plans/[feature]/plan.md
 */

// 実装コード
```

### 2. 仕様書（.spec.md）

```markdown
# [FileName].spec.md

## Requirements

- REQ-001: [要件1]
- REQ-002: [要件2]

## Test Cases

### TC-001: [テストケース1]

- Input: [入力]
- Expected: [期待される出力]
- Actual: [実際の出力]

### TC-002: [テストケース2]

- Input: [入力]
- Expected: [期待される出力]
```

### 3. テストコード

```typescript
describe("[Component/Function Name]", () => {
  test("TC-001: [テストケース1]", () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### 4. 作業ログ

完了後、以下のログを記録：

```markdown
# YYYYMMDD*01*[task-name]

## 実施した作業

- [x] [作業1]
- [x] [作業2]

## 変更ファイル

- `path/to/file1.tsx` (修正)
- `path/to/file2.spec.md` (新規)

## テスト結果

✅ TC-001: [テスト名]
✅ TC-002: [テスト名]

## 気づき・学び

- [気づき1]
- [気づき2]

## 次回の作業

- [ ] [次のタスク1]
- [ ] [次のタスク2]
```

---

## 制約・注意事項

### 技術的制約

- [ ] [制約1]
- [ ] [制約2]

### スケジュール

- **開始予定**: YYYY年MM月DD日
- **完了予定**: YYYY年MM月DD日
- **優先度**: High / Medium / Low

### リスク

| リスク    | 影響度 | 対策   |
| --------- | ------ | ------ |
| [リスク1] | High   | [対策] |
| [リスク2] | Medium | [対策] |

---

## チェックリスト

### 実装前

- [ ] Issue を作成
- [ ] Research を実施（必要に応じて）
- [ ] Plan を作成
- [ ] `.spec.md` を作成

### 実装中

- [ ] DEPENDENCY MAP を記載
- [ ] テストを先に実装（TDD）
- [ ] すべてのテストが PASS
- [ ] ESLint エラーなし
- [ ] TypeScript strict モードでエラーなし

### 実装後

- [ ] 作業ログを記録
- [ ] ドキュメントを更新
- [ ] Issue を resolved に移動
- [ ] コミットメッセージが Conventional Commits 形式

---

## 補足情報

[その他、AIに伝えたい情報や参考資料]

---

**テンプレート作成日**: 2025-10-22
**最終更新**: 2025-10-22
