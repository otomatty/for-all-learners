# 依存関係可視化ツール実装ガイド（実践例）

**対象:** 開発チーム・DevOps
**最終更新:** 2025-10-22

---

## 概要

このドキュメントは、このプロジェクトで **Madge** を導入・運用するための具体的な実装ガイドです。

---

## 🚀 クイックスタート（5分）

### ステップ 1: インストール

```bash
cd /Users/sugaiakimasa/apps/lichtblick
npm install --save-dev madge
```

### ステップ 2: 基本コマンド実行

```bash
# 循環依存を検出
npx madge src/ --circular

# 依存グラフを表示
npx madge src/ --no-color

# SVG で可視化
npx madge src/ --image dist/dependencies.svg
```

### ステップ 3: 結果確認

```bash
# 生成されたグラフを確認
open dist/dependencies.svg
```

---

## 📋 Step-by-Step 設定ガイド

### ステップ 1: Madge 設定ファイルを作成

**ファイル**: `/Users/sugaiakimasa/apps/lichtblick/madge.config.js`

```javascript
/**
 * Madge Configuration
 * 依存関係分析ツールの設定
 */

module.exports = {
  // 分析対象ディレクトリ
  src: ["src/"],

  // 除外パターン（テスト、ストーリーなど）
  excludePattern: [
    "node_modules",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx",
    "**/*.stories.tsx",
    "**/*.config.ts",
    "**/dist/**",
    "**/build/**",
  ],

  // ベースディレクトリ
  baseDir: process.cwd(),

  // モジュール形式
  format: "esm",

  // 対象ファイル拡張子
  extensions: ["ts", "tsx", "js", "jsx"],

  // npm パッケージを含めるか
  includeNpm: false,

  // 無視パターン
  ignorePattern: [],

  // グラフの方向
  rankdir: "LR", // LR: 左から右, TB: 上から下
};
```

### ステップ 2: npm scripts を追加

**ファイル**: `/Users/sugaiakimasa/apps/lichtblick/package.json`

```json
{
  "scripts": {
    "analyze:deps": "madge src/ --config madge.config.js",
    "analyze:deps:verbose": "madge src/ --config madge.config.js --verbose",
    "analyze:circular": "madge src/ --config madge.config.js --circular",
    "analyze:circular:verbose": "madge src/ --config madge.config.js --circular --verbose",
    "analyze:stats": "madge src/ --config madge.config.js --stats",
    "visualize:deps": "madge src/ --config madge.config.js --image dist/dependencies.svg",
    "visualize:deps:png": "madge src/ --config madge.config.js --image dist/dependencies.png",
    "visualize:deps:html": "madge src/ --config madge.config.js --image dist/dependencies.html --html",
    "check:deps": "npm run analyze:circular -- --exit 1"
  }
}
```

### ステップ 3: 実行テスト

```bash
# 基本分析
npm run analyze:deps

# 循環依存チェック
npm run analyze:circular

# グラフ生成
npm run visualize:deps

# 統計情報
npm run analyze:stats
```

---

## 🔄 CI/CD 統合

### GitHub Actions 設定

**ファイル**: `.github/workflows/dependency-analysis.yml`

```yaml
name: Dependency Analysis

on:
  schedule:
    # 毎週日曜日 00:00 UTC に実行
    - cron: "0 0 * * 0"

  push:
    branches:
      - main
      - develop

  pull_request:
    types:
      - opened
      - synchronize
      - reopened

jobs:
  analyze-dependencies:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Check for circular dependencies
        run: npm run check:deps
        continue-on-error: true

      - name: Print dependency stats
        run: npm run analyze:stats
        continue-on-error: true

      - name: Generate dependency graph
        run: npm run visualize:deps
        continue-on-error: true

      - name: Generate detailed report
        run: npm run visualize:deps:html
        continue-on-error: true

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: dependency-analysis-${{ github.ref_name }}
          path: dist/
          retention-days: 30

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '📊 Dependency analysis completed. [View Report](https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }})'
            })
```

### GitLab CI 設定（参考）

```yaml
# .gitlab-ci.yml
dependency-analysis:
  stage: analyze
  image: node:18
  cache:
    paths:
      - node_modules/
  script:
    - npm ci
    - npm run analyze:circular -- --exit 1
    - npm run analyze:stats
    - npm run visualize:deps
  artifacts:
    paths:
      - dist/
    expire_in: 30 days
  only:
    - main
    - develop
    - schedules
```

---

## 📊 実行例と出力解釈

### 例 1: 基本分析

```bash
$ npm run analyze:deps

src/components/Button/Button.tsx
├── src/hooks/useClickHandler.ts
├── src/utils/classNameBuilder.ts
└── Button.module.css

src/hooks/useClickHandler.ts
├── src/services/AuthService.ts
├── src/utils/logger.ts
└── src/context/AuthContext.ts

src/services/AuthService.ts
├── src/types/User.ts
├── src/utils/validateEmail.ts
└── src/constants/API_URL.ts
```

**解釈:**

- Button.tsx は 3 つのファイルに依存
- useClickHandler.ts は 3 つのファイルに依存
- 各依存関係を階層的に表示

### 例 2: 循環依存検出

```bash
$ npm run analyze:circular

Found 1 circular dependency:
⚠️ src/utils/A.ts ↔ src/utils/B.ts ↔ src/utils/C.ts ↔ src/utils/A.ts
```

**対応:**

- 即座に修正が必要
- CI で自動検出・失敗させる（`--exit 1`）

