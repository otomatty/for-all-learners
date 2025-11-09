# F.A.L プラグイン開発ガイド

**最終更新**: 2025-11-06  
**対象**: プラグイン開発者  
**前提知識**: TypeScript, Web Workers, React  
**Phase 2対応**: ✅ エディタ拡張システム対応済み  
**Phase 4対応**: ✅ 開発ツールとサンプルプラグイン対応済み

---

## 目次

1. [概要](#概要)
2. [プラグインシステムの基本](#プラグインシステムの基本)
3. [プラグインの作成](#プラグインの作成)
4. [CLI開発ツール](#cli開発ツール) ✅
5. [マニフェストの定義](#マニフェストの定義)
6. [プラグインAPI](#プラグインapi)
   - [App API](#app-api)
   - [Storage API](#storage-api)
   - [Notifications API](#notifications-api)
   - [UI API](#ui-api-phase-1)
   - [Editor API](#editor-api-phase-2) ✅
7. [拡張ポイント](#拡張ポイント)
8. [開発環境のセットアップ](#開発環境のセットアップ)
9. [デバッグとテスト](#デバッグとテスト)
10. [サンプルプラグイン](#サンプルプラグイン) ✅
11. [公開とマーケットプレイス](#公開とマーケットプレイス)
12. [FAQ](#faq)

## 詳細ドキュメント

より詳細な情報が必要な場合は、以下のドキュメントを参照してください：

- **[はじめにチュートリアル](./plugin-development/tutorial-getting-started.md)**: プラグイン開発の基本を学ぶ
- **[エディタ拡張チュートリアル](./plugin-development/tutorial-editor-extension.md)**: エディタ機能の拡張方法
- **[AI拡張チュートリアル](./plugin-development/tutorial-ai-extension.md)**: AI機能の拡張方法
- **[UI拡張チュートリアル](./plugin-development/tutorial-ui-extension.md)**: UI要素の追加方法
- **[ローカル開発環境](./plugin-development/local-development-environment.md)**: 開発環境の読み込みボタンとローカル開発の詳細
- **[APIリファレンス](./plugin-development/api-reference.md)**: 詳細なAPIドキュメント
- **[ベストプラクティス](./plugin-development/best-practices.md)**: 開発のベストプラクティス
- **[トラブルシューティング](./plugin-development/troubleshooting.md)**: よくある問題と解決方法

---

## 概要

F.A.L プラグインシステムは、ユーザーがアプリケーションの機能を拡張できる強力な仕組みです。プラグインは以下の領域を拡張できます：

- **エディタ拡張** (Tiptap Extensions)
- **AI機能拡張** (LLM統合、問題生成)
- **UI拡張** (React Components)
- **データ処理拡張** (Import/Export)
- **外部統合拡張** (API連携)

### セキュリティモデル

- プラグインは**Web Workerサンドボックス**で実行されます
- DOM、データベースへの直接アクセスは禁止
- プラグインAPIを通じた制限付きアクセスのみ許可
- 公式マーケットプレイスのプラグインはコードレビュー必須

---

## プラグインシステムの基本

### アーキテクチャ

```
┌─────────────────────────────────────────┐
│          F.A.L Application              │
│  ┌───────────────────────────────────┐  │
│  │      Plugin Loader                │  │
│  │  (loads & manages plugins)        │  │
│  └───────────────────────────────────┘  │
│                   │                      │
│      ┌────────────┴───────────┐         │
│      │                        │         │
│  ┌───▼────┐  ┌────▼───┐  ┌───▼────┐   │
│  │Plugin A│  │Plugin B│  │Plugin C│   │
│  │(Worker)│  │(Worker)│  │(Worker)│   │
│  └────────┘  └────────┘  └────────┘   │
│      │            │            │        │
│  ┌───▼────────────▼────────────▼─────┐ │
│  │         Plugin API                 │ │
│  │  (storage, notifications, UI, etc) │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### プラグインのライフサイクル

1. **インストール**: ユーザーがマーケットプレイスからインストール
2. **ロード**: アプリケーション起動時に自動ロード
3. **初期化**: `activate()` 関数が呼ばれる
4. **実行**: プラグインが提供する機能を実行
5. **破棄**: アプリケーション終了時に `dispose()` が呼ばれる

---

## プラグインの作成

プラグインを作成する方法は2つあります：

1. **CLIツールを使用（推奨）**: テンプレートから自動生成
2. **手動作成**: ゼロからプロジェクトを作成

### 方法1: CLIツールを使用（推奨）

F.A.L にはプラグイン開発を支援するCLIツールが用意されています。これを使用すると、テンプレートから必要なファイルが自動生成されます。

```bash
# プラグインを生成
bun run plugins:create my-plugin

# テンプレートを指定（オプション）
bun run plugins:create my-plugin --template=hello-world
```

利用可能なテンプレート：
- `hello-world`: 基本的なプラグイン（デフォルト）
- `editor-extension`: エディタ拡張テンプレート
- `ai-extension`: AI拡張テンプレート
- `ui-extension`: UI拡張テンプレート
- `data-processor-extension`: データ処理拡張テンプレート
- `integration-extension`: 統合拡張テンプレート

詳細は [CLI開発ツール](#cli開発ツール) セクションを参照してください。

### 方法2: 手動作成

```bash
# プラグインプロジェクトを作成
mkdir my-fal-plugin
cd my-fal-plugin

# package.json を初期化
npm init -y

# 必要な依存関係をインストール
npm install --save-dev typescript @types/node
npm install --save-dev esbuild  # ビルドツール
```

### 2. TypeScript設定

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "WebWorker"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3. プラグインコードの作成

`src/index.ts`:

```typescript
/**
 * My F.A.L Plugin
 * 
 * このプラグインは...（説明）
 */

// プラグイン API の型定義
interface PluginAPI {
  app: {
    getVersion(): string;
    getName(): string;
    getUserId(): Promise<string | null>;
  };
  storage: {
    get<T>(key: string): Promise<T | undefined>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
  };
  notifications: {
    show(message: string, type?: 'info' | 'success' | 'error' | 'warning'): void;
    info(message: string): void;
    success(message: string): void;
    error(message: string): void;
  };
  ui: {
    registerCommand(command: Command): Promise<void>;
    showDialog(options: DialogOptions): Promise<unknown>;
  };
}

interface Command {
  id: string;
  label: string;
  description?: string;
  handler: () => void | Promise<void>;
}

interface DialogOptions {
  title: string;
  message?: string;
  buttons?: Array<{ label: string }>;
}

/**
 * プラグインのアクティベーション関数
 * 
 * @param api - プラグインAPI
 * @param config - ユーザー設定
 * @returns プラグインインスタンス
 */
function activate(api: PluginAPI, config?: Record<string, unknown>) {
  // 初期化処理
  api.notifications.success('My Plugin が起動しました！');

  // コマンドを登録
  api.ui.registerCommand({
    id: 'my-command',
    label: '私のコマンド',
    description: 'サンプルコマンドです',
    async handler() {
      await api.notifications.info('コマンドが実行されました！');
    }
  });

  // プラグインメソッドを返す
  return {
    methods: {
      /**
       * サンプルメソッド
       */
      async doSomething() {
        const appName = api.app.getName();
        api.notifications.show(`${appName} でプラグインが動作中！`);
      }
    },

    /**
     * クリーンアップ処理
     */
    async dispose() {
      api.notifications.info('My Plugin が終了しました');
    }
  };
}

// プラグインを export
export default activate;
```

### 4. マニフェストの作成

`plugin.json`:

```json
{
  "id": "com.example.my-fal-plugin",
  "name": "My F.A.L Plugin",
  "version": "1.0.0",
  "description": "素晴らしいプラグインの説明",
  "author": "Your Name",
  "homepage": "https://github.com/your-username/my-fal-plugin",
  "repository": "https://github.com/your-username/my-fal-plugin",
  "license": "MIT",
  "main": "dist/index.js",
  "extensionPoints": {
    "editor": false,
    "ai": false,
    "ui": true,
    "dataProcessor": false,
    "integration": false
  },
  "keywords": ["sample", "demo"],
  "minAppVersion": "1.0.0"
}
```

### 5. ビルドスクリプト

`package.json`:

```json
{
  "name": "my-fal-plugin",
  "version": "1.0.0",
  "scripts": {
    "build": "esbuild src/index.ts --bundle --outfile=dist/index.js --format=esm --platform=browser",
    "watch": "esbuild src/index.ts --bundle --outfile=dist/index.js --format=esm --platform=browser --watch",
    "clean": "rm -rf dist"
  }
}
```

### 6. ビルド

```bash
npm run build
```

---

## CLI開発ツール

F.A.L にはプラグイン開発を効率化するためのCLIツールが用意されています。これらのツールを使用することで、プラグインの生成、ビルド、テスト、品質チェックなどを簡単に実行できます。

### 利用可能なコマンド

#### プラグインの生成

```bash
# 基本的なプラグインを生成
bun run plugins:create <plugin-name>

# テンプレートを指定して生成
bun run plugins:create <plugin-name> --template=<template-name>
```

利用可能なテンプレート：
- `hello-world`: 最小限のプラグイン（基本API使用例）
- `editor-extension`: エディタ拡張プラグイン
- `ai-extension`: AI機能拡張プラグイン
- `ui-extension`: UI拡張プラグイン
- `data-processor-extension`: データ処理拡張プラグイン
- `integration-extension`: 統合拡張プラグイン

#### プラグインのビルド

```bash
# プラグインをビルド
bun run plugins:build <plugin-id>

# 例: hello-worldプラグインをビルド
bun run plugins:build com.example.hello-world
```

ビルドプロセス：
1. TypeScriptの型チェック
2. esbuildによるバンドル
3. マニフェスト検証
4. 出力ディレクトリへの配置

#### プラグインのテスト

```bash
# プラグインのテストを実行
bun run plugins:test <plugin-id>

# カバレッジレポート付きで実行
bun run plugins:test <plugin-id> --coverage
# または
bun run plugins:test <plugin-id> -c
```

テストは Vitest を使用して実行されます。プラグインの `__tests__` ディレクトリ内のテストファイルが実行されます。

#### 開発モード

```bash
# 開発モードを起動（ウォッチモード）
bun run plugins:dev <plugin-id>
```

開発モードでは：
- ファイル変更時に自動ビルド
- ローカル開発環境での自動読み込み（準備中）

#### プラグインの検証

```bash
# プラグインの検証（マニフェスト、型、依存関係）
bun run plugins:validate <plugin-id>
```

検証内容：
- マニフェストファイルの検証
- TypeScriptの型チェック
- 依存関係のチェック

#### コード品質チェック

```bash
# リントチェック
bun run plugins:lint <plugin-id>

# 自動修正
bun run plugins:lint <plugin-id> --fix
```

Biome を使用してコード品質をチェックします。

#### セキュリティチェック

```bash
# セキュリティチェック
bun run plugins:security-check <plugin-id>
```

チェック内容：
- 危険なAPIの使用チェック（DOMアクセス、eval等）
- サンドボックス違反の検出
- 依存関係の脆弱性チェック

#### パフォーマンステスト

```bash
# ベンチマークテスト
bun run plugins:benchmark <plugin-id>
```

測定内容：
- プラグインの起動時間
- API呼び出しのパフォーマンス
- メモリ使用量

#### 型定義の生成

```bash
# TypeScript型定義を生成
bun run plugins:generate-types
```

プラグイン開発者向けの型定義パッケージ（`@fal/plugin-types`）を生成します。

### ヘルプの表示

```bash
# コマンド一覧とヘルプを表示
bun run plugins:help
```

### 使用例

```bash
# 1. プラグインを生成
bun run plugins:create my-first-plugin --template=hello-world

# 2. プラグインをビルド
bun run plugins:build com.example.my-first-plugin

# 3. プラグインをテスト
bun run plugins:test com.example.my-first-plugin --coverage

# 4. セキュリティチェック
bun run plugins:security-check com.example.my-first-plugin

# 5. パフォーマンステスト
bun run plugins:benchmark com.example.my-first-plugin

# 6. 開発モードで起動
bun run plugins:dev com.example.my-first-plugin
```

---

## マニフェストの定義

マニフェスト (`plugin.json`) は、プラグインのメタデータを定義します。

### 必須フィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `id` | string | 一意なプラグインID (例: `com.example.my-plugin`) |
| `name` | string | 表示名 |
| `version` | string | セマンティックバージョン (例: `1.0.0`) |
| `description` | string | 短い説明 |
| `author` | string | 作成者名 |
| `main` | string | エントリーポイント (例: `dist/index.js`) |
| `extensionPoints` | object | 拡張ポイントの有効化 |

### オプションフィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `homepage` | string | ホームページURL |
| `repository` | string | リポジトリURL |
| `license` | string | ライセンス (例: `MIT`) |
| `dependencies` | object | プラグイン依存関係 |
| `keywords` | string[] | 検索キーワード |
| `minAppVersion` | string | 最小アプリバージョン |

### 拡張ポイントの設定

```json
{
  "extensionPoints": {
    "editor": true,      // エディタ拡張を提供
    "ai": false,         // AI機能拡張を提供しない
    "ui": true,          // UI拡張を提供
    "dataProcessor": false,  // データ処理拡張を提供しない
    "integration": false     // 外部統合を提供しない
  }
}
```

---

## プラグインAPI

### App API

```typescript
// アプリケーション情報を取得
const version = api.app.getVersion();  // "1.0.0"
const name = api.app.getName();        // "F.A.L"
const userId = await api.app.getUserId();  // UUID or null
```

### Storage API

プラグイン専用のkey-valueストレージ：

```typescript
// データを保存
await api.storage.set('myKey', { data: 'value' });

// データを取得
const data = await api.storage.get<{ data: string }>('myKey');

// データを削除
await api.storage.delete('myKey');

// すべてのキーを取得
const keys = await api.storage.keys();

// すべてのデータをクリア
await api.storage.clear();
```

### Notifications API

```typescript
// 通知を表示
api.notifications.show('メッセージ', 'info');

// ショートハンド
api.notifications.info('情報メッセージ');
api.notifications.success('成功メッセージ');
api.notifications.error('エラーメッセージ');
api.notifications.warning('警告メッセージ');
```

### UI API (Phase 1)

```typescript
// コマンドを登録
await api.ui.registerCommand({
  id: 'my-command',
  label: 'My Command',
  description: 'Description',
  async handler() {
    // コマンド実行時の処理
  }
});

// コマンドを解除
await api.ui.unregisterCommand('my-command');

// ダイアログを表示
const result = await api.ui.showDialog({
  title: 'Confirmation',
  message: 'Are you sure?',
  buttons: [
    { label: 'Yes' },
    { label: 'No' }
  ]
});
```

### Editor API (Phase 2) ✅

エディタ拡張機能を提供するAPIです。Tiptap拡張機能（ノード、マーク、プラグイン）を登録し、エディタを操作できます。

#### 拡張機能の登録

```typescript
// カスタムマークを登録
await api.editor.registerExtension({
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
      return [
        'span',
        {
          'data-custom-highlight': '',
          style: `background-color: ${HTMLAttributes.color}`,
        },
        0,
      ];
    },
  }),
  type: 'mark',
});

// 拡張機能を解除
await api.editor.unregisterExtension('custom-highlight');
```

**注意**: プラグインの `deactivate()` メソッドで必ず拡張機能を解除してください。

#### エディタコマンドの実行

```typescript
// エディタコマンドを実行
await api.editor.executeCommand('toggleBold');

// コマンドが実行可能かチェック
const canExecute = await api.editor.canExecuteCommand('toggleBold');
```

#### エディタコンテンツの操作

```typescript
// コンテンツを取得
const content = await api.editor.getContent();

// コンテンツを設定
await api.editor.setContent({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Hello, World!' }],
    },
  ],
});
```

#### 選択範囲の操作

```typescript
// 選択範囲を取得
const selection = await api.editor.getSelection();
// { from: 5, to: 10 } または null（選択なし）

// 選択範囲を設定
await api.editor.setSelection(5, 10);
```

**注意**: エディタIDを指定しない場合、アクティブ（最後にフォーカスされた）エディタが使用されます。

---

## 拡張ポイント

### Phase 1 (現在)

- **UI拡張**: コマンド登録、ダイアログ表示

### Phase 2 (実装完了 ✅)

- **エディタ拡張**: Tiptap Extensions の動的登録
- **エディタ操作**: コマンド実行、コンテンツ取得/設定、選択範囲操作

詳細は [Editor API](#editor-api-phase-2) を参照してください。

### Phase 3 (予定)

- **AI機能拡張**: カスタムプロンプト、問題生成

### Phase 4 (予定)

- **UI拡張**: React Component動的ロード

### Phase 5 (予定)

- **データ処理拡張**: Import/Export

---

## 開発環境のセットアップ

### ローカル開発

1. F.A.Lアプリケーションをローカルで起動
2. プラグインをビルド
3. 開発環境ページ (`http://localhost:3000/settings/plugins/dev`) でプラグインを読み込む

詳細は **[ローカル開発環境のドキュメント](./plugin-development/local-development-environment.md)** を参照してください。

### CLIツールを使用した開発（推奨）

CLIツールを使用することで、開発を効率化できます：

```bash
# 1. プラグインを生成
bun run plugins:create my-plugin

# 2. 開発モードで起動（ウォッチモード）
bun run plugins:dev my-plugin

# 別のターミナルで F.A.L を起動
cd /path/to/for-all-learners
bun dev
```

### 手動ビルド

CLIツールを使用しない場合：

```bash
# プラグインを watch モードでビルド
npm run watch

# 別のターミナルで F.A.L を起動
cd /path/to/for-all-learners
bun dev
```

または、CLIツールを使用：

```bash
# プラグインをビルド
bun run plugins:build <plugin-id>
```

---

## デバッグとテスト

### デバッグ

プラグインはWeb Workerで実行されるため、ブラウザの開発者ツールでデバッグできます：

1. ブラウザの開発者ツールを開く
2. `Application` → `Workers` で Worker を確認
3. `console.log()` でログ出力

### テスト

プラグインのテストは Vitest を使用します。CLIツールを使用してテストを実行できます：

```bash
# テストを実行
bun run plugins:test <plugin-id>

# カバレッジレポート付きで実行
bun run plugins:test <plugin-id> --coverage
```

テストコードの例：

```typescript
// プラグインのテスト (Vitest使用)
import { describe, it, expect, vi } from 'vitest';
import activate from '../src/index';

// モックAPIの作成（テスト用）
function createMockAPI() {
  return {
    app: {
      getVersion: () => '1.0.0',
      getName: () => 'F.A.L Test',
      getUserId: async () => 'test-user-123',
    },
    storage: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      keys: vi.fn(() => Promise.resolve([])),
      clear: vi.fn(),
    },
    notifications: {
      show: vi.fn(),
      info: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
    ui: {
      registerCommand: vi.fn(),
      unregisterCommand: vi.fn(),
      showDialog: vi.fn(),
    },
    // 他のAPIも同様にモック
  };
}

describe('My Plugin', () => {
  it('should activate successfully', async () => {
    const api = createMockAPI();
    const result = await activate(api);
    expect(result).toBeDefined();
  });

  it('should register commands', async () => {
    const api = createMockAPI();
    await activate(api);
    
    // コマンドが登録されたことを確認
    expect(api.ui.registerCommand).toHaveBeenCalled();
  });
});
```

テストユーティリティの詳細については、[ベストプラクティス](./plugin-development/best-practices.md) を参照してください。

---

## 公開とマーケットプレイス

### 公式プラグインの公開

1. プラグインをビルド
2. リポジトリをGitHubで公開
3. F.A.L開発チームにレビュー依頼
4. レビュー完了後、マーケットプレイスに公開

### サードパーティプラグイン

- ユーザーが手動でインストール可能
- コードレビューなし（自己責任）

---

## FAQ

### Q: プラグインからデータベースにアクセスできますか？

**A**: いいえ。プラグインはWeb Workerで実行されるため、直接アクセスできません。代わりに、`api.storage` を使用してください。

### Q: プラグインからDOMにアクセスできますか？

**A**: いいえ。Web Worker内ではDOMアクセスは禁止されています。UIの変更は `api.ui` を使用してください。

### Q: プラグイン間で通信できますか？

**A**: Phase 1では未サポートです。将来のバージョンで追加予定です。

### Q: どのNPMパッケージを使用できますか？

**A**: ビルド時にバンドルできるパッケージであれば使用可能です。ただし、Node.js固有のAPIを使用するパッケージは動作しません。

### Q: React コンポーネントを追加できますか？

**A**: Phase 4で対応予定です。Phase 1ではコマンド登録とダイアログ表示のみサポートしています。

---

## サンプルプラグイン

F.A.L には各拡張ポイントの実装例を示すサンプルプラグインが用意されています。これらのプラグインは `plugins/examples/` ディレクトリに配置されています。

### Hello World プラグイン

**プラグインID**: `com.example.hello-world`  
**場所**: `plugins/examples/hello-world/`

プラグインシステムの基本構造を説明する最小限のサンプルです。

**主な機能**:
- プラグインのアクティベーションと通知表示
- コマンド登録（"Hello World を実行"、"ストレージ内容を表示"）
- Storage APIの使用（挨拶回数の保存）
- プラグインメソッドの公開（`getGreetingCount()`, `resetGreetingCount()`）

**使用方法**:
```bash
# プラグインをビルド
bun run plugins:build com.example.hello-world

# プラグインをテスト
bun run plugins:test com.example.hello-world
```

### Editor Extension サンプル

**プラグインID**: `com.example.editor-extension`  
**場所**: `plugins/examples/editor-extension/`

エディタ拡張の実装例を示すサンプルです。

**主な機能**:
- エディタコマンドの実行例
- コンテンツ操作（取得、設定、挿入）
- 選択範囲の操作
- プラグインメソッドの公開（`toggleBold()`, `getWordCount()`, `insertTimestamp()`）

**使用方法**:
```bash
# プラグインをビルド
bun run plugins:build com.example.editor-extension

# プラグインをテスト
bun run plugins:test com.example.editor-extension
```

### AI Extension サンプル

**プラグインID**: `com.example.ai-extension`  
**場所**: `plugins/examples/ai-extension/`

AI機能拡張の実装例を示すサンプルです。

**主な機能**:
- カスタム問題生成器の実装（複数タイプ対応）
- カスタムプロンプトテンプレートの実装（2種類）
- コンテンツアナライザーの実装（2種類）

**使用方法**:
```bash
# プラグインをビルド
bun run plugins:build com.example.ai-extension

# プラグインをテスト
bun run plugins:test com.example.ai-extension
```

### UI Extension サンプル

**プラグインID**: `com.example.ui-extension`  
**場所**: `plugins/examples/ui-extension/`

UI拡張の実装例を示すサンプルです。

**主な機能**:
- Widget登録の実装例（2種類）
- Page登録の実装例
- Sidebar Panel登録の実装例

**使用方法**:
```bash
# プラグインをビルド
bun run plugins:build com.example.ui-extension

# プラグインをテスト
bun run plugins:test com.example.ui-extension
```

### Data Processor Extension サンプル

**プラグインID**: `com.example.data-processor-extension`  
**場所**: `plugins/examples/data-processor-extension/`

データ処理拡張の実装例を示すサンプルです。

**主な機能**:
- Importerの実装例（Markdown、Text）
- Exporterの実装例（JSON、Markdown）
- Transformerの実装例（大文字変換、プレフィックス追加）

**使用方法**:
```bash
# プラグインをビルド
bun run plugins:build com.example.data-processor-extension

# プラグインをテスト
bun run plugins:test com.example.data-processor-extension
```

### Integration Extension サンプル

**プラグインID**: `com.example.integration-extension`  
**場所**: `plugins/examples/integration-extension/`

外部統合拡張の実装例を示すサンプルです。

**主な機能**:
- OAuth連携の実装例（サンプルOAuth）
- Webhookの実装例（イベント保存機能付き）
- External API呼び出しの実装例

**使用方法**:
```bash
# プラグインをビルド
bun run plugins:build com.example.integration-extension

# プラグインをテスト
bun run plugins:test com.example.integration-extension
```

### サンプルプラグインの確認方法

すべてのサンプルプラグインは `plugins/examples/` ディレクトリに配置されています。各プラグインには以下のファイルが含まれています：

- `src/index.ts`: プラグインコード
- `plugin.json`: マニフェストファイル
- `README.md`: プラグインの説明と使用方法
- `package.json`: パッケージ設定
- `tsconfig.json`: TypeScript設定

サンプルプラグインのコードを参照することで、各拡張ポイントの実装方法を学習できます。

---

## サポート

- **ドキュメント**: https://github.com/your-org/for-all-learners/docs
- **Issue**: https://github.com/your-org/for-all-learners/issues
- **Discord**: https://discord.gg/fal (準備中)

---

**Happy Plugin Development! 🎉**

