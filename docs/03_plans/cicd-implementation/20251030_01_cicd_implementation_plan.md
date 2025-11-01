# CI/CD改善実装計画

**対象:** 開発チーム
**最終更新:** 2025-10-30

---

## 概要

GitHub ActionsベースのCI/CDパイプラインを段階的に構築し、開発効率とコード品質を向上させます。

## 実装スコープ

### Phase 1: 基礎CI/CD（優先度: 🔴 最高）

**期間**: 1週間（2025-10-30 - 2025-11-06）
**目標**: 基本的なCI/CDパイプラインの構築

#### タスク一覧

- [ ] **Task 1.1**: Code Quality Checkワークフロー作成
  - ファイル: `.github/workflows/code-quality.yml`
  - 内容: Biomeによるlint/format自動チェック
  - トリガー: PR作成時、main/developへのpush
  - 所要時間: 2時間

- [ ] **Task 1.2**: Testワークフロー作成
  - ファイル: `.github/workflows/test.yml`
  - 内容: Vitestによる自動テスト実行
  - カバレッジレポート生成
  - トリガー: PR作成時、main/developへのpush
  - 所要時間: 3時間

- [ ] **Task 1.3**: Build Checkワークフロー作成
  - ファイル: `.github/workflows/build.yml`
  - 内容: Next.jsビルドの成功確認
  - 環境変数の設定
  - トリガー: PR作成時
  - 所要時間: 2時間

- [ ] **Task 1.4**: GitHub Secrets設定
  - 必要な環境変数をSecretsに登録
  - Supabase関連の環境変数
  - 所要時間: 1時間

- [ ] **Task 1.5**: PRテンプレート更新
  - CI結果確認チェックリストの追加
  - ワークフロー実行確認項目の追加
  - 所要時間: 1時間

**Phase 1 完了条件**:
- ✅ すべてのPRで自動的にlint/format/testが実行される
- ✅ ビルドエラーがPRマージ前に検出される
- ✅ テストカバレッジが可視化される

---

### Phase 2: セキュリティ強化（優先度: 🟡 高）

**期間**: 1週間（2025-11-07 - 2025-11-13）
**目標**: セキュリティとメンテナンス性の向上

#### タスク一覧

- [ ] **Task 2.1**: Security Checkワークフロー作成
  - ファイル: `.github/workflows/security.yml`
  - 内容: 依存関係の脆弱性スキャン
  - トリガー: 毎週月曜日、package.json変更時
  - 所要時間: 2時間

- [ ] **Task 2.2**: Dependabot設定
  - ファイル: `.github/dependabot.yml`
  - 内容: 依存関係の自動更新設定
  - レビュワー設定
  - 所要時間: 1時間

- [ ] **Task 2.3**: CodeQL分析設定（オプション）
  - ファイル: `.github/workflows/codeql.yml`
  - 内容: コードセキュリティ分析
  - 所要時間: 2時間

- [ ] **Task 2.4**: SECURITY.md更新
  - セキュリティポリシーの明記
  - 脆弱性報告手順の記載
  - 所要時間: 1時間

**Phase 2 完了条件**:
- ✅ 依存関係の脆弱性が自動検出される
- ✅ 依存関係の更新PRが自動作成される
- ✅ セキュリティポリシーが明確化される

---

### Phase 3: デプロイ自動化（優先度: 🟡 高）

**期間**: 1週間（2025-11-14 - 2025-11-20）
**目標**: デプロイプロセスの完全自動化

#### タスク一覧

- [ ] **Task 3.1**: Vercel連携設定
  - VercelプロジェクトとGitHubリポジトリの連携
  - 環境変数の設定（Production/Preview）
  - 所要時間: 2時間