### 例 3: 統計情報

```bash
$ npm run analyze:stats

File Statistics:
  Total files: 156
  Analyzed: 145
  Average dependencies: 2.3
  Max dependencies: 12 (src/components/Dashboard/Dashboard.tsx)

Largest modules by depth:
  1. src/components/Dashboard/Dashboard.tsx (depth: 8)
  2. src/services/ApiClient.ts (depth: 7)
  3. src/context/AppContext.ts (depth: 6)
```

**解釈:**

- 平均依存数が 2.3 → 健全
- Dashboard が深さ 8 → 複雑度が高い（リファクタリング検討）

### 例 4: SVG ダイアグラム

```bash
$ npm run visualize:deps

# dist/dependencies.svg が生成される
# ブラウザで open dist/dependencies.svg で確認
```

**ダイアグラムの読み方:**

- ノード（四角） = ファイル
- 矢印 = 依存関係（A → B は「A が B に依存」）
- 色分け = ファイルタイプ
- 循環依存 = 赤色でハイライト

---

## 🔍 よくある問題と対応

### 問題 1: グラフが大きすぎて見づらい

```bash
# 特定ディレクトリのみ分析
npx madge src/components/ --image deps-components.svg

# 深さを制限
npx madge src/ --depth 2 --image deps-limited.svg
```

### 問題 2: node_modules が含まれている

```bash
# .excludePattern で除外
madge src/ --include-npm false --image deps.svg
```

### 問題 3: TypeScript のパスエイリアスが認識されない

```javascript
// madge.config.js
module.exports = {
  src: ["src/"],
  // baseDir を適切に設定
  baseDir: process.cwd(),
  extensions: ["ts", "tsx", "js", "jsx"],
};
```

---

## 📈 定期実行スケジュール

### 推奨運用方法

| 実行タイミング           | コマンド                          | 対応アクション                   |
| ------------------------ | --------------------------------- | -------------------------------- |
| **開発中（毎コミット）** | `npm run check:deps`              | 循環依存なら commit 拒否         |
| **PR 作成時**            | `npm run analyze:circular`        | CI が自動実行、警告表示          |
| **マージ前**             | `npm run analyze:stats`           | 複雑度が許容範囲か確認           |
| **週 1 回（日曜）**      | `npm run visualize:deps`          | プロジェクト全体のヘルスチェック |
| **月 1 回**              | `npm run analyze:deps` + レビュー | アーキテクチャの改善提案         |

### Pre-commit Hook 設定

```json
// package.json の husky 設定
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run check:deps && npm run lint"
    }
  }
}
```

インストール:

```bash
npm install husky --save-dev
npx husky install
npx husky add .husky/pre-commit "npm run check:deps"
```

---

## 🎯 実例: Dashboard コンポーネントの分析

### 分析実行

```bash
npx madge src/components/Dashboard/Dashboard.tsx
```

### 出力

```
src/components/Dashboard/Dashboard.tsx
├── src/components/Header/Header.tsx
│   ├── src/hooks/useNav.ts
│   └── src/utils/classNameBuilder.ts
├── src/components/Sidebar/Sidebar.tsx
│   ├── src/context/SidebarContext.ts
│   └── src/hooks/useSidebar.ts
├── src/services/DataService.ts
│   ├── src/types/Data.ts
│   └── src/constants/API_URL.ts
└── src/utils/formatDate.ts
```

### グラフ生成

```bash
npx madge src/components/Dashboard/ --image dashboard-deps.svg
```

### 分析結果

```
Dashboard は以下に依存:
- 2 つのコンポーネント（Header, Sidebar）
- 1 つのサービス（DataService）
- ユーティリティ（formatDate）

リスク評価:
- 複雑度: 中（依存数 4 個）
- 修正時の影響範囲: 限定的（Header, Sidebar）
- リファクタリング: 不要（現在）
```

---

## 📝 ベストプラクティス

### ✅ DO

```bash
# 定期的に分析
npm run analyze:deps

# 循環依存を自動検出
npm run check:deps -- --exit 1

# グラフで全体像を把握
npm run visualize:deps
```

### ❌ DON'T

```bash
# 循環依存を無視
# ❌ npm run analyze:circular | grep -v circular

# グラフ生成を手動で...
# ❌ dot dependencies.dot -T svg > deps.svg
# ✅ npm run visualize:deps で自動化
```

---

## 🔗 関連ドキュメント

- [依存関係ダイアグラム自動生成ツール](./dependency-visualization-tools.md) - 詳細な技術情報
- [依存関係追跡ガイド](./dependency-mapping.md) - 軽量版（ファイルコメント）
- [コード品質基準](./code-quality-standards.md) - テストと品質

---

## 📞 トラブルシューティング

### Q: npm run visualize:deps で "dot not found" エラー

**A:** Graphviz がインストールされていません

```bash
# macOS
brew install graphviz

# Ubuntu/Debian
sudo apt-get install graphviz

# Windows
choco install graphviz
```

### Q: 分析時間が長い

**A:** 除外パターンを追加

```javascript
// madge.config.js
excludePattern: ["node_modules", "**/dist/**", "**/build/**", "**/*.test.ts", "**/*.spec.ts"];
```

### Q: ローカルパス（`@/`）が認識されない

**A:** tsconfig.json のパスエイリアス設定を確認

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Madge は自動的に tsconfig.json を読み込みます。

---

**最終更新:** 2025-10-22
**作成者:** AI (Grok Code Fast 1)
