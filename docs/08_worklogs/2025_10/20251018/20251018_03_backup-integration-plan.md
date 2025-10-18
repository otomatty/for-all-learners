# バックアップブランチ統合計画

**作成日**: 2025-10-18  
**作業ブランチ**: `integrate/backup-2025-10-18`  
**ステータス**: 🔍 分析中

---

## 📋 バックアップブランチ情報

### ブランチ詳細

| 項目                   | 値                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| **ブランチ名**         | `remote/main-backup`                                                                               |
| **最新コミット**       | `079974c`                                                                                          |
| **コミット日時**       | 2025-10-18 16:42:01 +0900                                                                          |
| **コミットメッセージ** | feat: Add detailed issue documentation for unresolved infinite POST loop and caching configuration |

### バックアップのコミット履歴

```
079974c - feat: Add detailed issue documentation for unresolved infinite POST loop and caching configuration (2025-10-18)
5faebc2 - docs: Restore missing worklog documents from 20251015-20251018
6b92fde - docs: Add static/dynamic route switching investigation worklog
79cc5f3 - feat: Add legacy link migrator and content sanitization utilities
```

---

## 🔄 main ブランチとの差分分析

### 📊 差分統計

| メトリクス         | 値              |
| ------------------ | --------------- |
| **変更ファイル数** | 17              |
| **削除ファイル数** | 4               |
| **変更行数**       | +1,200 / -3,206 |

### 📝 変更内容詳細

#### **削除ファイル** (main にはあるが backup にはない)

| ファイル                                                              | 行数 | 理由                 |
| --------------------------------------------------------------------- | ---- | -------------------- |
| `RESTORE_2025_10_15_SUMMARY.md`                                       | 236  | 不要なサマリー削除   |
| `docs/08_worklogs/.../comprehensive-worklog-summary.md`               | 589  | ワークログ整理       |
| `docs/08_worklogs/.../20251018_01_infinite-post-loop-fix.md`          | 277  | 修正ドキュメント削除 |
| `docs/issues/open/20251018_infinite-post-loop-investigation-guide.md` | 382  | 調査ガイド削除       |
| `docs/issues/open/20251018_infinite-post-root-cause-analysis.md`      | 485  | 根本原因分析削除     |

#### **変更ファイル** (内容が異なる)

| ファイル                                                     | 変更内容                      |
| ------------------------------------------------------------ | ----------------------------- |
| `app/(protected)/pages/[id]/_components/edit-page-form.tsx`  | 大幅な形式変更 (680 行差分)   |
| `app/(protected)/pages/[id]/_hooks/useAutoSave.ts`           | 機能改善 (66 行差分)          |
| `app/(protected)/pages/[id]/_hooks/useEditorInitializer.ts`  | 軽微な修正 (7 行差分)         |
| `app/(protected)/pages/[id]/_hooks/useLinkSync.ts`           | 機能調整 (14 行差分)          |
| `app/(protected)/pages/[id]/_hooks/usePageSaver.ts`          | 機能調整 (32 行差分)          |
| `app/(protected)/pages/[id]/page.tsx`                        | 大幅な機能変更 (318 行差分)   |
| `app/(protected)/pages/_components/pages-list-container.tsx` | UI 更新 (102 行差分)          |
| `app/_actions/updatePage.ts`                                 | 機能改善 (208 行差分)         |
| `app/api/cosense/sync/list/[cosenseProjectId]/route.ts`      | 大幅な変更 (430 行差分)       |
| `lib/unilink/auto-reconciler.ts`                             | リファクタリング (340 行差分) |
| `lib/unilink/page-cache-preloader.ts`                        | 機能調整 (32 行差分)          |
| `lib/unilink/reconcile-queue.ts`                             | リファクタリング (208 行差分) |

---

## 🎯 統合戦略

### オプション 1: マージでの統合

```bash
git merge remote/main-backup
```

**メリット**:

- 履歴を保持
- すべての変更を一度に取り込む
- ロールバック可能

**デメリット**:

- コンフリクト解決が必要な可能性
- 複雑なマージコミットが生成される

### オプション 2: チェリーピックでの統合

