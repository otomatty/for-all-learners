# ローカル開発環境でのプラグイン開発

**最終更新**: 2025-01-11  
**対象**: プラグイン開発者  
**関連**: [はじめにチュートリアル](./tutorial-getting-started.md), [開発環境のセットアップ](../plugin-development.md#開発環境のセットアップ)

---

## 概要

F.A.L プラグインシステムには、ローカル開発中のプラグインを簡単にテストできる開発環境が用意されています。このドキュメントでは、開発環境の読み込みボタンの目的、実装されている機能、本番環境との違いについて詳しく説明します。

---

## 目次

1. [開発環境の読み込みボタンとは](#開発環境の読み込みボタンとは)
2. [本番環境との違い](#本番環境との違い)
3. [実装されている機能](#実装されている機能)
4. [開発ワークフロー](#開発ワークフロー)
5. [技術的な詳細](#技術的な詳細)
6. [トラブルシューティング](#トラブルシューティング)

---

## 開発環境の読み込みボタンとは

### 目的

開発環境の読み込みボタンは、**ローカル開発中のプラグインを手動でロード・テストするための機能**です。以下の目的で実装されています：

- **ローカルファイルからの直接読み込み**: Supabase Storageを使わずに、ファイルシステムから直接プラグインを読み込む
- **署名検証のスキップ**: 開発中のプラグインは署名検証をスキップして素早くテストできる
- **ホットリロード**: コード変更後に再読み込みボタンで即座に反映
- **手動制御**: 自動ロードではなく、開発者が明示的にロードタイミングを制御

### アクセス方法

開発環境ページは以下のURLでアクセスできます：

```
http://localhost:3000/settings/plugins/dev
```

このページでは、`plugins/examples/` ディレクトリに配置されているローカルプラグインの一覧が表示されます。

---

## 本番環境との違い

開発環境と本番環境では、プラグインのロード方法が大きく異なります。以下の表に主な違いをまとめます：

| 項目 | 開発環境（読み込みボタン） | 本番環境（自動ロード） |
|------|------------------------|---------------------|
| **プラグインコードの取得元** | `plugins/examples/` ディレクトリ（ファイルシステム） | Supabase Storage（リモート） |
| **取得方法** | Server Action (`getLocalPluginCode`) でファイルを直接読み込み | `useLoadPlugin` フックでStorageから取得 |
| **署名検証** | `requireSignature: false` でスキップ | 将来的には必須（現在はスキップ） |
| **ロードタイミング** | 手動（読み込みボタンクリック） | 自動（`PluginAutoLoader` が起動時に実行） |
| **ホットリロード** | 可能（再読み込みボタン） | 不可（アプリ再起動が必要） |
| **設定の取得** | マニフェストの `defaultConfig` のみ | Storageから保存済み設定を取得してマージ |
| **プラグインの状態管理** | 開発ページで手動管理 | データベースで管理（インストール済み/有効化済み） |

### 本番環境のプラグインロードフロー

本番環境では、以下のようなフローでプラグインがロードされます：

1. **アプリケーション起動時**: `PluginAutoLoader` コンポーネントがマウントされる
2. **インストール済みプラグインの取得**: `getInstalledPlugins()` Server Actionでデータベースから取得
3. **有効化済みプラグインのフィルタリング**: `enabled: true` のプラグインのみを対象
4. **Storageからコード取得**: Supabase Storageからプラグインコードを取得
5. **設定のマージ**: デフォルト設定と保存済み設定をマージ
6. **プラグインのロード**: `PluginLoader.loadPlugin()` でロード

詳細は [`lib/hooks/use-load-plugin.ts`](../../../lib/hooks/use-load-plugin.ts) を参照してください。

---

## 実装されている機能

### 1. ローカルプラグインの検出

開発環境ページでは、`plugins/examples/` ディレクトリをスキャンして、以下の情報を取得します：

- プラグインID、名前、バージョン、説明、作成者
- プラグインのパス
- 現在のロード状態（`isLoaded`, `isEnabled`）

実装: [`app/_actions/plugins-dev.ts`](../../../app/_actions/plugins-dev.ts) の `getLocalPlugins()` 関数

### 2. プラグインコードの取得

Server Action `getLocalPluginCode()` が以下の優先順位でプラグインコードを取得します：

1. **`dist/index.js`** (ビルド済みコード) - 優先
2. **`src/index.ts`** (ソースコード) - フォールバック

実装: [`app/_actions/plugins-dev.ts`](../../../app/_actions/plugins-dev.ts) の `getLocalPluginCode()` 関数

### 3. プラグインの読み込み

読み込みボタンをクリックすると、以下の処理が実行されます：

1. **サーバー側**: `getLocalPluginCode()` でマニフェストとコードを取得
2. **クライアント側**: `PluginLoader.getInstance().loadPlugin()` でプラグインをロード
3. **オプション設定**:
   - `enableImmediately: true` - 即座に有効化
   - `requireSignature: false` - 署名検証をスキップ

実装: [`app/(protected)/settings/plugins/dev/_components/LocalPluginCard.tsx`](../../../app/(protected)/settings/plugins/dev/_components/LocalPluginCard.tsx) の `handleLoad()` 関数

### 4. ホットリロード機能

再読み込みボタンをクリックすると、以下の処理が実行されます：

1. **既存プラグインのアンロード**: 現在ロードされているプラグインをアンロード
2. **最新コードの取得**: ファイルシステムから最新のコードを取得
3. **プラグインの再ロード**: 新しいコードでプラグインを再ロード

これにより、コード変更を即座に反映できます。

実装: [`app/(protected)/settings/plugins/dev/_components/LocalPluginCard.tsx`](../../../app/(protected)/settings/plugins/dev/_components/LocalPluginCard.tsx) の `handleReload()` 関数

### 5. プラグインのアンロード

アンロードボタンをクリックすると、プラグインがアンロードされます：

- Web Workerの終了
- プラグインレジストリからの削除
- UI拡張（Widget、Page等）の登録解除

実装: [`app/(protected)/settings/plugins/dev/_components/LocalPluginCard.tsx`](../../../app/(protected)/settings/plugins/dev/_components/LocalPluginCard.tsx) の `handleUnload()` 関数

---

## 開発ワークフロー

### 基本的な開発フロー

1. **プラグインコードを編集**
   ```bash
   # プラグインのソースコードを編集
   vim plugins/examples/my-plugin/src/index.ts
   ```

2. **プラグインをビルド**
   ```bash
   # プラグインをビルド
   bun run plugins:build com.example.my-plugin
   
   # または、開発モード（ウォッチモード）で起動
   bun run plugins:dev com.example.my-plugin
   ```

3. **開発環境ページで読み込み**
   - ブラウザで `http://localhost:3000/settings/plugins/dev` にアクセス
   - プラグインカードの「読み込む」ボタンをクリック

4. **動作確認**
   - ダッシュボードページでWidgetが表示されるか確認
   - ブラウザの開発者ツールでエラーがないか確認

5. **コード変更後の再読み込み**
   - コードを変更してビルド
   - 開発環境ページで「再読み込み」ボタンをクリック

### 開発モードとの組み合わせ

`bun run plugins:dev` コマンドを使用すると、ファイル変更時に自動ビルドされます：

```bash
# ターミナル1: 開発モードでビルド
bun run plugins:dev com.example.my-plugin

# ターミナル2: F.A.L アプリケーションを起動
bun run dev
```

この場合、コードを変更すると自動的にビルドされるため、開発環境ページで「再読み込み」ボタンをクリックするだけで最新のコードが反映されます。

---

## 技術的な詳細

### アーキテクチャ

開発環境の読み込みボタンは、以下のアーキテクチャで実装されています：

```
┌─────────────────────────────────────────┐
│  開発環境ページ (Client Component)       │
│  LocalPluginCard.tsx                     │
└──────────────┬──────────────────────────┘
               │
               │ 1. getLocalPluginCode()
               │    (Server Action)
               ▼
┌─────────────────────────────────────────┐
│  サーバー側 (Node.js)                   │
│  plugins-dev.ts                         │
│  - ファイルシステムから読み込み          │
│  - manifest.json と dist/index.js       │
└──────────────┬──────────────────────────┘
               │
               │ 2. manifest + code を返す
               ▼
┌─────────────────────────────────────────┐
│  クライアント側 (Browser)               │
│  PluginLoader.getInstance()             │
│  - Web Worker を作成                    │
│  - プラグインコードを実行               │
│  - プラグインAPIをプロキシ              │
└─────────────────────────────────────────┘
```

### Server Action と Client Component の分離

開発環境の読み込みボタンは、Next.js の Server Action と Client Component を適切に分離して実装されています：

- **Server Action (`getLocalPluginCode`)**: ファイルシステムへのアクセス（Node.js環境でのみ可能）
- **Client Component (`LocalPluginCard`)**: Web Worker の作成とプラグインのロード（ブラウザ環境でのみ可能）

この分離により、以下の問題を回避しています：

- ❌ **以前の問題**: Server Action から直接 `PluginLoader.loadPlugin()` を呼び出すと、`Worker is not defined` エラーが発生
- ✅ **現在の解決策**: Server Action でファイルを読み込み、Client Component でプラグインをロード

### プラグインコードの取得ロジック

`getLocalPluginCode()` 関数は、以下のロジックでプラグインコードを取得します：

```typescript
// 1. プラグインディレクトリを検索
const pluginDir = findPluginDir(pluginId);

// 2. manifest.json を読み込み
const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

// 3. プラグインコードを取得（優先順位付き）
//    a. dist/index.js が存在する場合 → ビルド済みコードを使用
//    b. 存在しない場合 → src/index.ts を読み込み（フォールバック）
const distPath = join(pluginDir, "dist/index.js");
if (existsSync(distPath)) {
  code = readFileSync(distPath, "utf-8");
} else {
  code = readFileSync(codePath, "utf-8"); // manifest.main のパス
}
```

### プラグインロード時のオプション

開発環境では、以下のオプションでプラグインをロードします：

```typescript
const loadResult = await loader.loadPlugin(
  codeResult.manifest,
  codeResult.code,
  {
    enableImmediately: true,      // 即座に有効化
    requireSignature: false,      // 署名検証をスキップ
    // config は渡さない（defaultConfig のみ使用）
  },
);
```

本番環境では、`config` オプションも渡されます（Storageから取得した設定とマージ）。

---

## トラブルシューティング

### 問題1: 「プラグインが見つかりません」エラー

**原因**: `plugins/examples/` ディレクトリにプラグインが存在しない、または `plugin.json` が見つからない

**解決方法**:
1. プラグインが `plugins/examples/` ディレクトリに配置されているか確認
2. `plugin.json` ファイルが存在するか確認
3. プラグインIDが正しいか確認（`findPluginDir()` は複数の方法で検索します）

### 問題2: 「プラグインコードが見つかりません」エラー

**原因**: `dist/index.js` または `src/index.ts` が存在しない

**解決方法**:
1. プラグインをビルド: `bun run plugins:build <plugin-id>`
2. `dist/index.js` が生成されているか確認
3. `plugin.json` の `main` フィールドが正しいか確認

### 問題3: 「Worker is not defined」エラー

**原因**: Server Action から直接 `PluginLoader.loadPlugin()` を呼び出そうとしている

**解決方法**:
- この問題は既に解決済みです。現在の実装では、Server Action でファイルを読み込み、Client Component でプラグインをロードするように分離されています。
- もしこのエラーが発生する場合は、`LocalPluginCard.tsx` が Client Component (`"use client"`) としてマークされているか確認してください。

### 問題4: プラグインが読み込まれてもWidgetが表示されない

**原因**: プラグインの `activate()` 関数が正しく実行されていない、または `registerWidget()` が呼ばれていない

**解決方法**:
1. ブラウザの開発者ツールでエラーを確認
2. プラグインのログを確認: `http://localhost:3000/settings/plugins/dev/debug`
3. プラグインの `activate()` 関数が正しく実装されているか確認
4. `api.ui.registerWidget()` が呼ばれているか確認

### 問題5: 再読み込みボタンをクリックしても変更が反映されない

**原因**: プラグインコードがビルドされていない、または古いコードがキャッシュされている

**解決方法**:
1. プラグインを再ビルド: `bun run plugins:build <plugin-id>`
2. ブラウザのキャッシュをクリア
3. 一度アンロードしてから再読み込み

---

## 関連ドキュメント

- **[はじめにチュートリアル](./tutorial-getting-started.md)**: プラグイン開発の基本
- **[開発環境のセットアップ](../plugin-development.md#開発環境のセットアップ)**: 開発環境のセットアップ方法
- **[トラブルシューティング](./troubleshooting.md)**: よくある問題と解決方法
- **[Phase 4 実装計画](../../03_plans/plugin-system/phase4-development-tools.md)**: 開発ツールの実装計画

---

## 実装ファイル

開発環境の読み込みボタンに関連する主要なファイル：

- **UIコンポーネント**: [`app/(protected)/settings/plugins/dev/_components/LocalPluginCard.tsx`](../../../app/(protected)/settings/plugins/dev/_components/LocalPluginCard.tsx)
- **Server Actions**: [`app/_actions/plugins-dev.ts`](../../../app/_actions/plugins-dev.ts)
- **開発ページ**: [`app/(protected)/settings/plugins/dev/page.tsx`](../../../app/(protected)/settings/plugins/dev/page.tsx)
- **プラグインローダー**: [`lib/plugins/plugin-loader/plugin-loader.ts`](../../../lib/plugins/plugin-loader/plugin-loader.ts)

---

**最終更新**: 2025-01-11

