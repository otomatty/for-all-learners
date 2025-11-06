# プラグインロード関連の問題調査結果

**作成日**: 2025-11-06  
**ステータス**: Open  
**優先度**: High  
**Phase**: Phase 4 (Plugin Development Tools)

---

## 調査概要

GitHubコミット統計プラグインがインストールされているにも関わらず、カレンダー拡張機能とWidgetが表示されない問題について調査しました。

## 発見された問題

### 問題1: プラグインロード時に設定（config）が渡されていない

**問題箇所**: `lib/hooks/use-load-plugin.ts:109`

```typescript
const loadResult = await loader.loadPlugin(plugin.manifest, code, {
  enableImmediately: true,
  requireSignature: false,
  // ❌ config が渡されていない
});
```

**影響**:
- プラグインの`_activate`関数に`config`が渡されない
- `owner`と`repo`が設定されていないため、プラグインが初期化に失敗
- エラーメッセージが表示されるが、カレンダー拡張やWidgetは登録されない

**プラグインコードでの確認**:
```typescript
const owner = (config?.owner as string) || "";
const repo = (config?.repo as string) || "";

if (!owner || !repo) {
  api.notifications.error("GitHubコミット統計プラグイン: ownerとrepoの設定が必要です");
  return {}; // ❌ 空のオブジェクトを返して終了
}
```

### 問題2: プラグイン設定の取得がロード時に実行されていない

**現状**:
- プラグイン設定は`plugin-storage`に保存されている
- しかし、プラグインロード時に設定を取得していない
- `getAllPluginStorage`で設定を取得して、`config`オプションとして渡す必要がある

**解決方法**:
```typescript
// プラグインロード前に設定を取得
const config = await getAllPluginStorage(plugin.pluginId);

// 設定を渡してロード
const loadResult = await loader.loadPlugin(plugin.manifest, code, {
  enableImmediately: true,
  requireSignature: false,
  config, // ✅ 設定を渡す
});
```

### 問題3: アプリ起動時の自動ロード機能がない

**現状**:
- インストール時にプラグインをロードしているが、ページリロード後はロードされない
- アプリ起動時にインストール済みプラグインを自動的にロードする機能がない

**影響**:
- ページをリロードすると、プラグインがアンロードされる
- カレンダー拡張やWidgetが表示されなくなる

**必要な実装**:
- ダッシュボードページやアプリ起動時に、インストール済みプラグインを自動ロード
- プラグインのロード状態を管理する仕組み

### 問題4: プラグイン設定更新後にリロードされない

**現状**:
- 設定を変更しても、プラグインが再ロードされない
- 新しい設定が反映されるためには、プラグインを手動でアンロード・再ロードする必要がある

**影響**:
- 設定変更後も古い設定でプラグインが動作し続ける
- ユーザーが設定変更を確認できない

**必要な実装**:
- 設定保存時にプラグインを自動的にリロード
- または、設定変更を検知してリロードする機能

### 問題5: GitHub認証トークンの設定方法が不明確

**現状**:
- プラグインは`github_oauth_token`を`api.storage.get`で取得しようとしている
- しかし、設定UIでトークンを設定する方法がない

**プラグインコード**:
```typescript
const tokenData = await api.storage.get("github_oauth_token");

if (!tokenData) {
  api.notifications.warning("GitHub認証トークンが設定されていません");
  return {};
}
```

**必要な実装**:
- プラグイン設定画面で`github_oauth_token`を設定できるようにする
- または、専用の認証フローを実装

## 問題の根本原因

1. **プラグインロードフローの不完全性**
   - 設定の取得と受け渡しが実装されていない
   - アプリ起動時の自動ロード機能がない

2. **プラグイン設定の管理方法の不統一**
   - `plugin-storage`に保存されているが、ロード時に取得されていない
   - 設定更新とプラグイン再ロードの連携がない

3. **認証情報の管理方法が不明確**
   - GitHub認証トークンの設定方法がプラグイン開発者に明示されていない
   - 設定UIでの設定方法が不明

## 修正方針

### Phase 1: プラグインロード時の設定取得と受け渡し

1. `use-load-plugin.ts`を修正
   - プラグインロード前に`getAllPluginStorage`で設定を取得
   - 取得した設定を`config`オプションとして渡す

2. プラグイン設定のマージ
   - `defaultConfig`と保存済み設定をマージ
   - 優先順位: 保存済み設定 > デフォルト設定

### Phase 2: アプリ起動時の自動ロード機能

1. ダッシュボードページにプラグイン自動ロード機能を追加
   - `useEffect`でインストール済みプラグインを取得
   - 有効なプラグインを自動的にロード

2. プラグインロード状態の管理
   - ロード済みプラグインを記録
   - 重複ロードを防止

### Phase 3: 設定更新時の自動リロード

1. 設定保存時の自動リロード
   - `PluginSettingsForm`で設定保存後にプラグインをリロード
   - 新しい設定でプラグインを再初期化

### Phase 4: 認証情報の設定UI

1. GitHub認証トークン設定フィールドの追加
   - `configSchema`に`githubToken`フィールドを追加
   - パスワードタイプの入力フィールド

## 関連ファイル

### 修正が必要なファイル
- `lib/hooks/use-load-plugin.ts` - 設定取得と受け渡し
- `app/(protected)/dashboard/page.tsx` - 自動ロード機能
- `app/(protected)/settings/plugins/_components/PluginSettingsForm.tsx` - 設定保存時のリロード
- `plugins/examples/github-commit-stats/plugin.json` - 設定スキーマの拡張

### 参照すべきファイル
- `app/_actions/plugin-storage.ts` - プラグインストレージAPI
- `lib/plugins/plugin-loader/plugin-loader.ts` - プラグインローダー
- `plugins/examples/github-commit-stats/src/index.ts` - プラグイン実装

## 優先順位

1. **最優先**: 問題1と2の修正（設定取得と受け渡し）
   - これが修正されれば、プラグインが正常に初期化される
   - カレンダー拡張とWidgetが表示される可能性が高い

2. **高優先度**: 問題3の修正（アプリ起動時の自動ロード）
   - ページリロード後もプラグインが動作し続ける

3. **中優先度**: 問題4の修正（設定更新時のリロード）
   - ユーザー体験の向上

4. **中優先度**: 問題5の修正（認証情報設定UI）
   - プラグイン機能の完全な動作に必要

