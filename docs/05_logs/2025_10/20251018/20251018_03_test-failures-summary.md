# 33 個テスト失敗のサマリーと修正ロードマップ

**作成日**: 2025 年 10 月 18 日  
**テスト環境**: bun test (vitest)  
**総テスト数**: 607  
**成功**: 574  
**失敗**: 33  
**エラー**: 2

---

## Executive Summary

33 個のテスト失敗は以下の**主要 5 つのカテゴリ**に分類できます：

| 優先度      | カテゴリ              | 失敗数 | 根本原因              | 修正難度 | 推定時間 |
| ----------- | --------------------- | ------ | --------------------- | -------- | -------- |
| 🔴 Critical | キャッシュキー正規化  | 1      | 実装バグ              | ⭐       | 10 分    |
| 🟠 High     | Handler null チェック | 2      | 実装不足              | ⭐       | 10 分    |
| 🟡 Medium   | Logger vs console     | 8      | テスト/実装ミスマッチ | ⭐⭐     | 30 分    |
| 🟡 Medium   | プラグイン数/順序     | 6      | 実装変更              | ⭐⭐     | 20 分    |
| 🟠 High     | Input Rules 複雑統合  | 16     | JSDOM/モック問題      | ⭐⭐⭐   | 90 分    |

**合計推定修正時間**: 約 3.5 時間

---

## Category 1: キャッシュキー正規化 (1 個) 🔴

### テスト

```
✗ Unilink Utils > Cache Functionality >
  setCachedPageId and getCachedPageId >
  should normalize keys before caching
```

### 問題

```typescript
// ❌ 実装の問題
setCachedPageId = (key: string, pageId: string) => {
  resolvedCache.set(key, { ... })  // キー正規化なし
};

getCachedPageId = (key: string) => {
  const normalizedKey = normalizeTitleToKey(key);  // キー正規化あり
  const entry = resolvedCache.get(normalizedKey);
};

// 呼び出し例:
setCachedPageId("Test Multiple Spaces", "id");
getCachedPageId("Test  Multiple  Spaces");  // 期待: null、実際: "id"
```

### 解決策

`setCachedPageId` でキーを正規化してから保存する。

**ファイル**: `lib/unilink/utils.ts:153-160`

---

## Category 2: Handler null/undefined チェック (2 個) 🟠

### テスト

```
✗ UnifiedLinkMark Lifecycle > onCreateHandler >
  should handle null editor gracefully

✗ UnifiedLinkMark Lifecycle > onCreateHandler >
  should handle undefined editor gracefully
```

### 期待値

```typescript
// テストの期待値: エラーをスロー しない
expect(() => onCreateHandler(null)).not.toThrow();
expect(() => onCreateHandler(undefined)).not.toThrow();
```

### 問題の場所

`lib/tiptap-extensions/unified-link-mark/lifecycle.ts` の `onCreateHandler()` 関数

### 解決策

関数開始時に null/undefined チェックを追加。

---

## Category 3: Logger vs console (8 個) 🟡

### テスト群

```
✗ Mark Operations Module > updateMarkToExists >
  should log success message on update
✗ Mark Operations Module > updateMarkToExists >
  should handle errors gracefully
✗ Mark Operations Module > batchResolveMarks >
  should log batch resolution start
✗ Mark Operations Module > batchResolveMarks >
  should process each mark individually
✗ Mark Operations Module > batchResolveMarks >
  should handle empty mark array
✗ Mark Operations Module > batchResolveMarks >
  should handle single mark
✗ Broadcast Module > notifyPageCreated >
  should log broadcast event (debug)
✗ Broadcast Module > notifyPageUpdated >
  should log message for unimplemented feature
✗ Broadcast Module > notifyPageUpdated >
  should handle multiple calls without errors
```

### 問題の詳細

