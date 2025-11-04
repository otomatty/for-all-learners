# プラグインシステム Phase 2: エディタ拡張システム

**作成日**: 2025-11-04  
**ステータス**: 🚧 実装中  
**関連Issue**: N/A

---

## 概要

プラグインシステム Phase 2では、Tiptapエディタの拡張機能をプラグインから動的に登録・操作できる機能を実装します。プラグインは、カスタムノード、マーク、ProseMirrorプラグインを登録し、エディタの操作（コマンド実行、コンテンツ取得/設定など）を行うことができます。

---

## 実装目標

### 主要目標

1. **エディタ拡張の動的登録**: プラグインからTiptap拡張機能（ノード、マーク、プラグイン）を登録
2. **エディタ操作API**: プラグインからエディタのコンテンツやコマンドを操作
3. **拡張機能のライフサイクル管理**: プラグインのロード/アンロード時に拡張機能を適切に追加/削除
4. **型安全性の確保**: TypeScriptによる型安全なAPI設計

---

## 実装内容

### 1. エディタ拡張レジストリの実装

#### `lib/plugins/editor-registry.ts` (新規作成)

**目的**: プラグインが登録したエディタ拡張機能を管理

**機能**:
- 拡張機能の登録/登録解除
- プラグインIDによる拡張機能の管理
- エディタインスタンスごとの拡張機能の取得

**実装内容**:

```typescript
export interface EditorExtension {
  pluginId: string;
  extensionId: string;
  extension: Extension | Extension[];
  type: 'node' | 'mark' | 'plugin';
}

export class EditorExtensionRegistry {
  private extensions: Map<string, EditorExtension[]>;
  
  register(pluginId: string, extension: EditorExtension): void;
  unregister(pluginId: string, extensionId?: string): void;
  getExtensions(pluginId?: string): Extension[];
  clearPlugin(pluginId: string): void;
}
```

### 2. エディタAPIの実装

#### `lib/plugins/plugin-api.ts` への追加

**目的**: プラグインからエディタを操作するためのAPIを提供

**実装内容**:

```typescript
export interface EditorAPI {
  /**
   * Register a custom Tiptap extension (Node, Mark, or Plugin)
   */
  registerExtension(options: {
    id: string;
    extension: Extension | Extension[];
    type: 'node' | 'mark' | 'plugin';
  }): Promise<void>;

  /**
   * Unregister an extension
   */
  unregisterExtension(extensionId: string): Promise<void>;

  /**
   * Execute an editor command
   */
  executeCommand(command: string, ...args: unknown[]): Promise<unknown>;

  /**
   * Get editor content as JSON
   */
  getContent(): Promise<JSONContent>;

  /**
   * Set editor content
   */
  setContent(content: JSONContent): Promise<void>;

  /**
   * Get editor selection
   */
  getSelection(): Promise<{ from: number; to: number } | null>;

  /**
   * Set editor selection
   */
  setSelection(from: number, to: number): Promise<void>;

  /**
   * Check if a command is available
   */
  canExecuteCommand(command: string): Promise<boolean>;
}
```

### 3. エディタインスタンス管理

#### `lib/plugins/editor-manager.ts` (新規作成)

**目的**: エディタインスタンスとプラグイン拡張機能の統合管理

**機能**:
- エディタインスタンスの登録
- プラグイン拡張機能の自動適用
- エディタインスタンスごとの拡張機能の管理

**実装内容**:

```typescript
export class EditorManager {
  private editors: Map<string, Editor>; // editorId -> Editor
  private extensionRegistry: EditorExtensionRegistry;
  
  registerEditor(editorId: string, editor: Editor): void;
  unregisterEditor(editorId: string): void;
  applyPluginExtensions(editorId: string, pluginId: string): void;
  removePluginExtensions(editorId: string, pluginId: string): void;
}
```

### 4. プラグインローダーとの統合

#### `lib/plugins/plugin-loader.ts` への変更

**変更内容**:
- プラグインロード時にエディタ拡張機能を登録
- プラグインアンロード時にエディタ拡張機能を削除
- エディタマネージャーとの連携

### 5. エディタコンポーネントとの統合

#### `components/pages/_hooks/usePageEditorLogic.ts` への変更

**変更内容**:
- エディタ作成時にエディタマネージャーに登録
- プラグイン拡張機能の自動適用
- エディタ破棄時のクリーンアップ

---

## 技術的な検討事項

### 1. エディタインスタンスの特定

**課題**: 複数のエディタインスタンスが存在する可能性がある

**解決策**:
- エディタインスタンスごとに一意のIDを付与
- プラグインAPIでエディタIDを指定可能にする（オプション）
- デフォルトでは最初に登録されたエディタ、または最後にフォーカスされたエディタを使用

