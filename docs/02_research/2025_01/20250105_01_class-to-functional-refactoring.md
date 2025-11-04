# Classベース実装から関数型実装へのリファクタリング調査

**作成日**: 2025-01-05  
**関連Issue**: Phase 2実装完了後のリファクタリング検討  
**調査者**: AI Agent

---

## 概要

Phase 2のプラグイン機能実装が完了したため、Classベースの実装を関数型実装にリファクタリングする可能性を調査しました。

---

## 現状のClass実装

### Phase 2で使用されているClass一覧

| ファイル | Class名 | パターン | 用途 |
|---------|---------|---------|------|
| `lib/plugins/editor-registry.ts` | `EditorExtensionRegistry` | Singleton | エディタ拡張の登録・管理 |
| `lib/plugins/ai-registry.ts` | `AIExtensionRegistry` | Singleton | AI拡張の登録・管理 |
| `lib/plugins/ui-registry.ts` | `UIExtensionRegistry` | Singleton | UI拡張の登録・管理 |
| `lib/plugins/data-processor-registry.ts` | `DataProcessorExtensionRegistry` | Singleton | データ処理拡張の登録・管理 |
| `lib/plugins/integration-registry.ts` | `IntegrationExtensionRegistry` | Singleton | 統合拡張の登録・管理 |
| `lib/plugins/editor-manager.ts` | `EditorManager` | Singleton | エディタインスタンス管理 |
| `lib/plugins/plugin-loader.ts` | `PluginLoader` | Singleton | プラグインロード・アンロード |
| `lib/plugins/plugin-registry.ts` | `PluginRegistry` | Singleton | プラグイン登録・管理（Phase 1） |

**合計**: 8つのClass、全てSingletonパターンを使用

---

## Singletonパターンの特徴

### 現在の実装パターン

```typescript
export class Registry {
  private static instance: Registry | null = null;
  
  private constructor() {
    // プライベートコンストラクタ
  }
  
  public static getInstance(): Registry {
    if (!Registry.instance) {
      Registry.instance = new Registry();
    }
    return Registry.instance;
  }
  
  public static reset(): void {
    Registry.instance = null;
  }
  
  // インスタンスメソッド
  public register(...): void { }
}
```

### 使用例

```typescript
const registry = Registry.getInstance();
registry.register(...);
```

---

## 関数型実装への変換案

### パターン1: モジュールレベルの状態管理

```typescript
// プライベート状態（モジュールスコープ）
let state: {
  extensions: Map<string, ExtensionEntry[]>;
} = {
  extensions: new Map(),
};

// 公開関数
export function register(pluginId: string, options: Options): void {
  const pluginExtensions = state.extensions.get(pluginId) ?? [];
  // ... 登録ロジック
  state.extensions.set(pluginId, pluginExtensions);
}

export function unregister(pluginId: string, extensionId?: string): boolean {
  // ... 登録解除ロジック
}

// テスト用リセット関数
export function reset(): void {
  state = {
    extensions: new Map(),
  };
}
```

**メリット**:
- ✅ よりシンプルで直接的な実装
- ✅ Singletonパターンのオーバーヘッドがない
- ✅ モジュールレベルの状態で自然にシングルトン的動作
- ✅ テスト時のリセットが簡単

**デメリット**:
- ⚠️ モジュールが再読み込みされない限り状態が残る（通常は問題なし）
- ⚠️ 明示的なSingletonではないため、意図が読み取りにくい可能性

### パターン2: クロージャーを使った状態カプセル化

```typescript
function createRegistry() {
  // プライベート状態
  const extensions = new Map<string, ExtensionEntry[]>();
  
  // 公開API
  return {
    register(pluginId: string, options: Options): void {
      const pluginExtensions = extensions.get(pluginId) ?? [];
      // ... 登録ロジック
      extensions.set(pluginId, pluginExtensions);
    },
    
    unregister(pluginId: string, extensionId?: string): boolean {
      // ... 登録解除ロジック
    },
    
    // テスト用リセット
    reset(): void {
      extensions.clear();
    },
  };
}

// シングルトンインスタンス
const registry = createRegistry();

// エクスポート
export const register = registry.register;
export const unregister = registry.unregister;
export const reset = registry.reset;
```

