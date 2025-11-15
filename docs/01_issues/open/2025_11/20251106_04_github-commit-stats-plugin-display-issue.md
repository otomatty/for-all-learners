# GitHubコミット統計プラグインの表示問題

**作成日**: 2025-11-06  
**ステータス**: Open  
**優先度**: High  
**Phase**: Phase 4 (Plugin Development Tools)

---

## 概要

GitHubコミット統計プラグインの設定は完了しているが、実際にアプリケーション上に表示されない問題が発生しています。カレンダー拡張機能（バッジ表示）とWidget（ダッシュボード統計表示）が正しく動作していません。

## 現状

### ✅ 完了している機能

1. **プラグイン設定UI**
   - GitHubユーザー選択機能
   - リポジトリ選択機能（複数選択対応）
   - GitHub認証トークン設定機能
   - 設定の保存機能

2. **プラグイン実装**
   - カレンダー拡張の登録（`api.calendar.registerExtension()`）
   - Widgetの登録（`api.ui.registerWidget()`）
   - エディタコマンドの登録（`api.ui.registerCommand()`）
   - 複数リポジトリ対応の実装
   - GitHub API連携の実装

3. **プラグインロード機能**
   - アプリ起動時の自動ロード
   - 設定の取得と受け渡し

### ❌ 問題点

1. **カレンダー拡張機能が表示されない**
   - カレンダーセルにコミット行数のバッジが表示されない
   - 詳細パネルにプラグインデータが表示されない
   - プラグインが登録した拡張データが取得できていない可能性

2. **Widgetが表示されない**
   - ダッシュボードにプラグインWidgetが表示されない
   - Widgetレジストリに登録されていない可能性
   - Widgetのrender関数が正しく実行されていない可能性

3. **エディタコマンドが表示されない**
   - ノートエディタにプラグインコマンドが表示されない
   - コマンドレジストリに登録されていない可能性

## 調査が必要な項目

### 1. プラグインのロード状態確認

**確認項目**:
- プラグインが正しくロードされているか
- プラグインの`_activate`関数が実行されているか
- エラーが発生していないか

**確認方法**:
- ブラウザの開発者ツールでコンソールログを確認
- プラグインローダーのログを確認
- プラグインのロード状態を管理するストアを確認

### 2. カレンダー拡張レジストリの確認

**確認項目**:
- `calendar-registry.ts`に拡張が登録されているか
- `getDailyExtensionData()`が正しくデータを返しているか
- カレンダーコンポーネントが拡張データを取得しているか

**確認箇所**:
- `lib/plugins/calendar-registry.ts`: レジストリの状態
- `app/(protected)/dashboard/_components/ActivityCalendar/index.tsx`: 拡張データの取得処理
- `app/(protected)/dashboard/_components/ActivityCalendar/DayCell.tsx`: バッジ表示処理

**実装確認**:
```typescript
// ActivityCalendar/index.tsx の enrichWithPluginData 関数
const pluginExtensions = await getDailyExtensionData(day.date);
```

### 3. Widgetレジストリの確認

**確認項目**:
- `ui-registry.ts`にWidgetが登録されているか
- `getWidgets()`が正しくWidget一覧を返しているか
- Widgetのrender関数が正しく実行されているか

**確認箇所**:
- `lib/plugins/ui-registry.ts`: Widgetレジストリの状態
- `app/(protected)/dashboard/_components/PluginWidgetsSection.tsx`: Widget一覧の取得処理
- `components/plugins/PluginWidgetRenderer.tsx`: Widgetのレンダリング処理

**実装確認**:
```typescript
// PluginWidgetsSection.tsx の useEffect
const allWidgets = getWidgets();
```

### 4. プラグインAPIの実装確認

**確認項目**:
- `api.calendar.registerExtension()`が正しく実装されているか
- `api.ui.registerWidget()`が正しく実装されているか
- WorkerコンテキストでのAPI呼び出しが正しく動作しているか

**確認箇所**:
- `lib/plugins/plugin-api.ts`: Calendar APIとUI APIの実装
- `lib/plugins/plugin-loader/plugin-loader.ts`: WorkerコンテキストでのAPI提供

### 5. プラグイン設定の確認

**確認項目**:
- プラグイン設定が正しく取得されているか
- 設定がプラグインに正しく渡されているか
- 設定の形式が正しいか（`githubUser`, `selectedRepos`, `github_oauth_token`）

**確認箇所**:
- `lib/hooks/use-load-plugin.ts`: 設定の取得と受け渡し
- `app/_actions/plugin-storage.ts`: 設定の保存と取得

## 想定される原因

### 原因1: Workerコンテキストでのレジストリ登録が反映されていない

**問題**:
- プラグインはWorkerコンテキストで実行される
- レジストリはメインスレッド（UIスレッド）で管理される
- Workerからメインスレッドへの通信が正しく実装されていない可能性

