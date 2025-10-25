# テスト失敗の詳細分析 - パターン別

**作成日**: 2025 年 10 月 18 日  
**対象**: 33 個のテスト失敗の詳細パターン分析

---

## 失敗パターンの分類

### パターン 1: キャッシュキー正規化の不整合 (1 個)

#### テスト

- `lib/unilink/__tests__/utils.test.ts:162-171`
- `should normalize keys before caching`

#### 期待値と実装

```typescript
// テスト期待値:
setCachedPageId(normalizedKey, "id-normalized");
const nonNormalized = getCachedPageId("Test  Multiple  Spaces");
expect(nonNormalized).toBeNull(); // ❌ FAIL: returns "id-normalized"

// 原因:
// setCachedPageId: キーをそのまま保存
// getCachedPageId: キーを正規化して検索
// 結果: "Test  Multiple  Spaces" → normalize → "Test Multiple Spaces"
//     で一致してしまう
```

#### 修正内容

```typescript
// 修正前 (lib/unilink/utils.ts:153-160)
export const setCachedPageId = (key: string, pageId: string): void => {
  resolvedCache.set(key, {
    // ❌ キーを正規化していない
    pageId,
    timestamp: Date.now(),
  });
  saveCacheToStorage();
};

// 修正後
export const setCachedPageId = (key: string, pageId: string): void => {
  const normalizedKey = normalizeTitleToKey(key); // ✅ 正規化
  resolvedCache.set(normalizedKey, {
    pageId,
    timestamp: Date.now(),
  });
  saveCacheToStorage();
  logger.debug({ key: normalizedKey, pageId }, "[Cache] Entry set");
};
```

---

### パターン 2: Logger vs console のミスマッチ (8 個)

#### テスト

- `lib/unilink/__tests__/resolver/mark-operations.test.ts:258-287`
- `should log success message on update`
- `should handle errors gracefully`

#### 原因の詳細

```typescript
// テスト実装 (mark-operations.test.ts)
const consoleLogSpy = vi.spyOn(console, "log");
expect(consoleLogSpy).toHaveBeenCalledWith(
  expect.stringContaining("[UnifiedResolver] Mark updated to exists state")
);

// 実装 (mark-operations.ts:44-48)
// logger.error() を使用している
logger.error(
  { markId, pageId, error },
  "Failed to update mark to exists state"
);

// ❌ 問題:
// - テストは console.log を期待
// - 実装は logger.error を使用
// - logger は JSON 構造化ログ出力
```

#### 関連テスト

1. `updateMarkToExists > should log success message on update`
2. `updateMarkToExists > should handle errors gracefully`
3. `batchResolveMarks > should log batch resolution start`
4. `batchResolveMarks > should process each mark individually`
5. `batchResolveMarks > should handle empty mark array`
6. `batchResolveMarks > should handle single mark`
7. `Broadcast Module > notifyPageCreated > should log broadcast event`
8. `Broadcast Module > notifyPageUpdated > should log message for unimplemented feature`

---

### パターン 3: Handler 関数の null/undefined チェック (2 個)

#### テスト

- `lib/tiptap-extensions/unified-link-mark/__tests__/lifecycle.test.ts:50-65`
- `onCreateHandler > should handle null editor gracefully`
- `onCreateHandler > should handle undefined editor gracefully`

#### 期待値

```typescript
it("should handle null editor gracefully", () => {
  expect(() => {
    onCreateHandler(null as unknown as Editor);
  }).not.toThrow(); // ❌ FAIL
});

it("should handle undefined editor gracefully", () => {
  expect(() => {
    onCreateHandler(undefined as unknown as Editor);
  }).not.toThrow(); // ❌ FAIL
});
```

#### 実装確認が必要な部分

- `lib/tiptap-extensions/unified-link-mark/lifecycle.ts` の `onCreateHandler` 関数
- null/undefined チェックが実装されているか確認

---

### パターン 4: プラグイン数・順序の不一致 (6 個)

#### テスト

- `lib/tiptap-extensions/unified-link-mark/plugins/__tests__/index.test.ts`

#### 失敗テスト群

```typescript
// テスト期待値:
it("should return exactly 3 plugins", () => {
  expect(plugins.length).toBe(3); // ❌ 期待値と異なる可能性
});

it("should have auto-bracket first, click-handler second", () => {
  const autoBracketPlugin = plugins[0];
  const clickHandlerPlugin = plugins[1];
  expect(autoBracketPlugin.spec.props?.handleTextInput).toBeDefined();
  expect(clickHandlerPlugin.spec.props?.handleClick).toBeDefined();
});
```

#### 想定される原因

- `createPlugins()` が返すプラグイン数が変更された
- プラグインの順序が変更された
- プラグイン仕様 (spec) が変更された

#### 関連テスト

1. `should return exactly 3 plugins`
2. `should include click-handler plugin`
3. `should return plugins in consistent order`
4. `should have auto-bracket first, click-handler second`
5. `should handle editor without throwing`
6. `should create plugins with consistent structure`
7. `should create plugins that don't interfere with each other`
8. `should provide handler functions with correct signatures`

