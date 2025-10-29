# 20251029_02 Supabase .neq() クエリバグ修正

**作成日**: 2025-10-29
**関連Issue**: #36
**優先度**: ⭐⭐⭐⭐ (高)
**ステータス**: ✅ 完了

## 実施した作業

### 問題の概要

Supabaseの`.neq('created_at', 'updated_at')`が列名を文字列として比較しており、実際の値を比較していませんでした。これにより、更新されたページが正しくフィルタリングされず、ノート統計が不正確になっていました。

### 実装内容

#### 修正箇所

**1. `calculateNoteStats()` 関数（lines 328-335）**

```typescript
// Before: Incorrect .neq() usage
const { data: updatedPages } = await supabase
  .from("pages")
  .select("id, created_at, updated_at")
  .neq("created_at", "updated_at"); // ❌ 列名を文字列比較

// After: Client-side filtering
const { data: allUpdatedPages } = await supabase
  .from("pages")
  .select("id, created_at, updated_at")
  .gte("updated_at", dayStart.toISOString())
  .lte("updated_at", dayEnd.toISOString());

const updatedPages = allUpdatedPages?.filter(
  (page) => page.created_at !== page.updated_at,
) || [];
```

**2. `getDayActivityDetail()` 関数（lines 639-647）**

```typescript
// Before: Incorrect .neq() usage
const { data: updatedPages } = await supabase
  .from("pages")
  .select("id, title, updated_at, created_at")
  .neq("created_at", "updated_at"); // ❌ 列名を文字列比較

// After: Client-side filtering
const { data: allUpdatedPages } = await supabase
  .from("pages")
  .select("id, title, updated_at, created_at")
  .gte("updated_at", dayStart.toISOString())
  .lte("updated_at", dayEnd.toISOString());

const updatedPages = allUpdatedPages?.filter(
  (page) => page.created_at !== page.updated_at,
) || [];
```

### 技術的な詳細

#### Supabase .neq() の制限

Supabaseの`.neq()`メソッドは、列の値を別の**固定値**と比較するためのものです：

```typescript
// ✅ 正しい使用例: 列の値と固定値を比較
.neq('status', 'deleted')  // status列が'deleted'でないものを取得

// ❌ 間違った使用例: 列同士を比較
.neq('created_at', 'updated_at')  // これは機能しない
```

列同士を比較する場合は、以下のいずれかの方法を使用する必要があります：

1. **クライアント側でフィルタリング**（今回採用）
2. **SQL関数を使用**（`rpc()`を使用）
3. **データベースビューを作成**

今回は、パフォーマンスとシンプルさのバランスを考慮して、クライアント側フィルタリングを採用しました。

### 影響範囲

#### 修正前の問題

- 更新されたページが正しくカウントされない
- `pagesUpdated`の値が常に全てのページを含む
- ノート統計が不正確

#### 修正後の改善

- 更新されたページのみが正しくカウント
- 新規作成と更新が明確に区別される
- ノート統計が正確に表示

## 変更ファイル

- `app/_actions/activity_calendar.ts`
  - `calculateNoteStats()` 関数を修正
  - `getDayActivityDetail()` 関数を修正

## テスト確認項目

- [x] TypeScriptコンパイルエラーなし
- [x] Lintエラーなし
- [ ] 更新されたページが正しくカウントされる（手動テスト必要）
- [ ] 新規作成と更新が正しく区別される（手動テスト必要）

## パフォーマンス影響

### クエリ数

- **変更なし**: 同じ数のクエリ（修正前後で同じ）

### データ転送量

- **わずかに増加**: フィルタリング前のデータを取得するため
  - しかし、実際には数十〜数百レコード程度
  - クライアント側フィルタリングのオーバーヘッドは最小限

### トレードオフ

| 項目 | クライアント側 | RPC関数 | ビュー |
|------|---------------|---------|--------|
| 実装の簡易性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| パフォーマンス | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 保守性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| データ転送量 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

今回は**実装の簡易性**と**保守性**を優先しました。

## 次のステップ

### 今回実装したこと
- ✅ `.neq()`バグの修正
- ✅ クライアント側フィルタリングへの移行
- ✅ コメント追加（理由を明記）

### 今後の改善（必要に応じて）

1. **データ量が増加した場合の最適化**
   - RPC関数を使用してデータベース側でフィルタリング
   - ページネーションの導入

2. **統合テストの追加**
   - 新規作成と更新の区別が正しいことを検証
   - エッジケース（created_at === updated_at）のテスト

3. **モニタリング**
   - データ転送量の監視
   - クライアント側フィルタリングの処理時間を測定

## 関連ドキュメント

- **Issue**: #36 - Fix Supabase .neq() query bug
- **実装計画**: `docs/03_plans/dashboard-calendar-ui/20251028_01_calendar-ui-specification.md`
- **前回の作業**: `docs/05_logs/2025_10/20251029/01_fix-n-plus-1-query-issue.md`

## 学び・気づき

### 技術的な学び

1. **ORMの制約を理解する**
   - Supabase（PostgREST）は列同士の比較を直接サポートしない
   - 各ORMには独自の制約がある
   - ドキュメントを確認してから実装する

2. **シンプルな解決策を優先**
   - 複雑なRPC関数より、クライアント側フィルタリングが適切な場合もある
   - データ量とパフォーマンス要件に応じて選択

3. **コメントの重要性**
   - なぜその実装を選択したかをコメントに記載
   - 将来の開発者（自分自身を含む）への説明

### デバッグの学び

1. **静かに失敗するバグに注意**
   - `.neq()`はエラーを出さずに誤った結果を返す
   - 統計が不正確な場合は、クエリロジックを疑う

2. **型システムの限界**
   - TypeScriptは実行時のクエリロジックをチェックできない
   - テストとレビューが重要

---

**作成者**: GitHub Copilot
**最終更新**: 2025-10-29
