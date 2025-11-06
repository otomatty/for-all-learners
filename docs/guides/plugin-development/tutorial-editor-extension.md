# エディタ拡張チュートリアル

**最終更新**: 2025-11-06  
**対象**: エディタ機能を拡張したいプラグイン開発者  
**所要時間**: 30-45分

---

## このチュートリアルについて

このチュートリアルでは、F.A.L エディタ（Tiptapベース）を拡張するプラグインを作成します。

### 学習内容

- エディタ拡張の基本概念
- カスタムマークの作成
- カスタムノードの作成
- エディタコマンドの実装
- コンテンツの操作

---

## エディタ拡張の基本

### Editor API とは

Editor API を使用すると、プラグインから以下の操作が可能です：

- エディタコマンドの実行（太字、斜体など）
- コンテンツの取得・設定
- 選択範囲の操作
- カスタムエクステンションの登録

### 拡張の種類

1. **Extension**: 既存のエディタ機能を拡張
2. **Node**: 新しいコンテンツタイプを追加
3. **Mark**: テキストのスタイリングを追加
4. **Plugin**: エディタの動作を変更

---

## ステップ1: プラグインの生成

```bash
# エディタ拡張テンプレートから生成
bun run plugins:create my-editor-plugin --template=editor-extension
```

生成されたプラグインには、基本的なエディタ拡張の例が含まれています。

---

## ステップ2: エディタコマンドの実装

### 基本的なコマンド実行

```typescript
import type { PluginAPI } from "../../../../packages/plugin-types";

async function activate(api: PluginAPI) {
  // エディタコマンドの実行例
  await api.editor.executeCommand("toggleBold");
  
  // 現在のコンテンツを取得
  const content = await api.editor.getContent();
  console.log("Current content:", content);
  
  // コンテンツを設定
  await api.editor.setContent({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Hello, World!" }],
      },
    ],
  });
}
```

### コマンドの可用性チェック

```typescript
// コマンドが実行可能かチェック
const canBold = await api.editor.canExecuteCommand("toggleBold");
if (canBold) {
  await api.editor.executeCommand("toggleBold");
}
```

---

## ステップ3: コンテンツの操作

### コンテンツの取得

```typescript
// 現在のエディタコンテンツを取得
const content = await api.editor.getContent();

// コンテンツは JSONContent 形式
// {
//   type: "doc",
//   content: [
//     {
//       type: "paragraph",
//       content: [{ type: "text", text: "Hello" }],
//     },
//   ],
// }
```

### コンテンツの設定

```typescript
// 新しいコンテンツを設定
await api.editor.setContent({
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "タイトル" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "本文" }],
    },
  ],
});
```

### コンテンツの挿入

```typescript
// 現在の選択位置にテキストを挿入
await api.editor.executeCommand("insertContent", "挿入するテキスト");

// または、より複雑なコンテンツを挿入
await api.editor.executeCommand("insertContent", {
  type: "paragraph",
  content: [{ type: "text", text: "新しい段落" }],
});
```

---

## ステップ4: 選択範囲の操作

### 選択範囲の取得

```typescript
// 現在の選択範囲を取得
const selection = await api.editor.getSelection();

if (selection) {
  console.log("From:", selection.from);
  console.log("To:", selection.to);
  console.log("Text:", selection.text); // 選択されたテキスト
}
```

### 選択範囲の設定

```typescript
// 選択範囲を設定（例: 5文字目から10文字目まで）
await api.editor.setSelection(5, 10);
```

---

## ステップ5: カスタムエクステンションの登録

### カスタムマークの登録

```typescript
// カスタムマークを登録
await api.editor.registerExtension({
  id: "com.example.my-plugin.highlight",
  type: "mark",
  extension: {
    name: "highlight",
    parseHTML() {
      return [
        {
          tag: 'span[data-highlight="true"]',
        },
      ];
    },
    renderHTML({ HTMLAttributes }) {
      return [
        "span",
        { ...HTMLAttributes, "data-highlight": "true" },
        0,
      ];
    },
    addAttributes() {
      return {
        color: {
          default: "yellow",
          parseHTML: (element) => element.getAttribute("data-color"),
          renderHTML: (attributes) => {
            if (!attributes.color) {
              return {};
            }
            return {
              "data-color": attributes.color,
            };
          },
        },
      };
    },
  },
});
```

### カスタムノードの登録

