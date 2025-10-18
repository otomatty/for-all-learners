# 階層化ブランチ戦略：実装クイックガイド

**作成日**: 2025-10-17  
**タイプ**: 実装ガイド  
**関連Issue**: #12

## 🚀 5分でわかる実装フロー

### Phase 1: セットアップ（1回のみ）

```bash
# 1. メイン開発ブランチから統合ブランチを作成
$ git checkout feature/unified-link-migration-and-tdd
$ git pull origin feature/unified-link-migration-and-tdd
$ git checkout -b refactor/form-library-unification
$ git push -u origin refactor/form-library-unification

# ✅ 統合ブランチ完成
```

### Phase 2: 各ワーカーの作業フロー（毎 Phase 繰り返し）

```bash
# 1. 統合ブランチから作業ブランチを作成
$ git checkout refactor/form-library-unification
$ git pull origin refactor/form-library-unification
$ git checkout -b refactor/form-create-page-dialog
$ git push -u origin refactor/form-create-page-dialog

# 2. コーディング・テスト
$ vim components/create-page-dialog.tsx
$ bun run test -- create-page-dialog
$ bun run lint

# 3. Commit & Push
$ git add .
$ git commit -m "refactor: migrate create-page-dialog to form library"
$ git push origin refactor/form-create-page-dialog

# 4. GitHub で PR 作成（base: refactor/form-library-unification）

# ✅ PR が merge されるのを待機
```

### Phase 3: マージ完了後

```bash
# 1. 統合ブランチに戻す
$ git checkout refactor/form-library-unification
$ git pull origin refactor/form-library-unification

# 2. 次の Phase へ（Phase 2 に戻る）
```

---

## 🔄 よくあるシナリオ別コマンド

### 緊急タスクが発生した場合

```bash
# 現在の作業を一時保存
$ git stash

# 統合ブランチに戻る
$ git checkout refactor/form-library-unification
$ git pull origin refactor/form-library-unification

# 緊急ブランチを作成
$ git checkout -b fix/urgent-bug-name

# 修正・commit・push
$ git add . && git commit -m "fix: ..."
$ git push -u origin fix/urgent-bug-name

# GitHub で PR 作成（base: refactor/form-library-unification）

# 元の作業に戻る
$ git checkout refactor/form-create-page-dialog
$ git stash pop  # 作業を復元
```

### 統合ブランチが進んだ場合

```bash
# 最新を反映
$ git pull --rebase origin refactor/form-library-unification

# コンフリクトがあれば編集して
$ git add .
$ git rebase --continue
$ git push -f origin refactor/form-create-page-dialog
```

### ブランチの整理

```bash
# ローカルの古いリモートブランチ情報を削除
$ git fetch --prune

# マージ済みブランチをローカルから削除
$ git branch -d refactor/form-create-page-dialog

# リモートから削除
$ git push origin --delete refactor/form-create-page-dialog
```

---

## 📋 チェックリスト

### 毎 Phase 開始時

- [ ] 統合ブランチが最新か確認：`git pull origin refactor/form-library-unification`
- [ ] 作業ブランチが正しく作成されたか：`git branch -vv`
- [ ] ブランチ名が命名規則に従っているか

### 作業中（コミット前）

- [ ] Lint が通っているか：`bun run lint`
- [ ] テストが通っているか：`bun run test`
- [ ] コミットメッセージが明確か

### PR 作成時

- [ ] Base ブランチが `refactor/form-library-unification` か
- [ ] CI が全て通ったか
- [ ] コンフリクトがないか
- [ ] Description に実装内容を記載したか

---

## 🔗 ブランチ図

```
main
  │
  └─── feature/unified-link-migration-and-tdd
        │
        └─── refactor/form-library-unification (統合ブランチ)
              │
              ├─── refactor/form-create-page-dialog (Phase 1-a)
              ├─── refactor/form-deck-page (Phase 1-b)
              ├─── refactor/form-page-profile (Phase 2)
              └─── refactor/form-admin-pages (Phase 3)
```

---

## 🎯 PR マージの流れ

```
1. 作業完了
   ↓
2. Commit & Push
   ↓
3. PR 作成（GitHub）
   ↓
4. CI チェック ✅
   ↓
5. Code Review
   ↓
6. Approve ✅
   ↓
7. Merge（GitHub UI）
   ↓
8. ブランチ削除（GitHub UI）
```

---

## 📚 関連ドキュメント

詳細は以下を参照：
- [階層化ブランチ戦略ガイド](./20251017_01_hierarchical-branch-strategy.md) - 完全なドキュメント

---

**最終更新**: 2025-10-17
