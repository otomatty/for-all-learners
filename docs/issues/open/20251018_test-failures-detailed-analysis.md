# テスト失敗の詳細分析 - パターン別

**作成日**: 2025 年 10 月 18 日  
**対象**: 33 個のテスト失敗の詳細パターン分析

---

## 失敗パターンの詳細分類

### パターン 1: キャッシュキー正規化の不整合 (1 個)

#### テスト

- `lib/unilink/__tests__/utils.test.ts:162-171`
- `should normalize keys before caching`

#### 期待値と実装

```typescript
// テスト期待値:
const normalizedKey = normalizeTitleToKey("Test  Multiple  Spaces");
setCachedPageId(normalizedKey, "id-normalized");

// 異なる表現で取得
const nonNormalized = getCachedPageId("Test  Multiple  Spaces");
expect(nonNormalized).toBeNull(); // ❌ FAIL: returns "id-normalized"

// 原因分析:
// setCachedPageId: キーをそのまま保存 ("Test Multiple Spaces")
// getCachedPageId: キーを正規化して検索 ("Test Multiple Spaces")
// 結果: どちらも同じ正規化キーになるので一致してしまう
```

#### 修正方針

`setCachedPageId()` で必ずキーを正規化してから保存する。

---

### パターン 2: Handler の null/undefined チェック不足 (2 個)

#### テスト

- `lib/tiptap-extensions/unified-link-mark/__tests__/lifecycle.test.ts:50-65`
- `onCreateHandler > should handle null editor gracefully`
- `onCreateHandler > should handle undefined editor gracefully`

#### テストコード

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

#### 修正方針

`onCreateHandler()` で入力値の null/undefined チェックを追加:

```typescript
export const onCreateHandler = (editor: Editor | null | undefined): void => {
  if (!editor) {
    logger.warn("Editor is null or undefined in onCreateHandler");
    return;
  }
  // ... rest of implementation
};
```

---

### パターン 3: Logger と console のミスマッチ (8 個)

#### テスト実装

- `lib/unilink/__tests__/resolver/mark-operations.test.ts:258-287`

```typescript
const consoleLogSpy = vi.spyOn(console, "log");
// ... setup mock ...
await updateMarkToExists(mockEditor, "test-mark-id", "page-123", "Test");
expect(consoleLogSpy).toHaveBeenCalledWith(
  expect.stringContaining("[UnifiedResolver] Mark updated to exists state")
);
```

#### 実装

```typescript
// mark-operations.ts
logger.error(
  { markId, pageId, error },
  "Failed to update mark to exists state"
);
```

#### 問題

- テストは `console.log` を spy している
- 実装は `logger` (Pino 等) を使用
- logger は JSON 構造化ログ出力
- `console` と `logger` は別の出力先

#### 関連失敗テスト

1. `updateMarkToExists > should log success message on update`
2. `updateMarkToExists > should handle errors gracefully`
3. `batchResolveMarks > should log batch resolution start`
4. `batchResolveMarks > should process each mark individually`
5. `batchResolveMarks > should handle empty mark array`
6. `batchResolveMarks > should handle single mark`
7. `notifyPageCreated > should log broadcast event`
8. `notifyPageUpdated > should log message for unimplemented feature`

#### 修正方針

以下のいずれかの方法で統一：

**方法 A**: テストを logger モック対応に修正

```typescript
import logger from "@/lib/logger";
vi.mock("@/lib/logger");

const loggerDebugSpy = vi.spyOn(logger, "debug");
await updateMarkToExists(mockEditor, "test-mark-id", "page-123");
expect(loggerDebugSpy).toHaveBeenCalled();
```

**方法 B**: 実装を console 出力に変更

```typescript
console.log("[UnifiedResolver] Mark updated");
```

**方法 C**: テストを実装のログ出力を期待値に変更

```typescript
// テスト側で logger 出力を期待
```

---

### パターン 4: プラグイン数・順序の不一致 (6 個)

#### テスト

- `lib/tiptap-extensions/unified-link-mark/plugins/__tests__/index.test.ts`

#### 失敗テスト群

