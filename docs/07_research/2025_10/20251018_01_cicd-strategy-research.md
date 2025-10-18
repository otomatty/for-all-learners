# CI/CD戦略提案：GitHub Actions + Vercel

**作成日**: 2025年10月18日  
**最終更新日**: 2025年10月18日

---

## 概要

F.A.L プロジェクト（Next.js + Supabase + Vercel）に対する、GitHub Actions と Vercel を活用した CI/CD 戦略です。

**主な要件**:
- Vercel の **1 つのプロジェクト** で Production/Preview を自動管理
- GitHub ブランチに応じた自動デプロイ（`main` = Production、それ以外 = Preview）
- 品質管理（テスト・リント）の自動化
- セキュリティと信頼性の確保

**重要**: Vercel は自動的に `main` ブランチを Production として扱い、その他のブランチを Preview 環境としてデプロイします。複数プロジェクトは **不要** です。

---

## 推奨戦略

### 1. ブランチ戦略

#### ブランチ構成（シンプルな GitHub Flow）

```
main（本番）
  ↑ Production に自動デプロイ
  
develop（統合用）
  ↑ Preview に自動デプロイ
  ├─ feature/* （機能開発）→ Preview に自動デプロイ
  ├─ fix/* （バグ修正）→ Preview に自動デプロイ
  └─ chore/* （保守）→ Preview に自動デプロイ
```

**各ブランチの役割**:

| ブランチ | 目的 | Vercel デプロイ先 | 環境 | CI/CD処理 |
|---------|------|-----------------|------|---------|
| `main` | 本番リリース | **Production** | 本番 | テスト ✓ / リント ✓ / ビルド確認 ✓ |
| `develop` | 統合・開発 | **Preview** | 開発 | テスト ✓ / リント ✓ / ビルド確認 ✓ |
| `feature/*` | 機能開発 | **Preview** | 開発 | PR時にテスト ✓ / リント ✓ |
| `fix/*` | バグ修正 | **Preview** | 開発 | PR時にテスト ✓ / リント ✓ |

**ブランチ命名規則**:
- 機能開発: `feature/{機能名}` (例: `feature/unified-link-mark`)
- バグ修正: `fix/{バグ名}` (例: `fix/test-failures-investigation`)
- メンテナンス: `chore/{内容}` (例: `chore/dependency-update`)

---

### 2. Vercel でのプロジェクト設定

#### 設定方法（すべて 1 つのプロジェクトで管理）

Vercel Dashboard で以下を確認・設定:

**Project Settings → Git → Production Branch**:
- Production Branch: `main` ✓
- Preview Branches: （デフォルト = すべてのブランチが Preview）

**Environment Variables**:

環境ごとに異なる環境変数を設定。Vercel は自動的にブランチに応じて使い分けます。

| 変数 | Production | Preview | 説明 |
|------|-----------|---------|------|
| `DATABASE_URL` | 本番DB URL | Dev/Preview DB URL | Supabase接続 |
| `NEXT_PUBLIC_SUPABASE_URL` | 本番URL | Preview URL | 公開API URL |
| `SUPABASE_ANON_KEY` | 本番キー | Preview キー | 公開キー |
| `SUPABASE_SERVICE_ROLE_KEY` | 本番キー | Preview キー | 秘密キー |
| `NODE_ENV` | `production` | `development` | 環境識別 |

**環境変数の設定方法**:
1. Environment で「Production」「Preview」を選択
2. 各環境ごとに適切な値を設定
3. Save

#### Vercel 環境変数の設定例

```
# Production 環境のみ
DATABASE_URL = postgres://user:pass@prod.db.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL = https://xxxx.supabase.co
SUPABASE_ANON_KEY = eyJ...（本番キー）
SUPABASE_SERVICE_ROLE_KEY = eyJ...（本番シークレット）

# Preview 環境のみ
DATABASE_URL = postgres://user:pass@dev.db.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL = https://dev-xxxx.supabase.co
SUPABASE_ANON_KEY = eyJ...（Preview キー）
SUPABASE_SERVICE_ROLE_KEY = eyJ...（Preview シークレット）
```

---

### 3. GitHub Actions ワークフロー

**重要**: Vercel は GitHub と直接連携しているため、**GitHub Actions での明示的なデプロイコマンドは不要** です。  
GitHub Actions は **品質チェック（テスト・リント）のみ** に集中します。

#### ワークフロー 1: PR チェック（推奨）

