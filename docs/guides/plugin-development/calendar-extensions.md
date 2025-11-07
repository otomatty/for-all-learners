# カレンダー拡張機能

**最終更新**: 2025-01-28  
**対象**: プラグイン開発者  
**Phase**: Phase 2 (Calendar UI Extension Points)

---

## 概要

カレンダー拡張機能により、プラグインはアクティビティカレンダーにカスタムデータを表示できます。日付ごとのデータを提供し、カレンダーセルにバッジや詳細情報を表示します。

## 基本概念

### カレンダー拡張とは

カレンダー拡張は、プラグインが日付ごとのデータを提供し、カレンダーUIに表示する機能です。以下の特徴があります：

- **日付ごとのデータ**: 各日付に対してデータを提供
- **バッジ表示**: カレンダーセルにバッジを表示
- **詳細情報**: 詳細パネルに追加セクションを表示
- **ツールチップ**: ホバー時にツールチップを表示

## 使用方法

### 1. カレンダー拡張の登録

```typescript
async function activate(api: PluginAPI, config?: Record<string, unknown>) {
  await api.calendar.registerExtension({
    id: 'my-calendar-extension',
    name: 'My Calendar Extension',
    description: 'Display custom data in calendar',
    async getDailyData(date: string) {
      // 日付ごとのデータを取得
      const data = await fetchDailyData(date);
      
      // カレンダー拡張データを返す
      return {
        badge: `${data.count} items`,
        badgeColor: 'bg-blue-100 text-blue-700',
        tooltip: `Total: ${data.total}`,
        detailSections: [
          {
            title: 'Custom Data',
            content: `Items: ${data.count}\nTotal: ${data.total}`,
            icon: '📊',
          },
        ],
      };
    },
  });
  
  return {
    dispose: async () => {
      await api.calendar.unregisterExtension('my-calendar-extension');
    },
  };
}
```

### 2. CalendarExtensionDataの構造

```typescript
interface CalendarExtensionData {
  // カレンダーセルに表示するバッジ
  badge?: string;
  
  // バッジの色（CSSクラスまたはTailwindクラス）
  badgeColor?: string;
  
  // ツールチップテキスト
  tooltip?: string;
  
  // 詳細パネルに表示するセクション
  detailSections?: CalendarDetailSection[];
}

interface CalendarDetailSection {
  title: string;
  content: string | Record<string, unknown>; // テキストまたは構造化データ
  icon?: string;
}
```

### 3. バッジの色指定

バッジの色は、Tailwind CSSクラスまたはカスタムCSSクラスで指定できます：

```typescript
// Tailwindクラスを使用
badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'

// カスタムクラスを使用
badgeColor: 'custom-badge-class'
```

### 4. 詳細セクションの例

#### テキストコンテンツ

```typescript
detailSections: [
  {
    title: 'GitHubコミット統計',
    content: 'コミット数: 5件\n追加行数: +100\n削除行数: -20',
    icon: '📊',
  },
]
```

#### 構造化データ

```typescript
detailSections: [
  {
    title: 'Statistics',
    content: {
      commits: 5,
      additions: 100,
      deletions: 20,
    },
    icon: '📊',
  },
]
```

## 実装例

### GitHubコミット統計の例

```typescript
await api.calendar.registerExtension({
  id: 'github-commit-stats',
  name: 'GitHubコミット統計',
  async getDailyData(date: string) {
    const stats = await getGitHubCommitStats(date);
    
    return {
      badge: stats.netLines > 0 ? `+${stats.netLines}` : `${stats.netLines}`,
      badgeColor: stats.netLines > 0 
        ? 'bg-green-100 text-green-700' 
        : 'bg-red-100 text-red-700',
      tooltip: `コミット: ${stats.commits}件`,
      detailSections: [
        {
          title: 'GitHubコミット統計',
          content: `コミット数: ${stats.commits}件\n追加行数: +${stats.additions}\n削除行数: -${stats.deletions}`,
          icon: '📊',
        },
      ],
    };
  },
});
```

## ベストプラクティス

1. **パフォーマンス**: `getDailyData`は頻繁に呼び出されるため、可能な限り高速に応答してください
2. **エラーハンドリング**: エラーが発生した場合は、`null`を返して拡張データを非表示にしてください
3. **データのキャッシュ**: 可能な限りデータをキャッシュして、API呼び出しを減らしてください
4. **ユーザビリティ**: バッジとツールチップは簡潔で分かりやすい情報を表示してください

## 制限事項

- **非同期処理**: `getDailyData`は非同期関数である必要があります
- **null返却**: データが取得できない場合は`null`を返してください（拡張データが非表示になります）
- **日付形式**: 日付は`YYYY-MM-DD`形式で提供されます

## 関連ドキュメント

- [プラグイン開発ガイド](../plugin-development.md)
- [実装計画](../../03_plans/plugin-system/widget-calendar-extensions.md)
- [GitHubコミット統計プラグイン例](./examples/github-commit-stats.md)