各コミットを個別にチェリーピック：

```bash
git cherry-pick 6b92fde  # docs: Add static/dynamic route switching investigation worklog
git cherry-pick 5faebc2  # docs: Restore missing worklog documents
git cherry-pick 079974c  # feat: Add detailed issue documentation
```

**メリット**:

- 各変更を個別に検証できる
- 不要な変更をスキップ可能

**デメリット**:

- 複数のコミットが必要
- コンフリクト解決が複数回必要な可能性

### オプション 3: 選別してのマージ

重要な変更のみを手動でマージ：

```bash
git checkout remote/main-backup -- app/_actions/updatePage.ts
git checkout remote/main-backup -- lib/unilink/
# ... 必要なファイルのみ選別
```

**メリット**:

- 不要な変更を避ける
- ドキュメント削除を回避

**デメリット**:

- 手作業が多い
- ファイル依存性の管理が複雑

---

## 📋 主な変更内容の詳細

### 1. ページエディター関連の大幅改善

**ファイル**: `app/(protected)/pages/[id]/_components/edit-page-form.tsx`

バックアップは大幅な形式変更を含む可能性があります。

### 2. 自動保存機能の改善

**ファイル**: `app/(protected)/pages/[id]/_hooks/useAutoSave.ts`

ユーザーの自動保存体験を改善している可能性。

### 3. ページアクション層の改善

**ファイル**: `app/_actions/updatePage.ts`

より堅牢なページ更新処理が実装されている可能性。

### 4. Cosense 同期処理の改善

**ファイル**: `app/api/cosense/sync/list/[cosenseProjectId]/route.ts`

外部 API 連携の大幅な改善が行われている可能性。

### 5. Unilink 関連の最適化

**ファイル**: `lib/unilink/auto-reconciler.ts`, `reconcile-queue.ts`

内部リンク解決の最適化やリファクタリングが行われている可能性。

---

## ⚠️ 検討事項

### リスク評価

| リスク               | 評価   | 対応                       |
| -------------------- | ------ | -------------------------- |
| **コンフリクト発生** | 中程度 | マージ前に詳細確認         |
| **既存機能破壊**     | 低程度 | テスト実行必須             |
| **ドキュメント競合** | 低程度 | 必要なドキュメントのみ取込 |

### 推奨される統合手順

1. ✅ **現在の状態**: `integrate/backup-2025-10-18` ブランチ作成済み
2. 📌 **次のステップ**: バックアップブランチとのマージ検討
3. 📌 **テスト実行**: マージ後の機能検証
4. 📌 **確認項目**: 無限 POST ループが解決されているか確認
5. 📌 **最終判定**: main ブランチへのプッシュ判定

---

## 🔍 確認項目チェックリスト

### マージ前の確認

- [ ] バックアップブランチのコンフリクト箇所を確認
- [ ] 無限 POST ループ修正が保持されているか確認
- [ ] useLinkSync.ts の修正内容を比較
- [ ] usePageSaver.ts の修正内容を比較

### マージ後の確認

- [ ] コンパイルエラーがないか確認
- [ ] ユニットテスト全て成功するか確認
- [ ] ページエディターで POST リクエストが正常か確認
- [ ] 自動保存機能が正常に動作するか確認

---

## 📁 作業ブランチ情報

**ブランチ名**: `integrate/backup-2025-10-18`

```
main (1b99a11)
  ↓
  └─ integrate/backup-2025-10-18 (新規作成)
      ↓
      └─ remote/main-backup (079974c) へのマージ候補
```

---

## 📝 次のコマンド

### バックアップブランチをマージする場合

```bash
# 現在のブランチが integrate/backup-2025-10-18 であることを確認
git branch

# マージ実行
git merge remote/main-backup

# コンフリクト発生時の対応
git status  # コンフリクト箇所を確認
# ファイルを手動修正
git add .
git commit -m "Merge remote/main-backup with conflict resolution"
```

### 個別コミットをチェリーピックする場合

```bash
git cherry-pick 6b92fde
git cherry-pick 5faebc2
git cherry-pick 079974c
```

---

**次のステップ**: 上記のマージ戦略から選択してください。
