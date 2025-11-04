# プラグインシステム Phase 1: データベースマイグレーション実装完了

**日付**: 2025年11月4日  
**担当**: AI Assistant  
**関連ドキュメント**: 
- Plan: `docs/03_plans/plugin-system/phase1-core-system.md`
- Migration: `database/migrations/20251104_01_plugin_system.sql`

## 作業サマリー

プラグインシステム Phase 1 の最初のステップとして、データベーススキーマの設計とマイグレーションを完了した。

## 実施内容

### 1. Supabase DBの現状確認

**目的**: 既存のテーブル構造を確認し、マイグレーションスクリプトとの衝突を回避

**実施内容**:
- Supabase MCPを使用して `public` スキーマのテーブル一覧を取得
- 既存テーブル: 50+ テーブル確認（accounts, decks, cards, pages, notes など）
- **重要な発見**: `accounts` テーブルに `is_admin` カラムが存在せず、代わりに `admin_users` テーブルが存在

### 2. マイグレーションスクリプトの修正

**問題**: RLSポリシーが存在しない `accounts.is_admin` カラムを参照していた

**修正内容**:
```sql
-- Before (誤り)
WHERE accounts.is_admin = true

-- After (正しい)
WHERE admin_users.user_id = auth.uid()
  AND admin_users.is_active = true
```

**対象ポリシー**:
- `Only admins can insert plugins`
- `Only admins can update plugins`
- `Only admins can delete plugins`

### 3. データベースマイグレーション実行

**実行日時**: 2025年11月4日

**作成されたテーブル**:

#### 3.1 `plugins` テーブル（プラグインマーケットプレイス）
- **目的**: プラグインの公開・配布情報を管理
- **主要カラム**:
  - `plugin_id` (TEXT, UNIQUE): プラグイン一意識別子（例: `com.fal.example-plugin`）
  - `name`, `version`, `description`, `author`: 基本情報
  - `manifest` (JSONB): プラグインマニフェスト全体
  - `code_url` (TEXT): Supabase Storage上のプラグインコードURL
  - `is_official`, `is_reviewed` (BOOLEAN): セキュリティフラグ
  - `downloads_count`, `rating_average`, `rating_count`: マーケットプレイス統計
  - `has_*_extension` (BOOLEAN): 拡張ポイントフラグ（フィルタリング用）

- **RLS**: 全員が閲覧可能、管理者のみ編集可能
- **インデックス**: 8個（plugin_id, author, official, reviewed, downloads, rating, manifest GIN, extension points）

#### 3.2 `user_plugins` テーブル（ユーザーインストール済みプラグイン）
- **目的**: ユーザーごとのプラグインインストール状態を管理
- **主要カラム**:
  - `user_id` (UUID, FK → accounts.id)
  - `plugin_id` (TEXT, FK → plugins.plugin_id)
  - `installed_version` (TEXT): インストールされたバージョン
  - `enabled` (BOOLEAN): プラグインが有効かどうか
  - `config` (JSONB): ユーザー固有の設定
  - `installed_at`, `last_updated_at`, `last_used_at`: タイムスタンプ

- **RLS**: ユーザーは自分のプラグインのみ管理可能
- **制約**: UNIQUE(user_id, plugin_id) - 同じプラグインを重複インストール不可

#### 3.3 `plugin_storage` テーブル（プラグイン用KVストレージ）
- **目的**: プラグインがユーザーごとにデータを永続化するための汎用ストレージ
- **主要カラム**:
  - `user_id` (UUID, FK → accounts.id)
  - `plugin_id` (TEXT): プラグインID（FK制約なし、柔軟性のため）
  - `key` (TEXT): ストレージキー（最大255文字）
  - `value` (JSONB): ストレージ値
  - `created_at`, `updated_at`: タイムスタンプ

- **RLS**: ユーザーは自分のストレージのみアクセス可能
- **制約**: UNIQUE(user_id, plugin_id, key)
- **インデックス**: 3個（複合インデックス、GIN）

### 4. トリガー関数の作成

以下の自動更新トリガーを実装：
- `update_plugins_updated_at()`: plugins.updated_at 自動更新
- `update_user_plugins_updated_at()`: user_plugins.last_updated_at 自動更新
- `update_plugin_storage_updated_at()`: plugin_storage.updated_at 自動更新

### 5. ヘルパー関数の作成

以下のヘルパー関数を実装：
- `increment_plugin_downloads(p_plugin_id TEXT)`: ダウンロード数をインクリメント
- `update_plugin_rating(p_plugin_id TEXT, p_new_rating DECIMAL)`: レーティング平均を更新

## マイグレーション結果

✅ **成功**: すべてのテーブル、インデックス、トリガー、RLSポリシーが正常に作成された

**作成されたオブジェクト**:
- テーブル: 3個
- インデックス: 12個
- トリガー: 3個
- トリガー関数: 3個
- ヘルパー関数: 2個
- RLSポリシー: 12個

## 技術的な決定事項

### 1. plugin_id を TEXT 型で実装
- **理由**: ドメイン逆引き形式（`com.example.plugin`）を許可するため
- **利点**: 名前空間の衝突を回避、所有者が明確

