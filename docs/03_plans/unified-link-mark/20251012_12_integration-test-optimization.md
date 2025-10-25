# 統合テスト最適化実装計画

**作成日**: 2025-10-12  
**カテゴリ**: 実装計画  
**関連**: [統合テスト分析レポート](../../../08_worklogs/2025_10/20251012/20251012_18_integration-test-analysis.md)

## 目的

統合テストの品質向上、実行速度改善、メンテナンス性向上を実現する。

## 現状の問題点詳細

### 1. 失敗しているテスト (29 件)

#### CreatePageDialog テスト (17 件失敗)

**エラー**: `ReferenceError: document is not defined`

**原因**:

```tsx
// components/__tests__/create-page-dialog.test.tsx
/**
 * @vitest-environment jsdom
 */
```

ファイルには JSDOM 環境指定があるが、`@testing-library/react`の`render`関数実行時に`document`が未定義になっている。

**推測される原因**:

1. Vitest 設定とファイル指定の不整合
2. `vitest.setup.ts`の初期化タイミング問題
3. React Testing Library のバージョン互換性

#### OCR Client テスト (12 件失敗/タイムアウト)

**エラー**: テストが約 2960 秒(49 分)でタイムアウト

**原因**:

```typescript
// lib/ocr/__tests__/ocr-client.test.ts
it("正常な画像URLでOCR処理が成功する", async () => {
  // fetch のモック設定
  (global.fetch as unknown as MockFetch).mockResolvedValueOnce({
    // ...
  });

  const result = await ClientOcr.processImage("https://i.gyazo.com/test.png");
  // タイムアウト
});
```

**推測される原因**:

1. 画像の`onload`イベントが発火していない
2. `setTimeout`が実行されていない
3. Promise が解決されない無限待機状態

### 2. テストコードの重複

#### beforeEach の重複パターン

```typescript
// パターン1: plugins/__tests__/index.test.ts
beforeEach(() => {
  mockEditor = {} as Editor;
  mockOptions = {
    HTMLAttributes: {},
    autoReconciler: null,
    noteSlug: null,
    userId: "test-user-id",
    onShowCreatePageDialog: () => {},
  };
});

// パターン2: resolver.test.ts
beforeEach(() => {
  vi.clearAllMocks();
  mockEditor = {
    state: {
      doc: mockDoc,
    },
  } as unknown as Editor;
});
```

これらが**56 ファイル**で繰り返されている。

### 3. モックの不統一

#### 異なるモック実装

```typescript
// ファイルA
const mocks = {
  createPage: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
};

// ファイルB
const mockCreatePage = vi.fn();
const mockToast = { success: vi.fn() };

// ファイルC
vi.mock("@/app/_actions/pages", () => ({
  createPage: vi.fn(),
}));
```

## 実装計画

### Phase 1: 失敗テストの修正 (優先度: 最高)

#### Task 1.1: CreatePageDialog テストの修正

**対応方法 A: vitest.config.ts の確認と修正**

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom", // グローバル設定を確認
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

**対応方法 B: vitest.setup.ts の強化**

```typescript
// vitest.setup.ts
import { afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// Ensure JSDOM is properly initialized
if (typeof window !== "undefined") {
  // DOM environment is available
  console.log("JSDOM environment initialized");
}

// Additional JSDOM setup if needed
global.document = global.window.document;
```

**対応方法 C: テストファイルの環境指定強化**

```tsx
/**
 * @vitest-environment jsdom
 * @vitest-environment-options {"url": "http://localhost:3000"}
 */
```

**実装手順**:

1. `vitest.config.ts`の`environment`設定を確認
2. `vitest.setup.ts`にデバッグログを追加して問題を特定
3. 必要に応じてテストファイルの環境指定を強化
4. テストを実行して検証

**期待結果**: CreatePageDialog の 17 テストが全て成功

#### Task 1.2: OCR Client テストの修正

**問題の詳細分析**:

```typescript
// 現在のモック実装
Object.defineProperty(img, "src", {
  set: function (value) {
    this._src = value;
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0); // ← これが実行されていない可能性
  },
});
```

**対応方法 A: 即座にイベントを発火**

```typescript
Object.defineProperty(img, "src", {
  set: function (value) {
    this._src = value;
    // setTimeoutを使わず即座に実行
    if (this.onload) {
      this.onload();
    }
  },
});
```

**対応方法 B: Promise ベースのモック**

```typescript
Object.defineProperty(img, "src", {
  set: function (value) {
    this._src = value;
    // マイクロタスクで実行
    Promise.resolve().then(() => {
      if (this.onload) this.onload();
    });
  },
});
```

**対応方法 C: テストタイムアウトの短縮**