```typescript
it("should return exactly 3 plugins", () => {
  const plugins = createPlugins({
    editor: mockEditor,
    options: mockOptions,
  });
  expect(plugins.length).toBe(3); // ❌ 期待値と異なる
});

it("should have auto-bracket first, click-handler second", () => {
  const autoBracketPlugin = plugins[0];
  const clickHandlerPlugin = plugins[1];
  expect(autoBracketPlugin.spec.props?.handleTextInput).toBeDefined();
  expect(clickHandlerPlugin.spec.props?.handleClick).toBeDefined();
});
```

#### 想定される原因

- `createPlugins()` が返すプラグイン数が変更された（例: 4 個になった）
- プラグインの順序が変更された
- プラグイン仕様 (spec) が変更された

#### 修正方針

1. `createPlugins()` の実装を確認
2. 実際に返されるプラグイン数を確認
3. テストの期待値を実装に合わせて更新

---

### パターン 5: Input Rules の複雑な統合テスト (16 個)

#### テスト群

- `lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/utils.test.ts`

  - `isInCodeContext` 関連 (3 個)
  - `createTagInputRule` 関連 (2 個)
  - `createBracketInputRule` 関連 (1 個)

- `app/(protected)/pages/[id]/_hooks/__tests__/useLinkSync.test.ts` (1 個)

#### 共通の原因

これらのテストは複雑な ProseMirror エコシステム統合をテストしており、以下の要因が関係している：

1. **JSDOM 環境の制限**

   - DOM API の完全性
   - Range/Selection API の実装不完全
   - Document.execCommand の非実装

2. **ProseMirror との相互作用**

   - EditorState の状態管理
   - Transaction の処理
   - Plugin 実行モデル
   - Decorations の適用

3. **Input Rule の正規表現マッチング**
   - 複雑なテキスト解析
   - ワード境界検出
   - コンテキスト判定

#### 修正方針

1. モック環境の強化 (JSDOM から Playwright へ移行の検討)
2. Input Rule ロジックの単体テスト化
3. 統合テストの環境依存性を低減

---

## テスト実行結果の詳細

### 実行スクリーンショット

```
bun test v1.2.15

✗ Unilink Utils > Cache Functionality > setCachedPageId and getCachedPageId
  > should normalize keys before caching [0.20ms]

error: expect(received).toBeNull()
Received: "id-normalized"
```

### テスト統計

- 574 個のテスト成功
- 33 個のテスト失敗
- 2 個のエラー
- 1128 個の expect() 呼び出し
- 総実行時間: 1469.00ms

---

## 修正優先度順

| 優先度   | パターン          | 失敗数 | 修正難度      | 推定時間      |
| -------- | ----------------- | ------ | ------------- | ------------- |
| 🔴 1     | キー正規化        | 1      | ⭐ 非常に簡単 | 10 分         |
| 🟠 2     | Handler チェック  | 2      | ⭐ 非常に簡単 | 10 分         |
| 🟡 3     | Logger 形式       | 8      | ⭐⭐ 簡単〜中 | 30 分         |
| 🟡 4     | プラグイン数/順序 | 6      | ⭐⭐ 簡単〜中 | 20 分         |
| 🟠 5     | Input Rules 統合  | 16     | ⭐⭐⭐ 複雑   | 90 分+        |
| **合計** |                   | **33** |               | **3.5 時間+** |

---

## 検証方法

各修正後、以下のコマンドで検証:

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

## 根本原因の仮説

### 最も可能性の高い順序

1. **テストと実装の非同期進行** (確度: 高)

   - 実装が進化したが、テストが古いままになっている
   - テストが新しく、実装がそれに対応していない

2. **Logger フレームワークの選択変更** (確度: 高)

   - プロジェクト途中で logger を導入
   - テストはまだ console 出力を期待している

3. **モック環境の不十分な整備** (確度: 中)

   - JSDOM で複雑な DOM 操作のテストができていない
   - ProseMirror との相互作用が完全でない

4. **リファクタリング後の漏れ** (確度: 中)
   - 統合リンク機能の実装時にテストの更新が漏れた

---

## 参考資料

- テスト対象ファイル: `lib/unilink/utils.ts`, `lib/tiptap-extensions/unified-link-mark/**`
- テストファイル: `**/__tests__/**`
- ビルドツール: vitest v1.0+
- DOM 環境: JSDOM
