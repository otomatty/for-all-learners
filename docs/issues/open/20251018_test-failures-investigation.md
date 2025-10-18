# テスト失敗の詳細調査報告

**発見日**: 2025 年 10 月 18 日  
**失敗テスト数**: 33 個  
**重要度**: High  
**状態**: 調査完了

## 概要

33 個のテスト失敗が確認されました。失敗の根本原因は 5 つのカテゴリに分けられます。

### 失敗テスト数の分布

- **キャッシュキー正規化バグ**: 1 個 🔴 Critical
- **Handler null/undefined チェック不足**: 2 個 🟠 High
- **Logger vs console ミスマッチ**: 8 個 🟡 Medium
- **プラグイン数・順序の不一致**: 6 個 🟡 Medium
- **Input Rules 複雑統合テスト**: 16 個 🟠 High

---

## 詳細分析

### 問題 1: キャッシュキー正規化の不具合

#### 発見箇所

- **ファイル**: `lib/unilink/utils.ts`
- **関数**: `setCachedPageId()`
- **テスト**: `lib/unilink/__tests__/utils.test.ts:162-171`

#### 症状

```
Expected: null
Received: "id-normalized"

Test code:
const nonNormalized = getCachedPageId("Test  Multiple  Spaces");
expect(nonNormalized).toBeNull();
```

#### 根本原因

`setCachedPageId()` がキーを正規化せずに保存しているのに対し、`getCachedPageId()` は入力キーを正規化してから検索しています。

**実装の不一致**:

```typescript
// setCachedPageId - キー正規化なし
export const setCachedPageId = (key: string, pageId: string): void => {
  resolvedCache.set(key, {
    pageId,
    timestamp: Date.now(),
  });
  // key がそのままキャッシュに保存される
};

// getCachedPageId - キー正規化あり
export const getCachedPageId = (key: string): string | null => {
  const normalizedKey = normalizeTitleToKey(key);
  let entry = resolvedCache.get(normalizedKey);
  // normalizedKey で検索される
};
```

#### 修正提案

`setCachedPageId()` でキーを正規化してから保存する:

```typescript
export const setCachedPageId = (key: string, pageId: string): void => {
  const normalizedKey = normalizeTitleToKey(key);
  resolvedCache.set(normalizedKey, {
    pageId,
    timestamp: Date.now(),
  });
  saveCacheToStorage();
  logger.debug({ key: normalizedKey, pageId }, "[Cache] Entry set");
};
```

---

### 問題 2: ロギング・モック関連の失敗（32 個）

#### 失敗テストカテゴリ

##### A. Logger vs console のミスマッチ (8 個失敗)

**テスト期待値**:

```typescript
const consoleLogSpy = vi.spyOn(console, "log");
expect(consoleLogSpy).toHaveBeenCalledWith(
  expect.stringContaining("[UnifiedResolver] Mark updated to exists state")
);
```

**実装**:

```typescript
logger.error(
  { markId, pageId, error },
  "Failed to update mark to exists state"
);
```

**原因**: テストは `console.log` を期待しているが、実装は `logger` を使用している。

##### B. Handler null/undefined チェック (2 個失敗)

**テスト**:

```typescript
it("should handle null editor gracefully", () => {
  expect(() => {
    onCreateHandler(null as unknown as Editor);
  }).not.toThrow();
});
```

**原因**: `onCreateHandler()` で null/undefined チェックが実装されていない。

##### C. プラグイン数・順序 (6 個失敗)

**テスト期待値**:

```typescript
it("should return exactly 3 plugins", () => {
  const plugins = createPlugins({...});
  expect(plugins.length).toBe(3);
});
```

**想定される原因**: `createPlugins()` が返すプラグイン数や順序が変更された。

##### D. Input Rules 統合テスト (16 個失敗)

- `isInCodeContext` ロジック
- `createTagInputRule` 正規表現マッチング
- `createBracketInputRule` 設定
- ProseMirror との複雑な相互作用
- JSDOM 環境での DOM API 依存

---

## テストファイル一覧と失敗分布

| テストファイル                                                            | 失敗数 | 主な原因                    |
| ------------------------------------------------------------------------- | ------ | --------------------------- |
| `lib/unilink/__tests__/utils.test.ts`                                     | 1      | キー正規化ロジック          |
| `lib/tiptap-extensions/unified-link-mark/__tests__/migration.test.ts`     | 5      | Logger 出力形式             |
| `lib/tiptap-extensions/unified-link-mark/__tests__/lifecycle.test.ts`     | 2      | Null/undefined ハンドリング |
| `lib/unilink/__tests__/resolver/mark-operations.test.ts`                  | 4      | Logger メッセージ検証       |
| `lib/unilink/__tests__/resolver/broadcast.test.ts`                        | 3      | Logger 出力形式             |
| `lib/tiptap-extensions/unified-link-mark/plugins/__tests__/index.test.ts` | 6      | プラグイン数/順序           |
| `lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/*.ts`      | 7      | Code context 検出           |
| `app/(protected)/pages/[id]/_hooks/__tests__/useLinkSync.test.ts`         | 1      | エディター未定義            |

---

## 優先度別分類

### 🔴 Critical (即座に対応が必要)

1. **キャッシュキー正規化バグ** (1 個)
   - キャッシング機構の根本的な不具合
   - 機能の正確性に直結

### 🟠 High (早期に対応すべき)

2. **Handler null/undefined チェック** (2 個)
3. **Input Rules 統合テスト** (16 個)

### 🟡 Medium (計画的に対応)

4. **Logger マッチング** (8 個)
5. **プラグイン数/順序** (6 個)

---

## 次のステップ

### 短期 (本日対応)

1. キャッシュキー正規化バグを修正 (1 個失敗解決)
2. Handler null/undefined チェック追加 (2 個失敗解決)
3. ロギング・モック関連のテストセットアップを確認

### 中期 (近日中)

1. Logger 出力形式の統一
2. プラグイン数と順序の検証
3. Input Rules テストの再評価

### 長期 (計画的な対応)

1. テストスイート全体の安定性向上
2. モック環境とプロダクション環境の差異排除
3. CI/CD での定期的なテスト実行確認

---

## 関連ドキュメント

- 詳細分析: `docs/issues/open/20251018_02_test-failures-detailed-analysis.md`
- 修正ロードマップ: `docs/issues/open/20251018_03_test-failures-summary.md`

---

**調査期間**: 2025-10-18  
**所要時間**: 約 33 分