```typescript
describe("ClientOcr", () => {
  // グローバルタイムアウトを短縮
  it(
    "正常な画像URLでOCR処理が成功する",
    async () => {
      // ...
    },
    { timeout: 5000 }
  ); // 5秒に制限
});
```

**実装手順**:

1. 対応方法 A を試してテスト実行
2. 失敗する場合は対応方法 B を試行
3. それでも失敗する場合は対応方法 C でタイムアウトを短縮してエラーを早期検出
4. 根本原因を特定して適切に修正

**期待結果**: OCR の 12 テストが 5 秒以内に完了

### Phase 2: 共通テストヘルパーの作成 (優先度: 高)

#### Task 2.1: テストヘルパーディレクトリ構造

```
lib/
  __tests__/
    helpers/
      index.ts              # 全てのヘルパーをexport
      editor-mock.ts        # Editorモック
      options-mock.ts       # オプションモック
      page-mock.ts          # Pageデータモック
      dom-mock.ts           # DOM関連モック
      async-utils.ts        # 非同期テストユーティリティ
```

#### Task 2.2: Editor モックヘルパー

```typescript
// lib/__tests__/helpers/editor-mock.ts
import type { Editor } from "@tiptap/core";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export interface MockEditorOptions {
  doc?: ProseMirrorNode;
  selection?: { from: number; to: number };
  userId?: string;
}

/**
 * Create a mock Editor instance for testing
 *
 * @example
 * const editor = createMockEditor({
 *   doc: mockDoc,
 *   selection: { from: 0, to: 0 }
 * });
 */
export function createMockEditor(options: MockEditorOptions = {}): Editor {
  const mockDoc = options.doc || createEmptyDoc();

  return {
    state: {
      doc: mockDoc,
      selection: {
        from: options.selection?.from ?? 0,
        to: options.selection?.to ?? 0,
        $from: { pos: options.selection?.from ?? 0 } as any,
        $to: { pos: options.selection?.to ?? 0 } as any,
      },
      tr: {} as Transaction,
    } as EditorState,
    view: {
      state: {} as EditorState,
      dispatch: vi.fn(),
    },
    chain: vi.fn(() => ({
      focus: vi.fn(() => ({ run: vi.fn() })),
      setMark: vi.fn(() => ({ run: vi.fn() })),
      run: vi.fn(),
    })),
    commands: {
      insertUnifiedLink: vi.fn(),
      refreshUnifiedLinks: vi.fn(),
    },
  } as unknown as Editor;
}

/**
 * Create an empty ProseMirror document
 */
export function createEmptyDoc(): ProseMirrorNode {
  return {
    type: { name: "doc" },
    content: {
      size: 0,
      childCount: 0,
      forEach: vi.fn(),
      descendants: vi.fn(),
    },
    nodeSize: 2,
    childCount: 0,
  } as unknown as ProseMirrorNode;
}

/**
 * Create a ProseMirror document with text content
 */
export function createDocWithText(text: string): ProseMirrorNode {
  return {
    type: { name: "doc" },
    textContent: text,
    content: {
      size: text.length,
      childCount: 1,
      forEach: vi.fn(),
      descendants: vi.fn((callback) => {
        // Simulate document structure
        callback({ text }, 0, null, 0);
        return true;
      }),
    },
    nodeSize: text.length + 2,
    childCount: 1,
  } as unknown as ProseMirrorNode;
}
```

#### Task 2.3: Options モックヘルパー

```typescript
// lib/__tests__/helpers/options-mock.ts
import type { UnifiedLinkMarkOptions } from "@/lib/tiptap-extensions/unified-link-mark/types";

export interface MockOptionsConfig {
  userId?: string | null;
  noteSlug?: string | null;
  autoReconciler?: any;
  onShowCreatePageDialog?: () => void;
}

/**
 * Create mock UnifiedLinkMarkOptions for testing
 *
 * @example
 * const options = createMockOptions({ userId: "test-user" });
 */
export function createMockOptions(
  config: MockOptionsConfig = {}
): UnifiedLinkMarkOptions {
  return {
    HTMLAttributes: {},
    autoReconciler: config.autoReconciler ?? null,
    noteSlug: config.noteSlug ?? null,
    userId: config.userId ?? "test-user-id",
    onShowCreatePageDialog: config.onShowCreatePageDialog ?? vi.fn(),
  };
}
```

#### Task 2.4: Page データモックヘルパー

