# PR#31 レビュー指摘事項 修正計画

このディレクトリには、PR#31（develop → main）のGemini Code Assistレビューで指摘された5件の問題に対する修正計画とタスクリストが含まれています。

---

## 📚 ドキュメント一覧

| ファイル | 内容 | 対象者 |
|---------|------|--------|
| [20251029_01_implementation-plan.md](./20251029_01_implementation-plan.md) | 全体実装計画書 | 全員 |
| [20251029_02_phase1-tasks.md](./20251029_02_phase1-tasks.md) | Phase 1 タスクリスト | 実装者 |
| [20251029_03_phase2-tasks.md](./20251029_03_phase2-tasks.md) | Phase 2 タスクリスト | 実装者 |
| [20251029_04_phase3-tasks.md](./20251029_04_phase3-tasks.md) | Phase 3 タスクリスト | 実装者 |

---

## 🎯 修正内容の概要

### Phase 1: エラーログ追加（即座実施）
**所要時間**: 15-20分  
**優先度**: 🔴 High

#### 修正対象
1. `EditPageForm.tsx` - サムネイル自動設定エラー
2. `EditPageForm.tsx` - ページ削除エラー
3. `page-links-grid.tsx` - ページ作成失敗

#### 期待効果
- デバッグ時間を50-70%短縮
- エラー追跡が容易に

---

### Phase 2: パフォーマンス改善（次回実施）
**所要時間**: 30-45分  
**優先度**: 🟡 Medium

#### 修正対象
1. `notes-sidebar.tsx` - 重複除去の最適化（O(n²) → O(n)）

#### 期待効果
- 100件以上のノート表示が20倍高速化
- UI レスポンスの改善

---

### Phase 3: N+1クエリ最適化（別PR推奨）
**所要時間**: 1-2時間  
**優先度**: 🔴 High（パフォーマンス）

#### 修正対象
1. `linkGroups.ts` - `getLinkGroupsForPage` の最適化

#### 期待効果
- クエリ数を75-90%削減
- ページ表示が5-10倍高速化
- データベース負荷を大幅削減

---

## 🚀 クイックスタート

### 1. Phase 1を開始する

```bash
# ブランチを確認
git branch
# -> fix/pr31-review-phase1-error-logging

# タスクリストを開く
open docs/03_plans/pr31-review-fixes/20251029_02_phase1-tasks.md

# 修正開始
code app/(protected)/pages/[id]/_components/EditPageForm.tsx
```

### 2. Phase 2を開始する（Phase 1完了後）

```bash
# develop ブランチに戻る
git checkout develop

# 新しいブランチを作成
git checkout -b fix/pr31-review-phase2-performance

# タスクリストを開く
open docs/03_plans/pr31-review-fixes/20251029_03_phase2-tasks.md

# 修正開始
code app/(protected)/notes/_components/notes-sidebar.tsx
```

### 3. Phase 3を開始する（Phase 2完了後、別PR）

```bash
# develop ブランチに戻る
git checkout develop

# 新しいブランチを作成
git checkout -b fix/pr31-review-phase3-n-plus-one

# タスクリストを開く
open docs/03_plans/pr31-review-fixes/20251029_04_phase3-tasks.md

# 修正開始
code app/_actions/linkGroups.ts
```

---

## 📊 修正の影響範囲

| Phase | 修正ファイル数 | テスト影響 | Breaking Changes |
|-------|----------------|------------|------------------|
| Phase 1 | 2ファイル | なし | なし |
| Phase 2 | 1ファイル | 最小限 | なし |
| Phase 3 | 1ファイル | 大（327件） | なし |

---

## ✅ 完了基準

### Phase 1
- [x] ブランチ作成完了
- [x] 実装計画書作成
- [x] タスクリスト作成
- [ ] 修正実装完了
- [ ] テスト全てパス
- [ ] PR#31にマージ（またはdevelopにマージ）

### Phase 2
- [ ] ブランチ作成
- [ ] 修正実装完了
- [ ] パフォーマンステスト実施
- [ ] PR#31にマージ（またはdevelopにマージ）

### Phase 3
- [ ] ブランチ作成
- [ ] 詳細設計完了
- [ ] 修正実装完了
- [ ] 単体テスト（327件）全てパス
- [ ] パフォーマンステスト実施
- [ ] 別PRでレビュー・マージ

---

## 🔗 関連リンク

- **PR#31**: https://github.com/otomatty/for-all-learners/pull/31
- **Gemini Code Assistレビュー**: PR#31のReviewsタブ
- **Logger実装**: `/lib/logger.ts`
- **既存テスト**: `/app/_actions/__tests__/linkGroups.test.ts`

---

## 📝 進捗管理

### 現在の状態

| Phase | ステータス | 完了日 | 備考 |
|-------|-----------|--------|------|
| Phase 1 | 🏗️ 準備完了 | - | ブランチ作成済み |
| Phase 2 | ⏳ 準備中 | - | Phase 1完了後 |
| Phase 3 | ⏳ 準備中 | - | 別PR推奨 |

---

## 🎯 推奨実施順序

1. **今日中**: Phase 1（15-20分で完了）
2. **今週中**: Phase 2（30-45分で完了）
3. **来週**: Phase 3（1-2時間、別PRで実施）

---

## 💡 ヒント

### デバッグ時
- エラーログは `logger.error` を使用
- 必ずコンテキスト情報を含める（pageId, title, nameなど）
- error オブジェクトは第1引数のオブジェクトに含める

### パフォーマンステスト時
- `console.time` / `console.timeEnd` で測定
- Before/After を必ず記録
- 大規模データ（100件以上）でテスト

### Phase 3実装時
- 既存テスト（327件）を必ず全て確認
- バッチクエリの順序が重要
- Map を使ったルックアップで高速化

---

**作成日**: 2025-10-29  
**最終更新**: 2025-10-29  
**ステータス**: Phase 1 準備完了 ✅
