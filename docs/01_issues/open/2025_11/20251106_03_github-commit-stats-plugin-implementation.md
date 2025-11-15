# GitHubコミット統計プラグイン実装完了

**作成日**: 2025-11-06  
**ステータス**: Open  
**優先度**: High  
**Phase**: Phase 4 (Plugin Development Tools)

---

## 概要

GitHubコミット統計プラグインの実装を完了し、新しい設定スキーマ（複数リポジトリ対応、GitHub認証トークン設定）に対応させます。

## 現在の実装状況

### ✅ 完了した機能

1. **プラグイン設定UIのカスタマイズ機能**
   - JSON Schema拡張（`ui:widget`プロパティ）を実装
   - カスタムウィジェット（GitHubUserSelector, GitHubRepoSelector, PasswordInput）を実装
   - プラグイン開発者が柔軟に設定フォームを定義可能

2. **GitHub認証トークン設定ヘルプ**
   - トークン作成手順の詳細説明
   - 必要な権限（スコープ）の説明
   - セキュリティに関する注意事項

3. **プラグイン自動ロード機能**
   - アプリ起動時にインストール済みプラグインを自動ロード
   - `PluginAutoLoader`コンポーネントを実装

4. **設定の取得と受け渡し**
   - `use-load-plugin.ts`で設定を取得してプラグインに渡す
   - デフォルト設定と保存済み設定のマージ

5. **GitHub API Route**
   - CORS問題を回避するためのサーバーサイドAPI Routeを実装
   - `/api/github/repos`でリポジトリ一覧を取得

### ⚠️ 未実装の機能

1. **プラグイン実装の更新**
   - 現在のプラグインは`owner`と`repo`を直接使用
   - 新しい設定スキーマ（`githubUser`, `selectedRepos`）に対応が必要

2. **複数リポジトリ対応**
   - 選択された複数リポジトリからコミット情報を取得
   - 複数リポジトリの統計を集計して表示

3. **設定更新時の自動リロード**
   - 設定保存後にプラグインを自動的にリロード
   - 新しい設定でプラグインを再初期化

4. **データの永続化**
   - 取得したコミット統計データを`api.storage`に保存
   - キャッシュ機能としても活用

5. **動作確認**
   - カレンダー拡張機能が正しく表示されるか確認
   - Widgetが正しく表示されるか確認

## 要件

### 1. プラグイン実装の更新

#### 1.1 新しい設定スキーマへの対応

**現在の設定:**
```json
{
  "owner": "string",
  "repo": "string"
}
```

**新しい設定:**
```json
{
  "github_oauth_token": "string",
  "githubUser": "string",
  "selectedRepos": "string" // JSON文字列: ["owner/repo", ...]
}
```

**実装内容:**
- `config.githubUser`からユーザー名を取得
- `config.selectedRepos`をパースしてリポジトリリストを取得
- `config.github_oauth_token`からトークンを取得（既存の`api.storage.get("github_oauth_token")`も併用）

#### 1.2 複数リポジトリ対応

**要件:**
- 選択された複数のリポジトリからコミット情報を取得
- 各リポジトリの統計を集計
- カレンダーとWidgetに反映

**実装内容:**
```typescript
// 複数リポジトリのコミット統計を取得
async function getMultiRepoCommitLines(
  repos: string[], // ["owner/repo", ...]
  date: string
): Promise<CommitStats> {
  const statsPromises = repos.map(repo => {
    const [owner, repoName] = repo.split('/');
    return getDailyCommitLines(owner, repoName, date);
  });
  
  const allStats = await Promise.all(statsPromises);
  
  // 集計
  return {
    commits: allStats.reduce((sum, s) => sum + s.commits, 0),
    additions: allStats.reduce((sum, s) => sum + s.additions, 0),
    deletions: allStats.reduce((sum, s) => sum + s.deletions, 0),
    netLines: allStats.reduce((sum, s) => sum + s.netLines, 0),
  };
}
```

### 2. 設定更新時の自動リロード

**要件:**
- プラグイン設定を保存したときに、プラグインを自動的にリロード
- 新しい設定でプラグインを再初期化

**実装箇所:**
- `app/(protected)/settings/plugins/_components/PluginSettingsForm.tsx`
- `handleSubmit`内で設定保存後にプラグインをリロード

