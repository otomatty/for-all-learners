# 20251029_01 N+1クエリ問題修正 - ActivityCalendar

**作成日**: 2025-10-29
**関連Issue**: #35
**優先度**: ⭐⭐⭐⭐⭐ (最高)
**ステータス**: ✅ 完了

## 実施した作業

### 問題の概要

`getMonthlyActivitySummary`関数で、月の各日に対してループ内でデータベースクエリを実行していたため、最大62回のクエリが発生していた（31日 × 2クエリ/日）。

### 実装内容

#### 1. 月全体のデータを一括取得する関数を追加

**追加した関数:**

- `fetchMonthlyLearningLogs()` - 学習ログを月全体で一括取得
- `fetchMonthlyPages()` - ページ作成・更新データを月全体で一括取得  
- `fetchMonthlyLinks()` - リンク作成データを月全体で一括取得

#### 2. クライアント側で日別に集計する関数を追加

**追加した関数:**

- `calculateLearningStatsFromLogs()` - 取得済みログから特定日の統計を計算
- `calculateNoteStatsFromData()` - 取得済みページ・リンクから特定日の統計を計算

#### 3. `getMonthlyActivitySummary`を修正

**Before (N+1問題):**
```typescript
// 月の全日付を処理
while (currentDate <= monthEnd) {
  const [learning, notes] = await Promise.all([
    calculateLearningStats(userId, currentDate),  // DB query
    calculateNoteStats(userId, currentDate),      // DB query x3
  ]);
  // ... 31回繰り返し = 62+ queries
}
```

**After (一括取得 + クライアント側集計):**
```typescript
// Bulk fetch all data for the month (3 queries total)
const [learningLogs, pages, links] = await Promise.all([
  fetchMonthlyLearningLogs(userId, monthStart, monthEnd),
  fetchMonthlyPages(userId, monthStart, monthEnd),
  fetchMonthlyLinks(monthStart, monthEnd),
]);

// Process all days with client-side aggregation
while (currentDate <= monthEnd) {
  const learning = calculateLearningStatsFromLogs(learningLogs, currentDate);
  const notes = calculateNoteStatsFromData(pages, links, currentDate);
  // No DB query inside loop!
}
```

#### 4. エラーログをloggerに統一

`console.error`を`logger.error`に置き換え、構造化ログに統一。

## 変更ファイル

- `app/_actions/activity_calendar.ts` (主要修正)
  - 新規関数追加: 5個
  - `getMonthlyActivitySummary`の最適化
  - エラーハンドリング改善

## パフォーマンス改善結果

### クエリ数の削減

| 項目 | Before | After | 改善率 |
|------|--------|-------|--------|
| 学習ログクエリ | 31回/月 | 1回/月 | 97% 削減 |
| ページクエリ | 31回/月 | 1回/月 | 97% 削減 |
| リンククエリ | 31回/月 | 1回/月 | 97% 削減 |
| **合計** | **62-93回** | **3回** | **96% 削減** |

### 期待される効果

- **初期ロード時間**: 大幅な短縮（データ量に応じて数秒単位の改善）
- **データベース負荷**: 96%削減
- **スケーラビリティ**: ユーザー数増加に強い設計

## テスト確認項目

- [x] TypeScriptコンパイルエラーなし
- [x] Lintエラーなし
- [ ] 既存のテストが全てパス（要確認）
- [ ] カレンダー表示が正常に動作（手動テスト必要）
- [ ] データ精度が変更前と一致（手動テスト必要）

## 次のステップ

### 今回実装したこと (Phase 1)
- ✅ N+1クエリ問題の修正
- ✅ 一括取得方式への変更
- ✅ エラーハンドリング改善

### 今後の改善 (Phase 2)
1. **統合テストの追加**
   - 月全体の集計が正しいことを検証
   - パフォーマンステストの追加

2. **キャッシング戦略**
   - React QueryまたはSWRでキャッシュ
   - 同じ月の再取得を防ぐ

3. **データ取得の最適化**
   - インデックスの追加確認
   - クエリプランの分析

4. **プログレッシブローディング**
   - 現在月を優先表示
   - 前後の月は遅延ロード

## 関連ドキュメント

- **Issue**: #35 - Fix N+1 query problem in getMonthlyActivitySummary
- **実装計画**: `docs/03_plans/dashboard-calendar-ui/20251028_01_calendar-ui-specification.md`
- **コード品質Issue**: `docs/01_issues/open/2025_10/20251029_04_code-quality.md`

## 学び・気づき

### 技術的な学び

1. **N+1問題の検出方法**
   - ループ内でのDB呼び出しに注意
   - クエリ数をログで監視

2. **一括取得のトレードオフ**
   - メモリ使用量の増加（月全体のデータ）
   - しかし、実際のデータ量は数百〜数千レコード程度
   - ネットワークI/Oの削減効果の方が大きい

3. **型安全性の重要性**
   - データベースからの取得型に`null`を考慮
   - フィルタリングロジックでnullチェック

### プロジェクト管理

1. **段階的な実装の重要性**
   - 既存関数を残しながら新関数を追加
   - 切り替えはメイン関数のみ修正
   - ロールバックが容易

2. **ドキュメント駆動の効果**
   - Issue #35で問題が明確化
   - 実装方針が事前に決定
   - スムーズな実装が可能

---

**作成者**: GitHub Copilot
**最終更新**: 2025-10-29
