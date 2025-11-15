# GitHubコミット統計プラグイン機能強化

**作成日**: 2025-11-06  
**ステータス**: Open  
**優先度**: High  
**Phase**: Phase 4 (Plugin Development Tools)

---

## 概要

GitHubコミット統計プラグインの機能強化と設定UIの改善を行います。

## 問題点

### 1. カレンダー拡張機能が表示されない
- アクティビティカレンダーにコミット行数のバッジが表示されていない
- プラグインが正しくロードされていない可能性

### 2. プラグインWidgetが表示されない
- ダッシュボードにプラグインWidgetが表示されていない
- Widgetの読み込み状態が不明

### 3. 設定機能の不足
- 現在の設定は`owner`と`repo`のみ
- ユーザー指定機能がない
- リポジトリ選択機能がない
- GitHub認証トークンの設定UIがない

## 要件

### 1. プラグイン設定の拡張

#### 1.1 ユーザー指定機能
- **要件**: 対象となるGitHubユーザーを指定できる
- **実装**: `configSchema`に`githubUser`フィールドを追加
- **動作**: ユーザー指定後、そのユーザーの全リポジトリを取得

#### 1.2 リポジトリ選択機能
- **要件**: 指定ユーザーのリポジトリ一覧を表示し、選択可能にする
- **実装**: 
  - GitHub APIでリポジトリ一覧を取得
  - 複数選択可能なチェックボックスまたはマルチセレクト
  - 選択したリポジトリのデータを集計して表示

#### 1.3 GitHub認証トークン設定
- **要件**: プラグイン設定画面でGitHub認証トークンを設定できる
- **実装**:
  - 設定フォームに`githubToken`フィールドを追加
  - パスワードタイプの入力フィールド（セキュア）
  - トークンの検証機能（オプション）

### 2. データの永続化

#### 2.1 プラグインデータのローカル保存
- **要件**: プラグインが取得したデータをローカルに保存して永続化
- **実装**:
  - `api.storage`を使用してデータを保存
  - 日別のコミット統計データを保存
  - キャッシュ機能としても機能

#### 2.2 データの構造
```typescript
interface GitHubCommitStatsData {
  // 日別統計
  dailyStats: Record<string, {
    date: string;
    commits: number;
    additions: number;
    deletions: number;
    netLines: number;
  }>;
  
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

### 3. 設定UIの拡張

#### 3.1 プラグイン開発者向け設定フォーマット
- **要件**: プラグイン開発者が柔軟に設定フォームを定義できる
- **実装**:
  - JSON Schemaを拡張して、カスタムUIコンポーネントを指定可能に
  - 例: `ui:widget`プロパティでカスタムウィジェットを指定
  - 例: `ui:githubUserSelector` - GitHubユーザー選択用
  - 例: `ui:githubRepoSelector` - GitHubリポジトリ選択用（依存関係あり）

#### 3.2 設定スキーマの例
```json
{
  "type": "object",
  "properties": {
    "githubUser": {
      "type": "string",
      "description": "GitHubユーザー名",
      "ui:widget": "githubUserSelector",
      "required": true
    },
    "selectedRepos": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "監視するリポジトリ（複数選択可）",
      "ui:widget": "githubRepoSelector",
      "ui:dependencies": ["githubUser"],
      "required": true
    },
    "githubToken": {
      "type": "string",
      "description": "GitHub Personal Access Token",
      "ui:widget": "password",
      "required": true
    }
  },
  "required": ["githubUser", "selectedRepos", "githubToken"]
}
```

## 実装計画

### Phase 1: 現状の問題調査と修正
1. カレンダー拡張機能が表示されない原因の調査
2. プラグインWidgetが表示されない原因の調査
3. プラグインのロード状態の確認

### Phase 2: 設定機能の拡張
1. JSON Schemaの拡張（`ui:widget`プロパティの追加）
2. カスタムウィジェットコンポーネントの実装
   - GitHubユーザー選択コンポーネント
   - GitHubリポジトリ選択コンポーネント（依存関係対応）
   - パスワード入力コンポーネント
3. プラグイン設定フォームの拡張

### Phase 3: データ永続化機能
1. プラグインストレージへのデータ保存機能
2. キャッシュ機能の実装
3. データ同期機能の実装

### Phase 4: プラグインロジックの更新
1. 複数リポジトリ対応
2. ユーザー指定機能
3. データ永続化の統合

## 関連ファイル

### 設定UI関連
- `app/(protected)/settings/plugins/_components/PluginSettingsForm.tsx`
- `types/plugin.ts` (JSONSchema型定義)

### プラグイン実装
- `plugins/examples/github-commit-stats/src/index.ts`
- `plugins/examples/github-commit-stats/plugin.json`

### データ永続化
- `app/_actions/plugin-storage.ts`
- `lib/plugins/plugin-api.ts` (Storage API)

### カレンダー拡張
- `app/(protected)/dashboard/_components/ActivityCalendar.tsx`
- `lib/plugins/calendar-registry.ts`

## 注意事項

1. GitHub APIのレート制限に注意
2. 認証トークンのセキュアな保存
3. データのキャッシュ戦略（更新頻度の制御）
4. 複数リポジトリの集計パフォーマンス

## 参考資料

- [GitHub API Documentation](https://docs.github.com/en/rest)
- [JSON Schema Specification](https://json-schema.org/)
- [React Hook Form Documentation](https://react-hook-form.com/)

