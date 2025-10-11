# モック修正完了レポート

**作成日**: 2025 年 10 月 11 日  
**作業内容**: `vi.mock()`から手動モックへの移行

---

## エグゼクティブサマリー

Bun 環境で`vi.mock()`が動作しない問題に対応するため、全 4 ファイルのテストを手動モック方式に書き換えました。`vi.mock()`の呼び出しを削除し、`vi.spyOn()`を使用した手動モック設定に変更しました。

### 修正結果

| テストファイル              | vi.mock 削除 | 手動モック設定 | 実行状態      |
| --------------------------- | ------------ | -------------- | ------------- |
| unified-link-mark.test.ts   | ✅           | ✅             | ⚠️ 他の問題   |
| resolver.test.ts            | ✅           | ✅             | ⚠️ 他の問題   |
| create-page-dialog.test.tsx | ✅           | ✅             | ❌ DOM 未定義 |
| ocr-client.test.ts          | ✅           | ✅             | ❌ DOM 未定義 |

---

## 実施した修正内容

### 1. unified-link-mark.test.ts

**変更前**:

```typescript
vi.mock("@/lib/utils/searchPages", () => ({
  searchPages: vi.fn(),
}));
```

**変更後**:

```typescript
import * as searchPagesModule from "@/lib/utils/searchPages";

const mockSearchPages = vi.fn();
vi.spyOn(searchPagesModule, "searchPages").mockImplementation(mockSearchPages);
```

**一括置換**:

```bash
sed -i '' 's/vi\.mocked(searchPages)/mockSearchPages/g'
sed -i '' 's/expect(searchPages)/expect(mockSearchPages)/g'
```

---

### 2. resolver.test.ts

**変更前**:

```typescript
vi.mock("@/app/_actions/pages", () => ({
  createPage: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
```

**変更後**:

```typescript
import * as pagesModule from "@/app/_actions/pages";

const mockCreatePage = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.spyOn(pagesModule, "createPage").mockImplementation(mockCreatePage);

const toast = {
  success: mockToastSuccess,
  error: mockToastError,
  // ... その他のメソッド
};
```

**一括置換**:

```bash
sed -i '' 's/vi\.mocked(createPage)/mockCreatePage/g'
sed -i '' 's/expect(createPage)/expect(mockCreatePage)/g'
```

---

### 3. create-page-dialog.test.tsx

**変更前**:

```typescript
vi.mock("@/app/_actions/pages", () => ({
  createPage: vi.fn(),
}));
```

**変更後**:

```typescript
import * as pagesModule from "@/app/_actions/pages";

const mockCreatePage = vi.fn();
vi.spyOn(pagesModule, "createPage").mockImplementation(mockCreatePage);
```

---

### 4. ocr-client.test.ts

**変更前**:

```typescript
vi.mock("tesseract.js", () => ({
  createWorker: vi.fn(() => ({
    loadLanguage: vi.fn(),
    initialize: vi.fn(),
    // ...
  })),
}));
```

**変更後**:

```typescript
import * as tesseractModule from "tesseract.js";

const mockRecognize = vi.fn(() => Promise.resolve({...}));
const mockWorker = {
  loadLanguage: vi.fn(),
  initialize: vi.fn(),
  recognize: mockRecognize,
  terminate: vi.fn(),
};
const mockCreateWorker = vi.fn(() => Promise.resolve(mockWorker));

vi.spyOn(tesseractModule, "createWorker").mockImplementation(mockCreateWorker);
```

---

## 新たに発見された問題

### 問題 1: DOM 環境が正しく初期化されていない ❌

**エラーメッセージ**:

```
ReferenceError: document is not defined
ReferenceError: window is not defined
```

**影響を受けるテスト**:

- `create-page-dialog.test.tsx` (全テスト)
- `ocr-client.test.ts` (全テスト)
- `resolver.test.ts` (window を使用するテスト)

**原因**:

- `vitest.config.ts`で`environment: "jsdom"`が設定されているが、正しく動作していない
- Bun の環境で jsdom が正しく読み込まれていない可能性

**対策**:

1. 各テストファイルに`@vitest-environment jsdom`コメントを追加
2. `happy-dom`への切り替えを検討
3. setupFiles で DOM 環境を明示的に初期化

---

### 問題 2: キャッシュ関数のモックが正しく動作していない ⚠️

**エラーメッセージ**:

```
error: expect(received).toBe(expected)
Expected: "page-123"
Received: undefined
```

**影響を受けるテスト**:

- `utils.test.ts` のキャッシュ関連テスト (12 件失敗)

**原因**:

- `getCachedPageId`と`setCachedPageId`のモックが実際の関数を呼び出していない
- スパイの設定が不完全

**対策**:

```typescript
// 実際の実装をモックする必要がある
vi.spyOn(unilinkModule, "getCachedPageId").mockImplementation((key) => {
  // モックロジック
});
```