### 2. manifest を JSONB で保存
- **理由**: 柔軟性とクエリパフォーマンスのバランス
- **利点**: 
  - 拡張ポイント、依存関係などを動的にクエリ可能
  - GINインデックスで高速検索
  - マニフェスト構造の変更に柔軟に対応

### 3. plugin_storage の plugin_id に FK制約なし
- **理由**: プラグインがアンインストールされてもストレージデータを保持
- **利点**: ユーザーデータの保護、再インストール時の復元が容易

### 4. has_*_extension フラグの追加
- **理由**: 拡張ポイントごとのフィルタリングを高速化
- **利点**: manifest のネストされたJSONをパースせずにフィルタ可能

## セキュリティ対策

### Row Level Security (RLS)
- ✅ すべてのテーブルで有効化
- ✅ 管理者権限は `admin_users` テーブルで検証
- ✅ ユーザーは自分のデータのみアクセス可能

### 管理者権限チェック
```sql
EXISTS (
  SELECT 1 FROM admin_users
  WHERE admin_users.user_id = auth.uid()
  AND admin_users.is_active = true
)
```

### データ検証
- バージョン形式: セマンティックバージョニング（`^\d+\.\d+\.\d+`）
- レーティング範囲: 0.00 〜 5.00
- ストレージキー: 1〜255文字

## 今後の実装計画

### Phase 1（現在フェーズ）: コアプラグインシステム

#### 残りタスク

##### 1. TypeScript型定義（推定: 2時間）
- [ ] `types/plugin.ts`: PluginManifest, PluginAPI の定義
- [ ] `lib/plugins/types.ts`: 内部メッセージプロトコル、LoadedPlugin の定義

##### 2. Plugin API 実装（推定: 4時間）
- [ ] `lib/plugins/plugin-api.ts`: ホストとプラグイン間のAPI橋渡し
  - [ ] Storage API (get/set/delete)
  - [ ] Notifications API (show)
  - [ ] UI API (renderComponent)
  - [ ] メッセージパッシング処理

##### 3. Sandbox Worker 実装（推定: 6時間）
- [ ] `lib/plugins/sandbox-worker.ts`: Web Worker内でのプラグインコード実行
  - [ ] プラグイン初期化ハンドラ
  - [ ] API呼び出しプロキシ
  - [ ] セキュリティサンドボックス設定
  - [ ] **注意**: `eval` の使用は一時的、Phase 2でより安全な方法に置き換え

##### 4. Plugin Registry 実装（推定: 3時間）
- [ ] `lib/plugins/plugin-registry.ts`: 読み込み済みプラグインの管理
  - [ ] プラグイン登録/登録解除
  - [ ] プラグイン取得/一覧取得
  - [ ] アクティブ状態管理

##### 5. Plugin Loader 実装（推定: 6時間）
- [ ] `lib/plugins/plugin-loader.ts`: プラグインのロード/アンロード
  - [ ] Web Worker作成
  - [ ] Blob URL生成（動的プラグインロード）
  - [ ] 依存関係解決
  - [ ] エラーハンドリング
  - [ ] ホスト側APIハンドラ統合

##### 6. Server Actions 実装（推定: 4時間）
- [ ] `lib/actions/plugins.ts`: プラグイン管理のサーバーサイドロジック
  - [ ] `getPlugins()`: マーケットプレイスからプラグイン一覧取得
  - [ ] `getPluginById()`: プラグイン詳細取得
  - [ ] `installPlugin()`: プラグインインストール
  - [ ] `uninstallPlugin()`: プラグインアンインストール
  - [ ] `updatePluginConfig()`: プラグイン設定更新
  - [ ] `getInstalledPlugins()`: ユーザーのインストール済みプラグイン一覧

##### 7. UI コンポーネント実装（推定: 8時間）
- [ ] `app/(protected)/plugins/page.tsx`: プラグインマーケットプレイスページ
- [ ] `components/plugins/plugin-card.tsx`: プラグインカード
- [ ] `components/plugins/plugin-detail-dialog.tsx`: プラグイン詳細ダイアログ
- [ ] `components/plugins/installed-plugins-list.tsx`: インストール済みプラグイン一覧

##### 8. テスト実装（推定: 6時間）
- [ ] `lib/plugins/__tests__/plugin-registry.test.ts`
- [ ] `lib/plugins/__tests__/plugin-loader.test.ts`
- [ ] `lib/plugins/__tests__/plugin-api.test.ts`
- [ ] E2Eテスト: プラグインのインストール〜実行

**Phase 1 推定合計時間**: 39時間

---

### Phase 2: 拡張ポイント実装

**開始予定**: Phase 1 完了後

#### タスク概要

##### 1. Editor Extensions（推定: 12時間）
- [ ] Tiptap拡張ポイントの実装
  - [ ] Custom Nodes登録API
  - [ ] Custom Marks登録API
  - [ ] Custom Plugins登録API
- [ ] サンプルプラグイン作成（例: カスタムブロック、構文ハイライト）