---

### パターン 5: Input Rules の複雑な統合テスト (7 個)

#### テスト群

- `lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/utils.test.ts`

  - `isInCodeContext > should return true at the start of inline code`
  - `isInCodeContext > should handle multiple inline code in same paragraph`
  - `isInCodeContext > should handle invalid positions gracefully`

- `lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/tag-rule.test.ts`

  - `createTagInputRule > should not match invalid tag patterns`
  - `createTagInputRule > should only match at word boundaries`

- `lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/bracket-rule.test.ts`

  - `createBracketInputRule > should use correct regex pattern`

- `app/(protected)/pages/[id]/_hooks/__tests__/useLinkSync.test.ts`
  - `useLinkSync > should not crash with undefined editor methods`

#### 共通の原因

これらのテストは複雑な ProseMirror エコシステム統合をテストしており、以下の要因が関係している可能性：

1. **JSDOM 環境の制限**

   - DOM API の完全性
   - Range/Selection API の実装

2. **ProseMirror との相互作用**

   - EditorState の状態管理
   - Transaction の処理
   - Plugin 実行モデル

3. **Input Rule の正規表現マッチング**
   - 予期しない エッジケース
   - 範囲検出ロジックの問題

---

## テスト実行結果の詳細表示

### 実行スクリーンショット (テストログから)

```
(fail) Unilink Utils > Cache Functionality > setCachedPageId and getCachedPageId
       > should normalize keys before caching [0.20ms]
error: expect(received).toBeNull()
Received: "id-normalized"
```

### 修正優先度順

| 優先度 | パターン               | 失敗数 | 修正難度 | 推定時間 |
| ------ | ---------------------- | ------ | -------- | -------- |
| 🔴 1   | キー正規化             | 1      | 低       | 10 分    |
| 🟠 2   | Handler null/undefined | 2      | 低       | 10 分    |
| 🟡 3   | Logger vs console      | 8      | 中       | 30 分    |
| 🟡 4   | プラグイン数/順序      | 6      | 中       | 20 分    |
| 🔵 5   | Input Rules 統合       | 7      | 高       | 60 分    |
| 🟢 6   | その他                 | 8      | 中〜高   | 40 分    |

---

## 修正計画（詳細版）

### Phase 1: Critical Issues (本日対応)

#### 1.1 キャッシュキー正規化修正

- **ファイル**: `lib/unilink/utils.ts`
- **関数**: `setCachedPageId()`
- **変更内容**: `normalizeTitleToKey(key)` で正規化してから保存
- **テスト**: `lib/unilink/__tests__/utils.test.ts`
- **期待結果**: 1 個失敗が解決

#### 1.2 Handler の null/undefined チェック

- **ファイル**: `lib/tiptap-extensions/unified-link-mark/lifecycle.ts`
- **関数**: `onCreateHandler()`
- **変更内容**: null/undefined チェックを追加
- **テスト**: `lib/tiptap-extensions/unified-link-mark/__tests__/lifecycle.test.ts`
- **期待結果**: 2 個失敗が解決

### Phase 2: Logger マッチング修正 (本日中)

#### 2.1 テスト側の修正方針

- `console.log` spy ではなく `logger` mock を使用
- またはテストで実装の logger 出力を期待値に変更

#### 2.2 影響を受けるファイル

- `lib/unilink/__tests__/resolver/mark-operations.test.ts`
- `lib/unilink/__tests__/resolver/broadcast.test.ts`
- その他 logger テスト

### Phase 3: プラグイン・Input Rules 調査 (翌日以降)

- `createPlugins()` 実装を精査
- Input Rules の JSDOM 環境での動作確認
- 必要に応じてモック環境の強化

---

## 根本原因の仮説

### 最も可能性の高い順序

1. **テストと実装の非同期進行**

   - 実装が進化したが、テストが古いままになっている
   - または逆にテストが新しく、実装がそれに対応していない

2. **Logger フレームワークの選択変更**

   - プロジェクト途中で logger を導入
   - テストはまだ console 出力を期待している

3. **モック環境の不十分な整備**

   - `vi.hoisted()` や `vi.mock()` の実装が完全でない
   - JSDOM で複雑な DOM 操作のテストができていない

4. **リファクタリング後の漏れ**
   - 統合リンク機能の実装時にテストの更新が漏れた

---

## 検証方法

各修正後、以下のコマンドで検証：

```bash
# 特定のテストファイルのみ実行
bun test -- lib/unilink/__tests__/utils.test.ts
bun test -- lib/tiptap-extensions/unified-link-mark/__tests__/lifecycle.test.ts

# 全テスト実行
bun test

# 特定の describe ブロックのみ
bun test -- --grep "Cache Functionality"
bun test -- --grep "should normalize keys"
```

---

## 関連ドキュメント

- 主調査: `docs/issues/open/20251018_01_test-failures-investigation.md`
- 実装: `lib/unilink/utils.ts`
- テスト: `lib/unilink/__tests__/utils.test.ts`
- テスト: `lib/tiptap-extensions/unified-link-mark/__tests__/`