**確認方法**:
- `lib/plugins/plugin-loader/plugin-loader.ts`のWorker通信実装を確認
- `lib/plugins/plugin-api.ts`のAPI実装を確認

### 原因2: プラグインのロードタイミングの問題

**問題**:
- プラグインがロードされる前にカレンダーやWidgetがレンダリングされる
- プラグインがロードされた後にレジストリが更新されない

**確認方法**:
- プラグインのロード順序を確認
- カレンダーやWidgetのレンダリングタイミングを確認

### 原因3: プラグイン設定の不備

**問題**:
- 設定が正しく取得されていない
- 設定の形式が間違っている
- 必須設定が不足している

**確認方法**:
- プラグイン設定の保存状態を確認
- プラグインロード時の設定を確認

### 原因4: エラーハンドリングの問題

**問題**:
- プラグインのエラーが適切に処理されていない
- エラーが発生しても通知されていない
- エラーによりプラグインが初期化に失敗している

**確認方法**:
- ブラウザのコンソールでエラーを確認
- プラグインのエラーハンドリングを確認

## 実装計画

### Phase 1: 問題の特定とデバッグ（最優先）

1. **ログの追加**
   - プラグインロード時のログを追加
   - レジストリ登録時のログを追加
   - データ取得時のログを追加

2. **デバッグツールの実装**
   - プラグインのロード状態を確認するUI
   - レジストリの状態を確認するUI
   - プラグイン設定を確認するUI

3. **エラーハンドリングの強化**
   - エラーの可視化
   - エラーログの記録
   - エラー通知の改善

### Phase 2: Workerコンテキストとメインスレッドの通信確認

1. **Worker通信の実装確認**
   - `plugin-loader.ts`のWorker通信実装を確認
   - レジストリ登録の通信を確認
   - データ取得の通信を確認

2. **同期メカニズムの実装**
   - Workerからメインスレッドへのイベント通知
   - レジストリの同期メカニズム
   - データの同期メカニズム

### Phase 3: プラグインロードタイミングの調整

1. **ロード順序の最適化**
   - プラグインのロードタイミングを調整
   - カレンダーやWidgetのレンダリングタイミングを調整
   - ロード完了後の再レンダリング

2. **状態管理の改善**
   - プラグインのロード状態を管理
   - レジストリの更新を検知
   - 自動再レンダリングの実装

### Phase 4: 動作確認とテスト

1. **動作確認**
   - カレンダー拡張機能の表示確認
   - Widgetの表示確認
   - エディタコマンドの表示確認

2. **テストの実装**
   - プラグインロードのテスト
   - レジストリ登録のテスト
   - データ取得のテスト

## 関連ファイル

### プラグイン実装
- `plugins/examples/github-commit-stats/src/index.ts` - プラグインコード
- `plugins/examples/github-commit-stats/plugin.json` - プラグイン設定スキーマ

### プラグインシステム
- `lib/plugins/plugin-loader/plugin-loader.ts` - プラグインローダー
- `lib/plugins/plugin-api.ts` - プラグインAPI
- `lib/plugins/calendar-registry.ts` - カレンダー拡張レジストリ
- `lib/plugins/ui-registry.ts` - UI拡張レジストリ

### UIコンポーネント
- `app/(protected)/dashboard/_components/ActivityCalendar/index.tsx` - カレンダーコンポーネント
- `app/(protected)/dashboard/_components/ActivityCalendar/DayCell.tsx` - カレンダーセル
- `app/(protected)/dashboard/_components/ActivityCalendar/DayDetailPanel.tsx` - 詳細パネル
- `app/(protected)/dashboard/_components/PluginWidgetsSection.tsx` - Widgetセクション
- `components/plugins/PluginWidgetRenderer.tsx` - Widgetレンダラー

### 設定とロード
- `lib/hooks/use-load-plugin.ts` - プラグインロードフック
- `app/_actions/plugin-storage.ts` - プラグインストレージ

## 関連Issue

- [20251106_01_github-commit-stats-plugin-enhancement.md](./20251106_01_github-commit-stats-plugin-enhancement.md) - 機能強化要件
- [20251106_02_plugin-loading-issues.md](./20251106_02_plugin-loading-issues.md) - プラグインロード問題（一部解決済み）
- [20251106_03_github-commit-stats-plugin-implementation.md](./20251106_03_github-commit-stats-plugin-implementation.md) - プラグイン実装完了（継続作業）

## 参考資料

- [実装計画: Widgetレンダリング & カレンダーUI拡張機能](../../03_plans/plugin-system/widget-calendar-extensions.md)
- [プラグイン開発ガイド](../../guides/plugin-development.md)
- [カレンダー拡張機能ガイド](../../guides/plugin-development/calendar-extensions.md)
- [Widgetレンダリングガイド](../../guides/plugin-development/widget-rendering.md)

## 備考

- プラグインの実装自体は完了しているが、表示されない問題が発生している
- Workerコンテキストとメインスレッドの通信が原因の可能性が高い
- デバッグツールの実装が重要

