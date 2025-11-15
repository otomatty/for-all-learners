# プラグイン開発チュートリアル: はじめに

**最終更新**: 2025-11-06  
**対象**: プラグイン開発初心者  
**所要時間**: 15-30分

---

## このチュートリアルについて

このチュートリアルでは、F.A.L プラグインシステムの基本を学び、最初のプラグインを作成します。

### 学習内容

- プラグインシステムの概要
- 開発環境のセットアップ
- 最初のプラグインの作成
- プラグインのビルドとテスト

---

## プラグインシステムの概要

### プラグインとは？

F.A.L プラグインは、アプリケーションの機能を拡張するJavaScriptモジュールです。プラグインは以下の領域を拡張できます：

- **エディタ拡張**: カスタムマークやノードの追加
- **AI機能拡張**: 問題生成器やプロンプトテンプレートの作成
- **UI拡張**: WidgetやPageの追加
- **データ処理拡張**: Import/Export/Transformerの実装
- **外部統合拡張**: OAuthやWebhookの実装

### セキュリティモデル

- プラグインは**Web Workerサンドボックス**で実行されます
- DOMやデータベースへの直接アクセスは禁止
- プラグインAPIを通じた制限付きアクセスのみ許可

### プラグインのライフサイクル

1. **ロード**: アプリケーションがプラグインを読み込む
2. **初期化**: `activate()` 関数が呼ばれる
3. **実行**: プラグインが提供する機能を実行
4. **破棄**: `dispose()` 関数が呼ばれる（オプション）

---

## 開発環境のセットアップ

### 必要な環境

- **Node.js**: v18以上
- **Bun**: v1.0以上（推奨）または npm/yarn
- **TypeScript**: v5.0以上
- **Git**: バージョン管理用

### セットアップ手順

```bash
# 1. F.A.L リポジトリをクローン
git clone https://github.com/otomatty/for-all-learners.git
cd for-all-learners

# 2. 依存関係をインストール
bun install

# 3. 開発環境を起動
bun run dev
```

### 型定義のインストール

プラグイン開発には、型定義パッケージが必要です：

```bash
# プロジェクトルートで型定義を生成
bun run plugins:generate-types

# プラグインディレクトリで型定義をインストール
cd plugins/examples/your-plugin
bun add ../../packages/plugin-types
```

---

## 最初のプラグイン作成

### ステップ1: プラグインの生成

CLIツールを使用してプラグインを生成します：

```bash
# Hello Worldテンプレートから生成
bun run plugins:create my-first-plugin

# または、特定のテンプレートを指定
bun run plugins:create my-plugin --template=editor-extension
```

利用可能なテンプレート：
- `hello-world`: 基本的なプラグイン
- `editor-extension`: エディタ拡張
- `ai-extension`: AI拡張
- `ui-extension`: UI拡張
- `data-processor-extension`: データ処理拡張
- `integration-extension`: 統合拡張

### ステップ2: プラグインの構造

生成されたプラグインの構造：

```
my-first-plugin/
├── src/
│   └── index.ts          # メインのプラグインコード
├── plugin.json           # プラグインマニフェスト
├── package.json          # パッケージ設定
├── tsconfig.json         # TypeScript設定
└── README.md             # ドキュメント
```

### ステップ3: プラグインコードの確認

`src/index.ts` の基本構造：

```typescript
import type { PluginAPI } from "../../../../packages/plugin-types";

/**
 * Plugin activation function
 */
async function activate(
  api: PluginAPI,
  config?: Record<string, unknown>
): Promise<{
  methods?: Record<string, (...args: unknown[]) => unknown | Promise<unknown>>;
  dispose?: () => void | Promise<void>;
}> {
  // プラグインの初期化処理
  api.notifications.success("プラグインが起動しました！");
  
  // プラグインのメソッドを公開
  return {
    methods: {
      // 公開メソッド
    },
    dispose: async () => {
      // クリーンアップ処理
    },
  };
}

export default activate;
```