**メリット**:
- ✅ クロージャーで状態が完全にカプセル化される
- ✅ Singletonパターンより明示的
- ✅ テスト用のリセットが簡単

**デメリット**:
- ⚠️ パターン1より少し複雑

### パターン3: 関数型スタイル（純粋関数 + 状態管理）

```typescript
// 状態型
type RegistryState = {
  extensions: Map<string, ExtensionEntry[]>;
};

// プライベート状態
let state: RegistryState = {
  extensions: new Map(),
};

// 純粋関数（状態を引数として受け取る）
function registerExtension(
  state: RegistryState,
  pluginId: string,
  options: Options,
): RegistryState {
  const newState = {
    ...state,
    extensions: new Map(state.extensions),
  };
  
  const pluginExtensions = newState.extensions.get(pluginId) ?? [];
  // ... 登録ロジック
  newState.extensions.set(pluginId, pluginExtensions);
  
  return newState;
}

// 状態を更新する関数（impure）
export function register(pluginId: string, options: Options): void {
  state = registerExtension(state, pluginId, options);
}

// テスト用リセット
export function reset(): void {
  state = {
    extensions: new Map(),
  };
}
```

**メリット**:
- ✅ 純粋関数としてテストしやすい
- ✅ 関数型プログラミングの原則に沿う

**デメリット**:
- ⚠️ オーバーヘッドが大きい（毎回Mapをコピー）
- ⚠️ 実用的でない可能性

---

## 推奨パターン

**推奨**: **パターン1（モジュールレベルの状態管理）**

### 理由

1. **シンプルさ**: 最もシンプルで理解しやすい
2. **パフォーマンス**: オーバーヘッドが最小限
3. **実用性**: Node.js/TypeScriptのモジュールシステムと相性が良い
4. **既存コードとの互換性**: 関数エクスポートで既存のAPIを維持できる

### 実装例（EditorExtensionRegistry）

