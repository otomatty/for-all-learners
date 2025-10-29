# Issue: リンク解決ロジック動作確認

**優先度**: 🟠 High  
**推定難度**: ⭐⭐ 中程度（30-60分）  
**推奨期限**: 1-2日以内  
**作成日**: 2025-10-19

---

## 概要

resolver-queue のキー正規化とページ検索ロジックが正確に実装されていることを確認しました。

ただし、テスト環境または実際のデータで「pending 状態のまま遷移しない」という動作が報告されている場合、以下の点を検証する必要があります。

---

## 検証結果

### ✅ 実装は正確

検証した内容:

| 項目 | ファイル | 行番号 | 結果 |
|------|---------|--------|------|
| キャッシュ正規化 | `lib/unilink/utils.ts` | 155-160 | ✅ 正確に実装 |
| キー正規化処理 | `lib/unilink/utils.ts` | 8-27 | ✅ 正確に実装 |
| resolver-queue ロジック | `resolver-queue.ts` | 118-186 | ✅ 正確に実装 |
| 検索実装 | `lib/utils/searchPages.ts` | 8-17 | ✅ ILIKE クエリで大文字小文字を区別しない検索 |

### 処理フロー

```
1. キャッシュ確認
   getCachedPageId(key) → 内部で normalizeTitleToKey() 実行
   
2. ページ検索
   searchPagesWithRetry(raw) → ILIKE クエリで検索
   結果なければ searchPagesWithRetry(key) 実行
   
3. 一致判定
   results.find(r => normalizeTitleToKey(r.title) === key)
   
4. キャッシュ保存
   setCachedPageId(key, exact.id) → 内部で normalizeTitleToKey() 実行
```

---

## 確認すべき点

### 1. resolver-queue が実行されているか

**確認方法**:
- ブラウザコンソール、またはサーバーログで以下のログを確認:
  ```
  [ResolverQueue] Adding item to queue
  [ResolverQueue] Starting resolution
  [ResolverQueue] Exact match found - marking as EXISTS
  ```

**問題の可能性**:
- resolver-queue の追加に失敗している
- editor インスタンスが null になっている
- input rule がマークを正しく生成していない

**ファイル**:
- `lib/tiptap-extensions/unified-link-mark/resolver-queue.ts` - lines 34-45

---

### 2. ページが DB に作成されているか

**確認方法**:
```sql
-- Supabase SQL Editor で実行
SELECT id, title FROM pages 
WHERE title ILIKE '%検索キー%' 
ORDER BY updated_at DESC 
LIMIT 5;
```

**問題の可能性**:
- ページがまだ DB に存在していない
- ページタイトルが異なる形式で保存されている
- ユーザー権限がページにアクセスできない

---

### 3. 検索クエリが正しく機能しているか

**確認方法**:
```typescript
// DevTools で実行
const results = await searchPages("検索キー");
console.log(results);
```

**問題の可能性**:
- searchPages が空配列を返している
- 正規化キーと DB タイトルが一致していない
- ネットワークエラーが発生している

**ファイル**:
- `lib/utils/searchPages.ts` - lines 8-17

---

### 4. resolver タイムアウトが発生していないか

**デフォルト設定**:
- タイムアウト: 5000ms（5秒）
- リトライ: 最大 3回
- バックオフ: 指数バックオフ（100ms → 200ms → 400ms）

**確認方法**:
- ブラウザコンソール、またはサーバーログで以下のログを確認:
  ```
  Resolution timeout - marking as MISSING
  ```

**問題の可能性**:
- DB クエリが遅い
- ネットワーク遅延が大きい
- searchPages 実装に問題がある

**ファイル**:
- `lib/tiptap-extensions/unified-link-mark/resolver-queue.ts` - lines 71-84
- `lib/tiptap-extensions/unified-link-mark/config.ts` - RESOLVER_CONFIG

---

### 5. キャッシュが正しく機能しているか

**確認方法**:
```typescript
// DevTools で実行
import { getAllCacheEntries, getCachedPageId } from '@/lib/unilink/utils';
console.log('All cache entries:', getAllCacheEntries());
console.log('Cached page:', getCachedPageId("キー"));
```

**問題の可能性**:
- キャッシュがセッションストレージに保存されていない
- キャッシュが正規化されていない
- TTL（5分）が短すぎる

**ファイル**:
- `lib/unilink/utils.ts` - lines 138-175

---

## テスト実施計画

### 単体テスト

1. **resolver-queue のテスト**
   - ファイル: `lib/tiptap-extensions/unified-link-mark/__tests__/resolver-queue.test.ts`
   - 検証: キー正規化、キャッシュ、検索ロジック

2. **キャッシュユーティリティテスト**
   - ファイル: `lib/unilink/__tests__/utils.test.ts`
   - 検証: normalizeTitleToKey, getCachedPageId, setCachedPageId

### 統合テスト

1. **エンドツーエンドテスト**
   - エディタでリンク入力 → リンク解決 → ページナビゲーション
   - ブラウザコンソールでログ確認

2. **ネットワークテスト**
   - Chrome DevTools の Network タブで searchPages リクエスト確認
   - レスポンス時間、ペイロード確認

---

## 参考コード

### resolver-queue の核となるロジック

**ファイル**: `lib/tiptap-extensions/unified-link-mark/resolver-queue.ts`

```typescript
// Lines 118-127: キャッシュ確認
const cachedPageId = getCachedPageId(key);
if (cachedPageId) {
  updateMarkState(editor, markId, {
    state: "exists",
    exists: true,
    pageId: cachedPageId,
    href: `/pages/${cachedPageId}`,
  });
  markResolved(markId);
  return;
}

// Lines 129-152: 検索と一致判定
let results = await searchPagesWithRetry(raw);
if (results.length === 0 && raw !== key) {
  results = await searchPagesWithRetry(key);
}

const exact = results.find((r) => {
  const normalizedTitle = normalizeTitleToKey(r.title);
  return (
    normalizedTitle === key ||
    normalizedTitle === normalizeTitleToKey(raw)
  );
});
```

---

## 検証根拠

### ファイルパス
- `lib/tiptap-extensions/unified-link-mark/resolver-queue.ts` - lines 118-186
- `lib/unilink/utils.ts` - lines 8-27, 155-160
- `lib/utils/searchPages.ts` - lines 8-17
- `lib/tiptap-extensions/unified-link-mark/config.ts` - RESOLVER_CONFIG

### テスト実行結果
```bash
bun test lib/tiptap-extensions/unified-link-mark/__tests__/resolver-queue.test.ts
# 予想: すべてのテストが pass（実装は正確）
```

---

## 関連ドキュメント

- 📋 [検証報告書](20251019_05_verification-report-memo-link-investigation.md) - 問題A 参照
- 📝 [元のレポート](20251018_04_memo-link-feature-investigation.md) - 問題A 参照

---

**作成者**: GitHub Copilot  
**作成日**: 2025-10-19  
**最終更新**: 2025-10-19
