# CI/CD セットアップガイド

このガイドでは、For All Learners プロジェクトのCI/CD環境のセットアップ手順を説明します。

## 📋 目次

- [概要](#概要)
- [前提条件](#前提条件)
- [Phase 1: 基礎CI/CD](#phase-1-基礎cicd)
- [Phase 2: セキュリティ強化](#phase-2-セキュリティ強化)
- [トラブルシューティング](#トラブルシューティング)

---

## 概要

実装されているCI/CDワークフロー:

| ワークフロー | 目的 | トリガー | Phase |
|------------|------|---------|-------|
| **Code Quality Check** | Biomeによるlint/format | PR作成、main/develop push | 1 |
| **Test** | Vitestによる自動テスト実行 | PR作成、main/develop push | 1 |
| **Build Check** | Next.js本番ビルド確認 | PR作成 | 1 |
| **Tauri Build** | Tauriバイナリの自動ビルド | PR作成、main/develop push、タグ作成 | 6 |
| **Security Check** | 依存関係の脆弱性スキャン | 毎週月曜、package.json変更時 | 2 |
| **Dependabot** | 依存関係の自動更新 | 毎週月曜 | 2 |

---

## 前提条件

### 必要なもの

- ✅ GitHubリポジトリへの管理者アクセス
- ✅ Supabaseプロジェクトの認証情報
- ✅ Bunランタイム（ローカル開発用）

### 確認事項

```bash
# Bunがインストールされているか確認
bun --version

# 依存関係がインストールされているか確認
bun install

# テストが実行できるか確認
bun test

# ビルドが成功するか確認
bun run build
```

---

## Phase 1: 基礎CI/CD

### ステップ1: GitHub Secretsの設定

1. GitHubリポジトリページを開く
2. **Settings** > **Secrets and variables** > **Actions** に移動
3. **New repository secret** をクリック
4. 以下のSecretsを追加:

| Secret名 | 説明 | 取得方法 |
|---------|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL | Supabaseダッシュボード > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー | Supabaseダッシュボード > Settings > API |

**設定手順（画像付き）:**

```
Settings > Secrets and variables > Actions > New repository secret

Name: NEXT_PUBLIC_SUPABASE_URL
Secret: https://your-project.supabase.co

[Add secret]
```

---

### ステップ2: ワークフローファイルの確認

以下のワークフローファイルが存在することを確認:

```bash
.github/workflows/
├── code-quality.yml  ✅
├── test.yml          ✅
├── build.yml         ✅
```

各ファイルの詳細は [実装計画](../../docs/03_plans/cicd-implementation/20251030_01_cicd_implementation_plan.md) を参照。

---

### ステップ3: 動作確認

#### 3.1 テストブランチの作成

```bash
# 新しいブランチを作成
git checkout -b test/ci-setup

# 意図的に小さな変更を加える
echo "# CI Test" >> README.md

# コミット
git add README.md
git commit -m "test: CI setup verification"

# プッシュ
git push origin test/ci-setup
```

#### 3.2 PRの作成

1. GitHubでPRを作成
2. 自動的に以下のワークフローが実行されることを確認:
   - ✅ Code Quality Check
   - ✅ Test
   - ✅ Build Check

#### 3.3 結果の確認

**成功の場合:**
```
✅ Code Quality Check / Lint and Format Check (pull_request)
✅ Test / Unit Tests (pull_request)
✅ Build Check / Production Build (pull_request)
```

**失敗の場合:**
- ログを確認し、エラーメッセージに従って修正
- よくあるエラーは [トラブルシューティング](#トラブルシューティング) を参照

---

### ステップ4: PRテンプレートの確認

PRを作成すると、以下のチェックリストが表示されます:

```markdown
## CI/CDチェック

- [ ] ✅ Code Quality Check: Passed
- [ ] ✅ Tests: Passed (Coverage ≥ 80%)
- [ ] ✅ Build: Passed
- [ ] ✅ Security: No vulnerabilities detected
```

すべてのチェックが✅になったことを確認してマージしてください。

---

## Phase 2: セキュリティ強化

### ステップ1: Security Checkワークフローの確認

```bash
.github/workflows/
└── security.yml  ✅
```

このワークフローは:
- 毎週月曜日 9:00 JST に自動実行
- package.json 変更時に実行
- 手動でも実行可能（workflow_dispatch）

---

### ステップ2: Dependabotの確認

```bash
.github/
└── dependabot.yml  ✅
```

Dependabotは:
- 毎週月曜日に依存関係をチェック
- 更新が必要な場合、自動的にPRを作成
- 最大5個のPRまで同時にオープン

---

### ステップ3: 動作確認

#### 手動でSecurity Checkを実行

1. GitHub > Actions タブを開く
2. 左側のワークフロー一覧から **Security Check** を選択
3. **Run workflow** をクリック
4. ブランチを選択して実行

#### 結果の確認

**脆弱性が見つかった場合:**
- 自動的にIssueが作成される
- ラベル: `security`, `dependencies`
- 対応手順がIssue本文に記載される

**脆弱性がない場合:**
- ワークフローが成功で完了
- 何もアクションは必要なし

---

## トラブルシューティング

### エラー1: `bun: command not found`

**原因**: GitHub ActionsランナーにBunがインストールされていない

**解決策**: すでに `oven-sh/setup-bun@v2` アクションで対応済み。ワークフローファイルを確認してください。

---

### エラー2: Build失敗 - 環境変数エラー

**症状:**
```
Error: NEXT_PUBLIC_SUPABASE_URL is not defined
```

**解決策:**
1. GitHub Secretsに環境変数が正しく設定されているか確認
2. ワークフローファイルで `env:` セクションが正しく記載されているか確認

```yaml
env:
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

---

### エラー3: テストカバレッジが閾値未満

**症状:**
```
Error: Coverage threshold not met
Lines: 75% (target: 80%)
```

**解決策:**
1. テストケースを追加して、未カバーの行をテスト
2. または `vitest.config.mts` の `thresholds` を調整（推奨しない）

---

### エラー4: Dependabot PRが多すぎる

**症状:**
Dependabotが一度に多くのPRを作成してしまう

**解決策:**
`.github/dependabot.yml` の `open-pull-requests-limit` を調整:

```yaml
open-pull-requests-limit: 3  # デフォルト: 5
```

---

### エラー5: Lint失敗 - Biomeエラー

**症状:**
```
Error: Found 5 lint errors
```

**解決策:**
ローカルで修正:

```bash
# 自動修正
bun run lint

# エラー確認
bun run biome check src/
```

---

## よくある質問

### Q1: ワークフローが実行されない

**A:** 以下を確認してください:
- ワークフローファイルが `.github/workflows/` に配置されている
- YAMLの構文が正しい（インデントなど）
- トリガー条件（on:）が適切に設定されている

---

### Q2: テストが長時間実行される

**A:** 以下を検討してください:
- テストの並列化（現在は単一ジョブで実行）
- Bunのキャッシュ最適化
- 不要なテストの削減

---

### Q3: GitHub Actions無料枠が心配

**A:** 
- **Public リポジトリ**: 無制限なので心配不要
- **Private リポジトリ**: 月2,000分まで無料
- 現在の構成では、月間約320分程度の使用を見込んでいます（無料枠内）

---

## 次のステップ

### Phase 3: デプロイ自動化（予定）

- Vercel連携
- 自動デプロイ
- プレビュー環境

詳細は [実装計画](../../docs/03_plans/cicd-implementation/20251030_01_cicd_implementation_plan.md) を参照。

---

## 関連ドキュメント

- [CI/CD改善提案調査](../../docs/02_research/2025_10/20251030_cicd_improvement_research.md) - 改善提案の詳細
- [実装計画](../../docs/03_plans/cicd-implementation/20251030_01_cicd_implementation_plan.md) - 実装計画の詳細
- [GitHub Actions公式ドキュメント](https://docs.github.com/en/actions)

---

## サポート

問題が発生した場合:

1. [トラブルシューティング](#トラブルシューティング) を確認
2. GitHub Issuesで報告
3. チームに相談

---

**最終更新:** 2025-10-30
**作成者:** AI Assistant
