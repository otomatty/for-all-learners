# UI拡張チュートリアル

**最終更新**: 2025-11-06  
**対象**: UI機能を拡張したいプラグイン開発者  
**所要時間**: 30-45分

---

## このチュートリアルについて

このチュートリアルでは、F.A.L のUIを拡張するプラグインを作成します。

### 学習内容

- UI拡張の基本概念
- Widgetの作成
- カスタムPageの作成
- Sidebar Panelの実装

---

## UI拡張の基本

### UI API とは

UI API を使用すると、プラグインから以下のUI要素を追加できます：

- **Widget**: ダッシュボードやサイドバーに表示されるコンポーネント
- **Page**: カスタムページを追加
- **Sidebar Panel**: サイドバーにパネルを追加
- **Command**: コマンドパレットにコマンドを登録
- **Dialog**: ダイアログを表示

---

## ステップ1: プラグインの生成

```bash
# UI拡張テンプレートから生成
bun run plugins:create my-ui-plugin --template=ui-extension
```

---

## ステップ2: Widgetの作成

### 基本的なWidget

```typescript
import type { PluginAPI } from "../../../../packages/plugin-types";

async function activate(api: PluginAPI) {
  // Widgetを登録
  await api.ui.registerWidget({
    id: "com.example.my-plugin.my-widget",
    title: "マイウィジェット",
    description: "カスタムウィジェットの説明",
    component: "MyWidget", // コンポーネント名
    location: "dashboard", // 表示場所: "dashboard" | "sidebar"
    settings: {
      showTitle: true,
      autoRefresh: false,
    },
  });
}
```

### 設定可能なWidget

```typescript
await api.ui.registerWidget({
  id: "com.example.my-plugin.configurable-widget",
  title: "設定可能ウィジェット",
  description: "ユーザーが設定できるウィジェット",
  component: "ConfigurableWidget",
  location: "dashboard",
  settings: {
    showTitle: true,
    autoRefresh: true,
    refreshInterval: 60, // 60秒ごとに更新
    maxItems: 10,
  },
});
```

---

## ステップ3: カスタムPageの作成

### 基本的なPage

```typescript
await api.ui.registerPage({
  id: "com.example.my-plugin.my-page",
  title: "マイページ",
  description: "カスタムページの説明",
  path: "/plugin/my-page", // URLパス
  component: "MyPage", // コンポーネント名
  icon: "📄", // アイコン（絵文字またはアイコン名）
});
```

### ナビゲーションアイテムとして表示

```typescript
await api.ui.registerPage({
  id: "com.example.my-plugin.reports",
  title: "レポート",
  description: "統計レポートを表示",
  path: "/plugin/reports",
  component: "ReportsPage",
  icon: "📊",
  showInNavigation: true, // ナビゲーションに表示
  navigationOrder: 100, // ナビゲーションの順序
});
```

---

## ステップ4: Sidebar Panelの実装

### 基本的なSidebar Panel

```typescript
await api.ui.registerSidebarPanel({
  id: "com.example.my-plugin.my-panel",
  title: "マイパネル",
  description: "サイドバーパネルの説明",
  component: "MyPanel", // コンポーネント名
  icon: "📊",
  position: "top", // "top" | "bottom"
  defaultOpen: true, // デフォルトで開く
});
```

### 折りたたみ可能なPanel

```typescript
await api.ui.registerSidebarPanel({
  id: "com.example.my-plugin.collapsible-panel",
  title: "折りたたみ可能パネル",
  description: "折りたたみ可能なサイドバーパネル",
  component: "CollapsiblePanel",
  icon: "📋",
  position: "top",
  defaultOpen: false,
  collapsible: true,
});
```

---

## ステップ5: コマンドの登録

### ページを開くコマンド

```typescript
await api.ui.registerCommand({
  id: "com.example.my-plugin.open-page",
  label: "マイページを開く",
  description: "カスタムページを開きます",
  handler: async () => {
    // ページへのナビゲーションはアプリケーション側で処理
    api.notifications.info("ページを開きました");
  },
});
```

### ダイアログを表示するコマンド

