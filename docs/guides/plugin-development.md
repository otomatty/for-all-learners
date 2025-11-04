# F.A.L プラグイン開発ガイド

**最終更新**: 2025-11-04  
**対象**: プラグイン開発者  
**前提知識**: TypeScript, Web Workers, React

---

## 目次

1. [概要](#概要)
2. [プラグインシステムの基本](#プラグインシステムの基本)
3. [プラグインの作成](#プラグインの作成)
4. [マニフェストの定義](#マニフェストの定義)
5. [プラグインAPI](#プラグインapi)
6. [拡張ポイント](#拡張ポイント)
7. [開発環境のセットアップ](#開発環境のセットアップ)
8. [デバッグとテスト](#デバッグとテスト)
9. [公開とマーケットプレイス](#公開とマーケットプレイス)
10. [FAQ](#faq)

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

### 1. プロジェクトのセットアップ

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

---

## 拡張ポイント

### Phase 1 (現在)

- **UI拡張**: コマンド登録、ダイアログ表示

### Phase 2 (予定)

- **エディタ拡張**: Tiptap Extensions

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
3. ビルドしたプラグインを手動でインストール

### 開発サーバー

```bash
# プラグインを watch モードでビルド
npm run watch

# 別のターミナルで F.A.L を起動
cd /path/to/for-all-learners
bun dev
```

---

## デバッグとテスト

### デバッグ

プラグインはWeb Workerで実行されるため、ブラウザの開発者ツールでデバッグできます：

1. ブラウザの開発者ツールを開く
2. `Application` → `Workers` で Worker を確認
3. `console.log()` でログ出力

### テスト

```typescript
// プラグインのテスト (Vitest使用)
import { describe, it, expect } from 'vitest';

describe('My Plugin', () => {
  it('should do something', () => {
    // テストコード
  });
});
```

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

公式サンプルプラグインは以下のリポジトリで公開予定です：

- `fal-plugin-example-simple` - シンプルなプラグイン
- `fal-plugin-example-storage` - ストレージ活用例
- `fal-plugin-example-commands` - コマンド登録例

---

## サポート

- **ドキュメント**: https://github.com/your-org/for-all-learners/docs
- **Issue**: https://github.com/your-org/for-all-learners/issues
- **Discord**: https://discord.gg/fal (準備中)

---

**Happy Plugin Development! 🎉**