**目的**: PR 作成時に品質チェック（テスト・リント）を実行

**ファイル**: `.github/workflows/pr-checks.yml`

```yaml
name: PR Checks

on:
  pull_request:
    branches:
      - main
      - develop

jobs:
  lint:
    name: Lint and Format Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Biome check
        run: npm run lint
  
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test -- --run
  
  build:
    name: Build Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
```

**特徴**:
- PR マージ前に品質を保証
- テスト・リント・ビルド確認をすべて実行
- PR に結果コメントが自動表示

---

#### ワークフロー 2: デプロイ後確認（オプション）

**目的**: Vercel デプロイ完了後に通知（Slack など）

**ファイル**: `.github/workflows/notify-deployment.yml`

```yaml
name: Notify Deployment

on:
  deployment_status

jobs:
  notify:
    runs-on: ubuntu-latest
    if: github.event.deployment_status.state == 'success'
    steps:
      - name: Get deployment URL
        id: deployment
        run: |
          echo "url=${{ github.event.deployment_status.environment_url }}" >> $GITHUB_OUTPUT
          echo "env=${{ github.event.deployment_status.environment }}" >> $GITHUB_OUTPUT
      
      - name: Notify to Slack (Optional)
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "✅ Deployment Successful",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Branch*: ${{ github.ref }}\n*Environment*: ${{ steps.deployment.outputs.env }}\n*URL*: ${{ steps.deployment.outputs.url }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK
```

**特徴**:
- Vercel デプロイ完了後に自動実行
- デプロイ情報を Slack などで通知
- オプションで追加可能

---

### 4. 環境変数・シークレット管理

#### GitHub Secrets の設定

`Settings → Secrets and variables → Actions` で以下を設定（オプション・通知用）:

```
SLACK_WEBHOOK_URL  # Slack 通知用（オプション）
```

#### Vercel での環境変数設定

**重要**: Vercel Dashboard で環境ごとに変数を設定します。

1. **Vercel Dashboard へログイン**
2. **Project → Settings → Environment Variables**
3. **各環境ごとに設定**:

```
# Production 用（main ブランチからのデプロイ時に使用）
DATABASE_URL = postgres://...（本番DB）
NEXT_PUBLIC_SUPABASE_URL = https://prod.supabase.co（本番 URL）
SUPABASE_ANON_KEY = eyJ...（本番公開キー）
SUPABASE_SERVICE_ROLE_KEY = eyJ...（本番秘密キー）

# Preview 用（main 以外のブランチからのデプロイ時に使用）
DATABASE_URL = postgres://...（Preview DB）
NEXT_PUBLIC_SUPABASE_URL = https://preview.supabase.co（Preview URL）
SUPABASE_ANON_KEY = eyJ...（Preview 公開キー）
SUPABASE_SERVICE_ROLE_KEY = eyJ...（Preview 秘密キー）
```

---

## デプロイフロー（簡略図）

```
┌─────────────────────────────────────────────────────────┐
│              GitHub リポジトリへの変更                     │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
    (PR 作成)            (push/merge)
    ┌─────────┐       ┌────────────┐
    │ feature │       │ main/other │
    │ /fix    │       │  branches  │
    └────┬────┘       └──────┬─────┘
         │                   │
         ▼                   ▼
    ┌──────────────┐   ┌─────────────────┐
    │ GitHub       │   │ Vercel 自動判定  │
    │ Actions      │   │                 │
    │ チェック     │   │ - main? →       │
    │              │   │   Production に  │
    │ ✓ Lint       │   │   デプロイ       │
    │ ✓ Test       │   │                 │
    │ ✓ Build      │   │ - 他? →         │
    │              │   │   Preview に    │
    │ (デプロイ    │   │   デプロイ       │
    │  しない)     │   │                 │
    └──────────────┘   │ ✓ 自動ビルド    │
                       │ ✓ 自動デプロイ  │
                       └─────────────────┘
```

---

## メリット・デメリット

### メリット

✅ **シンプルな構成**
- Vercel プロジェクト 1 つで Production/Preview を管理
- 複数プロジェクトの管理不要

✅ **自動化による効率性**
- GitHub push で自動的にブランチを判定
- `main` なら Production、その他は Preview へ自動デプロイ

✅ **品質保証**
- PR マージ前に GitHub Actions でテスト・リント実行
- 本番環境への間違ったデプロイを防止

✅ **環境分離**
- Vercel の環境変数機能で Production/Preview を分離
- 本番と開発の DB/API キーを区別