```typescript
// lib/__tests__/helpers/page-mock.ts
import type { Json } from "@/types/database.types";

export interface MockPageData {
  id?: string;
  title?: string;
  user_id?: string;
  content_tiptap?: Json;
  is_public?: boolean;
}

/**
 * Create a mock Page object for testing
 *
 * @example
 * const page = createMockPage({ title: "Test Page" });
 */
export function createMockPage(data: MockPageData = {}) {
  return {
    id: data.id ?? `page-${Math.random().toString(36).slice(2, 9)}`,
    title: data.title ?? "Test Page",
    content_tiptap: data.content_tiptap ?? {},
    user_id: data.user_id ?? "test-user-id",
    is_public: data.is_public ?? false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    thumbnail_url: null,
    scrapbox_page_id: null,
    scrapbox_page_content_synced_at: null,
    scrapbox_page_list_synced_at: null,
  };
}

/**
 * Create multiple mock pages
 */
export function createMockPages(count: number, baseData: MockPageData = {}) {
  return Array.from({ length: count }, (_, i) =>
    createMockPage({
      ...baseData,
      title: baseData.title
        ? `${baseData.title} ${i + 1}`
        : `Test Page ${i + 1}`,
    })
  );
}
```

#### Task 2.5: 統合モックファクトリ

```typescript
// lib/__tests__/helpers/index.ts
export * from "./editor-mock";
export * from "./options-mock";
export * from "./page-mock";
export * from "./dom-mock";
export * from "./async-utils";

import { vi } from "vitest";
import { createMockEditor } from "./editor-mock";
import { createMockOptions } from "./options-mock";

/**
 * Create a complete test environment with all common mocks
 *
 * @example
 * const env = createTestEnvironment();
 * // env.editor, env.options, env.mocks が利用可能
 */
export function createTestEnvironment() {
  const editor = createMockEditor();
  const options = createMockOptions();

  const mocks = {
    createPage: vi.fn(),
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    },
    emitPageCreated: vi.fn(),
  };

  return {
    editor,
    options,
    mocks,
    cleanup: () => {
      vi.clearAllMocks();
    },
  };
}
```

#### Task 2.6: 既存テストの移行例

**Before**:

```typescript
describe("createPlugins", () => {
  let mockEditor: Editor;
  let mockOptions: UnifiedLinkMarkOptions;

  beforeEach(() => {
    mockEditor = {} as Editor;
    mockOptions = {
      HTMLAttributes: {},
      autoReconciler: null,
      noteSlug: null,
      userId: "test-user-id",
      onShowCreatePageDialog: () => {},
    };
  });

  it("should return an array of plugins", () => {
    const plugins = createPlugins({
      editor: mockEditor,
      options: mockOptions,
    });
    // ...
  });
});
```

**After**:

```typescript
import { createMockEditor, createMockOptions } from "@/__tests__/helpers";

describe("createPlugins", () => {
  let editor: Editor;
  let options: UnifiedLinkMarkOptions;

  beforeEach(() => {
    editor = createMockEditor();
    options = createMockOptions();
  });

  it("should return an array of plugins", () => {
    const plugins = createPlugins({ editor, options });
    // ...
  });
});
```

**削減されたコード量**: 約 70% (10 行 → 3 行)

### Phase 3: 統合テストの再構成 (優先度: 中)

#### Task 3.1: ディレクトリ構造の整理

```
lib/tiptap-extensions/unified-link-mark/
  __tests__/
    unit/                           # 単体テスト
      commands/
        insert-unified-link.test.ts
        refresh-unified-links.test.ts
      plugins/
        auto-bracket-plugin.test.ts
        click-handler-plugin.test.ts
        suggestion-plugin.test.ts
      input-rules/
        bracket-rule.test.ts
        tag-rule.test.ts

    integration/                    # 統合テスト (新規)
      plugins-integration.test.ts   # プラグイン間の連携
      editor-integration.test.ts    # エディタとの統合
      resolver-integration.test.ts  # リゾルバとの統合
      e2e-scenarios.test.ts        # エンドツーエンドシナリオ

    helpers/                        # 共通ヘルパー
      index.ts
      editor-mock.ts
      options-mock.ts
```

#### Task 3.2: 統合テストの分類

**レベル 1: プラグイン統合** (`plugins-integration.test.ts`)

- 複数プラグインの同時動作
- プラグイン間のイベント伝播
- プラグインの実行順序

**レベル 2: エディタ統合** (`editor-integration.test.ts`)

- エディタとプラグインの連携
- コマンド実行とエディタ状態
- 実際の DOM 操作

**レベル 3: リゾルバ統合** (`resolver-integration.test.ts`)

- ページ作成フロー
- ナビゲーション
- ブロードキャスト

**レベル 4: E2E シナリオ** (`e2e-scenarios.test.ts`)

- 実際のユーザー操作フロー
- 複数機能の連携
- エラーハンドリング

#### Task 3.3: 統合テスト例

