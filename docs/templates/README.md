# ドキュメントテンプレート集

このディレクトリには、プロジェクトで使用する各種ドキュメントのテンプレートが格納されています。

**最終更新日**: 2025年10月22日

---

## 📋 テンプレート一覧

### 1. Prompt テンプレート

- **ファイル**: [`prompt-template.md`](./prompt-template.md)
- **用途**: AI・開発者への指示書作成
- **配置先**: `docs/00_prompts/`
- **使用タイミング**: 全フェーズで使用

**主要セクション**:

- プロジェクトコンテキスト
- タスクの詳細
- 遵守すべきルール
- 参照ドキュメント
- 期待される出力形式

---

### 2. Issue テンプレート

- **ファイル**: [`issue-template.md`](./issue-template.md)
- **用途**: 問題・要件の記録
- **配置先**: `docs/01_issues/open/YYYY_MM/`
- **使用タイミング**: 実装開始前、問題発見時

**主要セクション**:

- 基本情報（発見日、重要度）
- 発見場所（ファイルパス、行番号）
- 問題の詳細
- 提案する解決策
- 影響範囲

---

### 3. Research テンプレート

- **ファイル**: [`research-template.md`](./research-template.md)
- **用途**: 技術調査・リサーチレポート作成
- **配置先**: `docs/02_research/YYYY_MM/`
- **使用タイミング**: 技術選定、ベストプラクティス確認時

**主要セクション**:

- 調査概要
- 調査の背景
- 調査方法
- 調査結果
- 比較・評価
- 推奨事項
- 参考資料

---

### 4. Plan テンプレート

- **ファイル**: [`plan-template.md`](./plan-template.md)
- **用途**: 実装計画書作成
- **配置先**: `docs/03_plans/{機能名}/`
- **使用タイミング**: 実装前の設計時

**主要セクション**:

- 計画概要
- 背景
- フェーズ分割
- 技術選定
- 依存関係
- リスクと対策
- テスト戦略
- マイルストーン

---

### 5. Spec テンプレート

- **ファイル**: [`spec-template.md`](./spec-template.md)
- **用途**: 仕様書＋テストケース定義
- **配置先**: `src/{path}/{FileName}.spec.md`
- **使用タイミング**: テスト駆動開発（TDD）開始時

**主要セクション**:

- Requirements（要件定義）
- Test Cases（テストケース TC-001～）
- Implementation Notes（実装ノート）
- Related Files（関連ファイル）

---

### 6. Log テンプレート

- **ファイル**: [`log-template.md`](./log-template.md)
- **用途**: 作業ログ記録
- **配置先**: `docs/05_logs/YYYY_MM/YYYYMMDD/`
- **使用タイミング**: 作業完了後

**主要セクション**:

- 作業概要
- 作業内容
- 変更ファイル
- テスト結果
- 気づき・学び
- 次回の作業

---

## 🎯 使用方法

### 1. テンプレートをコピー

```bash
# Issue テンプレートをコピー
cp docs/templates/issue-template.md docs/01_issues/open/2025_10/20251022_01_my-issue.md

# Plan テンプレートをコピー
cp docs/templates/plan-template.md docs/03_plans/my-feature/20251022_01_implementation-plan.md

# Spec テンプレートをコピー
cp docs/templates/spec-template.md src/components/MyComponent/MyComponent.spec.md
```

### 2. テンプレート内の [項目] を埋める

テンプレート内の以下の項目を実際の内容に置き換えてください：

- `[機能名]` → 実際の機能名
- `[担当者名]` → 担当者の名前
- `YYYY-MM-DD` → 実際の日付
- `[説明]` → 具体的な説明

### 3. 不要なセクションを削除

プロジェクトやタスクの性質に応じて、不要なセクションは削除してください。

---

## 📝 命名規則

### 日付形式

```
YYYYMMDD_01_feature-name.md
└─┬──┘ └┬┘ └────┬─────┘
  │      │       └─ 機能名・内容（ケバブケース）
  │      └─ 連番（同日に複数ある場合）
  └─ 日付（YYYYMMDD形式）
```

### ファイル名例

**Issue**:

```
docs/01_issues/open/2025_10/20251022_01_button-component.md
docs/01_issues/open/2025_10/20251022_02_navigation-fix.md
```

**Research**:

```
docs/02_research/2025_10/20251022_01_ui-library-research.md
docs/02_research/2025_10/20251023_01_performance-optimization.md
```

**Plan**:

```
docs/03_plans/button-component/20251022_01_implementation-plan.md
docs/03_plans/navigation/20251023_01_redesign-plan.md
```

**Spec**:

```
src/components/Button/Button.spec.md
src/utils/calculateTotal/calculateTotal.spec.md
```

**Log**:

```
docs/05_logs/2025_10/20251022/01_button-implementation.md
docs/05_logs/2025_10/20251022/02_navigation-fix.md
```

---

## 🔗 関連ドキュメント

### ルール・ガイドライン

- [AI ドキュメント駆動開発ガイド](../rules/ai-documentation.md)
- [命名規則](../rules/naming-conventions.md)
- [コード品質基準](../rules/code-quality-standards.md)
- [言語規則](../rules/language-rules.md)
- [依存関係追跡ガイド](../rules/dependency-mapping.md)

### ドキュメント管理

- [ドキュメント構造](../README.md)
- [問題報告ガイド](../rules/issue-reporting.md)
- [Git・コミット規則](../rules/git-conventions.md)

---

## ✅ テンプレート作成時のチェックリスト

新しいテンプレートを作成する際は、以下を確認してください：

- [ ] テンプレート名が明確か
- [ ] 使用目的が明確に記述されているか
- [ ] 配置先ディレクトリが指定されているか
- [ ] 必須セクションが含まれているか
- [ ] 例・サンプルが含まれているか
- [ ] 関連ドキュメントへのリンクがあるか
- [ ] 命名規則が記載されているか
- [ ] このREADMEに追加されているか

---

## 📊 テンプレート使用状況

| テンプレート | 使用頻度   | 重要度   |
| ------------ | ---------- | -------- |
| Prompt       | ⭐⭐⭐⭐⭐ | Critical |
| Issue        | ⭐⭐⭐⭐⭐ | Critical |
| Spec         | ⭐⭐⭐⭐⭐ | Critical |
| Log          | ⭐⭐⭐⭐⭐ | High     |
| Research     | ⭐⭐⭐⭐   | High     |
| Plan         | ⭐⭐⭐⭐   | High     |

---

## 🔄 テンプレートの更新

テンプレートを改善する場合：

1. 変更内容を Issue に記録
2. テンプレートファイルを修正
3. このREADMEも更新
4. 変更履歴を記録
5. 既存ドキュメントへの影響を確認

---

## 変更履歴

| 日付       | 変更内容                      | 担当者 |
| ---------- | ----------------------------- | ------ |
| 2025-10-22 | 初版作成、全テンプレート統合  | AI     |
| 2025-10-22 | Prompt・Plan テンプレート追加 | AI     |

---

**作成日**: 2025-10-22
**最終更新**: 2025-10-22
