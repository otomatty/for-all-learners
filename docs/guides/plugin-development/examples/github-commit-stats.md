# GitHubコミット統計プラグイン - 実装例

**最終更新**: 2025-01-28  
**対象**: プラグイン開発者  
**Phase**: Phase 4 (GitHub Commit Stats Plugin)

---

## 概要

このプラグインは、GitHubコミット行数をカレンダーに表示し、ダッシュボードに統計を表示する実装例です。

## 機能

1. **カレンダー拡張**: カレンダーセルにGitHubコミット行数のバッジを表示
2. **Widget表示**: ダッシュボードに今月のGitHubコミット統計を表示
3. **詳細情報**: カレンダーの詳細パネルにコミット統計を表示

## 実装のポイント

### 1. GitHub API認証

プラグインは、Storage APIを使用してGitHub認証トークンを取得します：

```typescript
const tokenData = await api.storage.get('github_oauth_token');
```

### 2. GitHub APIの登録

Integration APIを使用してGitHub APIを登録します：

```typescript
await api.integration.registerExternalAPI({
  id: 'github-api',
  name: 'GitHub API',
  baseUrl: 'https://api.github.com',
  auth: {
    type: 'bearer',
    token: tokenData.accessToken,
  },
});
```

### 3. コミット統計の取得

GitHub APIを呼び出してコミット統計を取得します：

```typescript
const commitsResponse = await api.integration.callExternalAPI('github-api', {
  method: 'GET',
  url: `/repos/${owner}/${repo}/commits`,
  query: {
    since: startDateISO,
    until: endDateISO,
    per_page: '100',
  },
});
```

### 4. カレンダー拡張の登録

日付ごとのデータを提供するカレンダー拡張を登録します：

```typescript
await api.calendar.registerExtension({
  id: 'github-commit-stats',
  name: 'GitHubコミット統計',
  async getDailyData(date: string) {
    const stats = await getDailyCommitLines(date);
    return {
      badge: `${stats.netLines > 0 ? '+' : ''}${stats.netLines}`,
      badgeColor: stats.netLines > 0 
        ? 'bg-green-100 text-green-700' 
        : 'bg-red-100 text-red-700',
      tooltip: `コミット: ${stats.commits}件`,
      detailSections: [/* ... */],
    };
  },
});
```

### 5. Widgetの登録

ダッシュボードにWidgetを登録します：

```typescript
await api.ui.registerWidget({
  id: 'github-commit-stats-widget',
  name: 'GitHubコミット統計',
  position: 'top-right',
  size: 'medium',
  async render() {
    const monthlyStats = await getMonthlyStats();
    return {
      type: 'stat-card',
      props: {
        title: '今月のコミット統計',
        value: monthlyStats.netLines,
        description: `コミット: ${monthlyStats.totalCommits}件`,
      },
    };
  },
});
```

## ファイル構造

```
plugins/examples/github-commit-stats/
├── plugin.json          # プラグインマニフェスト
├── package.json         # 依存関係
├── README.md            # プラグイン説明
└── src/
    └── index.ts         # プラグインコード
```

## 設定

プラグインを有効化する前に、以下の設定が必要です：

1. **GitHub認証トークン**: `github_oauth_token` をプラグインストレージに保存
2. **プラグイン設定**:
   - `owner`: GitHubリポジトリのオーナー名
   - `repo`: GitHubリポジトリ名

## 注意事項

1. **Web Worker制限**: プラグインはWeb Worker内で実行されるため、TypeScriptの型定義や外部モジュールのインポートは使用できません
2. **ヘルパー関数**: `github-api.ts`や`github-auth.ts`のヘルパー関数は直接使用できません。必要に応じてロジックをインラインで実装してください
3. **エラーハンドリング**: API呼び出しは適切にエラーハンドリングし、失敗時は空のデータを返してください

## 関連ドキュメント

- [プラグイン開発ガイド](../plugin-development.md)
- [Widgetレンダリング機能](./widget-rendering.md)
- [カレンダー拡張機能](./calendar-extensions.md)
- [実装計画](../../../03_plans/plugin-system/widget-calendar-extensions.md)

