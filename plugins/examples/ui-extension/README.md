# UI Extension サンプルプラグイン

UI拡張機能の実装例を示すサンプルプラグインです。

## 機能

このプラグインは以下の機能を実装しています：

1. **Widget（ウィジェット）**
   - ダッシュボード用ウィジェット
   - サイドバー用統計ウィジェット

2. **Custom Page（カスタムページ）**
   - プラグイン専用のカスタムページ

3. **Sidebar Panel（サイドバーパネル）**
   - サイドバーに表示するパネル

4. **Command（コマンド）**
   - カスタムページを開くコマンド

## 使用方法

1. プラグインをインストール
2. プラグインが有効化されると、以下のUI要素が追加されます：
   - **ダッシュボードウィジェット**: ダッシュボードに表示されるウィジェット
   - **統計ウィジェット**: サイドバーに表示される統計情報
   - **サンプルページ**: `/plugin/ui-extension-sample` にアクセス可能
   - **サンプルパネル**: サイドバーの上部に表示されるパネル

## 実装のポイント

### Widget の登録

```typescript
await api.ui.registerWidget({
  id: "my-widget",
  title: "ウィジェット名",
  description: "説明",
  component: "WidgetComponent",
  location: "dashboard", // or "sidebar"
  settings: {
    // ウィジェット設定
  },
});
```

### Page の登録

```typescript
await api.ui.registerPage({
  id: "my-page",
  title: "ページ名",
  description: "説明",
  path: "/plugin/my-page",
  component: "PageComponent",
  icon: "📄",
});
```

### Sidebar Panel の登録

```typescript
await api.ui.registerSidebarPanel({
  id: "my-panel",
  title: "パネル名",
  description: "説明",
  component: "PanelComponent",
  icon: "📊",
  position: "top", // or "bottom"
});
```

## 関連ドキュメント

- [プラグイン開発ガイド](../../../docs/guides/plugin-development.md)
- [プラグインAPIリファレンス](../../../packages/plugin-types/index.d.ts)

