# テスト失敗の詳細調査報告

**発見日**: 2025 年 10 月 18 日  
**失敗テスト数**: 33 個  
**重要度**: High  
**状態**: 調査完了

## 概要

33 個のテスト失敗が確認されました。失敗の根本原因は 2 つのカテゴリに分けられます：

### 1. **主要問題：`setCachedPageId`がキーを正規化していない**

- **影響範囲**: キャッシング機構全般
- **失敗テスト数**: 1 個（直接的）
- **セキュリティ/機能リスク**: 高

### 2. **ロギング・モック関連の問題**

- **影響範囲**: テストのログ出力とモック検証
- **失敗テスト数**: 32 個（間接的影響）
- **セキュリティ/機能リスク**: 中

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

**テストの期待値**：

- `normalizeTitleToKey("Test  Multiple  Spaces")` → `"Test Multiple Spaces"`
- `setCachedPageId("Test Multiple Spaces", "id-normalized")` で正規化キーで保存
- `getCachedPageId("Test  Multiple  Spaces")` で、正規化してから検索して、同一キーを取得
- 非正規化キーで検索した場合、見つからない（テストの期待値）

**実際の動作**：

- `setCachedPageId("Test Multiple Spaces", "id-normalized")` で**元のキーのまま**保存
- 後に `getCachedPageId("Test  Multiple  Spaces")` で、正規化キーで検索
- 両者の正規化結果が同じ (`"Test Multiple Spaces"`) ため、結果として一致

#### 影響

- 複数の表現のキーがすべてキャッシュヒットする（設計上の問題）
- キャッシュの一貫性が損なわれている
- テストケースの意図：`setCachedPageId` の呼び出し時点でキーを正規化すべき

#### 修正提案

`setCachedPageId()` でキーを正規化してから保存する：

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

##### A. Migration テスト群 (5 個失敗)

- `should migrate data-page-title links (missing pages)`
- `should handle links with only data-page-title`
- `should convert text content to raw and text attributes`
- `should set key to lowercase title for data-page-title links`
- その他

**原因**: テスト内で logger がログを出力しているが、テストは log メッセージ（`msg` フィールド）を検証するコードが含まれていない。期待値と実際の logger 出力の形式が一致していない。

##### B. Lifecycle テスト群 (2 個失敗)

- `should handle null editor gracefully`
- `should handle undefined editor gracefully`

**原因**: `onCreateHandler()` で null/undefined チェックがないか、チェック後の処理で logger がエラー出力している。

##### C. Mark Operations テスト群 (4 個失敗)

- `should log success message on update`
- `should handle errors gracefully`
- `should log batch resolution start`
- `should process each mark individually`
- その他

**根本原因**: これらのテストは logger の**ログメッセージの内容と形式**を検証しようとしているが、実装の logger 出力が期待値と異なっている。

**具体例**:

```typescript
// テスト期待値:
it("should log success message on update", () => {
  // logger.debug() の呼び出しを expect() で検証
});

// 実装側:
logger.debug({ ... }, "[updateMarkToExists] Message");
```

Logger が異なる形式で出力されていることが原因。

##### D. Broadcast テスト群 (3 個失敗)

- `should log broadcast event (debug)`
- `should log message for unimplemented feature`
- `should handle multiple calls without errors`

**原因**: `notifyPageCreated()` と `notifyPageUpdated()` 関数がローカルスコープで動作する場合、ロギングレベルやメッセージ形式が異なっている可能性。

##### E. createPlugins テスト群 (6 個失敗)

- `should return exactly 3 plugins`
- `should include click-handler plugin`
- `should return plugins in consistent order`
- `should have auto-bracket first, click-handler second`
- `should handle editor without throwing`
- `should create plugins with consistent structure`
- `should create plugins that don't interfere with each other`
- `should provide handler functions with correct signatures`

**原因**: プラグイン作成時の順序またはプラグイン数が期待値と異なっている。複数の問題が累積している可能性。

##### F. Input rules テスト群 (8 個失敗)

- `isInCodeContext` グループ (3 個)
- `createTagInputRule` グループ (2 個)
- `createBracketInputRule` グループ (1 個)
- `useLinkSync` グループ (1 個)

**原因**: これらのテストは複雑な ProseMirror インテグレーション処理をテストしており、モック環境との不整合が生じている可能性が高い。

---

## テストファイル一覧と失敗分布

| テストファイル                                                                       | 失敗数 | 主な原因                    |
| ------------------------------------------------------------------------------------ | ------ | --------------------------- |
| `lib/unilink/__tests__/utils.test.ts`                                                | 1      | キー正規化ロジック          |
| `lib/tiptap-extensions/unified-link-mark/__tests__/migration.test.ts`                | 5      | Logger 出力形式の不一致     |
| `lib/tiptap-extensions/unified-link-mark/__tests__/lifecycle.test.ts`                | 2      | Null/undefined ハンドリング |
| `lib/unilink/__tests__/resolver/mark-operations.test.ts`                             | 4      | Logger メッセージ検証       |
| `lib/unilink/__tests__/resolver/broadcast.test.ts`                                   | 3      | Logger 出力形式             |
| `lib/tiptap-extensions/unified-link-mark/plugins/__tests__/index.test.ts`            | 6      | プラグイン数/順序           |
| `lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/utils.test.ts`        | 3      | Code context 検出           |
| `lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/tag-rule.test.ts`     | 2      | タグ入力ルール              |
| `lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/bracket-rule.test.ts` | 1      | ブラケット入力ルール        |
| `app/(protected)/pages/[id]/_hooks/__tests__/useLinkSync.test.ts`                    | 1      | エディター未定義            |

---

## 優先度別分類

### 🔴 Critical (即座に対応が必要)

1. **キャッシュキー正規化バグ** (1 個)
   - キャッシング機構の根本的な不具合
   - 機能の正確性に直結

### 🟡 High (早期に対応すべき)

2. **ロギング検証テストの失敗** (32 個)
   - テストフレームワークのセットアップ問題の可能性
   - 複数の異なる原因が混在している

---

## 根本原因別分類

### パターン A: 実装と設計意図の齟齬

- キャッシュキー正規化
- **修正難度**: 低

### パターン B: ロギングやモックのセットアップ問題

- `vitest` の `vi.hoisted()` が使用できない
- `vi.mock()` が未実装
- Logger 形式の不一致
- **修正難度**: 中〜高

### パターン C: 複雑な統合テストの環境問題

- ProseMirror プラグイン統合テスト
- JSDOM 環境とプラグインのインタラクション
- **修正難度**: 高

---

## 次のステップ

### 短期 (本日対応)

1. キャッシュキー正規化バグを修正 (1 個失敗解決)
2. ロギング・モック関連のテストセットアップを確認

### 中期 (近日中)

1. `vi.hoisted()` と `vi.mock()` の実装確認
2. Logger 出力形式の統一
3. プラグイン数と順序の検証

### 長期 (計画的な対応)

1. テストスイート全体の安定性向上
2. モック環境とプロダクション環境の差異排除
3. CI/CD での定期的なテスト実行確認

---

## 関連ドキュメント

- 実装計画: `docs/04_implementation/plans/unified-link-mark/`
- 設計書: `docs/03_design/features/unified-link-mark.md`
- テスト戦略: `docs/05_testing/`

---

## 調査時間

- 開始: 2025-10-18 17:46:03
- 完了: 2025-10-18 18:20:00
- 所要時間: 約 33 分
