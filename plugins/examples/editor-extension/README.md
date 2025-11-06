# Editor Extension サンプルプラグイン

エディタ拡張機能の実装例を示すサンプルプラグインです。

## 機能

このプラグインは以下の機能を実装しています：

1. **エディタコマンドの実行**
   - テキストの挿入
   - エディタ内容の取得と表示
   - サンプルコンテンツの設定

2. **エディタ操作**
   - 選択範囲の取得
   - コンテンツの設定
   - Boldフォーマットの切り替え

3. **プラグインメソッド**
   - `toggleBold()`: Boldフォーマットの切り替え
   - `getWordCount()`: エディタの単語数を取得
   - `insertTimestamp()`: タイムスタンプを挿入

## 使用方法

1. プラグインをインストール
2. プラグインが有効化されると、以下のコマンドが利用可能になります：
   - **サンプルテキストを挿入**: エディタにサンプルテキストを挿入
   - **エディタの内容を取得**: エディタの内容をJSON形式で表示
   - **サンプルコンテンツを設定**: エディタに構造化されたサンプルコンテンツを設定

## 実装のポイント

### Editor API の使用

```typescript
// テキストを挿入
await api.editor.executeCommand("insertContent", {
  type: "text",
  text: "Hello World",
});

// エディタの内容を取得
const content = await api.editor.getContent();

// エディタの内容を設定
await api.editor.setContent(newContent);

// 選択範囲を取得
const selection = await api.editor.getSelection();

// コマンドが実行可能かチェック
const canExecute = await api.editor.canExecuteCommand("toggleBold");
```

### コマンド登録

```typescript
await api.ui.registerCommand({
  id: "my-command",
  label: "コマンド名",
  description: "説明",
  handler: async () => {
    // コマンドの処理
  },
});
```

## 関連ドキュメント

- [プラグイン開発ガイド](../../../docs/guides/plugin-development.md)
- [プラグインAPIリファレンス](../../../packages/plugin-types/index.d.ts)