✅ **GitHub Actions との連携**
- PR チェックで品質管理
- デプロイは Vercel に任せる（責任の分離）

✅ **スケーラビリティ**
- 新しいブランチを作成すれば自動的に Preview デプロイ
- 追加設定が最小限

### デメリット・注意点

⚠️ **テスト実行時間**
- PR ごとに全テスト実行のため、マージに時間がかかる可能性
- **対策**: テスト時間の最適化、並列実行の活用

⚠️ **環境変数の管理**
- 本番と Preview で異なる値を Vercel で管理する必要がある
- **対策**: Vercel Dashboard で環境ごとに設定

⚠️ **デプロイの手動キャンセルが必要な場合**
- Vercel は自動デプロイするため、緊急時に対応が遅れる可能性
- **対策**: 重要な本番変更は PR レビュー・承認フロー厳格化

⚠️ **ローカルテストの大切さ**
- GitHub Actions は最低限の品質チェックのため、本番前に必ずローカルテストを実施

---

## 推奨される追加設定

### 1. PR の自動チェック（保護ルール） 🔒

**GitHub Repository Settings**:

1. **Branch protection rule を作成**:
   - **Branch name pattern**: `main`
   - **Require status checks to pass before merging**: ✓ チェック
   - **Require code reviews**: ✓ チェック（最低 1 人のレビュー）

2. **Develop ブランチの保護**（オプション）:
   - `develop` ブランチにも同じルールを適用
   - PR なしでの直接 push を防止

---

### 2. PR テンプレートの作成

**ファイル**: `.github/pull_request_template.md`

```markdown
## 📝 説明
<!-- 変更内容を簡潔に説明してください -->

## 🔍 変更の種類
- [ ] 🐛 バグ修正
- [ ] ✨ 新機能
- [ ] 📚 ドキュメント更新
- [ ] ♻️ リファクタリング

## 🧪 テスト実施
- [ ] ローカルで動作確認
- [ ] テスト実行成功

## ✅ チェックリスト
- [ ] コードが既存スタイルに準拠
- [ ] テストケースを追加
- [ ] 関連ドキュメントを更新
- [ ] 不必要なコンソール.log を削除

## 🔗 関連 Issue
<!-- Issue 番号を記載：例 Closes #123 -->
```

---

### 3. 自動リリース管理（オプション）

**ファイル**: `.github/workflows/create-release.yml`

```yaml
name: Create Release

on:
  push:
    branches:
      - main
    paths:
      - 'package.json'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Extract version
        id: version
        run: |
          VERSION=$(jq -r '.version' package.json)
          echo "version=$VERSION" >> $GITHUB_OUTPUT
      
      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ steps.version.outputs.version }}
          release_name: Release ${{ steps.version.outputs.version }}
          draft: false
          prerelease: false
```

---

### 4. Slack 通知（オプション）

Vercel デプロイ完了時に Slack に通知:

1. **Slack Webhook 設定**:
   - Slack Workspace → Apps → Incoming Webhooks
   - `SLACK_WEBHOOK_URL` を作成

2. **GitHub Secrets に追加**:
   - `Settings → Secrets → SLACK_WEBHOOK_URL`

3. **ワークフロー内で使用** (前述の `notify-deployment.yml` 参照)

---

### 5. パフォーマンスモニタリング（オプション）

- **Sentry** による エラー トラッキング
- **Datadog** による アプリケーション パフォーマンス 監視
- **Vercel Analytics** による ウェブ バイタル 監視

---

## 実装ステップ（推奨順序）

### フェーズ 1: 最小構成（即実装推奨）⭐

**目標**: PR チェック自動化

1. `.github/workflows/pr-checks.yml` を作成
2. GitHub Branch protection rule を設定
3. PR 作成してテスト

**所要時間**: 30 分

**得られる効果**:
- PR マージ前に品質チェック自動化
- 本番環境への低品質なコード混入を防止

---

### フェーズ 2: 標準構成（次のスプリント）⭐⭐

**目標**: 本番・開発環境の分離確認

1. Vercel Dashboard で環境ごとの環境変数を確認
2. `develop` ブランチを作成・push
3. Preview デプロイ動作確認

**所要時間**: 1 時間

**得られる効果**:
- Production/Preview の明確な分離
- ブランチ別の自動デプロイ

---

### フェーズ 3: 生産性向上（成熟段階）⭐⭐⭐

**目標**: より充実した CI/CD