```typescript
/**
 * Editor Extension Registry
 *
 * Manages editor extensions registered by plugins.
 * Provides registration, unregistration, and query capabilities for editor extensions.
 */

import type { Extension } from "@tiptap/core";
import logger from "@/lib/logger";
import type { EditorExtensionOptions } from "./types";

// ============================================================================
// Types
// ============================================================================

export interface EditorExtensionEntry {
  pluginId: string;
  extensionId: string;
  extension: Extension | Extension[];
  type: "node" | "mark" | "plugin";
}

// ============================================================================
// State (Private)
// ============================================================================

/** Map of plugin ID to array of extensions */
const extensions = new Map<string, EditorExtensionEntry[]>();

// ============================================================================
// Registration Operations
// ============================================================================

/**
 * Register an editor extension
 *
 * @param pluginId Plugin ID registering the extension
 * @param options Extension options
 * @throws Error if extension ID already exists for this plugin
 */
export function register(
  pluginId: string,
  options: EditorExtensionOptions,
): void {
  const pluginExtensions = extensions.get(pluginId) ?? [];

  // Check if extension ID already exists
  const existing = pluginExtensions.find(
    (ext) => ext.extensionId === options.id,
  );

  if (existing) {
    throw new Error(
      `Extension ${options.id} already registered for plugin ${pluginId}`,
    );
  }

  // Validate extension type
  if (!["node", "mark", "plugin"].includes(options.type)) {
    throw new Error(
      `Invalid extension type: ${options.type}. Must be 'node', 'mark', or 'plugin'`,
    );
  }

  const entry: EditorExtensionEntry = {
    pluginId,
    extensionId: options.id,
    extension: options.extension as Extension | Extension[],
    type: options.type,
  };

  pluginExtensions.push(entry);
  extensions.set(pluginId, pluginExtensions);

  logger.info(
    {
      pluginId,
      extensionId: options.id,
      type: options.type,
    },
    "Editor extension registered",
  );
}

/**
 * Unregister an extension
 *
 * @param pluginId Plugin ID
 * @param extensionId Extension ID (optional, if not provided, all extensions for plugin are removed)
 * @returns True if extension was unregistered, false if not found
 */
export function unregister(pluginId: string, extensionId?: string): boolean {
  const pluginExtensions = extensions.get(pluginId);

  if (!pluginExtensions) {
    logger.warn({ pluginId }, "No extensions found for plugin");
    return false;
  }

  if (extensionId) {
    // Remove specific extension
    const index = pluginExtensions.findIndex(
      (ext) => ext.extensionId === extensionId,
    );

    if (index === -1) {
      logger.warn(
        { pluginId, extensionId },
        "Extension not found for unregistration",
      );
      return false;
    }

    pluginExtensions.splice(index, 1);

    if (pluginExtensions.length === 0) {
      extensions.delete(pluginId);
    } else {
      extensions.set(pluginId, pluginExtensions);
    }

    logger.info({ pluginId, extensionId }, "Editor extension unregistered");
    return true;
  }

  // Remove all extensions for plugin
  extensions.delete(pluginId);
  logger.info(
    { pluginId, count: pluginExtensions.length },
    "All editor extensions unregistered for plugin",
  );
  return true;
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get all extensions for a plugin
 *
 * @param pluginId Plugin ID (optional, if not provided, returns all extensions)
 * @returns Array of extension entries
 */
export function getExtensions(pluginId?: string): EditorExtensionEntry[] {
  if (pluginId) {
    return extensions.get(pluginId) ?? [];
  }

  // Return all extensions
  const allExtensions: EditorExtensionEntry[] = [];
  for (const pluginExtensions of extensions.values()) {
    allExtensions.push(...pluginExtensions);
  }
  return allExtensions;
}

/**
 * Get Tiptap Extension instances for a plugin
 *
 * @param pluginId Plugin ID (optional, if not provided, returns all extensions)
 * @returns Array of Tiptap Extensions (flattened if array)
 */
export function getTiptapExtensions(pluginId?: string): Extension[] {
  const entries = getExtensions(pluginId);
  const result: Extension[] = [];

  for (const entry of entries) {
    if (Array.isArray(entry.extension)) {
      result.push(...entry.extension);
    } else {
      result.push(entry.extension);
    }
  }

  return result;
}

/**
 * Check if plugin has extensions
 *
 * @param pluginId Plugin ID
 * @returns True if plugin has registered extensions
 */
export function hasExtensions(pluginId: string): boolean {
  const pluginExtensions = extensions.get(pluginId);
  return pluginExtensions !== undefined && pluginExtensions.length > 0;
}

/**
 * Get extension by ID
 *
 * @param pluginId Plugin ID
 * @param extensionId Extension ID
 * @returns Extension entry or undefined if not found
 */
export function getExtension(
  pluginId: string,
  extensionId: string,
): EditorExtensionEntry | undefined {
  const pluginExtensions = extensions.get(pluginId);
  return pluginExtensions?.find((ext) => ext.extensionId === extensionId);
}

/**
 * Clear all extensions for a plugin
 *
 * @param pluginId Plugin ID
 */
export function clearPlugin(pluginId: string): void {
  unregister(pluginId);
}

/**
 * Clear all extensions
 *
 * @warning This will remove all registered extensions!
 */
export function clear(): void {
  const count = extensions.size;
  extensions.clear();
  logger.info({ clearedCount: count }, "All editor extensions cleared");
}

/**
 * Get statistics
 *
 * @returns Statistics about registered extensions
 */
export function getStats(): {
  totalPlugins: number;
  totalExtensions: number;
  extensionsByType: Record<"node" | "mark" | "plugin", number>;
} {
  let totalExtensions = 0;
  const extensionsByType: Record<"node" | "mark" | "plugin", number> = {
    node: 0,
    mark: 0,
    plugin: 0,
  };

  for (const pluginExtensions of extensions.values()) {
    for (const ext of pluginExtensions) {
      totalExtensions++;
      extensionsByType[ext.type]++;
    }
  }

  return {
    totalPlugins: extensions.size,
    totalExtensions,
    extensionsByType,
  };
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Reset registry (for testing)
 */
export function reset(): void {
  extensions.clear();
}
```