### 2. 拡張機能の動的追加/削除

**課題**: Tiptapエディタは通常、初期化時に拡張機能を設定する

**解決策**:
- `editor.setExtensions()` を使用して拡張機能を動的に更新
- プラグイン拡張機能を別配列として管理し、基本拡張機能とマージ

### 3. セキュリティ考慮事項

**課題**: プラグインがエディタの全機能にアクセスできる

**解決策**:
- エディタ操作APIを通じた制限付きアクセスのみ
- 危険なコマンド（例: `clearContent`）は明示的に許可する必要がある
- エディタコンテンツの変更は監査ログに記録（将来フェーズ）

### 4. パフォーマンス

**課題**: 複数のプラグインが拡張機能を登録した場合のパフォーマンス

**解決策**:
- 拡張機能の遅延ロード
- エディタ更新のバッチ処理
- 拡張機能のキャッシング

---

## 実装ステップ

### Step 1: エディタ拡張レジストリの実装

1. `lib/plugins/editor-registry.ts` を作成
2. 拡張機能の登録/登録解除機能を実装
3. ユニットテストを作成

### Step 2: エディタマネージャーの実装

1. `lib/plugins/editor-manager.ts` を作成
2. エディタインスタンス管理機能を実装
3. 拡張機能の適用/削除機能を実装

### Step 3: エディタAPIの実装

1. `lib/plugins/plugin-api.ts` に `EditorAPI` を追加
2. エディタ操作APIを実装
3. プラグインAPIへの統合

### Step 4: プラグインローダーとの統合

1. `lib/plugins/plugin-loader.ts` を更新
2. プラグインロード時に拡張機能を登録
3. プラグインアンロード時に拡張機能を削除

### Step 5: エディタコンポーネントとの統合

1. `components/pages/_hooks/usePageEditorLogic.ts` を更新
2. エディタ作成時にエディタマネージャーに登録
3. プラグイン拡張機能の自動適用

### Step 6: テストとドキュメント

1. 統合テストを作成
2. サンプルプラグインを作成
3. ドキュメントを更新

---

## 型定義

### `lib/plugins/types.ts` への追加

```typescript
export interface EditorExtensionOptions {
  id: string;
  extension: Extension | Extension[];
  type: 'node' | 'mark' | 'plugin';
}

export interface EditorCommandOptions {
  command: string;
  args?: unknown[];
}
```

---

## サンプルプラグイン

### カスタムマークプラグインの例

```typescript
// plugin code
export default function(api: PluginAPI) {
  return {
    activate() {
      // Register a custom mark extension
      api.editor.registerExtension({
        id: 'custom-highlight',
        extension: Mark.create({
          name: 'customHighlight',
          addAttributes() {
            return {
              color: {
                default: '#ffeb3b',
              },
            };
          },
          parseHTML() {
            return [{ tag: 'span[data-custom-highlight]' }];
          },
          renderHTML({ HTMLAttributes }) {
            return ['span', { 'data-custom-highlight': '', style: `background-color: ${HTMLAttributes.color}` }, 0];
          },
        }),
        type: 'mark',
      });

      // Register a command
      api.ui.registerCommand({
        id: 'add-highlight',
        label: 'Add Highlight',
        handler: async () => {
          await api.editor.executeCommand('toggleCustomHighlight', { color: '#ffeb3b' });
        },
      });
    },
    deactivate() {
      api.editor.unregisterExtension('custom-highlight');
    },
  };
}
```

---

## 制限事項

### Phase 2 の制限

1. **エディタインスタンス**: 複数エディタの同時操作は未サポート（将来対応）
2. **React Component**: NodeViewの動的ロードは未サポート（Phase 4で対応）
3. **エディタ設定**: エディタの初期設定の変更は未サポート
4. **拡張機能の依存関係**: プラグイン間の拡張機能依存関係は未サポート（将来対応）

---

## 次のフェーズ

### Phase 3: AI機能拡張システム

**実装予定:**
- AI API追加
- プロンプトテンプレート登録
- カスタム問題生成ロジック
- LLMモデル選択

---

## 関連ドキュメント

- [プラグイン開発ガイド](../../guides/plugin-development.md)
- [プラグイン型定義](../../../types/plugin.ts)
- [プラグインAPI仕様](../../../lib/plugins/plugin-api.ts)
- [Phase 1 実装計画](./phase1-core-system.md)

---

## 変更履歴

| 日付 | 変更内容 | 担当 |
|------|----------|------|
| 2025-11-04 | Phase 2 実装計画作成 | AI Agent |

---

**ステータス**: 🚧 Phase 2 設計完了  
**次のステップ**: エディタ拡張レジストリの実装開始