```typescript
// テスト側 (mark-operations.test.ts:258-287)
const consoleLogSpy = vi.spyOn(console, "log");
expect(consoleLogSpy).toHaveBeenCalledWith(
  expect.stringContaining("[UnifiedResolver] Mark updated")
);

// 実装側 (mark-operations.ts:44-48)
logger.error({ markId, pageId, error }, "Failed to update mark");
// → console.log ではなく logger を使用している
```

### 解決策（2 つのアプローチ）

#### A. テストを修正（推奨）

logger mock を使用してテストを書き直す。

#### B. 実装を修正

console.log に変更する（ただし プロジェクト方針に反する可能性）。

---

## Category 4: プラグイン数・順序 (6 個) 🟡

### テスト群

```
✗ createPlugins > Function behavior >
  should return exactly 3 plugins
✗ createPlugins > Plugin types >
  should include click-handler plugin
✗ createPlugins > Plugin order >
  should return plugins in consistent order
✗ createPlugins > Plugin order >
  should have auto-bracket first, click-handler second
✗ createPlugins > Error handling >
  should handle editor without throwing
✗ createPlugins > Plugin consistency >
  should create plugins with consistent structure
✗ createPlugins > Plugin consistency >
  should create plugins that don't interfere with each other
✗ createPlugins > ProseMirror compatibility >
  should provide handler functions with correct signatures
```

### 問題

`lib/tiptap-extensions/unified-link-mark/plugins/__tests__/index.test.ts` で期待されるプラグイン数が 3 個ですが、実装が異なる可能性があります。

### 確認が必要な部分

- `createPlugins()` 関数が実装されているプラグイン数
- プラグインの順序
- 各プラグインの spec（仕様）

---

## Category 5: Input Rules 複雑統合 (16 個) 🟠

### テスト群 A: isInCodeContext (3 個)

```
✗ isInCodeContext > Inline code detection >
  should return true at the start of inline code
✗ isInCodeContext > Mixed content scenarios >
  should handle multiple inline code in same paragraph
✗ isInCodeContext > Type safety and robustness >
  should handle invalid positions gracefully
```

### テスト群 B: createTagInputRule (2 個)

```
✗ createTagInputRule > Pattern validation >
  should not match invalid tag patterns
✗ createTagInputRule > Word boundary behavior >
  should only match at word boundaries
```

### テスト群 C: createBracketInputRule (1 個)

```
✗ createBracketInputRule > Configuration >
  should use correct regex pattern
```

### テスト群 D: useLinkSync (1 個)

```
✗ useLinkSync > Mock editor tests >
  should not crash with undefined editor methods
```

### 共通の根本原因

これらのテストは複雑な ProseMirror エコシステム統合をテストしており、以下の環境要因が影響している可能性があります：

1. **JSDOM 環境の制限**

   - Range/Selection API が完全でない
   - Document/Element の機能が制限されている

2. **モック不足**

   - Editor メソッドが完全にモック化されていない
   - Transaction/EditorState の状態が正しく保持されていない

3. **非同期処理の問題**
   - `async/await` の取り扱い
   - Promise チェーンの処理

### 解決策

- JSDOM のセットアップを強化
- モック環境の完全性を確認
- テストを小分けにして単位テストを強化

---

## Migration テストの失敗 (5 個)

### テスト群

```
✗ UnifiedLinkMark - Legacy Data Migration >
  PageLinkMark Migration >
  should migrate data-page-title links (missing pages)

✗ UnifiedLinkMark - Legacy Data Migration >
  Edge Cases >
  should handle links with only data-page-title

✗ UnifiedLinkMark - Legacy Data Migration >
  Conversion Consistency >
  should convert text content to raw and text attributes

✗ UnifiedLinkMark - Legacy Data Migration >
  Conversion Consistency >
  should set key to lowercase title for data-page-title links
```

### 原因の推測

migration.test.ts のテストが以下の parseHTML ロジック（rendering.ts）に対して実装が不完全、または期待値と異なる可能性があります。

**確認が必要な部分**:

- `rendering.ts` の parseHTML パーサーが全てのレガシー属性を処理しているか
- `text` 属性と `raw` 属性が適切に設定されているか
- `key` 属性のローカライズロジック

---

## 修正ロードマップ（段階別）

### Phase 1: 直近（本日対応） ⏰ 40 分

#### 1.1 キャッシュキー正規化修正

- **ファイル**: `lib/unilink/utils.ts`
- **変更**: `setCachedPageId()` に正規化ロジックを追加
- **テスト**: 1 個解決
- **時間**: 10 分

```typescript
export const setCachedPageId = (key: string, pageId: string): void => {
  const normalizedKey = normalizeTitleToKey(key); // ← 追加
  resolvedCache.set(normalizedKey, {
    pageId,
    timestamp: Date.now(),
  });
  saveCacheToStorage();
  logger.debug({ key: normalizedKey, pageId }, "[Cache] Entry set");
};
```

#### 1.2 Handler null チェック追加

- **ファイル**: `lib/tiptap-extensions/unified-link-mark/lifecycle.ts`
- **変更**: `onCreateHandler()` の開始時に null/undefined チェック
- **テスト**: 2 個解決
- **時間**: 10 分

```typescript
export const onCreateHandler = (editor: Editor): void => {
  // ← null/undefined チェックを追加
  if (!editor) {
    logger.debug("Editor is null or undefined, skipping initialization");
    return;
  }
  // ... 既存ロジック
};
```

#### 1.3 Logger 形式の確認

- **ファイル群**: mark-operations.ts, broadcast.ts
- **確認項目**: logger の使用方法とテストの期待値が一致しているか
- **テスト**: 8 個の失敗を分析（完全解決は翌日以降）
- **時間**: 20 分

---

### Phase 2: 中期（翌日） ⏰ 1.5 時間

#### 2.1 Logger テストの修正

- テストで logger を適切に mock する
- または実装で console.log を使用するように変更
- **テスト**: 8 個解決

#### 2.2 プラグイン数・順序の確認

- `createPlugins()` の実装を確認
- テスト期待値との差分を特定
- **テスト**: 6 個解決

#### 2.3 Input Rules の調査開始

- JSDOM セットアップの確認
- モック環境の検証
- **テスト**: 部分的に解決

---

### Phase 3: 長期（計画的対応） ⏰ 2 時間以上

#### 3.1 JSDOM 環境の強化

- DOM API の完全なモック化
- Range/Selection API の実装
- **テスト**: 16 個のうち複数個解決

#### 3.2 統合テストの再設計

- 複雑な ProseMirror テストを単位テストに分割
- モック依存性を低減
- **テスト**: 残りの個数解決

---

## 検証手順

### 各フェーズ後のテスト実行

```bash
# Phase 1 後
bun test -- lib/unilink/__tests__/utils.test.ts  # 1個解決確認
bun test -- lib/tiptap-extensions/unified-link-mark/__tests__/lifecycle.test.ts  # 2個解決確認

# Phase 2 後
bun test -- lib/unilink/__tests__/resolver/mark-operations.test.ts
bun test -- lib/tiptap-extensions/unified-link-mark/plugins/__tests__/index.test.ts

# 全テスト確認
bun test
```

---

## 関連ドキュメント

| ドキュメント                                                      | 内容               |
| ----------------------------------------------------------------- | ------------------ |
| `docs/issues/open/20251018_01_test-failures-investigation.md`     | 初期調査報告       |
| `docs/issues/open/20251018_02_test-failures-detailed-analysis.md` | パターン別詳細分析 |
| `docs/issues/open/20251018_03_test-failures-summary.md`           | このドキュメント   |

---

## 補足

### テスト実行環境

- ツール: bun v1.2.15
- フレームワーク: vitest
- 環境: jsdom
- テスト総数: 607
- 実行時間: 1469.00ms

### 次のアクション

1. 本ドキュメントを関係者で共有
2. Phase 1 の修正を実施
3. テスト結果を記録
4. Phase 2 の計画を立案