---

## 移行計画

### ステップ1: 1つのレジストリで試行

1. `EditorExtensionRegistry` を関数型にリファクタリング
2. テストを更新
3. 依存ファイルを更新（`plugin-api.ts`, `editor-manager.ts`等）

### ステップ2: 残りのレジストリを順次移行

1. `AIExtensionRegistry`
2. `UIExtensionRegistry`
3. `DataProcessorExtensionRegistry`
4. `IntegrationExtensionRegistry`

### ステップ3: Manager/Loaderの移行

1. `EditorManager`
2. `PluginLoader`
3. `PluginRegistry`（Phase 1だが関連）

---

## 既存コードへの影響

### 変更が必要なファイル

#### 1. レジストリファイル自体
- Class定義を削除
- 関数エクスポートに変更

#### 2. 使用しているファイル

**`lib/plugins/plugin-api.ts`**:
```typescript
// Before
const registry = getEditorExtensionRegistry();
registry.register(pluginId, options);

// After
import { register as registerEditorExtension } from "./editor-registry";
registerEditorExtension(pluginId, options);
```

**`lib/plugins/plugin-loader.ts`**:
```typescript
// Before
const extensionRegistry = getEditorExtensionRegistry();
if (extensionRegistry.hasExtensions(pluginId)) {
  extensionRegistry.clearPlugin(pluginId);
}

// After
import { hasExtensions, clearPlugin } from "./editor-registry";
if (hasExtensions(pluginId)) {
  clearPlugin(pluginId);
}
```

**`lib/plugins/editor-manager.ts`**:
```typescript
// Before
const registry = getEditorExtensionRegistry();
const pluginExtensions = registry.getTiptapExtensions();

// After
import { getTiptapExtensions } from "./editor-registry";
const pluginExtensions = getTiptapExtensions();
```

#### 3. テストファイル

```typescript
// Before
import { EditorExtensionRegistry } from "./editor-registry";

beforeEach(() => {
  EditorExtensionRegistry.reset();
});

// After
import { reset } from "./editor-registry";

beforeEach(() => {
  reset();
});
```

---

## メリット・デメリット

### メリット

1. **モダンな実装**: 関数型プログラミングの原則に沿う
2. **シンプルさ**: Singletonパターンのオーバーヘッドがない
3. **テストしやすさ**: モジュールレベルの状態なのでリセットが簡単
4. **型安全性**: TypeScriptの型推論が効きやすい
5. **Tree-shaking**: 使用していない関数が除外されやすい

### デメリット

1. **既存コードの変更**: 多くのファイルでインポート文を変更する必要がある
2. **明確性**: Singletonパターンほど「シングルトンである」ことが明示的でない
3. **状態の可視性**: モジュールレベルの状態なので、デバッグ時に直接アクセスできない（これはメリットでもある）

---

## 結論

**推奨**: 関数型実装へのリファクタリングは**推奨**します。

### 理由

1. **モダンなTypeScript/JavaScriptのベストプラクティス**に沿う
2. **コードの簡潔性**が向上する
3. **テストの書きやすさ**が向上する
4. **既存の機能を損なうことなく**移行可能

### 注意事項

- 移行は**段階的に**行うこと（1つのレジストリから始める）
- **既存のテストを全てパス**することを確認
- **型定義を維持**すること（export interface/typeはそのまま）

---

## 関連ドキュメント

- [Phase 2実装計画](../03_plans/plugin-system/phase2-editor-extensions.md)
- [実装状況まとめ](../03_plans/plugin-system/implementation-status.md)

