# コーディング規則ガイド

このディレクトリには、プロジェクト全体で遵守すべきコーディング規則、命名規則、ドキュメント規則が集約されています。

## 📋 ガイド一覧

### 1. [AI ドキュメント駆動開発ガイド](./ai-documentation.md)

**対象:** AI（Grok Code Fast 等）+ 開発者
**内容:**

- AI が参照するドキュメント体系（5種類）
- フェーズごとの実装フロー
- ドキュメント駆動 + テスト駆動開発の実践

### 2. [命名規則](./naming-conventions.md)

**対象:** 全開発者
**内容:**

- ファイル・ディレクトリの命名規則
- 変数・関数・クラスの命名規則
- マークダウンドキュメントの命名規則
- `.spec.md` ファイルの位置付け

### 3. [`.spec.md` 仕様書テンプレート](./spec-template.md)

**対象:** AI + 開発者
**内容:**

- 仕様書の標準テンプレート
- 要件定義セクション
- テストケース定義セクション
- 実装ノートセクション

### 4. [コード品質基準](./code-quality-standards.md)

**対象:** 全開発者
**内容:**

- エラーハンドリング方針
- テストカバレッジ要件
- パフォーマンス指標
- セキュリティガイドライン

### 5. [言語規則](./language-rules.md)

**対象:** 全開発者
**内容:**

- コード内コメント（英語）
- ドキュメント（日本語）
- 関数名・変数名（英語）
- コミットメッセージ（英語）
- エラーメッセージ（用途別）

### 6. [コンポーネント・ロジック依存関係追跡ガイド](./dependency-mapping.md)

**対象:** 全開発者
**内容:**

- ファイル先頭の DEPENDENCY MAP コメント
- `.dependency.md` 詳細ファイル
- 親子関係の可視化
- 修正時の影響範囲判定

### 6.5 [依存関係ダイアグラム自動生成ツール](./dependency-visualization-tools.md)

**対象:** 全開発者・DevOps
**内容:**

- Madge による自動可視化
- Dependency Cruiser の詳細ルール検証
- depcheck で未使用パッケージ検出
- CI パイプライン統合

### 6.6 [ツール実装ガイド](./dependency-visualization-implementation.md)

**対象:** 開発チーム・DevOps
**内容:**

- Madge の具体的セットアップ手順
- npm scripts の定義
- GitHub Actions 設定例
- 実行結果の解釈ガイド

### 7. [ドキュメント管理ガイド](./documentation-management.md)

**対象:** 全開発者
**内容:**

- ドキュメント構造の詳細
- ファイル作成・更新フロー
- ドキュメント間の関連付け
- アーカイブ管理

### 8. [問題報告ガイド](./issue-reporting.md)

**対象:** 全開発者
**内容:**

- 問題の分類と重要度
- 問題レポートのテンプレート
- 報告フロー
- 解決までのワークフロー

### 9. [Git・コミット規則](./git-conventions.md)

**対象:** 全開発者
**内容:**

- Conventional Commits 形式
- ブランチ命名規則
- コミットメッセージの例
- PR テンプレート

---

## 🎯 クイックスタート

### 新機能を実装する場合

1. **Prompt** → 要件・背景を明確にする

   - 参照: [AI ドキュメント駆動開発ガイド](./ai-documentation.md)

2. **Issue** → 問題・要件を記録

   - テンプレート: [問題報告ガイド](./issue-reporting.md)

3. **Research** → 技術調査

   - 場所: `docs/02_research/YYYY_MM/`

4. **Plan** → 実装計画を作成

   - 場所: `docs/03_plans/{機能名}/`

5. **Spec** → 仕様書 + テストケースを定義

   - ファイル: `src/components/{Component}/{Component}.spec.md`
   - テンプレート: [`.spec.md` 仕様書テンプレート](./spec-template.md)

6. **Test** → テストコードを実装

   - ファイル: `src/components/{Component}/{Component}.test.tsx`
   - spec.md の TC-\* に従う

7. **Implementation** → 本体を実装

   - ファイル: `src/components/{Component}/{Component}.tsx`
   - テストをすべてパスさせる

8. **Log** → 作業ログを記録
   - 場所: `docs/05_logs/YYYY_MM/YYYYMMDD/`

### 既存コードの問題を発見した場合

1. 問題を記録: `docs/01_issues/open/YYYY_MM/YYYYMMDD/`

   - テンプレート: [問題報告ガイド](./issue-reporting.md)

2. 問題ファイルから設計書・実装計画へリンク

3. 対応完了後、`docs/01_issues/resolved/` へ移動

---

## 🔍 ルール検索

| 対象                   | ガイド                                              | セクション         |
| ---------------------- | --------------------------------------------------- | ------------------ |
| 関数名を命名したい     | [命名規則](./naming-conventions.md)                 | 関数・メソッド名   |
| テストケースを書きたい | [`.spec.md` テンプレート](./spec-template.md)       | Test Cases         |
| ドキュメント作成方法   | [ドキュメント管理](./documentation-management.md)   | 新規作成フロー     |
| コメントを書きたい     | [言語規則](./language-rules.md)                     | コード内コメント   |
| バグを報告したい       | [問題報告ガイド](./issue-reporting.md)              | 報告フロー         |
| コミットしたい         | [Git 規則](./git-conventions.md)                    | コミットメッセージ |
| エラーハンドリング     | [コード品質基準](./code-quality-standards.md)       | エラーハンドリング |
| 依存関係を確認したい   | [依存関係追跡](./dependency-mapping.md)             | DEPENDENCY MAP     |
| グラフを自動生成したい | [自動化ツール](./dependency-visualization-tools.md) | Madge, Cruiser等   |

---

## 📌 重要な原則

### ✅ ドキュメント駆動開発

- すべてのコンポーネント・ロジックに対応する `.spec.md` が存在
- 実装前に仕様とテストケースが明確

### ✅ テスト駆動開発

- spec.md の Test Cases セクションを基に test.tsx を実装
- すべてのテストがパスしてから本体実装

### ✅ 問題の即座の報告

- 発見したバグ・改善点は即座に docs/issues/open/ に記録
- 小さな問題も放置しない（Broken Windows 理論）

### ✅ 言語の使い分け

- **コード・コメント・関数名:** 英語
- **ドキュメント:** 日本語
- **コミット:** 英語

### ✅ AI との連携効率化

- Prompt にはプロジェクトコンテキストを含める
- AI は spec.md → test.tsx → implementation.tsx の順で進める

---

## 📖 関連ドキュメント

- **プロジェクト全体ガイド**: `docs/README.md`
- **技術スタック**: `docs/03_design/architecture/technology-stack.md`
- **既存のコーディング規約**: `.github/copilot-instructions.md`
- **Madge ツール**: https://github.com/pahen/madge
- **Dependency Cruiser**: https://github.com/sverweij/dependency-cruiser

---

## ✏️ ルール更新履歴

| 日付       | 変更内容                         | 参照                                            |
| ---------- | -------------------------------- | ----------------------------------------------- |
| 2025-10-22 | ルールディレクトリ初版作成       | docs/05_logs/2025_10/20251022_01_rules-setup.md |
| 2025-10-22 | 自動化ツール解説ドキュメント追加 | docs/05_logs/2025_10/20251022_02_tools-guide.md |

---

**最終更新**: 2025-10-22