### ステップ4: マニフェストの確認

`plugin.json` の基本構造：

```json
{
  "id": "com.example.my-first-plugin",
  "name": "My First Plugin",
  "version": "1.0.0",
  "description": "私の最初のプラグイン",
  "author": "Your Name",
  "main": "src/index.ts",
  "extensionPoints": {
    "editor": false,
    "ai": false,
    "ui": true,
    "dataProcessor": false,
    "integration": false
  }
}
```

---

## プラグインのビルドとテスト

### ビルド

プラグインをビルドします：

```bash
# プラグインディレクトリに移動
cd plugins/examples/my-first-plugin

# ビルド実行
bun run plugins:build my-first-plugin
```

ビルド結果は `dist/` ディレクトリに出力されます。

### テスト

プラグインのテストを実行します：

```bash
# テスト実行
bun run plugins:test my-first-plugin

# カバレッジ付きで実行
bun run plugins:test my-first-plugin --coverage
```

### 開発モード

ホットリロード付きの開発モード：

```bash
# 開発モード開始
bun run plugins:dev my-first-plugin
```

---

## ローカル開発環境でのテスト

### プラグインの読み込み

1. アプリケーションを起動：
   ```bash
   bun run dev
   ```

2. プラグインをビルドして公開：
   ```bash
   bun run plugins:build com.example.my-first-plugin
   bun run plugins:publish com.example.my-first-plugin
   ```

3. マーケットプレイスからインストール：
   - ブラウザで `http://localhost:3000/settings/plugins` にアクセス
   - マーケットプレイスタブでプラグインを検索
   - 「インストール」ボタンをクリック

詳細は **[プラグイン公開ガイド](./publishing-plugins.md)** を参照してください。

### プラグインの再読み込み

コードを変更したら、再公開してテストできます：

1. プラグインをビルド：
   ```bash
   bun run plugins:build com.example.my-first-plugin
   ```

2. プラグインを再公開：
   ```bash
   bun run plugins:publish com.example.my-first-plugin
   ```

3. マーケットプレイスからプラグインを再インストールまたは更新

### デバッグ

デバッグ情報を確認：

1. ブラウザの開発者ツールを開く（F12）
2. `Application` → `Workers` で Worker を確認
3. `Console` でログを確認
4. プラグインのログ、エラー、パフォーマンスメトリクスを確認

---

## 次のステップ

基本を理解したら、次のチュートリアルに進みましょう：

1. **[エディタ拡張チュートリアル](./tutorial-editor-extension.md)**: カスタムマークやノードの作成
2. **[AI拡張チュートリアル](./tutorial-ai-extension.md)**: 問題生成器の作成
3. **[UI拡張チュートリアル](./tutorial-ui-extension.md)**: Widgetの作成
4. **[APIリファレンス](./api-reference.md)**: 詳細なAPIドキュメント
5. **[ベストプラクティス](./best-practices.md)**: 開発のベストプラクティス

---

## よくある質問

### Q: プラグインはどこに作成すればいいですか？

**A**: `plugins/examples/` ディレクトリに作成してください。開発用のプラグインはここに配置します。

### Q: プラグインのIDはどのように決めますか？

**A**: 逆ドメイン記法を使用します（例: `com.example.my-plugin`）。一意である必要があります。

### Q: プラグインはどのように配布しますか？

**A**: CLIツールを使用してプラグインを公開できます。詳細は **[プラグイン公開ガイド](./publishing-plugins.md)** を参照してください。

---

## サンプルプラグイン

参考になるサンプルプラグイン：

- `plugins/examples/hello-world/`: 基本的なプラグイン
- `plugins/examples/editor-extension/`: エディタ拡張の例
- `plugins/examples/ai-extension/`: AI拡張の例
- `plugins/examples/ui-extension/`: UI拡張の例

---

**次のチュートリアル**: [エディタ拡張チュートリアル](./tutorial-editor-extension.md)

