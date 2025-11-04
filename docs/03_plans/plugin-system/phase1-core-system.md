# プラグインシステム Phase 1: コアシステム構築

**作成日**: 2025-11-04  
**ステータス**: ✅ 実装完了  
**関連Issue**: N/A

---

## 概要

F.A.Lに汎用プラグインシステムを導入し、ユーザーが機能を拡張できる基盤を構築しました。Phase 1ではコアシステム（マニフェスト、ローダー、サンドボックス、API）を実装しています。

---

## 実装内容

### 1. 型定義

#### `types/plugin.ts`
- プラグインマニフェスト型定義
- プラグインメタデータ型
- ユーザープラグイン型
- プラグインストレージ型
- ランタイム状態型

#### `lib/plugins/types.ts`
- Workerメッセージプロトコル型
- プラグインAPI型
- エラー型
- 依存関係解決型

### 2. プラグインAPI

#### `lib/plugins/plugin-api.ts`

実装された機能:
- **App API**: アプリケーション情報取得
- **Storage API**: プラグイン専用key-valueストレージ
- **Notifications API**: トースト通知
- **UI API**: コマンド登録、ダイアログ表示

```typescript
interface PluginAPI {
  app: AppAPI;
  storage: StorageAPI;
  notifications: NotificationsAPI;
  ui: UIAPI;
}
```

### 3. Web Workerサンドボックス

#### `lib/plugins/sandbox-worker.ts`

機能:
- プラグインコードの隔離実行
- メッセージプロトコルによる通信
- プラグインAPIプロキシ
- エラーハンドリング

セキュリティ:
- DOM直接アクセス不可
- データベース直接アクセス不可
- プラグインAPIを通じた制限付きアクセスのみ

### 4. プラグインローダー

#### `lib/plugins/plugin-loader.ts`

機能:
- プラグインのロード/アンロード
- マニフェストバリデーション
- 依存関係解決
- Web Worker管理
- エラーハンドリング

```typescript
class PluginLoader {
  async loadPlugin(manifest, code, options): Promise<PluginLoadResult>
  async unloadPlugin(pluginId): Promise<void>
  async reloadPlugin(pluginId, code, options): Promise<PluginLoadResult>
}
```

### 5. プラグインレジストリ

#### `lib/plugins/plugin-registry.ts`

機能:
- プラグイン登録/登録解除
- 拡張ポイントによるフィルタリング
- 有効化/無効化管理
- エラー状態管理
- 統計情報取得

Singletonパターンで実装:

```typescript
class PluginRegistry {
  register(plugin): void
  unregister(pluginId): boolean
  get(pluginId): LoadedPlugin | undefined
  getAll(): LoadedPlugin[]
  getByExtensionPoint(point): LoadedPlugin[]
}
```

### 6. データベーススキーマ

#### `database/migrations/20251104_01_plugin_system.sql`

テーブル:
1. **plugins**: プラグインメタデータ（マーケットプレイス）
2. **user_plugins**: ユーザーインストール済みプラグイン
3. **plugin_storage**: プラグイン専用ストレージ

機能:
- Row Level Security (RLS)
- トリガー関数（更新日時の自動更新）
- ヘルパー関数（ダウンロード数、レーティング）

### 7. Server Actions

#### `app/_actions/plugins.ts`

実装機能:
- `getAvailablePlugins()`: マーケットプレイスクエリ
- `getPlugin()`: プラグイン詳細取得
- `getInstalledPlugins()`: インストール済みプラグイン取得
- `installPlugin()`: プラグインインストール
- `uninstallPlugin()`: プラグインアンインストール
- `enablePlugin()` / `disablePlugin()`: 有効化/無効化
- `updatePluginConfig()`: 設定更新

#### `app/_actions/plugin-storage.ts`

実装機能:
- `getPluginStorage()`: ストレージ取得
- `setPluginStorage()`: ストレージ保存
- `deletePluginStorage()`: ストレージ削除
- `getPluginStorageKeys()`: キー一覧取得
- `clearPluginStorage()`: 全削除

### 8. プラグイン設定画面

#### `app/(protected)/settings/plugins/page.tsx`

機能:
- インストール済みプラグイン一覧
- マーケットプレイス一覧
- プラグインの有効化/無効化
- プラグインのインストール/アンインストール
- プラグイン情報表示（作成者、バージョン、ダウンロード数など）

UI構成:
- タブ切り替え（インストール済み/マーケットプレイス）
- カード形式での表示
- バッジによる視覚的な状態表示

### 9. ユニットテスト

#### `lib/plugins/__tests__/plugin-registry.test.ts`
- Singletonパターンのテスト
- CRUD操作のテスト
- フィルタリング機能のテスト
- エラー管理のテスト

#### `lib/plugins/__tests__/plugin-loader.test.ts`
- マニフェストバリデーションのテスト
- ロード/アンロードのテスト
- Worker管理のテスト

### 10. ドキュメント

#### `docs/guides/plugin-development.md`

内容:
- プラグインシステムの概要
- プラグイン開発チュートリアル
- マニフェスト定義ガイド
- プラグインAPI リファレンス
- 拡張ポイントの説明
- 開発環境セットアップ
- デバッグとテスト
- FAQ

---

## ディレクトリ構造