##### 2. AI Extensions（推定: 16時間）
- [ ] LLM統合拡張ポイント
  - [ ] Question Generator API
  - [ ] Prompt Template API
  - [ ] Content Analyzer API
- [ ] サンプルプラグイン作成（例: カスタム問題生成、要約生成）

##### 3. UI Extensions（推定: 10時間）
- [ ] UIコンポーネント拡張ポイント
  - [ ] Custom Widget API
  - [ ] Custom Page API
  - [ ] Custom Sidebar Panel API
- [ ] React Server Components統合

##### 4. Data Processor Extensions（推定: 8時間）
- [ ] データ処理拡張ポイント
  - [ ] Importer API（外部データ取り込み）
  - [ ] Exporter API（データエクスポート）
  - [ ] Transformer API（データ変換）

##### 5. Integration Extensions（推定: 12時間）
- [ ] 外部サービス統合拡張ポイント
  - [ ] OAuth連携API
  - [ ] Webhook API
  - [ ] External API呼び出しAPI（CORS proxy経由）

**Phase 2 推定合計時間**: 58時間

---

### Phase 3: マーケットプレイスUI/UX

**開始予定**: Phase 2 完了後

#### タスク概要（推定: 24時間）
- [ ] プラグイン検索・フィルタリング機能
- [ ] レーティング・レビューシステム
- [ ] プラグイン更新通知
- [ ] プラグイン設定UI
- [ ] プラグインアンインストール時の確認ダイアログ

---

### Phase 4: セキュリティ強化

**開始予定**: Phase 3 完了後

#### タスク概要（推定: 20時間）
- [ ] Content Security Policy (CSP) 厳格化
- [ ] プラグインコード署名・検証システム
- [ ] サンドボックス強化（Iframe Sandbox または Secure Worker）
- [ ] レート制限（API呼び出し、ストレージ使用量）
- [ ] セキュリティ監査ログ

---

### Phase 5: 公式プラグイン開発

**開始予定**: Phase 4 完了後

#### 予定プラグイン（推定: 各 6〜12時間）
1. **Scrapbox Sync Plugin**: Scrapboxとの双方向同期
2. **Anki Export Plugin**: Ankiデッキへのエクスポート
3. **Math Equation Plugin**: 高度な数式エディタ
4. **Diagram Plugin**: Mermaid/PlantUML統合
5. **Code Editor Plugin**: Monaco Editor統合
6. **Speech-to-Text Plugin**: 音声入力拡張

---

## 全体進捗

```
Phase 1: [████░░░░░░] 20% (DBマイグレーション完了)
Phase 2: [░░░░░░░░░░]  0% (未開始)
Phase 3: [░░░░░░░░░░]  0% (未開始)
Phase 4: [░░░░░░░░░░]  0% (未開始)
Phase 5: [░░░░░░░░░░]  0% (未開始)
```

**推定総時間**: 141時間 + 公式プラグイン開発

---

## 次のステップ

**優先度 HIGH**: Phase 1 の残りタスク実装

1. ✅ データベースマイグレーション（完了）
2. **→ 次**: TypeScript型定義の実装（`types/plugin.ts`, `lib/plugins/types.ts`）
3. Plugin API実装
4. Sandbox Worker実装
5. Plugin Loader & Registry実装
6. Server Actions実装
7. UIコンポーネント実装
8. テスト実装

**推定完了日**: Phase 1 は約1週間（39時間 / 5時間/日 = 8営業日）

---

## 技術的な課題と対策

### 課題1: Web Worker内での動的プラグインコード実行
**現状**: `eval` を使用する一時的な実装
**リスク**: XSS攻撃、コードインジェクション
**対策案（Phase 4で実装）**:
- Blob URLを使用した安全なコードロード
- Content Security Policy (CSP) の厳格化
- プラグインコード署名・検証システム

### 課題2: プラグイン依存関係の解決
**現状**: 未実装（Phase 1で実装予定）
**対策**: 
- トポロジカルソート使用
- 循環依存の検出・エラー処理

### 課題3: プラグインのパフォーマンス影響
**現状**: 監視・制限なし
**対策案（Phase 4で実装）**:
- API呼び出しレート制限
- ストレージ使用量制限
- CPU使用率監視（Web Worker Timeout）

---

## 参考資料

- **実装計画**: `docs/03_plans/plugin-system/phase1-core-system.md`
- **マイグレーションスクリプト**: `database/migrations/20251104_01_plugin_system.sql`
- **Supabase Documentation**: https://supabase.com/docs
- **Web Workers API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API

---

## まとめ

Phase 1 の最初のステップとして、プラグインシステムのデータベース基盤を構築した。既存のDB構造に影響を与えることなく、セキュアで拡張性の高いスキーマを実装できた。

次は TypeScript 型定義と Plugin API の実装に進み、実際にプラグインをロード・実行できる基盤を構築する。

**本日の作業時間**: 約2時間（DB調査、マイグレーション修正、実行、ログ作成）

---

**作成者**: AI Assistant  
**作成日時**: 2025年11月4日

