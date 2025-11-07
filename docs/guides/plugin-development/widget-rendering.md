# Widgetレンダリング機能

**最終更新**: 2025-01-28  
**対象**: プラグイン開発者  
**Phase**: Phase 1 (Widget Rendering Foundation)

---

## 概要

Widgetレンダリング機能により、プラグインはダッシュボードにカスタムUIコンポーネントを表示できます。プラグインは定義済みのコンポーネントタイプを使用して、タイプセーフで安全なUIを提供します。

## 基本概念

### Widgetとは

Widgetは、プラグインがダッシュボードに表示するUIコンポーネントです。以下の特徴があります：

- **位置指定**: ダッシュボード上の配置位置を指定（top-left, top-right, bottom-left, bottom-right）
- **サイズ指定**: ウィジェットのサイズを指定（small, medium, large）
- **型安全**: 定義済みのコンポーネントタイプを使用
- **サンドボックス**: プラグインはWeb Worker内で実行され、直接DOMアクセス不可

### サポートされているコンポーネントタイプ

1. **stat-card**: 統計カード（値、説明、トレンド表示）
2. **metric**: 単一メトリック表示
3. **list**: リスト表示
4. **text**: テキスト表示
5. **custom**: カスタム表示（JSON形式でpropsを表示）

## 使用方法

### 1. Widgetの登録

```typescript
async function activate(api: PluginAPI, config?: Record<string, unknown>) {
  await api.ui.registerWidget({
    id: 'my-widget',
    name: 'My Widget',
    description: 'Widget description',
    position: 'top-right',
    size: 'medium',
    icon: '📊',
    async render(context) {
      // データを取得
      const data = await fetchData();
      
      // Widgetコンポーネントを返す
      return {
        type: 'stat-card',
        props: {
          title: 'Total Users',
          value: data.totalUsers,
          description: `Active: ${data.activeUsers}`,
          trend: 'up',
          trendValue: '+10%',
        },
      };
    },
  });
  
  return {
    dispose: async () => {
      await api.ui.unregisterWidget('my-widget');
    },
  };
}
```

### 2. コンポーネントタイプごとの例

#### stat-card

```typescript
return {
  type: 'stat-card',
  props: {
    title: 'Total Revenue',
    value: 125000,
    description: 'Monthly revenue',
    trend: 'up',
    trendValue: '+15%',
    icon: '💰',
  },
};
```

#### metric

```typescript
return {
  type: 'metric',
  props: {
    label: 'Active Users',
    value: 1234,
    unit: 'users',
    color: 'primary',
  },
};
```

#### list

```typescript
return {
  type: 'list',
  props: {
    items: [
      { label: 'Item 1', value: 'Value 1', icon: '📝' },
      { label: 'Item 2', value: 'Value 2', icon: '📊' },
    ],
    ordered: false,
  },
};
```

#### text

```typescript
return {
  type: 'text',
  props: {
    content: 'Hello, World!',
    variant: 'primary',
    size: 'lg',
    align: 'center',
  },
};
```

## セキュリティ

### HTMLレンダリングの制限

セキュリティ上の理由から、プラグインからの直接HTMLレンダリング（`dangerouslySetInnerHTML`）は**サポートされていません**。代わりに、定義済みのコンポーネントタイプを使用してください。

### 型安全なprops

すべてのpropsは型チェックされ、不正なデータが表示されないようになっています。

## ベストプラクティス

1. **エラーハンドリング**: Widgetのrender関数では、エラーを適切に処理し、エラーメッセージを表示してください
2. **パフォーマンス**: 大量のデータを取得する場合は、キャッシュやデバウンスを考慮してください
3. **ユーザビリティ**: ローディング状態やエラー状態を明確に表示してください

## 関連ドキュメント

- [プラグイン開発ガイド](../plugin-development.md)
- [実装計画](../../03_plans/plugin-system/widget-calendar-extensions.md)