---

### 問題 3: Editor モックの不完全性 ⚠️

**エラーメッセージ**:

```
TypeError: Right side of assignment cannot be destructured
      at updateMarkToExists (resolver.ts:118:33)
```

**原因**:

- テスト内のモック Editor オブジェクトが`editor.view`プロパティを持っていない
- 実際の実装が期待するプロパティ構造と一致していない

**対策**:
モック Editor に必要なプロパティを追加:

```typescript
const mockEditor = {
  view: {
    state: {...},
    dispatch: vi.fn(),
  },
  // ...
} as Partial<Editor>;
```

---

## 現在のテスト結果サマリー

### 成功しているテスト ✅

| ファイル                            | 成功 | 失敗 | 成功率 |
| ----------------------------------- | ---- | ---- | ------ |
| thumbnailExtractor.test.ts          | 13   | 0    | 100%   |
| thumbnailExtractor.pageView.test.ts | 7    | 0    | 100%   |
| smartThumbnailUpdater.test.ts       | 13   | 0    | 100%   |
| thumbnailExtractor.batch.test.ts    | 12   | 0    | 100%   |
| utils.test.ts (正規化)              | 20   | 0    | 100%   |
| resolver.test.ts (一部)             | 4    | 11   | 27%    |

**合計**: 69 成功 / 133 失敗 (34%成功率)

---

## 次のステップ（優先度順）

### 🔥 優先度: 最高

#### 1. DOM 環境の修正

各テストファイルの先頭に以下を追加:

```typescript
/**
 * @vitest-environment jsdom
 */
```

または、`vitest.config.ts`を修正:

```typescript
export default defineConfig({
  test: {
    environment: "happy-dom", // jsdomの代わり
    // ...
  },
});
```

**工数**: 0.5 日

---

### ⚠️ 優先度: 高

#### 2. キャッシュ関数のモック修正

`utils.test.ts`のキャッシュテストを修正:

```typescript
// スパイではなく、実際の実装を使用
// またはモック実装を完全に定義
```

**工数**: 0.5 日

---

#### 3. Editor モックの完全化

`resolver.test.ts`と`unified-link-mark.test.ts`の Editor モックを修正:

```typescript
const mockEditor = {
  view: {
    state: mockState,
    dispatch: vi.fn(),
  },
  schema: {...},
  commands: {...},
  // 必要なすべてのプロパティ
} as Editor;
```

**工数**: 1 日

---

### 📝 優先度: 中

#### 4. window/document モックの追加

`resolver.test.ts`の navigation 関連テストを修正:

```typescript
beforeEach(() => {
  global.window = {
    location: {
      href: "",
    },
    confirm: vi.fn(),
  } as any;
});
```

**工数**: 0.5 日

---

## 技術的な学び

### 1. Bun での`vi.mock()`の制限

**問題**: Bun は Vitest の`vi.mock()`をモジュールレベルで完全にはサポートしていない

**解決策**: `vi.spyOn()`を使用した手動モック

**トレードオフ**:

- ✅ Bun 環境で動作
- ✅ より明示的なモック設定
- ❌ コード量が増加
- ❌ 一括置換が必要

---

### 2. jsdom vs happy-dom

**jsdom**:

- より完全な DOM 実装
- メモリ使用量が大きい
- Bun との互換性に問題がある可能性

**happy-dom**:

- 軽量で高速
- Bun 環境でより安定
- 一部の DOM API が未実装の可能性

**推奨**: happy-dom への切り替えを検討

---

### 3. モック戦略のベストプラクティス

**学んだこと**:

1. グローバルモックよりもローカルモックを優先
2. `vi.spyOn()`は実際のモジュールインポートが必要
3. 複雑なオブジェクト（toast 等）は手動で構築
4. テストごとに`vi.clearAllMocks()`を呼び出す

---

## まとめ

### 達成したこと ✅

1. 4 つのテストファイルから`vi.mock()`を完全に削除
2. 手動モック方式への移行完了
3. 一部のテスト（69 件）が正常に実行可能

### 残っている課題 ❌

1. DOM 環境の初期化問題（133 件のテスト失敗）
2. キャッシュ関数のモック不具合（12 件のテスト失敗）
3. Editor/window モックの不完全性

### 推奨される次のアクション

1. **即座**: `@vitest-environment jsdom`コメントの追加
2. **今日中**: キャッシュテストの修正
3. **今週中**: すべてのテストを動作させる

---

**作成者**: AI Assistant  
**レビュー状態**: 要レビュー  
**関連ドキュメント**:

- [テスト実行状況レポート](./20251011_test-status-report.md)
- [UnifiedLinkMark Phase 2 実装完了レポート](./20251011_unified-link-mark-phase2-implementation.md)