```
lib/plugins/
├─ plugin-api.ts           # ✅ プラグインAPI定義・実装
├─ plugin-loader.ts        # ✅ プラグインローダー
├─ plugin-registry.ts      # ✅ プラグインレジストリ
├─ sandbox-worker.ts       # ✅ Web Workerサンドボックス
├─ types.ts                # ✅ プラグイン関連型定義
└─ __tests__/
   ├─ plugin-loader.test.ts   # ✅ ローダーテスト
   └─ plugin-registry.test.ts # ✅ レジストリテスト

types/
└─ plugin.ts               # ✅ プラグインマニフェスト型定義

app/_actions/
├─ plugins.ts              # ✅ プラグイン管理Actions
└─ plugin-storage.ts       # ✅ プラグインストレージActions

app/(protected)/settings/plugins/
└─ page.tsx                # ✅ プラグイン設定画面

database/migrations/
└─ 20251104_01_plugin_system.sql  # ✅ プラグインDBスキーマ

docs/
├─ guides/
│  └─ plugin-development.md       # ✅ 開発者向けガイド
└─ 03_plans/plugin-system/
   └─ phase1-core-system.md       # ✅ この計画書
```

---

## 技術的な意思決定

### Web Worker の選択

**理由:**
- セキュリティ: プラグインコードをメインスレッドから隔離
- パフォーマンス: 重い処理をバックグラウンドで実行可能
- 安定性: プラグインのエラーがアプリ全体に波及しない

**制約:**
- DOM直接アクセス不可 → メッセージパッシングで実装
- React Component実行不可 → Phase 4で別アプローチ検討

### Singleton パターンの採用

PluginLoader と PluginRegistry にSingletonパターンを採用：

**理由:**
- アプリケーション全体で単一のインスタンスを保証
- グローバルアクセスポイントの提供
- 状態の一元管理

### メッセージプロトコル設計

ホスト ↔ Worker間の通信プロトコル:

```typescript
interface WorkerMessage<T = unknown> {
  type: WorkerMessageType;
  requestId?: string;  // リクエスト-レスポンスのマッチング
  payload: T;
}
```

**メッセージタイプ:**
- `INIT`: プラグイン初期化
- `CALL_METHOD`: プラグインメソッド呼び出し
- `DISPOSE`: プラグイン破棄
- `API_CALL`: プラグインからAPIコール
- `API_RESPONSE`: API呼び出しの結果
- `EVENT`: イベント通知
- `ERROR`: エラー発生

---

## セキュリティ考慮事項

### 実装済み

1. **サンドボックス化**: Web Workerによる隔離実行
2. **API制限**: プラグインAPIを通じた制限付きアクセス
3. **RLS (Row Level Security)**: データベースレベルでのアクセス制御
4. **ストレージ隔離**: プラグイン毎・ユーザー毎に隔離されたストレージ

### 今後の検討事項

1. **コード署名**: プラグインコードの検証（Phase 6）
2. **権限管理**: より細かいアクセス権限制御（将来フェーズ）
3. **レート制限**: API呼び出しの頻度制限（将来フェーズ）
4. **CSP (Content Security Policy)**: セキュリティポリシー設定（Phase 2）

---

## パフォーマンス最適化

### 実装済み

1. **遅延ロード**: 必要に応じてプラグインをロード
2. **タイムアウト設定**: 初期化30秒、破棄5秒
3. **非同期処理**: すべてのAPI呼び出しは非同期

### 今後の最適化

1. **バンドルサイズ削減**: コード分割と最適化（Phase 2）
2. **キャッシング**: プラグインコードのキャッシング（Phase 2）
3. **バックグラウンドロード**: アプリ起動時の並列ロード（Phase 2）

---

## 制限事項

### Phase 1 の制限

1. **拡張ポイント**: UI基本機能のみ（コマンド、ダイアログ）
2. **プラグイン間通信**: 未サポート
3. **React Component**: Phase 4まで未サポート
4. **ネイティブコード**: 実行不可
5. **依存関係バージョン管理**: 簡易チェックのみ

---

## 次のフェーズ

### Phase 2: エディタ拡張システム

**目標**: Tiptap Extensions の動的ロード

**実装予定:**
- エディタAPI追加
- カスタムノード/マーク登録
- プラグインからのエディタ操作
- エディタコマンド拡張

### Phase 3: AI機能拡張システム

**目標**: カスタムプロンプトと問題生成

**実装予定:**
- AI API追加
- プロンプトテンプレート登録
- カスタム問題生成ロジック
- LLMモデル選択

### Phase 4: UI拡張システム

**目標**: React Component の動的ロード

**実装予定:**
- UI Component API
- カスタムウィジェット
- レイアウト拡張
- スタイリング

### Phase 5: データ処理拡張

**目標**: Import/Export 機能拡張

**実装予定:**
- Data Processor API
- カスタムインポーター
- カスタムエクスポーター
- データ変換パイプライン

### Phase 6: マーケットプレイス

**目標**: プラグインストアの構築

**実装予定:**
- プラグインアップロード
- コードレビューシステム
- バージョン管理
- レーティング・レビュー機能
- 検索・フィルタリング強化

---

## 関連ドキュメント

- [プラグイン開発ガイド](../../guides/plugin-development.md)
- [プラグイン型定義](../../../types/plugin.ts)
- [プラグインAPI仕様](../../../lib/plugins/plugin-api.ts)

---

## 変更履歴

| 日付 | 変更内容 | 担当 |
|------|----------|------|
| 2025-11-04 | Phase 1 実装完了 | AI Agent |

---

**ステータス**: ✅ Phase 1 完了  
**次のステップ**: Phase 2 エディタ拡張システムの設計・実装