- [ ] **Task 3.2**: ブランチ戦略の確立
  - main → Production環境
  - develop → Staging環境
  - feature/* → Preview環境
  - ドキュメント化
  - 所要時間: 2時間

- [ ] **Task 3.3**: デプロイ後の自動テスト
  - ファイル: `.github/workflows/post-deploy.yml`
  - 内容: デプロイ後のヘルスチェック
  - トリガー: デプロイ完了時
  - 所要時間: 3時間

- [ ] **Task 3.4**: ロールバック手順のドキュメント化
  - 緊急時のロールバック手順
  - 責任者の明確化
  - 所要時間: 1時間

**Phase 3 完了条件**:
- ✅ すべてのブランチで自動デプロイが機能する
- ✅ PRごとにプレビュー環境が自動作成される
- ✅ デプロイ後の自動検証が実行される

---

### Phase 4: 高度な監視（優先度: 🟢 中）

**期間**: 2週間（2025-11-21 - 2025-12-04）
**目標**: 包括的な品質・パフォーマンス監視

#### タスク一覧

- [ ] **Task 4.1**: 依存関係グラフ可視化
  - ファイル: `.github/workflows/dependency-viz.yml`
  - ツール: Madge
  - 内容: 循環依存の自動検出
  - トリガー: main pushまたは週次
  - 所要時間: 3時間

- [ ] **Task 4.2**: E2Eテスト環境構築
  - Playwrightのセットアップ
  - 主要フローのE2Eテスト作成
  - ファイル: `.github/workflows/e2e.yml`
  - 所要時間: 8時間

- [ ] **Task 4.3**: Lighthouse CI設定
  - ファイル: `.github/workflows/lighthouse.yml`
  - 内容: パフォーマンス/アクセシビリティ監視
  - トリガー: main PR時
  - 所要時間: 3時間

- [ ] **Task 4.4**: Bundle Size分析
  - ファイル: `.github/workflows/bundle-analysis.yml`
  - 内容: バンドルサイズの監視とPRへのコメント
  - トリガー: PR作成時
  - 所要時間: 3時間

**Phase 4 完了条件**:
- ✅ 循環依存が自動検出される
- ✅ 主要フローのE2Eテストが実行される
- ✅ パフォーマンススコアが監視される
- ✅ バンドルサイズの変化が可視化される

---

## 詳細実装内容

### Task 1.1: Code Quality Checkワークフロー

#### ファイル構成

```
.github/
└── workflows/
    └── code-quality.yml
```

#### ワークフロー内容

```yaml
name: Code Quality Check

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  lint-and-format:
    name: Lint and Format Check
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run Biome Check
        run: bun run lint

      - name: Comment PR (on failure)
        if: failure() && github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '❌ Code quality check failed. Please run `bun run lint` locally and fix the issues.'
            })
```

#### テスト手順

1. ブランチ作成: `git checkout -b test/code-quality-workflow`
2. 意図的にlintエラーを作成
3. PR作成
4. ワークフローが実行され、失敗することを確認
5. エラー修正後、ワークフローが成功することを確認

---

### Task 1.2: Testワークフロー

#### ワークフロー内容

```yaml
name: Test

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run tests
        run: bun run test

      - name: Generate coverage report
        run: bun run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
          name: codecov-umbrella
          fail_ci_if_error: false

      - name: Comment coverage on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const coverage = JSON.parse(fs.readFileSync('./coverage/coverage-summary.json', 'utf8'));
            const { lines, statements, functions, branches } = coverage.total;
            
            const body = `## 📊 Test Coverage Report
            
            | Metric | Coverage | Target |
            |--------|----------|--------|
            | Lines | ${lines.pct}% | 80% |
            | Statements | ${statements.pct}% | 80% |
            | Functions | ${functions.pct}% | 80% |
            | Branches | ${branches.pct}% | 75% |
            `;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body
            })
```

---

### Task 1.3: Build Checkワークフロー

#### ワークフロー内容

```yaml
name: Build Check

on:
  pull_request:
    branches: [main, develop]

jobs:
  build:
    name: Production Build
    runs-on: ubuntu-latest
    
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Build Next.js app
        run: bun run build

      - name: Check build output
        run: |
          if [ ! -d ".next" ]; then
            echo "Build output not found"
            exit 1
          fi

      - name: Comment PR (on success)
        if: success() && github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Production build completed successfully!'
            })
```

---

## 環境変数管理

### 必要なGitHub Secrets

| Secret名 | 説明 | 設定場所 |
|---------|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL | Settings > Secrets > Actions |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー | Settings > Secrets > Actions |
| `CODECOV_TOKEN` | Codecov アップロードトークン（オプション） | Settings > Secrets > Actions |

### 設定手順

1. GitHubリポジトリページを開く
2. **Settings** > **Secrets and variables** > **Actions** に移動
3. **New repository secret** をクリック
4. Name と Value を入力して保存

---

## PRテンプレート更新

### 更新内容

`.github/pull_request_template.md` に以下のセクションを追加:

```markdown
## CI/CD チェック

- [ ] ✅ Code Quality Check: Passed
- [ ] ✅ Tests: Passed (Coverage ≥ 80%)
- [ ] ✅ Build: Passed
- [ ] ✅ No security vulnerabilities detected

## デプロイ確認（Phase 3以降）

- [ ] Preview環境で動作確認済み
- [ ] パフォーマンス劣化なし
```

---

## リスク管理

### リスク1: CI実行時間の増加

**影響度**: 中
**確率**: 高

**対策**:
- Bunのキャッシュ機能を活用
- 並列ジョブ実行
- 不要な依存関係の削減

**監視指標**:
- ワークフロー実行時間（目標: 5分以内）

---

### リスク2: GitHub Actions無料枠の超過

**影響度**: 低（Public repoの場合は無制限）
**確率**: 低

**対策**:
- Private repoの場合、月間使用時間を監視
- 不要なワークフローの削減

---

### リスク3: False Positiveによる開発ブロック

**影響度**: 中
**確率**: 中

**対策**:
- 初期段階はwarning扱い
- ルールの継続的な見直し
- チームフィードバックの収集

---

## 成功指標（KPI）

### Phase 1完了時

- ✅ **CI実行率**: 100%（全PR）
- ✅ **平均実行時間**: < 5分
- ✅ **テストカバレッジ**: ≥ 80%
- ✅ **ビルド成功率**: ≥ 95%

### Phase 2完了時

- ✅ **脆弱性検出件数**: 0件
- ✅ **Dependabot PR対応率**: ≥ 80%

### Phase 3完了時

- ✅ **デプロイ成功率**: ≥ 99%
- ✅ **平均デプロイ時間**: < 3分
- ✅ **ロールバック実施回数**: 0回

### Phase 4完了時

- ✅ **循環依存件数**: 0件
- ✅ **Lighthouse スコア**: ≥ 90
- ✅ **バンドルサイズ**: < 500KB（gzip）

---

## チェックリスト

### Phase 1実装前

- [ ] チームメンバーへの説明・合意
- [ ] GitHub Secretsの準備
- [ ] テスト用ブランチの作成

### Phase 1実装後

- [ ] すべてのワークフローが正常動作
- [ ] ドキュメント更新
- [ ] チームへの使用方法共有

### Phase 2-4実装前

- [ ] 前フェーズの完了確認
- [ ] リソース確保
- [ ] 優先順位の再確認

---

## 関連ドキュメント

- [CI/CD改善提案調査](../../02_research/2025_10/20251030_cicd_improvement_research.md)
- [コード品質基準](../../rules/code-quality-standards.md)
- [GitHub Actionsベストプラクティス](https://docs.github.com/en/actions/learn-github-actions/usage-limits-billing-and-administration)

---

## 次のアクション

1. **即座に実施**: Phase 1のTask 1.1開始
2. **今週中**: Phase 1完了
3. **来週**: Phase 2開始

---

**最終更新:** 2025-10-30
**作成者:** AI Assistant
**レビュワー:** (TBD)