```typescript
await api.ui.registerCommand({
  id: "com.example.my-plugin.show-dialog",
  label: "ダイアログを表示",
  description: "カスタムダイアログを表示します",
  handler: async () => {
    const result = await api.ui.showDialog({
      title: "確認",
      message: "この操作を実行しますか？",
      buttons: [
        {
          label: "キャンセル",
          action: "cancel",
        },
        {
          label: "実行",
          action: "confirm",
          variant: "primary",
        },
      ],
    });

    if (result === "confirm") {
      api.notifications.success("操作を実行しました");
    }
  },
});
```

---

## ステップ6: 実用的な例

### 例1: 統計ダッシュボードWidget

```typescript
await api.ui.registerWidget({
  id: "com.example.my-plugin.stats-widget",
  title: "統計情報",
  description: "プラグインの使用統計を表示",
  component: "StatsWidget",
  location: "dashboard",
  settings: {
    showTitle: true,
    autoRefresh: true,
    refreshInterval: 300, // 5分ごとに更新
    showChart: true,
  },
});
```

### 例2: クイックアクセスPage

```typescript
await api.ui.registerPage({
  id: "com.example.my-plugin.quick-access",
  title: "クイックアクセス",
  description: "よく使う機能へのクイックアクセス",
  path: "/plugin/quick-access",
  component: "QuickAccessPage",
  icon: "⚡",
  showInNavigation: true,
  navigationOrder: 1, // 最初に表示
});
```

### 例3: 通知パネル

```typescript
await api.ui.registerSidebarPanel({
  id: "com.example.my-plugin.notifications",
  title: "通知",
  description: "プラグインからの通知を表示",
  component: "NotificationsPanel",
  icon: "🔔",
  position: "top",
  defaultOpen: true,
  collapsible: true,
});
```

---

## ステップ7: コンポーネントの実装

UI拡張では、コンポーネント名を指定しますが、実際のコンポーネント実装はアプリケーション側で行います。

プラグインからは、以下の方法でデータを提供できます：

```typescript
// Storage APIを使用してデータを保存
await api.storage.set("widget-data", {
  items: [
    { id: 1, title: "Item 1", value: 100 },
    { id: 2, title: "Item 2", value: 200 },
  ],
});

// コンポーネント側で取得
// const data = await api.storage.get("widget-data");
```

---

## クリーンアップ

```typescript
async function activate(api: PluginAPI) {
  // Widgetを登録
  await api.ui.registerWidget({ /* ... */ });
  
  // Pageを登録
  await api.ui.registerPage({ /* ... */ });
  
  // Sidebar Panelを登録
  await api.ui.registerSidebarPanel({ /* ... */ });
  
  // コマンドを登録
  await api.ui.registerCommand({ /* ... */ });

  return {
    dispose: async () => {
      // すべての登録を解除
      await api.ui.unregisterWidget("com.example.my-plugin.my-widget");
      await api.ui.unregisterPage("com.example.my-plugin.my-page");
      await api.ui.unregisterSidebarPanel("com.example.my-plugin.my-panel");
      await api.ui.unregisterCommand("com.example.my-plugin.open-page");
    },
  };
}
```

---

## サンプルプラグイン

詳細な実装例は、`plugins/examples/ui-extension/` を参照してください。

---

## 次のステップ

- **[APIリファレンス](./api-reference.md)**: UI APIの詳細
- **[ベストプラクティス](./best-practices.md)**: 開発のベストプラクティス
- **[トラブルシューティング](./troubleshooting.md)**: よくある問題と解決方法

---

## よくある質問

### Q: Reactコンポーネントを直接実装できますか？

**A**: 現在はコンポーネント名を指定するのみです。実際のコンポーネント実装はアプリケーション側で行います。

### Q: カスタムスタイルを適用できますか？

**A**: WidgetやPageの設定で、スタイルオプションを指定できます。詳細はAPIリファレンスを参照してください。

### Q: 複数のWidgetを登録できますか？

**A**: はい、複数のWidgetを登録できます。それぞれ異なるIDを指定してください。

---

**前のチュートリアル**: [AI拡張チュートリアル](./tutorial-ai-extension.md)  
**次のステップ**: [APIリファレンス](./api-reference.md)

