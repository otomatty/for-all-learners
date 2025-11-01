# CI/CD改善提案調査

**対象:** 開発チーム
**最終更新:** 2025-10-30

---

## 概要

現在のプロジェクトのCI/CD環境を分析し、改善提案をまとめます。

## 現状分析

### 現在の構成

#### ✅ 実装済み
- **パッケージマネージャー**: Bun
- **フレームワーク**: Next.js 15.4.7
- **テストフレームワーク**: Vitest
- **リンター/フォーマッター**: Biome
- **テストカバレッジ目標**: 
  - Lines: 80%
  - Functions: 80%
  - Branches: 75%
  - Statements: 80%

#### ❌ 未実装
- **GitHub Actions ワークフロー**: なし
- **自動テスト実行**: なし
- **自動デプロイ**: なし
- **依存関係の自動チェック**: なし
- **セキュリティスキャン**: なし

---

## 改善提案

### 優先度1: 基本的なCI/CDパイプライン構築

#### 1.1 コード品質チェック（Lint & Format）

**目的**: コード品質の自動チェック

```yaml
name: Code Quality Check

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run lint
```

**メリット**:
- PRマージ前にコード品質を保証
- チーム全体で統一されたコードスタイル
- レビュワーの負担軽減

---

#### 1.2 自動テスト実行

**目的**: すべてのPRでテストを自動実行

```yaml
name: Test

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run test
      - name: Test Coverage
        run: bun run test:coverage
      - name: Upload Coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
```

**メリット**:
- 自動的にテストが実行される
- カバレッジレポート生成
- リグレッション防止
- 目標カバレッジ(80%)の監視

---

#### 1.3 ビルドチェック

**目的**: プロダクションビルドが成功することを確認

```yaml
name: Build Check

on:
  pull_request:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run build
```

**メリット**:
- デプロイ前にビルドエラーを検出
- 環境変数の問題を早期発見

---

### 優先度2: セキュリティ・依存関係管理

#### 2.1 依存関係の脆弱性チェック

```yaml
name: Security Check

on:
  schedule:
    - cron: '0 0 * * 1'  # 毎週月曜日
  pull_request:
    paths:
      - 'package.json'
      - 'bun.lockb'

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - name: Audit Dependencies
        run: bun audit
```

**メリット**:
- セキュリティ脆弱性の早期発見
- 依存関係の自動監視

---

#### 2.2 Dependabot設定

**ファイル**: `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    reviewers:
      - "otomatty"
    labels:
      - "dependencies"
```

**メリット**:
- 依存関係の自動更新PR作成
- セキュリティパッチの迅速な適用

---

### 優先度3: 高度な自動化

#### 3.1 自動デプロイ（Vercel/Netlify連携）

**推奨**: Vercel GitHub Appを使用

**設定手順**:
1. Vercelプロジェクトとリポジトリを連携
2. 環境変数をVercelダッシュボードで設定
3. ブランチごとのデプロイ戦略:
   - `main` → Production
   - `develop` → Preview
   - Feature branches → Preview

**メリット**:
- プッシュごとに自動デプロイ
- PRごとにプレビュー環境
- ロールバックが容易

---

#### 3.2 依存関係グラフ可視化

```yaml
name: Dependency Visualization

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'components/**'
      - 'lib/**'

jobs:
  visualize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install  # madgeはdevDependenciesに含まれる
      - run: bunx madge --circular src/
      - name: Generate Dependency Graph
        run: bunx madge --image deps.svg src/
      - name: Upload Artifact
        uses: actions/upload-artifact@v4
        with:
          name: dependency-graph
          path: deps.svg
```

**メリット**:
- 循環依存の自動検出
- 依存関係の可視化
- 設計品質の監視

---

#### 3.3 E2Eテスト（Playwright）

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - name: Install Playwright
        run: bunx playwright install --with-deps
      - name: Run E2E Tests
        run: bun run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

**前提**: `package.json`に`test:e2e`スクリプトを追加

---

### 優先度4: パフォーマンス・品質監視

#### 4.1 Lighthouse CI

```yaml
name: Lighthouse CI

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run build
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v12
        with:
          urls: |
            http://localhost:3000
            http://localhost:3000/auth/login
          uploadArtifacts: true
```

**メリット**:
- パフォーマンス劣化の早期検出
- アクセシビリティスコア監視
- SEOスコア監視

---

#### 4.2 Bundle Size分析