**実装内容:**
```typescript
const handleSubmit = async (values: FormValues) => {
  // ... 設定保存処理 ...
  
  // プラグインをリロード
  const loader = PluginLoader.getInstance();
  const plugin = await loader.getPlugin(pluginId);
  if (plugin) {
    await loader.unloadPlugin(pluginId);
    await loadPlugin(pluginMetadata); // 新しい設定で再ロード
  }
};
```

### 3. データの永続化

**要件:**
- 取得したコミット統計データを`api.storage`に保存
- キャッシュとして活用し、API呼び出しを削減

**データ構造:**
```typescript
interface GitHubCommitStatsData {
  // 日別統計（リポジトリ別）
  dailyStats: Record<string, Record<string, {
    date: string;
    commits: number;
    additions: number;
    deletions: number;
    netLines: number;
  }>>;
  
  // リポジトリ別統計
  repoStats: Record<string, {
    owner: string;
    repo: string;
    totalCommits: number;
    totalAdditions: number;
    totalDeletions: number;
    lastUpdated: string;
  }>;
  
  // メタデータ
  metadata: {
    lastSyncDate: string;
    selectedRepos: string[]; // ["owner/repo", ...]
    githubUser: string;
  };
}
```

**実装内容:**
- コミット統計取得時に`api.storage.set()`で保存
- 取得前にキャッシュを確認し、有効な場合はキャッシュを使用
- キャッシュの有効期限を設定（例: 1時間）

### 4. エラーハンドリングの強化

**要件:**
- リポジトリが存在しない場合のエラーハンドリング
- トークンが無効な場合のエラーハンドリング
- ネットワークエラーの適切な処理

## 実装計画

### Phase 1: プラグイン実装の更新（最優先）

1. `plugins/examples/github-commit-stats/src/index.ts`を更新
   - 新しい設定スキーマに対応
   - `config.githubUser`と`config.selectedRepos`を使用
   - 複数リポジトリ対応の関数を実装

2. 複数リポジトリのコミット統計取得機能を実装
   - `getMultiRepoCommitLines`関数を実装
   - カレンダー拡張とWidgetで使用

### Phase 2: 設定更新時の自動リロード

1. `PluginSettingsForm.tsx`を更新
   - 設定保存後にプラグインをリロード
   - `useLoadPlugin`フックを使用

### Phase 3: データの永続化

1. コミット統計データの保存機能を実装
   - `api.storage`を使用してデータを保存
   - キャッシュ機能を実装

2. キャッシュの有効期限管理
   - 最終同期日時を記録
   - 有効期限を超えた場合は再取得

### Phase 4: 動作確認とデバッグ

1. カレンダー拡張機能の確認
   - 複数リポジトリの統計が正しく表示されるか
   - バッジとツールチップが正しく表示されるか

2. Widgetの確認
   - 複数リポジトリの統計が正しく集計されるか
   - 月次統計が正しく表示されるか

3. エラーハンドリングの確認
   - 各種エラーケースでの動作確認

## 関連ファイル

### 修正が必要なファイル

- `plugins/examples/github-commit-stats/src/index.ts` - プラグイン実装の更新
- `app/(protected)/settings/plugins/_components/PluginSettingsForm.tsx` - 設定保存時のリロード

### 参照すべきファイル

- `app/_actions/plugin-storage.ts` - プラグインストレージAPI
- `lib/hooks/use-load-plugin.ts` - プラグインロードフック
- `lib/plugins/plugin-loader/plugin-loader.ts` - プラグインローダー
- `plugins/examples/github-commit-stats/plugin.json` - プラグイン設定スキーマ

## 優先順位

1. **最優先**: Phase 1 - プラグイン実装の更新
   - これが完了すれば、基本的な機能が動作する
   - カレンダー拡張とWidgetが表示される

2. **高優先度**: Phase 2 - 設定更新時の自動リロード
   - ユーザー体験の向上
   - 設定変更が即座に反映される

3. **中優先度**: Phase 3 - データの永続化
   - パフォーマンスの向上
   - API呼び出しの削減

4. **中優先度**: Phase 4 - 動作確認とデバッグ
   - 品質保証
   - エラーケースの確認

## 関連Issue

- [20251106_01_github-commit-stats-plugin-enhancement.md](./20251106_01_github-commit-stats-plugin-enhancement.md) - 機能強化要件
- [20251106_02_plugin-loading-issues.md](./20251106_02_plugin-loading-issues.md) - プラグインロード問題

## 備考

- プラグイン設定UIのカスタマイズ機能は既に実装済み
- GitHub API Routeも実装済み（CORS問題を解決）
- プラグイン自動ロード機能も実装済み

