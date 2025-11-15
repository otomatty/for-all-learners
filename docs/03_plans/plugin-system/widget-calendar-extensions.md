# プラグインシステム: Widgetレンダリング & カレンダーUI拡張機能

**作成日**: 2025-11-05  
**最終更新**: 2025-11-10  
**ステータス**: ✅ 実装完了  
**関連Issue**: [#109](https://github.com/otomatty/for-all-learners/issues/109), [#97](https://github.com/otomatty/for-all-learners/issues/97)  
**前提条件**: Phase 1, Phase 2, Phase 3完了 ✅

---

## 概要

プラグインシステムに以下の2つの機能を追加します：

1. **Widgetレンダリング機能**: プラグインが登録したWidgetをダッシュボードで表示
2. **カレンダーUI拡張機能**: プラグインがカレンダーUIに独自データを表示

これらの機能により、プラグイン開発者は以下のような拡張が可能になります：
- GitHubコミット行数を1日ごとに取得してカレンダーに表示
- 日記作成時に独自のカウンターを表示
- ダッシュボード上にカスタム統計情報を表示

---

## 実装目標

### 主要目標

1. **Widgetレンダリング機能**: プラグインが登録したWidgetをダッシュボードで表示
2. **カレンダーUI拡張ポイント**: プラグインがカレンダーUIにデータを追加できる仕組み
3. **GitHub API連携**: Integration Extension経由でGitHub APIを呼び出し
4. **サンプルプラグイン**: GitHubコミット行数表示プラグインの実装

---

## 実装順序

### Phase 1: Widgetレンダリング機能の基盤実装（推定: 6時間）

#### 1.1 Widgetレンダリングコンポーネントの実装（推定: 3時間）

**目的**: プラグインが登録したWidgetをダッシュボードで表示するコンポーネント

**実装内容**:

- [x] `components/plugins/PluginWidgetRenderer.tsx`: Widgetレンダリングコンポーネント
  - [x] `ui-registry.getWidgets()` でWidget一覧を取得
  - [x] Widgetの `render()` 関数を実行
  - [x] `WidgetRenderResult` をReactコンポーネントに変換
  - [x] エラーハンドリング（プラグインエラー時のフォールバック表示）
  - [x] ローディング状態の表示

- [x] `components/plugins/PluginWidgetContainer.tsx`: Widgetコンテナコンポーネント
  - [x] Widgetのサイズと位置に応じたレイアウト
  - [ ] ドラッグ&ドロップでの位置変更（将来実装）
  - [x] Widget設定ダイアログの表示

- [x] `app/(protected)/dashboard/_components/PluginWidgetsSection.tsx`: Widgetセクション
  - [x] ダッシュボードにWidgetセクションを追加
  - [x] 位置別にWidgetをグループ化（top-left, top-right, bottom-left, bottom-right）
  - [x] グリッドレイアウトで表示

**実装ファイル**:
- `components/plugins/PluginWidgetRenderer.tsx`: Widgetレンダリングコンポーネント
- `components/plugins/PluginWidgetContainer.tsx`: Widgetコンテナコンポーネント
- `app/(protected)/dashboard/_components/PluginWidgetsSection.tsx`: Widgetセクション

**テスト**:
- [x] Widgetレンダリングのテスト
- [x] エラーハンドリングのテスト
- [x] ローディング状態のテスト

#### 1.2 ダッシュボードページへの統合（推定: 1時間）

**目的**: Widgetセクションをダッシュボードページに追加

**実装内容**:

- [x] `app/(protected)/dashboard/page.tsx`: ダッシュボードページにWidgetセクションを追加
  - [x] `PluginWidgetsSection` コンポーネントをインポート
  - [x] 適切な位置にWidgetセクションを配置

**実装ファイル**:
- `app/(protected)/dashboard/page.tsx`: ダッシュボードページ

#### 1.3 Widgetデータ取得のServer Action（推定: 2時間）

**目的**: サーバーサイドでWidgetデータを取得するAPI

**実装内容**:

- [x] `app/_actions/plugin-widgets.ts`: Widget取得Server Action
  - [x] `getWidgets()`: 登録済みWidget一覧を取得
  - [x] `renderWidget()`: Widgetのrender関数を実行して結果を取得
  - [x] エラーハンドリング

**実装ファイル**:
- `app/_actions/plugin-widgets.ts`: Widget取得Server Action

**テスト**:
- [x] Server Actionのテスト

---

### Phase 2: カレンダーUI拡張ポイントの実装（推定: 8時間）

#### 2.1 カレンダー拡張ポイントAPIの実装（推定: 4時間）

**目的**: プラグインがカレンダーUIにデータを追加できるAPI

**実装内容**:

- [x] `lib/plugins/calendar-registry.ts`: カレンダー拡張レジストリ（新規作成）
  - [x] `registerCalendarExtension()`: カレンダー拡張を登録
  - [x] `unregisterCalendarExtension()`: カレンダー拡張を削除
  - [x] `getCalendarExtensions()`: 登録済み拡張を取得
  - [x] `getDailyExtensionData()`: 拡張データを取得してマージ

**実装内容（詳細）**:

```typescript
// lib/plugins/calendar-registry.ts

export interface CalendarExtensionOptions {
  id: string;
  pluginId: string;
  name: string;
  description?: string;
  
  // 日付ごとのデータを取得する関数
  getDailyData: (date: string) => Promise<CalendarExtensionData>;
}

export interface CalendarExtensionData {
  // カレンダーセルに表示する追加情報
  badge?: string; // バッジテキスト
  badgeColor?: string; // バッジの色
  tooltip?: string; // ツールチップテキスト
  
  // 詳細パネルに表示する追加セクション
  detailSections?: CalendarDetailSection[];
}

export interface CalendarDetailSection {
  title: string;
  content: string | React.ReactNode; // 将来的にはReactコンポーネントもサポート
}
```

- [x] `lib/plugins/types.ts`: カレンダー拡張関連の型定義を追加
- [x] `lib/plugins/plugin-api.ts`: Calendar APIを追加
  - [x] `api.calendar.registerExtension()`: カレンダー拡張を登録
  - [x] `api.calendar.unregisterExtension()`: カレンダー拡張を削除

**実装ファイル**:
- `lib/plugins/calendar-registry.ts`: カレンダー拡張レジストリ
- `lib/plugins/types.ts`: 型定義追加
- `lib/plugins/plugin-api.ts`: Calendar API追加

**テスト**:
- [x] カレンダー拡張レジストリのテスト
- [x] Calendar APIのテスト

#### 2.2 カレンダーUIコンポーネントの拡張（推定: 4時間）

**目的**: カレンダーUIコンポーネントでプラグインデータを表示

**実装内容**:

- [x] `app/(protected)/dashboard/_components/ActivityCalendar/types.ts`: 型定義拡張
  - [x] `DailyActivitySummary` に `pluginExtensions?: CalendarExtensionData[]` を追加

- [x] `app/_actions/activity_calendar.ts`: カレンダーデータ取得時にプラグインデータをマージ
  - [x] `getMonthlyActivitySummary()` 内で `calendar-registry.getDailyExtensionData()` を呼び出し
  - [x] 各日のデータにプラグインデータをマージ

- [x] `app/(protected)/dashboard/_components/ActivityCalendar/DayCell.tsx`: カレンダーセルにプラグインデータを表示
  - [x] プラグインデータのバッジを表示
  - [x] ツールチップにプラグインデータを表示

- [x] `app/(protected)/dashboard/_components/ActivityCalendar/DayDetailPanel.tsx`: 詳細パネルにプラグインデータを表示
  - [x] プラグインデータの詳細セクションを表示

**実装ファイル**:
- `app/(protected)/dashboard/_components/ActivityCalendar/types.ts`: 型定義拡張
- `app/_actions/activity_calendar.ts`: カレンダーデータ取得拡張
- `app/(protected)/dashboard/_components/ActivityCalendar/DayCell.tsx`: セル表示拡張
- `app/(protected)/dashboard/_components/ActivityCalendar/DayDetailPanel.tsx`: 詳細パネル拡張

**テスト**:
- [x] カレンダーUIコンポーネントのテスト
- [x] プラグインデータ表示のテスト

---

### Phase 3: GitHub API連携機能の実装（推定: 4時間）

#### 3.1 GitHub API呼び出しヘルパー（推定: 2時間）

**目的**: Integration Extension経由でGitHub APIを呼び出すためのヘルパー

**実装内容**:

- [x] `lib/plugins/integration-helpers/github-api.ts`: GitHub APIヘルパー（新規作成）
  - [x] `getCommitsByDate()`: 日付ごとのコミットを取得
  - [x] `getCommitStats()`: コミットの統計情報（追加行数、削除行数）を取得
  - [x] `getDailyCommitLines()`: 日別のコミット行数を取得

**実装内容（詳細）**:

```typescript
// lib/plugins/integration-helpers/github-api.ts

export interface GitHubCommitStats {
  date: string; // YYYY-MM-DD
  commits: number;
  additions: number;
  deletions: number;
  netLines: number; // additions - deletions
}

export async function getDailyCommitLines(
  owner: string,
  repo: string,
  date: string,
  api: IntegrationAPI
): Promise<GitHubCommitStats> {
  // GitHub APIを呼び出してコミット統計を取得
  // api.integration.callExternalAPI() を使用
}
```

**実装ファイル**:
- `lib/plugins/integration-helpers/github-api.ts`: GitHub APIヘルパー

**テスト**:
- [x] GitHub APIヘルパーのテスト

#### 3.2 GitHub認証管理（推定: 2時間）

**目的**: GitHub OAuth認証の管理

**実装内容**:

- [x] `lib/plugins/integration-helpers/github-auth.ts`: GitHub認証ヘルパー（新規作成）
  - [x] OAuth認証フローの実装
  - [x] アクセストークンの保存・取得（Storage API経由）
  - [x] トークンのリフレッシュ

**実装ファイル**:
- `lib/plugins/integration-helpers/github-auth.ts`: GitHub認証ヘルパー

**テスト**:
- [x] GitHub認証ヘルパーのテスト

---

### Phase 4: GitHubコミット行数表示プラグインの実装（推定: 8時間）

#### 4.1 プラグインの基本構造（推定: 2時間）

**目的**: GitHubコミット行数表示プラグインの基本構造

**実装内容**:

- [x] `plugins/examples/github-commit-stats/`: プラグインディレクトリ（新規作成）
  - [x] `plugin.json`: マニフェストファイル
  - [x] `src/index.ts`: プラグインコード
  - [x] `package.json`: 依存関係

**実装ファイル**:
- `plugins/examples/github-commit-stats/plugin.json`: マニフェスト
- `plugins/examples/github-commit-stats/src/index.ts`: プラグインコード
- `plugins/examples/github-commit-stats/package.json`: 依存関係

#### 4.2 カレンダー拡張の実装（推定: 3時間）

**目的**: カレンダーUIにGitHubコミット行数を表示

**実装内容**:

- [x] `plugins/examples/github-commit-stats/src/index.ts`: カレンダー拡張の実装
  - [x] `api.calendar.registerExtension()` でカレンダー拡張を登録
  - [x] `getDailyData()` 関数でGitHub APIからデータを取得
  - [x] カレンダーセルにコミット行数のバッジを表示
  - [x] 詳細パネルにコミット統計を表示

**実装内容（詳細）**:

```typescript
// plugins/examples/github-commit-stats/src/index.ts

async function activate(api: PluginAPI, config?: Record<string, unknown>) {
  // GitHub認証
  const githubToken = await api.storage.get<string>('github_token');
  
  // カレンダー拡張を登録
  await api.calendar.registerExtension({
    id: 'github-commit-stats',
    name: 'GitHubコミット統計',
    description: 'GitHubコミット行数をカレンダーに表示',
    async getDailyData(date: string): Promise<CalendarExtensionData> {
      const stats = await getDailyCommitLines(
        config?.owner as string,
        config?.repo as string,
        date,
        api.integration
      );
      
      return {
        badge: `${stats.netLines > 0 ? '+' : ''}${stats.netLines}`,
        badgeColor: stats.netLines > 0 ? 'green' : stats.netLines < 0 ? 'red' : 'gray',
        tooltip: `コミット: ${stats.commits}件, 追加: +${stats.additions}, 削除: -${stats.deletions}`,
        detailSections: [{
          title: 'GitHubコミット統計',
          content: `コミット数: ${stats.commits}件\n追加行数: +${stats.additions}\n削除行数: -${stats.deletions}\n純増行数: ${stats.netLines > 0 ? '+' : ''}${stats.netLines}`
        }]
      };
    }
  });
  
  return {
    dispose: async () => {
      await api.calendar.unregisterExtension('github-commit-stats');
    }
  };
}
```

**実装ファイル**:
- `plugins/examples/github-commit-stats/src/index.ts`: プラグインコード

#### 4.3 Widget表示の実装（推定: 2時間）

**目的**: ダッシュボードにGitHubコミット統計Widgetを表示

**実装内容**:

- [x] `plugins/examples/github-commit-stats/src/index.ts`: Widget登録の実装
  - [x] `api.ui.registerWidget()` でWidgetを登録
  - [x] Widgetのrender関数でGitHubコミット統計を表示
  - [x] 今月の合計コミット行数を表示

**実装内容（詳細）**:

```typescript
// plugins/examples/github-commit-stats/src/index.ts

await api.ui.registerWidget({
  id: 'github-commit-stats-widget',
  name: 'GitHubコミット統計',
  description: '今月のGitHubコミット行数を表示',
  position: 'top-right',
  size: 'medium',
  async render(context) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    
    // 今月の合計コミット行数を取得
    const monthlyStats = await getMonthlyCommitLines(
      config?.owner as string,
      config?.repo as string,
      year,
      month,
      api.integration
    );
    
    return {
      type: 'github-commit-stats',
      props: {
        totalCommits: monthlyStats.totalCommits,
        totalAdditions: monthlyStats.totalAdditions,
        totalDeletions: monthlyStats.totalDeletions,
        netLines: monthlyStats.netLines
      }
    };
  }
});
```

**実装ファイル**:
- `plugins/examples/github-commit-stats/src/index.ts`: プラグインコード

#### 4.4 エディタ拡張の実装（推定: 1時間）

**目的**: 日記作成時にGitHubコミット行数カウンターを表示

**実装内容**:

- [x] `plugins/examples/github-commit-stats/src/index.ts`: エディタ拡張の実装
  - [x] UIコマンドとしてカウンターを挿入
  - [x] エディタ内にGitHubコミット行数を表示

**実装ファイル**:
- `plugins/examples/github-commit-stats/src/index.ts`: プラグインコード

---

### Phase 5: ドキュメントとテスト（推定: 4時間）

#### 5.1 ドキュメント作成（推定: 2時間）

**目的**: 新機能のドキュメント作成

**実装内容**:

- [x] `docs/guides/plugin-development/widget-rendering.md`: Widgetレンダリング機能の説明
- [x] `docs/guides/plugin-development/calendar-extensions.md`: カレンダー拡張機能の説明
- [x] `docs/guides/plugin-development/examples/github-commit-stats.md`: サンプルプラグインの説明

**実装ファイル**:
- `docs/guides/plugin-development/widget-rendering.md`: Widgetレンダリングガイド
- `docs/guides/plugin-development/calendar-extensions.md`: カレンダー拡張ガイド
- `docs/guides/plugin-development/examples/github-commit-stats.md`: サンプルプラグインガイド

#### 5.2 テスト実装（推定: 2時間）

**目的**: 新機能のテスト

**実装内容**:

- [x] `lib/plugins/__tests__/calendar-registry.test.ts`: カレンダー拡張レジストリのテスト
- [x] `components/plugins/__tests__/PluginWidgetRenderer.test.tsx`: Widgetレンダリングコンポーネントのテスト
- [x] `app/_actions/__tests__/plugin-widgets.test.ts`: Widget取得Server Actionのテスト

**実装ファイル**:
- `lib/plugins/__tests__/calendar-registry.test.ts`: カレンダー拡張レジストリテスト
- `components/plugins/__tests__/PluginWidgetRenderer.test.tsx`: Widgetレンダリングテスト
- `app/_actions/__tests__/plugin-widgets.test.ts`: Widget取得テスト

---

## 推定時間

### 各Phaseの推定時間

| Phase | 項目 | 推定時間 |
|------|------|---------|
| Phase 1 | Widgetレンダリング機能の基盤実装 | 6時間 |
| Phase 2 | カレンダーUI拡張ポイントの実装 | 8時間 |
| Phase 3 | GitHub API連携機能の実装 | 4時間 |
| Phase 4 | GitHubコミット行数表示プラグインの実装 | 8時間 |
| Phase 5 | ドキュメントとテスト | 4時間 |
| **合計** | | **30時間** |

---

## 実装の優先順位

### 高優先度（基本機能）

1. **Phase 1**: Widgetレンダリング機能の基盤実装
   - ダッシュボードにWidgetを表示する機能は必須
   - 他の機能の基盤となる

2. **Phase 2**: カレンダーUI拡張ポイントの実装
   - カレンダーUIにプラグインデータを表示する機能は必須
   - GitHubコミット行数表示の前提

### 中優先度（実用例）

3. **Phase 3**: GitHub API連携機能の実装
   - 実用的なプラグインの実装に必要

4. **Phase 4**: GitHubコミット行数表示プラグインの実装
   - 実用例として重要

### 低優先度（補完）

5. **Phase 5**: ドキュメントとテスト
   - 開発者体験の向上に重要

---

## 完了条件

- [x] Widgetレンダリング機能が動作し、ダッシュボードにWidgetが表示される ✅
- [x] カレンダーUI拡張ポイントが動作し、プラグインデータがカレンダーに表示される ✅
- [x] GitHubコミット行数表示プラグインが動作し、カレンダーとWidgetにデータが表示される ✅
- [x] すべてのテストがパスする ✅ (69テストケース全てパス)
- [x] ドキュメントが完備されている ✅

---

## 関連ドキュメント

- [実装状況まとめ](./implementation-status.md)
- [プラグイン開発ガイド](../../guides/plugin-development.md)
- [Phase 4実装計画](./phase4-development-tools.md)
- [Issue #109 - Phase 4: Plugin Development Tools & Sample Plugins](https://github.com/otomatty/for-all-learners/issues/109)

---

## フォローアップメモ (2025-11-10)

- GitHubコミット統計プラグインに `createConcurrencyLimiter` を導入し、`integration.callExternalAPI` の同時実行数を5件に制限することでホスト側レートリミット (最大10件) を確実に下回るように調整。
- カレンダー拡張とダッシュボードWidgetのデータ取得処理で行われる全ての GitHub API 呼び出しをリミッター経由に統一し、既存のバッチ処理構造を維持したままピーク負荷を平準化。
- 単体テスト `plugins/examples/github-commit-stats/src/concurrency.test.ts` を新設し、リミッターが設定値を超えて非同期タスクを同時実行しないことを検証。

---

## 変更履歴

| 日付 | 変更内容 | 担当 |
|------|----------|------|
| 2025-11-05 | Widgetレンダリング & カレンダーUI拡張機能実装計画作成 | AI Agent |
| 2025-01-28 | Phase 1-5 すべての実装完了、全69テストケースパス、ドキュメント完備 | AI Agent |
| 2025-11-10 | GitHubコミット統計プラグインのAPI同時実行数を5件に制限し、関連テストとドキュメントを更新 | AI Agent |

