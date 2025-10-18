# 階層化ブランチ戦略ガイド

**作成日**: 2025-10-17  
**最終更新日**: 2025-10-17  
**対象プロジェクト**: for-all-learners  
**関連Issue**: #12 (refactor: form.tsxライブラリを全フォームで統一活用)

## 📖 目次

1. [概要](#概要)
2. [基本的な考え方](#基本的な考え方)
3. [ブランチ戦略の種類](#ブランチ戦略の種類)
4. [推奨：階層化ブランチ戦略](#推奨階層化ブランチ戦略)
5. [実装フロー](#実装フロー)
6. [複雑なシナリオ対応](#複雑なシナリオ対応)
7. [トラブルシューティング](#トラブルシューティング)
8. [ベストプラクティス](#ベストプラクティス)

---

## 概要

複数フェーズの大規模リファクタリング、機能開発時に、以下を実現するブランチ管理戦略です：

- ✅ 並行開発対応（複数フェーズを同時進行）
- ✅ PR管理の明確性（各フェーズ独立）
- ✅ 途中の緊急タスク対応
- ✅ コンフリクト管理の簡潔性
- ✅ ロールバック容易性

---

## 基本的な考え方

### 問題：なぜ通常のブランチ戦略では不十分か

**直列ブランチ戦略の問題点**:

```
main
└─ feature/main-dev
   └─ feature/phase-1
      └─ feature/phase-2
         └─ feature/phase-3
```

| 問題 | 詳細 |
|------|------|
| **並行開発不可** | Phase-1 が完了するまで Phase-2 を開始できない |
| **マージ地獄** | phase-1 → main, phase-2 → main でコンフリクト多発 |
| **PR管理複雑** | 親ブランチが次々変化してレビュー対象が不明確 |
| **デバッグ困難** | どの Phase でバグが入り込んだか追跡困難 |

### 解決策：階層化ブランチ戦略

```
main
└─ feature/main-dev (メイン開発ブランチ)
   └─ refactor/form-library-unification (統合ブランチ)
      ├─ refactor/form-create-page-dialog (Phase 1)
      ├─ refactor/form-deck-page (Phase 1)
      ├─ refactor/form-page-profile (Phase 2)
      └─ refactor/form-admin-pages (Phase 3)
```

**メリット**:
- ✅ 統合ブランチが単一の merge base として機能
- ✅ 各 Phase が独立した PR として管理可能
- ✅ 複数フェーズを並行実行可能
- ✅ 緊急タスク対応時に git stash/pop で整理

---

## ブランチ戦略の種類

### 1. 直列ブランチ戦略

```
feature-main → feature-sub1 → feature-sub2 → feature-sub3
```

**利用場面**: 単純な小規模機能開発

| メリット | デメリット |
|---------|-----------|
| 理解しやすい | 並行開発不可 |
| セットアップ不要 | マージコンフリクト多 |
| | デバッグ困難 |

---

### 2. 並列ブランチ戦略（Git Flow 系）

```
main
└─ develop
   ├─ feature/user-auth
   ├─ feature/payment
   └─ feature/analytics
```

**利用場面**: 複数フィーチャーの同時開発

| メリット | デメリット |
|---------|-----------|
| 並行開発可能 | develop ブランチのマージ競合が増える |
| 各フィーチャー独立 | 全 feature が完了まで release できない |
| | develop 自体が不安定になる可能性 |

---

### 3. 階層化ブランチ戦略（推奨⭐⭐⭐⭐⭐）

```
main
└─ feature/main-dev
   └─ epic/form-library-refactor (統合ブランチ)
      ├─ feature/form-phase-1a
      ├─ feature/form-phase-1b
      └─ feature/form-phase-2
```

**利用場面**: 複数フェーズの大規模リファクタリング・機能開発

| メリット | デメリット |
|---------|-----------|
| ✅ 親ブランチ保護 | 初期セットアップに手間 |
| ✅ 並行開発対応 | ブランチが増える（管理ツール推奨） |
| ✅ PR明確性 | 命名規則の統一が必須 |
| ✅ ロールバック容易 | |
| ✅ 途中タスク対応 | |

---

## 推奨：階層化ブランチ戦略

### ブランチ階層の定義

```
【Level 0】main
├─ 本番環境リリース版
└─ 安定版のみ存在

【Level 1】feature/unified-link-migration-and-tdd (メイン開発ブランチ)
├─ 複数フィーチャー/リファクタリング統合先
├─ 中期的な開発目標を反映
└─ 複数人による同時開発の中心

【Level 2】refactor/form-library-unification (統合ブランチ/Epic)
├─ 1つの大規模テーマの統合点
├─ 複数フェーズの成果を集約
└─ Phase ごとの成果物が merge される

【Level 3】refactor/form-create-page-dialog, refactor/form-deck-page (作業ブランチ)
├─ 個別フェーズの作業単位
├─ 1つの PR = 1つの作業ブランチ
└─ developer が直接 commit する場所
```

### ブランチ命名規則

**推奨命名パターン**:

```
【統合ブランチ（Epic）】
epic/{theme-name}
例: epic/form-library-refactor

【Phase/機能ブランチ】
{type}/{feature-name}
例:
  - refactor/form-create-page-dialog
  - refactor/form-deck-page
  - feat/new-payment-feature
  - fix/validation-bug

【緊急ブランチ】
fix/{urgent-issue-name}
例: fix/critical-security-bug
```

### ブランチ間の merge 方向

```
【基本フロー】
main
  ↑
  │ merge (final)
feature/unified-link-migration-and-tdd
  ↑
  │ merge (Phase 完了時)
refactor/form-library-unification
  ↑
  ├─ merge (作業完了時)
  ├─ merge (作業完了時)
  └─ merge (作業完了時)
  ↑
  │ PR commit
refactor/form-create-page-dialog
(作業ブランチ)
```

**重要**: 下から上へのみ merge が発生します。上から下へのマージは原則なし。

---

## 実装フロー

### 初期セットアップ

#### Step 1: 統合ブランチの作成

```bash
# メイン開発ブランチから新規ブランチ作成
$ cd /Users/sugaiakimasa/apps/for-all-learners
$ git checkout feature/unified-link-migration-and-tdd
$ git pull origin feature/unified-link-migration-and-tdd

# 統合ブランチを作成
$ git checkout -b refactor/form-library-unification

# リモートに push
$ git push -u origin refactor/form-library-unification
```

**確認**:
```bash
$ git log --oneline -3
# 現在の HEAD が refactor/form-library-unification であることを確認
```

#### Step 2: Phase 1 作業ブランチの作成

```bash
# 統合ブランチから Phase 1 ブランチを作成
$ git checkout -b refactor/form-create-page-dialog
$ git push -u origin refactor/form-create-page-dialog

# 現在の位置を確認
$ git branch -vv
```

**出力例**:
```
* refactor/form-create-page-dialog        [origin/refactor/form-create-page-dialog] ...
  refactor/form-library-unification        [origin/refactor/form-library-unification] ...
  feature/unified-link-migration-and-tdd  [origin/feature/unified-link-migration-and-tdd] ...
  main                                     [origin/main: behind 2] ...
```

### Phase ごとの作業フロー

#### Phase 1: `create-page-dialog.tsx` の移行

```bash
# 1. 作業ブランチに切り替え
$ git checkout refactor/form-create-page-dialog

# 2. 実装
$ vim components/create-page-dialog.tsx
# react-hook-form + form.tsx ライブラリに移行
# テストを更新
# lint を実行

# 3. テスト実行
$ bun run test -- create-page-dialog
$ bun run lint

# 4. Commit
$ git add .
$ git commit -m "refactor: migrate create-page-dialog to form library

- Replace useState with useForm hook
- Implement Zod schema for validation
- Use Form, FormField, FormItem components
- Update tests for new implementation
- Fixes: #12"

# 5. Push
$ git push origin refactor/form-create-page-dialog

# 6. GitHub で PR を作成
# Base: refactor/form-library-unification
# Compare: refactor/form-create-page-dialog
```

#### Phase 1: `deck-form.tsx` の移行（並行）

**別の developer が並行実行可能**:

```bash
# 別ターミナル・別PC
$ git checkout feature/unified-link-migration-and-tdd
$ git pull origin feature/unified-link-migration-and-tdd

# Phase 1-b のブランチを作成（統合ブランチから）
$ git checkout -b refactor/form-deck-page
$ git push -u origin refactor/form-deck-page

# 同様に実装・PR 作成
```

**効果**:
- ✅ 2 人が異なるファイルを同時に作業可能
- ✅ コンフリクトなし（異なるファイルのため）
- ✅ PR レビュー並行実行可能

### PR レビュー・マージ

#### PR 作成後の流れ

```
1. GitHub で PR を作成
   ├─ Base: refactor/form-library-unification
   ├─ Compare: refactor/form-create-page-dialog
   └─ Description: 実装内容、テスト内容を記載

2. CI チェック実行
   ├─ Lint ✅
   ├─ Unit Test ✅
   ├─ Type Check ✅
   └─ Build ✅

3. Code Review
   ├─ 実装パターンの確認
   ├─ テスト漏れの確認
   └─ ドキュメント確認

4. Approve & Merge
   ├─ Squash merge（コミット履歴をきれいに）
   ├─ または Merge commit（履歴を保持）
   └─ 本人が merge（GitHub UI から）
```

#### マージ時のコマンド例

```bash
# 統合ブランチに戻る
$ git checkout refactor/form-library-unification

# 最新の統合ブランチを取得
$ git pull origin refactor/form-library-unification

# 作業ブランチから最新を取得
$ git pull origin refactor/form-create-page-dialog

# ローカルで merge（競合がないか確認）
$ git merge refactor/form-create-page-dialog

# 問題なければ push
$ git push origin refactor/form-library-unification

# GitHub UI から PR を "Merge pull request" で確認
```

---

## 複雑なシナリオ対応

### シナリオ 1: 作業中に緊急バグを発見

**状況**:
```
現在: refactor/form-create-page-dialog で作業中
イベント: inquiry-form.tsx にバリデーションバグを発見
対応: 即座に修正して別 PR で提出したい
```

**対応手順**:

```bash
# 1. 現在の作業を一時保存
$ git stash
# 出力: Saved working directory and staged changes to refs/stash@{0}

# 2. 統合ブランチに切り替え
$ git checkout refactor/form-library-unification
$ git pull origin refactor/form-library-unification

# 3. 緊急修正用ブランチを作成
$ git checkout -b fix/inquiry-validation-bug

# 4. バグ修正
$ vim app/(public)/inquiry/_components/inquiry-form.tsx
# 修正...

# 5. テスト実行
$ bun run test -- inquiry-form
$ bun run lint

# 6. Commit & Push
$ git add .
$ git commit -m "fix: improve validation error handling in inquiry form

- Add missing error state check
- Improve error message clarity
- Update test cases"

$ git push -u origin fix/inquiry-validation-bug

# 7. GitHub で PR 作成（base: refactor/form-library-unification）

# 8. PR が merge されるまで待機（または自分で merge）
$ git checkout refactor/form-library-unification
$ git pull origin refactor/form-library-unification

# 9. 元の作業に戻る
$ git checkout refactor/form-create-page-dialog

# 10. 作業を復元
$ git stash pop
# または $ git stash list で確認してから $ git stash pop

# 11. 作業継続
$ bun run test  # 緊急修正による影響確認
```

**フロー図**:

```
作業ブランチ: refactor/form-create-page-dialog
  ↓ stash（作業を一時保存）
統合ブランチ: refactor/form-library-unification
  ↓ pull（最新を取得）
緊急ブランチ: fix/inquiry-validation-bug
  ↓ 修正・commit・push
GitHub PR: fix/inquiry-validation-bug → refactor/form-library-unification
  ↓ merge ✅
戻る: refactor/form-create-page-dialog
  ↓ stash pop（作業を復元）
作業再開 ✅
```

### シナリオ 2: 統合ブランチが進んだ状況で作業ブランチを更新

**状況**:
```
refactor/form-library-unification に他の developer が merge
  ↓
あなたの refactor/form-deck-page がコンフリクト可能性あり
対応: 統合ブランチの最新を作業ブランチに反映
```

**対応手順**:

```bash
# 1. 統合ブランチの最新を確認
$ git checkout refactor/form-library-unification
$ git pull origin refactor/form-library-unification

# 2. 作業ブランチに切り替え
$ git checkout refactor/form-deck-page

# 3. 統合ブランチから最新を取得（rebase を推奨）
$ git pull --rebase origin refactor/form-library-unification

# 【もしコンフリクトが発生した場合】
# 3a. コンフリクト箇所を編集
$ vim <conflict-file>

# 3b. Rebase 継続
$ git add .
$ git rebase --continue

# 4. Force push（rebase したため）
$ git push -f origin refactor/form-deck-page
```

**注意**:
- ⚠️ Force push は自分のブランチのみ
- ⚠️ 共有ブランチ（統合ブランチ・main）には force push しない
- ⚠️ Rebase vs Merge の選択：
  - **Rebase**: 履歴をきれいに保つ（推奨）
  - **Merge**: 履歴を保持、merge commit が残る

### シナリオ 3: Phase 1 完了後、Phase 2 への update

**状況**:
```
Phase 1 が完了して、refactor/form-library-unification に merge
Phase 2 ブランチ (refactor/form-page-profile) を新規作成
Phase 2 で Phase 1 の変更を反映する必要がある
```

**対応手順**:

```bash
# 1. 統合ブランチが最新であることを確認
$ git checkout refactor/form-library-unification
$ git pull origin refactor/form-library-unification

# 2. Phase 2 ブランチを統合ブランチから作成
$ git checkout -b refactor/form-page-profile
$ git push -u origin refactor/form-page-profile

# ※ Phase 1 の変更は既に統合ブランチに含まれているため、
#    新規ブランチ作成時点で自動的に反映される
```

---

## トラブルシューティング

### Q1: 作業ブランチで誤って main へ merge してしまった

**状況**:
```bash
$ git push origin refactor/form-create-page-dialog
# 誤って main へ push してしまった
```

**解決策**:

```bash
# 1. 状況確認
$ git log --oneline -5 origin/main

# 2. main を前の commit に戻す
$ git checkout main
$ git reset --hard HEAD~1  # 最新 commit を取り消し
$ git push -f origin main

# 3. または GitHub の Revert 機能を使用
# GitHub → Pull requests → Revert
```

**予防策**:
- 作業ブランチ以外への push は慎重に
- `git push` の実行前に `git branch` で確認
- Protect rules を main ブランチに設定

### Q2: Rebase 中にコンフリクトが発生

**状況**:
```bash
$ git pull --rebase origin refactor/form-library-unification
# conflict detected
```

**解決策**:

```bash
# 1. コンフリクト状況を確認
$ git status

# 2. 各ファイルのコンフリクト箇所を編集
$ vim <conflict-file>
# <<<<<<< HEAD
# あなたの変更
# =======
# 統合ブランチの変更
# >>>>>>> refactor/form-library-unification
# この部分を手動で編集

# 3. 編集後、add
$ git add <conflict-file>

# 4. Rebase 継続
$ git rebase --continue

# 5. Push
$ git push -f origin <your-branch>
```

### Q3: Stash した作業を失ってしまった

**状況**:
```bash
$ git stash pop
# 誤って別の branch で stash pop した
```

**回復策**:

```bash
# 1. Stash 一覧を確認
$ git stash list
# stash@{0}: WIP on refactor/form-create-page-dialog: abc1234 commit message
# stash@{1}: WIP on refactor/form-deck-page: def5678 commit message

# 2. 特定の stash を確認
$ git stash show stash@{0}

# 3. 特定の stash を復元
$ git stash pop stash@{0}

# 4. または新しいブランチに復元
$ git stash branch new-branch-name stash@{0}
```

---

## ベストプラクティス

### 1. コミットメッセージ規則

**Conventional Commit 形式を推奨**:

```
type(scope): subject

body

footer
```

**例**:

```
refactor(forms): migrate create-page-dialog to form library

- Replace useState with useForm hook
- Implement Zod schema for validation
- Update tests for new implementation

Closes: #12
Co-authored-by: Developer Name <email@example.com>
```

**タイプ**:
- `feat`: 新しい機能
- `fix`: バグ修正
- `refactor`: リファクタリング
- `test`: テスト追加/修正
- `docs`: ドキュメント
- `chore`: ビルド等の雑務

### 2. PR description のテンプレート

```markdown
## 概要
[この PR で何を実装したか、簡潔に]

## 実装内容
- [ ] form.tsx ライブラリへの移行
- [ ] バリデーション実装
- [ ] テスト追加

## テスト結果
- [ ] Unit tests pass: `bun run test`
- [ ] Lint pass: `bun run lint`
- [ ] Build success: `bun run build`

## 関連する Issue
Closes #12

## レビューポイント
[レビュアーが注目してほしい箇所]

## 備考
[その他の備考]
```

### 3. ブランチ管理のチェックリスト

作業開始時:
- [ ] メイン開発ブランチが最新か確認
- [ ] 統合ブランチが最新か確認
- [ ] 新しい作業ブランチから既に同じ作業がないか確認
- [ ] ブランチ命名が規則に従っているか確認

作業中:
- [ ] Lint が通っているか
- [ ] テストが通っているか
- [ ] コミットメッセージが明確か

PR 作成時:
- [ ] Base ブランチが正しいか（通常は統合ブランチ）
- [ ] PR description が詳しいか
- [ ] CI チェックが全て通ったか
- [ ] コンフリクトがないか

マージ時:
- [ ] 少なくとも 1 人のレビュアーが approve したか
- [ ] CI が最後まで通ったか
- [ ] Squash merge か Merge commit か判断したか
- [ ] マージ後、ブランチを削除したか

### 4. 定期的な整理

```bash
# 1 週間ごと
# ローカルの消えたリモートブランチを削除
$ git fetch --prune
$ git branch -vv | grep "gone]"  # 削除対象を確認

# マージ済みブランチをローカルから削除
$ git branch --merged | grep -v main | grep -v feature | xargs git branch -d

# 2 週間ごと
# 統合ブランチから古いブランチを確認
$ git log --graph --all --oneline --decorate
```

---

## 関連ドキュメント

- [Git ワークフロー](../../../docs/04_implementation/guides/)
- [Conventional Commit](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Git Branching Model (Git Flow)](https://nvie.com/posts/a-successful-git-branching-model/)

---

## よくある質問

### Q: 統合ブランチに直接 commit してもいい？

**A**: 原則、直接 commit しないでください。理由：
- 作業ブランチ → PR → review → merge の流れで品質管理
- 統合ブランチは「確認済みの変更」の集約地

### Q: 複数の統合ブランチを並行できる？

**A**: はい、可能です。例：
```
feature/main-dev
├─ epic/form-library-refactor
└─ epic/api-redesign
```

各 epic が独立して進行可能。ただし main-dev へのマージ時に調整が必要。

### Q: リモートから統合ブランチを pull したら、ローカルブランチも自動更新される？

**A**: いいえ。ローカルブランチは手動で update が必要：
```bash
$ git checkout refactor/form-library-unification
$ git pull origin refactor/form-library-unification
```

### Q: 作業ブランチを削除したい

**A**: GitHub で PR merge 後、自動削除設定可能。または手動：
```bash
# ローカルから削除
$ git branch -d refactor/form-create-page-dialog

# リモートから削除
$ git push origin --delete refactor/form-create-page-dialog
```

---

## まとめ

| 要素 | 推奨ベストプラクティス |
|------|----------------------|
| **ブランチ階層** | 3 層構造（main, feature, epic, working） |
| **命名規則** | `{type}/{feature-name}` |
| **PR 作成** | 作業ブランチ → 統合ブランチ |
| **マージ** | Squash merge（履歴きれいに） |
| **コンフリクト対応** | Rebase で解決 |
| **緊急対応** | git stash/pop 活用 |
| **コミットメッセージ** | Conventional Commit 形式 |
| **整理** | 定期的な古いブランチ削除 |

---

**最終更新**: 2025-10-17  
**作成者**: AI Assistant