```typescript
// カスタムノードを登録
await api.editor.registerExtension({
  id: "com.example.my-plugin.callout",
  type: "node",
  extension: {
    name: "callout",
    group: "block",
    content: "block+",
    parseHTML() {
      return [
        {
          tag: 'div[data-type="callout"]',
        },
      ];
    },
    renderHTML({ HTMLAttributes }) {
      return [
        "div",
        { ...HTMLAttributes, "data-type": "callout" },
        0,
      ];
    },
    addAttributes() {
      return {
        type: {
          default: "info",
          parseHTML: (element) => element.getAttribute("data-callout-type"),
          renderHTML: (attributes) => {
            if (!attributes.type) {
              return {};
            }
            return {
              "data-callout-type": attributes.type,
            };
          },
        },
      };
    },
  },
});
```

---

## ステップ6: 実用的な例

### 例1: タイムスタンプの挿入

```typescript
async function activate(api: PluginAPI) {
  // タイムスタンプを挿入するコマンドを登録
  await api.ui.registerCommand({
    id: "com.example.my-plugin.insert-timestamp",
    name: "タイムスタンプを挿入",
    handler: async () => {
      const timestamp = new Date().toLocaleString("ja-JP");
      await api.editor.executeCommand("insertContent", timestamp);
      api.notifications.success("タイムスタンプを挿入しました");
    },
  });
}
```

### 例2: 文字数カウント

```typescript
async function activate(api: PluginAPI) {
  // 文字数を表示するコマンドを登録
  await api.ui.registerCommand({
    id: "com.example.my-plugin.word-count",
    name: "文字数を表示",
    handler: async () => {
      const content = await api.editor.getContent();
      
      // JSONContentからテキストを抽出
      function extractText(node: JSONContent): string {
        if (node.type === "text") {
          return node.text || "";
        }
        if (node.content) {
          return node.content.map(extractText).join("");
        }
        return "";
      }
      
      const text = extractText(content);
      const count = text.length;
      
      api.notifications.info(`文字数: ${count}文字`);
    },
  });
}
```

### 例3: 選択テキストの変換

```typescript
async function activate(api: PluginAPI) {
  // 選択テキストを大文字に変換
  await api.ui.registerCommand({
    id: "com.example.my-plugin.uppercase",
    name: "選択テキストを大文字に",
    handler: async () => {
      const selection = await api.editor.getSelection();
      
      if (!selection || !selection.text) {
        api.notifications.warning("テキストを選択してください");
        return;
      }
      
      // 選択範囲を大文字に変換して置換
      const uppercase = selection.text.toUpperCase();
      await api.editor.setSelection(selection.from, selection.to);
      await api.editor.executeCommand("deleteSelection");
      await api.editor.executeCommand("insertContent", uppercase);
      
      api.notifications.success("大文字に変換しました");
    },
  });
}
```

---

## クリーンアップ

プラグインのアンロード時には、登録したエクステンションを削除する必要があります：

```typescript
async function activate(api: PluginAPI) {
  // エクステンションを登録
  await api.editor.registerExtension({
    id: "com.example.my-plugin.custom-mark",
    type: "mark",
    extension: { /* ... */ },
  });
  
  return {
    dispose: async () => {
      // エクステンションを削除
      await api.editor.unregisterExtension("com.example.my-plugin.custom-mark");
    },
  };
}
```

---

## サンプルプラグイン

詳細な実装例は、`plugins/examples/editor-extension/` を参照してください。

---

## 次のステップ

- **[AI拡張チュートリアル](./tutorial-ai-extension.md)**: 問題生成器の作成
- **[UI拡張チュートリアル](./tutorial-ui-extension.md)**: Widgetの作成
- **[APIリファレンス](./api-reference.md)**: Editor APIの詳細

---

## よくある質問

### Q: 既存のエクステンションを変更できますか？

**A**: 既存のエクステンションを直接変更することはできません。カスタムエクステンションを登録して、新しい機能を追加してください。

### Q: エディタの状態を監視できますか？

**A**: 現在は直接的な監視機能はありませんが、定期的にコンテンツを取得することで監視できます。

### Q: 複数のエディタインスタンスに対応できますか？

**A**: Editor APIは、デフォルトでアクティブなエディタを操作します。特定のエディタIDを指定することも可能です。

---

**前のチュートリアル**: [はじめに](./tutorial-getting-started.md)  
**次のチュートリアル**: [AI拡張チュートリアル](./tutorial-ai-extension.md)