1. PR テンプレート `.github/pull_request_template.md` を作成
2. `.github/workflows/notify-deployment.yml` を設定（Slack 通知）
3. `.github/workflows/create-release.yml` を設定（自動リリース）

**所要時間**: 2 時間

**得られる効果**:
- PR プロセスの標準化
- デプロイ情報の可視化
- リリース管理の自動化

---

## 関連資料

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Deployment Documentation](https://vercel.com/docs)
- [Vercel + GitHub Integration](https://vercel.com/docs/concepts/deployments/continuous-deployment)
- [GitHub Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## よくある質問（FAQ）

### Q1: 複数の Vercel プロジェクトが必要ですか？

**A**: いいえ、不要です。Vercel は 1 つのプロジェクトで自動的に以下を判定します:
- `main` ブランチ → **Production** デプロイ
- その他のブランチ → **Preview** デプロイ

複数プロジェクトは複雑性を増すだけなので、推奨しません。

---

### Q2: Preview から Production へ昇格させるには？

**A**: GitHub で `develop` → `main` への PR を作成し merge するだけです:

```bash
# develop で変更を commit
git add .
git commit -m "feat: new feature"

# main に PR を作成
git push origin develop  # develop を push
# GitHub で PR 作成 & merge
```

Vercel が自動的に Production にデプロイします。

---

### Q3: デプロイをキャンセルしたい場合は？

**A**: Vercel Dashboard で以下のいずれかの方法で対応:

1. **デプロイ中にキャンセル**: Deployment → Cancel
2. **Rollback**: 前のバージョンに戻す
3. **git revert**: 問題のあるコミットを打ち消す

```bash
git revert <commit-hash>
git push origin main  # 自動で本番にデプロイ
```

---

### Q4: Preview URL はどこで確認できますか？

**A**: 複数の方法があります:

1. **PR コメント**: GitHub PR に Vercel が自動コメント
2. **Vercel Dashboard**: Project → Deployments → Preview
3. **GitHub Deployments**: PR の「Show all activity」で確認

---

### Q5: 本番環境でバグが発生した場合の対応フロー？

**A**: 以下の優先度で対応:

1. **Immediate Fix** (緊急パッチ):
   ```bash
   git checkout main
   git pull origin main
   git checkout -b fix/critical-bug
   # バグを修正
   git commit -m "fix: critical bug"
   git push origin fix/critical-bug
   # PR 作成 → コードレビュー → merge
   ```

2. **詳細な調査が必要**: 
   - Preview でテスト
   - 本番環境のホットフィックスは避ける

---

### Q6: 環境変数を追加・更新した場合の手順？

**A**: Vercel Dashboard で手動設定が必要です:

1. **Vercel Dashboard** → Project Settings → Environment Variables
2. 各環境 (Production/Preview) ごとに設定
3. **再デプロイ**が必要:
   ```bash
   git commit -m "chore: no-op for env redeploy" --allow-empty
   git push origin main  # Production
   git push origin develop  # Preview
   ```

**注意**: `.env.local` でローカル開発用の変数も管理してください。

---

## 次のステップ

### 今すぐ実装できること

1. ✅ **フェーズ 1 の実装**:
   - `.github/workflows/pr-checks.yml` を作成
   - この記事の YAML コード例をコピペで実装可能

2. ✅ **GitHub Branch Protection の設定**:
   - `main` と `develop` に protection rule を追加
   - テスト合格必須化

3. ✅ **Vercel の確認**:
   - `develop` ブランチで push
   - Preview デプロイ動作確認

---

## トラブルシューティング

### デプロイが失敗する場合

1. **ビルドエラー**:
   ```bash
   npm run build  # ローカルで確認
   npm test -- --run  # テストも実行
   ```

2. **環境変数エラー**:
   - Vercel Dashboard で環境変数が正しく設定されているか確認
   - Preview/Production で異なる値を使っているか確認

3. **GitHub Actions エラー**:
   - GitHub → Actions タブでログを確認
   - `npm ci` → `npm run lint` → `npm run build` を順序通り実行

---

## 備考

- **本ドキュメントは 2025年10月18日 に作成されました**
- Vercel、GitHub Actions の仕様は変更される可能性があります
- 最新の公式ドキュメントを定期的に確認してください

---

## ドキュメントの更新履歴

| 日付 | 変更内容 |
|------|--------|
| 2025-10-18 | 初版作成：1 Vercel プロジェクト、GitHub Actions PR チェックのシンプルな戦略に修正 |
```