```yaml
name: Bundle Analysis

on:
  pull_request:
    branches: [main]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - name: Analyze Bundle
        run: bunx @next/bundle-analyzer
      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            // Bundle sizeをPRにコメント
```

**メリット**:
- バンドルサイズの監視
- パフォーマンス劣化防止

---

## 実装優先順位とタイムライン

### Phase 1: 基礎（1週間）

- [ ] Code Quality Check ワークフロー
- [ ] Test ワークフロー（カバレッジ付き）
- [ ] Build Check ワークフロー
- [ ] PRテンプレート更新（CI結果チェック項目追加）

**期待される効果**:
- コード品質の自動保証
- テスト実行の自動化
- ビルドエラーの早期発見

---

### Phase 2: セキュリティ（1週間）

- [ ] Security Check ワークフロー
- [ ] Dependabot設定
- [ ] GitHub Advanced Security有効化（プライベートリポジトリの場合）

**期待される効果**:
- セキュリティ脆弱性の自動検出
- 依存関係の自動更新

---

### Phase 3: デプロイ自動化（1週間）

- [ ] Vercel/Netlify連携
- [ ] 環境変数の設定
- [ ] ブランチ戦略の確立

**期待される効果**:
- デプロイの完全自動化
- プレビュー環境の自動生成

---

### Phase 4: 高度な監視（2週間）

- [ ] 依存関係グラフ可視化
- [ ] E2Eテスト
- [ ] Lighthouse CI
- [ ] Bundle Size分析

**期待される効果**:
- 包括的な品質監視
- パフォーマンス劣化の防止

---

## コスト分析

### GitHub Actions 無料枠

- **Public リポジトリ**: 無制限
- **Private リポジトリ**: 月2,000分（無料）

### 予想実行時間（1 PR あたり）

| ワークフロー | 実行時間 | 月間PR数(20) | 合計時間 |
|------------|---------|------------|---------|
| Lint | 1分 | 20回 | 20分 |
| Test | 3分 | 20回 | 60分 |
| Build | 5分 | 20回 | 100分 |
| Security | 2分 | 20回 | 40分 |
| E2E | 10分 | 10回 | 100分 |
| **合計** | - | - | **320分** |

**結論**: 無料枠内で十分運用可能

---

## リスクと対策

### リスク1: CI実行時間の増加

**対策**:
- キャッシュ戦略の最適化
- 並列実行の活用
- 必要に応じてselfホステッドランナー

### リスク2: False Positiveによるブロック

**対策**:
- 初期はwarning扱い
- 段階的に厳格化
- ルールの継続的な見直し

### リスク3: 環境変数の管理

**対策**:
- GitHub Secretsの活用
- 環境ごとの変数分離
- ドキュメント化

---

## 推奨事項

### 即座に実装すべき（Phase 1）

1. ✅ **Code Quality Check**: コード品質の基本保証
2. ✅ **Test Workflow**: テストの自動実行
3. ✅ **Build Check**: ビルドエラーの防止

### 次に実装すべき（Phase 2-3）

4. ✅ **Security Check**: セキュリティ脆弱性の監視
5. ✅ **自動デプロイ**: 開発効率の大幅向上

### 長期的に実装（Phase 4）

6. ⚠️ **E2E Tests**: 包括的なテスト
7. ⚠️ **Performance Monitoring**: パフォーマンス監視

---

## 次のアクション

### 1. 実装計画の作成

`docs/03_plans/cicd-implementation/` に実装計画を作成

### 2. ワークフローファイルの作成

`.github/workflows/` ディレクトリに以下を作成:
- `code-quality.yml`
- `test.yml`
- `build.yml`
- `security.yml`

### 3. チーム内共有

- 実装方針の合意
- 優先順位の確認
- タイムラインの調整

---

## 参考資料

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Bun CI/CD Guide](https://bun.sh/guides/test/ci)
- [Next.js CI/CD Best Practices](https://nextjs.org/docs/deployment)
- [Vitest CI Configuration](https://vitest.dev/guide/ci.html)
- [Biome CI Integration](https://biomejs.dev/guides/continuous-integration/)

---

## 関連ドキュメント

- [コード品質基準](../../rules/code-quality-standards.md)
- [依存関係追跡](../../rules/dependency-mapping.md)
- [テスト駆動開発](../../rules/ai-documentation.md)

---

**最終更新:** 2025-10-30
**作成者:** AI Assistant