```typescript
// integration/plugins-integration.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createTestEnvironment } from "../helpers";
import { createPlugins } from "../../plugins";

describe("Plugins Integration", () => {
  let env: ReturnType<typeof createTestEnvironment>;

  beforeEach(() => {
    env = createTestEnvironment();
  });

  describe("Auto-bracket and Click-handler interaction", () => {
    it("should create link with bracket and handle click correctly", async () => {
      const plugins = createPlugins({
        editor: env.editor,
        options: env.options,
      });

      // Auto-bracket plugin creates link
      // Click-handler plugin handles navigation

      expect(plugins).toHaveLength(3);
      // Integration test logic...
    });
  });

  describe("Suggestion and Resolver interaction", () => {
    it("should suggest pages and resolve to existing page", async () => {
      // Test suggestion plugin + resolver queue integration
    });
  });
});
```

### Phase 4: パフォーマンス最適化 (優先度: 中)

#### Task 4.1: 並列実行の最適化

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // テストファイルを並列実行
    fileParallelism: true,

    // 最大並列数を設定
    maxConcurrency: 10,

    // テストの分離を保証
    isolate: true,

    // 各テストのタイムアウト
    testTimeout: 5000, // 5秒
  },
});
```

#### Task 4.2: 遅いテストの特定と最適化

```typescript
// 遅いテストを見つけるレポーター
export default defineConfig({
  test: {
    reporters: ["default", ["json", { outputFile: "test-results.json" }]],
    benchmark: {
      // ベンチマークテストの設定
      include: ["**/*.bench.ts"],
    },
  },
});
```

#### Task 4.3: モックの最適化

```typescript
// 重いモックを軽量化
export function createLightweightMock() {
  // 必要最小限のモック実装
  return {
    // 実際に使用されるメソッドのみ
  };
}
```

### Phase 5: カバレッジ向上 (優先度: 低)

#### Task 5.1: 優先順位付け

| モジュール           | 現在   | 目標 | 優先度 |
| -------------------- | ------ | ---- | ------ |
| click-handler-plugin | 6.44%  | 60%  | 最高   |
| suggestion-plugin    | 21.90% | 60%  | 高     |
| bracket-rule         | 18.75% | 80%  | 中     |
| tag-rule             | 18.97% | 80%  | 中     |

#### Task 5.2: テスト追加計画

**click-handler-plugin**: 実際の DOM 操作テストを追加

```typescript
describe("click-handler-plugin DOM operations", () => {
  it("should handle actual click events", () => {
    // 実際のDOMクリックをシミュレート
  });

  it("should navigate on link click", () => {
    // ナビゲーション処理のテスト
  });
});
```

## 実装スケジュール

### Week 1: 失敗テスト修正 + ヘルパー作成

- Day 1-2: Task 1.1, 1.2 (失敗テスト修正)
- Day 3-4: Task 2.1-2.4 (ヘルパー作成)
- Day 5: Task 2.5-2.6 (既存テスト移行開始)

### Week 2: 統合テスト再構成

- Day 1-2: Task 3.1 (ディレクトリ整理)
- Day 3-4: Task 3.2, 3.3 (統合テスト作成)
- Day 5: テスト実行とデバッグ

### Week 3: 最適化とカバレッジ向上

- Day 1-2: Task 4.1-4.3 (パフォーマンス最適化)
- Day 3-5: Task 5.1-5.2 (カバレッジ向上)

## 成功指標

### 即時 (Week 1 終了時)

- [ ] 失敗テスト: 0 件
- [ ] 共通ヘルパー: 作成完了
- [ ] 既存テストの移行: 20%完了

### 短期 (Week 2 終了時)

- [ ] 統合テストの分離: 完了
- [ ] テスト実行時間: < 1000ms
- [ ] カバレッジ: 関数 > 55%, 行 > 55%

### 中期 (Week 3 終了時)

- [ ] カバレッジ: 関数 > 65%, 行 > 65%
- [ ] テスト実行時間: < 800ms
- [ ] コードの重複: 50%削減

## リスクと対策

### Risk 1: JSDOM 環境問題が深刻

**対策**: 最新の vitest と JSDOM にアップデート、または happy-dom に切り替え

### Risk 2: 既存テストの移行に時間がかかる

**対策**: 段階的移行、重要度の高いテストから優先

### Risk 3: パフォーマンス改善が限定的

**対策**: プロファイリングツールで正確なボトルネックを特定

## 関連ドキュメント

- [統合テスト分析レポート](../../../08_worklogs/2025_10/20251012/20251012_18_integration-test-analysis.md)
- [Phase R2.2 完了レポート](../../../08_worklogs/2025_10/20251012/20251012_17_phase-r2.2-complete-summary.md)

---

**更新履歴**

- 2025-10-12: 初版作成 - 詳細な実装計画策定
