# ブランチ保護ルール設定ガイド

**作成日**: 2025-11-16  
**目的**: developブランチを経由しないとmainブランチにマージできないようにする設定

---

## 概要

このガイドでは、GitHubリポジトリで「developブランチを経由しないとmainブランチにマージできない」という制約を実現する方法を説明します。

**実現方法**:
1. **GitHub Actionsワークフロー**で自動チェック（既に実装済み）
2. **GitHubのブランチ保護ルール**で追加の保護を設定

---

## 前提条件

- ✅ GitHubリポジトリへの管理者アクセス
- ✅ `.github/workflows/branch-protection.yml` が存在すること

---

## ステップ1: GitHub Actionsワークフローの確認

既に以下のワークフローが実装されています：

**ファイル**: `.github/workflows/branch-protection.yml`

このワークフローは、mainブランチへのプルリクエストがdevelopブランチからのものであることを自動的にチェックします。

**動作**:
- mainブランチへのPRが作成されると自動実行
- developブランチ以外からのPRの場合、チェックを失敗させ、PRにコメントを追加
- チェックが失敗すると、PRをマージできない

---

## ステップ2: GitHubブランチ保護ルールの設定

GitHubのリポジトリ設定で、mainブランチへの直接プッシュを禁止し、プルリクエスト経由のみ許可する設定を行います。

### 2.1 リポジトリ設定ページを開く

1. GitHubリポジトリページを開く
2. **Settings** タブをクリック
3. 左サイドバーから **Branches** を選択

### 2.2 ブランチ保護ルールを追加

1. **Branch protection rules** セクションで **Add rule** をクリック
2. **Branch name pattern** に `main` を入力

### 2.3 保護ルールの設定

以下の設定を有効にします：

#### ✅ 必須設定

- [x] **Require a pull request before merging**
  - [x] **Require approvals**: 1（最低1人の承認を必須）
  - [x] **Dismiss stale pull request approvals when new commits are pushed**
  - [x] **Require review from Code Owners**（CODEOWNERSファイルがある場合）

- [x] **Require status checks to pass before merging**
  - [x] **Require branches to be up to date before merging**
  - 以下のチェックを必須にする：
    - ✅ `Branch Protection Check / Check Merge Source Branch`
    - ✅ `Code Quality Check / Lint and Format Check`
    - ✅ `Test / Unit Tests`
    - ✅ `Build Check / Production Build`

- [x] **Require conversation resolution before merging**
  - PRのコメントがすべて解決されている必要がある

- [x] **Do not allow bypassing the above settings**
  - 管理者もこのルールをバイパスできないようにする

#### ⚠️ 注意事項

- **Allow force pushes**: ❌ チェックしない（強制プッシュを禁止）
- **Allow deletions**: ❌ チェックしない（ブランチ削除を禁止）

### 2.4 設定の保存

1. すべての設定を確認
2. **Create** ボタンをクリック

---

## ステップ3: 動作確認

### 3.1 正しいフローの確認

以下の手順で、正しく動作することを確認します：

```bash
# 1. 機能ブランチからdevelopへのPRを作成
git checkout -b feature/test-branch
# 変更を加える
git add .
git commit -m "test: add test feature"
git push origin feature/test-branch

# 2. GitHubで feature/test-branch → develop のPRを作成
# → これは正常にマージできるはず

# 3. develop → main のPRを作成
# → これも正常にマージできるはず
```

### 3.2 不正なフローの確認

以下の手順で、不正なマージがブロックされることを確認します：

```bash
# 1. 機能ブランチから直接mainへのPRを作成
git checkout -b feature/direct-to-main
# 変更を加える
git add .
git commit -m "test: direct to main"
git push origin feature/direct-to-main

# 2. GitHubで feature/direct-to-main → main のPRを作成
# → Branch Protection Check が失敗するはず
# → PRにエラーメッセージが表示されるはず
# → マージボタンが無効化されるはず
```

---

## ワークフローの説明

### 正しいマージフロー

```
feature/* → develop → main
```

1. **機能開発**: `feature/*` ブランチで開発
2. **統合**: `feature/*` → `develop` にPRを作成してマージ
3. **リリース**: `develop` → `main` にPRを作成してマージ

### ブロックされるフロー

```
feature/* → main  ❌ ブロックされる
fix/* → main      ❌ ブロックされる
chore/* → main    ❌ ブロックされる
```

---

## トラブルシューティング

### 問題1: チェックが実行されない

**原因**: ワークフローファイルが正しく配置されていない

**解決方法**:
```bash
# ワークフローファイルの存在を確認
ls -la .github/workflows/branch-protection.yml

# ファイルが存在しない場合、作成する
# （既に作成済みのはず）
```

### 問題2: チェックが失敗するが、エラーメッセージが表示されない

**原因**: GitHub Actionsの権限設定が不十分

**解決方法**:
1. リポジトリの **Settings** > **Actions** > **General** を開く
2. **Workflow permissions** で **Read and write permissions** を選択
3. **Allow GitHub Actions to create and approve pull requests** にチェック

### 問題3: 管理者でもマージできない

**原因**: 「Do not allow bypassing the above settings」が有効になっている

**解決方法**:
- 緊急時のみ、一時的にこの設定を無効化
- 通常時は有効のままにしておくことを推奨

---

## 関連ドキュメント

- [CI/CD戦略](../02_research/2025_10/20251018/20251018_01_cicd-strategy-research.md)
- [ブランチ戦略ガイド](../04_implementation/guides/20251017_01_hierarchical-branch-strategy.md)
- [CI/CDセットアップガイド](../../.github/workflows/README.md)

---

## まとめ

この設定により、以下のことが保証されます：

✅ **mainブランチへの直接プッシュが禁止される**  
✅ **developブランチ以外からのPRが自動的にブロックされる**  
✅ **すべてのCI/CDチェックがパスしないとマージできない**  
✅ **コードレビューが必須になる**  

これにより、mainブランチの品質と安定性が保たれます。

