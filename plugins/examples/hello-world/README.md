# Hello World Plugin

プラグインシステムの基本構造を説明する最小限のサンプルプラグインです。

## 機能

このプラグインは以下の機能を実装しています：

1. **プラグインのアクティベーション**
   - プラグインが起動したときに通知を表示
   - アプリケーション情報を取得して表示

2. **コマンド登録**
   - "Hello World を実行" コマンド: 挨拶メッセージを表示し、回数をカウント
   - "ストレージ内容を表示" コマンド: 保存されているデータを表示

3. **ストレージAPIの使用**
   - 挨拶回数の保存
   - 最後の挨拶時刻の保存
   - 最後の起動時刻の保存

4. **プラグインメソッドの公開**
   - `getGreetingCount()`: 挨拶回数を取得
   - `resetGreetingCount()`: 挨拶回数をリセット

## 使用方法

1. プラグインをインストール
2. プラグインが有効化されると、自動的に通知が表示されます
3. コマンドパレットから "Hello World を実行" を実行
4. または "ストレージ内容を表示" を実行して保存データを確認

## 実装のポイント

### プラグインの基本構造

```typescript
async function activate(
  api: PluginAPI,
  config?: Record<string, unknown>,
): Promise<{
  methods?: Record<string, (...args: unknown[]) => unknown | Promise<unknown>>;
  dispose?: () => void | Promise<void>;
}> {
  // プラグインの初期化処理
  // ...
  
  return {
    methods: {
      // 公開するメソッド
    },
    dispose: async () => {
      // クリーンアップ処理
    },
  };
}
```

### APIの使用例

- **Notifications API**: ユーザーに通知を表示
- **Storage API**: プラグイン固有のデータを保存
- **UI API**: コマンドやダイアログを登録
- **App API**: アプリケーション情報を取得

## 関連ドキュメント

- [プラグイン開発ガイド](../../../docs/guides/plugin-development.md)
- [プラグインAPIリファレンス](../../../packages/plugin-types/index.d.ts)

