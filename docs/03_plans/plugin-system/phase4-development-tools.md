# プラグインシステム Phase 4: Plugin Development Tools & Sample Plugins

**作成日**: 2025-11-05  
**ステータス**: 🔄 実装中  
**関連Issue**: [#109](https://github.com/otomatty/for-all-learners/issues/109)  
**前提条件**: Phase 1, Phase 2, Phase 3完了 ✅

---

## 概要

プラグインシステムの基盤（Phase 1-3）が完了したため、次は実際のプラグイン開発を支援するツールとサンプルプラグインの作成に取り組みます。これにより、プラグイン開発者が効率的にプラグインを開発できる環境を整備します。

---

## 実装目標

### 主要目標

1. **プラグイン開発ツール**: CLIツール、テンプレート、デバッグツールの提供
2. **サンプルプラグイン**: 各拡張ポイントの実装例を提供
3. **ドキュメント強化**: チュートリアル、APIリファレンス、ベストプラクティスの整備
4. **テストと品質保証**: プラグイン開発者向けのテストフレームワークと品質チェックツール

---

## 実装内容

### 1. プラグイン開発ツール

#### 1.1 CLIツール（推定: 6時間）

**目的**: プラグインの生成、ビルド、テストを支援するCLIツール

**実装内容**:

- [ ] `scripts/plugins/create-plugin.ts`: プラグイン生成コマンド
  - [ ] プラグイン名、ID、拡張ポイントを入力
  - [ ] テンプレートからプロジェクト構造を生成
  - [ ] `package.json`, `tsconfig.json`, ビルド設定を自動生成
  - [ ] 基本的なマニフェストファイル（`plugin.json`）を生成

- [ ] `scripts/plugins/build-plugin.ts`: プラグインビルドコマンド
  - [ ] esbuildによるバンドル
  - [ ] 型チェック
  - [ ] マニフェスト検証
  - [ ] 出力ディレクトリへの配置

- [ ] `scripts/plugins/test-plugin.ts`: プラグインテストコマンド
  - [ ] Vitestによるテスト実行
  - [ ] プラグインAPIのモック
  - [ ] カバレッジレポート

- [ ] `scripts/plugins/dev-plugin.ts`: 開発モードコマンド
  - [ ] ウォッチモードでのビルド
  - [ ] ローカル開発環境への自動読み込み
  - [ ] ホットリロード

**実装ファイル**:
- `scripts/plugins/create-plugin.ts`: プラグイン生成
- `scripts/plugins/build-plugin.ts`: ビルド
- `scripts/plugins/test-plugin.ts`: テスト
- `scripts/plugins/dev-plugin.ts`: 開発モード
- `scripts/plugins/cli.ts`: CLIエントリーポイント

**使用例**:
```bash
# プラグイン生成
bun run plugins:create my-plugin

# ビルド
bun run plugins:build my-plugin

# テスト
bun run plugins:test my-plugin

# 開発モード
bun run plugins:dev my-plugin
```

#### 1.2 プラグイン開発用テンプレート（推定: 4時間）

**目的**: 新規プラグイン開発を迅速に開始できるテンプレート

**実装内容**:

- [ ] `templates/plugins/hello-world/`: 最小限のプラグインテンプレート
  - [ ] 基本的な `activate()` 関数
  - [ ] マニフェストファイル
  - [ ] ビルド設定
  - [ ] テスト設定

- [ ] `templates/plugins/editor-extension/`: エディタ拡張テンプレート
  - [ ] カスタムノード/マーク/プラグインのサンプル
  - [ ] Editor APIの使用例

- [ ] `templates/plugins/ai-extension/`: AI拡張テンプレート
  - [ ] Question Generatorのサンプル
  - [ ] Prompt Templateのサンプル
  - [ ] Content Analyzerのサンプル

- [ ] `templates/plugins/ui-extension/`: UI拡張テンプレート
  - [ ] Widget登録のサンプル
  - [ ] Page登録のサンプル
  - [ ] Sidebar Panel登録のサンプル

- [ ] `templates/plugins/data-processor-extension/`: データ処理拡張テンプレート
  - [ ] Importerのサンプル
  - [ ] Exporterのサンプル
  - [ ] Transformerのサンプル

- [ ] `templates/plugins/integration-extension/`: 統合拡張テンプレート
  - [ ] OAuth連携のサンプル
  - [ ] Webhookのサンプル
  - [ ] External API呼び出しのサンプル

**実装ファイル**:
- `templates/plugins/hello-world/`: 基本テンプレート
- `templates/plugins/editor-extension/`: エディタ拡張テンプレート
- `templates/plugins/ai-extension/`: AI拡張テンプレート
- `templates/plugins/ui-extension/`: UI拡張テンプレート
- `templates/plugins/data-processor-extension/`: データ処理拡張テンプレート
- `templates/plugins/integration-extension/`: 統合拡張テンプレート

#### 1.3 ローカル開発環境でのプラグイン読み込み機能（推定: 2時間）

**目的**: 開発中のプラグインをローカルで簡単にテストできる環境

**実装内容**:

- [ ] `app/_actions/plugins-dev.ts`: 開発用Server Actions
  - [ ] ローカルプラグインの読み込み
  - [ ] プラグインの再読み込み（ホットリロード）
  - [ ] 開発モードフラグの管理

- [ ] `app/(protected)/settings/plugins/dev/page.tsx`: 開発用プラグイン管理ページ
  - [ ] ローカルプラグインの一覧表示
  - [ ] プラグインの追加/削除
  - [ ] プラグインの再読み込みボタン

**実装ファイル**:
- `app/_actions/plugins-dev.ts`: 開発用Server Actions
- `app/(protected)/settings/plugins/dev/page.tsx`: 開発用UI

#### 1.4 デバッグツール（推定: 2時間）

**目的**: プラグイン開発時のデバッグを支援

**実装内容**:

- [ ] `lib/plugins/debug-tools.ts`: デバッグユーティリティ
  - [ ] プラグイン実行ログの収集
  - [ ] エラー追跡
  - [ ] パフォーマンス測定

- [ ] `app/(protected)/settings/plugins/dev/debug/page.tsx`: デバッグUI
  - [ ] プラグインログの表示
  - [ ] エラー一覧
  - [ ] パフォーマンスメトリクス

- [ ] ブラウザ開発者ツールとの統合
  - [ ] Worker内のconsole.logをメインスレッドに転送
  - [ ] エラースタックトレースの表示

**実装ファイル**:
- `lib/plugins/debug-tools.ts`: デバッグユーティリティ
- `app/(protected)/settings/plugins/dev/debug/page.tsx`: デバッグUI

#### 1.5 TypeScript型定義の自動生成（推定: 2時間）✅ **完了**

**目的**: プラグインAPIの型定義を自動生成し、開発体験を向上

**実装内容**:

- [x] `scripts/plugins/generate-types.ts`: 型定義生成スクリプト ✅
  - [x] `lib/plugins/plugin-api.ts` から型を抽出 ✅
  - [x] `lib/plugins/types.ts` から型を抽出 ✅
  - [x] `@fal/plugin-types` パッケージとして出力 ✅

- [x] `packages/plugin-types/`: プラグイン開発者向け型定義パッケージ ✅
  - [x] `package.json` ✅
  - [x] `index.d.ts`: 型定義エクスポート ✅
  - [x] `README.md` ✅
  - [x] `tsconfig.json` ✅

**実装ファイル**:
- `scripts/plugins/generate-types.ts`: 型定義生成 ✅
- `packages/plugin-types/`: 型定義パッケージ ✅

**使用例**:
```bash
# 型定義を生成
bun run plugins:generate-types

# プラグイン開発時にインストール
npm install @fal/plugin-types
```

**実装日**: 2025-11-05

---

### 2. サンプルプラグイン作成（推定: 12時間）

#### 2.1 Hello Worldプラグイン（推定: 1時間）

**目的**: プラグインの基本構造を説明する最小限のサンプル

**実装内容**:

- [ ] `plugins/examples/hello-world/`: Hello Worldプラグイン
  - [ ] 基本的な `activate()` 関数
  - [ ] Storage APIの使用例
  - [ ] Notifications APIの使用例
  - [ ] コマンド登録の例

**実装ファイル**:
- `plugins/examples/hello-world/index.ts`: プラグインコード
- `plugins/examples/hello-world/plugin.json`: マニフェスト
- `plugins/examples/hello-world/README.md`: 説明

#### 2.2 Editor Extensionサンプル（推定: 2時間）

**目的**: エディタ拡張の実装例

**実装内容**:

- [ ] `plugins/examples/editor-extension/`: エディタ拡張サンプル
  - [ ] カスタムマーク（ハイライト）の実装
  - [ ] カスタムノード（ブロック）の実装
  - [ ] エディタコマンドの実行例
  - [ ] コンテンツ操作の例

**実装ファイル**:
- `plugins/examples/editor-extension/index.ts`: プラグインコード
- `plugins/examples/editor-extension/plugin.json`: マニフェスト
- `plugins/examples/editor-extension/README.md`: 説明

#### 2.3 AI Extensionサンプル（推定: 2時間）

**目的**: AI拡張の実装例

**実装内容**:

- [ ] `plugins/examples/ai-extension/`: AI拡張サンプル
  - [ ] カスタム問題生成器の実装
  - [ ] カスタムプロンプトテンプレートの実装
  - [ ] コンテンツアナライザーの実装

**実装ファイル**:
- `plugins/examples/ai-extension/index.ts`: プラグインコード
- `plugins/examples/ai-extension/plugin.json`: マニフェスト
- `plugins/examples/ai-extension/README.md`: 説明

#### 2.4 UI Extensionサンプル（推定: 2時間）

**目的**: UI拡張の実装例

**実装内容**:

- [ ] `plugins/examples/ui-extension/`: UI拡張サンプル
  - [ ] Widget登録の実装例
  - [ ] Page登録の実装例
  - [ ] Sidebar Panel登録の実装例

**実装ファイル**:
- `plugins/examples/ui-extension/index.ts`: プラグインコード
- `plugins/examples/ui-extension/plugin.json`: マニフェスト
- `plugins/examples/ui-extension/README.md`: 説明

#### 2.5 Data Processor Extensionサンプル（推定: 2時間）

**目的**: データ処理拡張の実装例

**実装内容**:

- [ ] `plugins/examples/data-processor-extension/`: データ処理拡張サンプル
  - [ ] Importerの実装例（Markdownインポート）
  - [ ] Exporterの実装例（JSONエクスポート）
  - [ ] Transformerの実装例（データ変換）

**実装ファイル**:
- `plugins/examples/data-processor-extension/index.ts`: プラグインコード
- `plugins/examples/data-processor-extension/plugin.json`: マニフェスト
- `plugins/examples/data-processor-extension/README.md`: 説明

#### 2.6 Integration Extensionサンプル（推定: 2時間）

**目的**: 統合拡張の実装例

**実装内容**:

- [ ] `plugins/examples/integration-extension/`: 統合拡張サンプル
  - [ ] OAuth連携の実装例（GitHub OAuth）
  - [ ] Webhookの実装例（Slack通知）
  - [ ] External API呼び出しの実装例（天気API）

**実装ファイル**:
- `plugins/examples/integration-extension/index.ts`: プラグインコード
- `plugins/examples/integration-extension/plugin.json`: マニフェスト
- `plugins/examples/integration-extension/README.md`: 説明

---

### 3. ドキュメント強化（推定: 8時間）

#### 3.1 プラグイン開発チュートリアル（推定: 3時間）

**目的**: プラグイン開発の初心者向けチュートリアル

**実装内容**:

- [ ] `docs/guides/plugin-development/tutorial-getting-started.md`: はじめに
  - [ ] プラグインシステムの概要
  - [ ] 開発環境のセットアップ
  - [ ] 最初のプラグイン作成

- [ ] `docs/guides/plugin-development/tutorial-editor-extension.md`: エディタ拡張チュートリアル
  - [ ] カスタムマークの作成
  - [ ] カスタムノードの作成
  - [ ] エディタコマンドの実装

- [ ] `docs/guides/plugin-development/tutorial-ai-extension.md`: AI拡張チュートリアル
  - [ ] 問題生成器の作成
  - [ ] プロンプトテンプレートの作成

- [ ] `docs/guides/plugin-development/tutorial-ui-extension.md`: UI拡張チュートリアル
  - [ ] Widgetの作成
  - [ ] Pageの作成

#### 3.2 APIリファレンスの充実（推定: 2時間）

**目的**: プラグインAPIの詳細なリファレンス

**実装内容**:

- [ ] `docs/guides/plugin-development/api-reference.md`: APIリファレンス
  - [ ] App API
  - [ ] Storage API
  - [ ] Notifications API
  - [ ] UI API
  - [ ] Editor API
  - [ ] AI API
  - [ ] Data API
  - [ ] Integration API

- [ ] 各APIの詳細な説明
  - [ ] メソッドシグネチャ
  - [ ] パラメータの説明
  - [ ] 戻り値の説明
  - [ ] 使用例

#### 3.3 ベストプラクティスガイド（推定: 2時間）

**目的**: プラグイン開発のベストプラクティスをまとめたガイド

**実装内容**:

- [ ] `docs/guides/plugin-development/best-practices.md`: ベストプラクティス
  - [ ] セキュリティのベストプラクティス
  - [ ] パフォーマンスのベストプラクティス
  - [ ] エラーハンドリングのベストプラクティス
  - [ ] テストのベストプラクティス
  - [ ] コード品質のベストプラクティス

#### 3.4 トラブルシューティングガイド（推定: 1時間）

**目的**: よくある問題と解決方法をまとめたガイド

**実装内容**:

- [ ] `docs/guides/plugin-development/troubleshooting.md`: トラブルシューティング
  - [ ] よくあるエラーと解決方法
  - [ ] デバッグ方法
  - [ ] パフォーマンス問題の解決
  - [ ] セキュリティ問題の解決

---

### 4. テストと品質保証（推定: 8時間）

#### 4.1 プラグイン用テストフレームワーク（推定: 3時間）

**目的**: プラグイン開発者向けのテストフレームワーク

**実装内容**:

- [ ] `lib/plugins/testing/plugin-test-utils.ts`: テストユーティリティ
  - [ ] プラグインAPIのモック
  - [ ] プラグインのアクティベーション/デアクティベーション
  - [ ] テスト用のヘルパー関数

- [ ] `lib/plugins/testing/plugin-test-runner.ts`: テストランナー
  - [ ] プラグインのテスト実行
  - [ ] カバレッジレポート生成

**実装ファイル**:
- `lib/plugins/testing/plugin-test-utils.ts`: テストユーティリティ
- `lib/plugins/testing/plugin-test-runner.ts`: テストランナー

#### 4.2 コード品質チェックツール（推定: 2時間）

**目的**: プラグインコードの品質をチェックするツール

**実装内容**:

- [ ] `scripts/plugins/lint-plugin.ts`: リントツール
  - [ ] ESLint/Biomeによるコード品質チェック
  - [ ] プラグイン固有のルール

- [ ] `scripts/plugins/validate-plugin.ts`: 検証ツール
  - [ ] マニフェスト検証
  - [ ] 型チェック
  - [ ] 依存関係チェック

**実装ファイル**:
- `scripts/plugins/lint-plugin.ts`: リントツール
- `scripts/plugins/validate-plugin.ts`: 検証ツール

#### 4.3 セキュリティチェックツール（推定: 2時間）

**目的**: プラグインコードのセキュリティをチェックするツール

**実装内容**:

- [ ] `scripts/plugins/security-check.ts`: セキュリティチェックツール
  - [ ] 危険なAPIの使用チェック
  - [ ] サンドボックス違反の検出
  - [ ] 依存関係の脆弱性チェック

**実装ファイル**:
- `scripts/plugins/security-check.ts`: セキュリティチェック

#### 4.4 パフォーマンステストツール（推定: 1時間）

**目的**: プラグインのパフォーマンスを測定するツール

**実装内容**:

- [ ] `scripts/plugins/benchmark-plugin.ts`: ベンチマークツール
  - [ ] プラグインの起動時間測定
  - [ ] API呼び出しのパフォーマンス測定
  - [ ] メモリ使用量測定

**実装ファイル**:
- `scripts/plugins/benchmark-plugin.ts`: ベンチマークツール

---

## 推定時間

### 各項目の推定時間

| 項目 | 推定時間 |
|------|---------|
| プラグイン開発ツール | 16時間 |
| - CLIツール | 6時間 |
| - テンプレート | 4時間 |
| - ローカル開発環境 | 2時間 |
| - デバッグツール | 2時間 |
| - 型定義生成 | 2時間 |
| サンプルプラグイン作成 | 12時間 |
| - Hello World | 1時間 |
| - Editor Extension | 2時間 |
| - AI Extension | 2時間 |
| - UI Extension | 2時間 |
| - Data Processor Extension | 2時間 |
| - Integration Extension | 2時間 |
| ドキュメント強化 | 8時間 |
| - チュートリアル | 3時間 |
| - APIリファレンス | 2時間 |
| - ベストプラクティス | 2時間 |
| - トラブルシューティング | 1時間 |
| テストと品質保証 | 8時間 |
| - テストフレームワーク | 3時間 |
| - コード品質チェック | 2時間 |
| - セキュリティチェック | 2時間 |
| - パフォーマンステスト | 1時間 |
| **合計** | **44時間** |

---

## 完了条件

- [ ] すべての開発ツールが実装され、動作確認済み
- [ ] すべてのサンプルプラグインが実装され、動作確認済み
- [ ] ドキュメントが完備され、検証済み
- [ ] テストフレームワークと品質チェックツールが実装され、動作確認済み
- [ ] プラグイン開発ガイドに各ツールとサンプルプラグインの使い方が記載されている

---

## 品質基準

各ツールとサンプルプラグインは以下を満たすこと：

- [ ] テストカバレッジ70%以上
- [ ] エラーハンドリング適切
- [ ] ドキュメント完備
- [ ] コードコメント充実

---

## 関連ドキュメント

- [実装状況まとめ](./implementation-status.md)
- [プラグイン開発ガイド](../../guides/plugin-development.md)
- [Issue #109 - Phase 4: Plugin Development Tools & Sample Plugins](https://github.com/otomatty/for-all-learners/issues/109)

---

## 実装順序

1. **Phase 4.1**: プラグイン開発ツール（CLI、テンプレート）
2. **Phase 4.2**: サンプルプラグイン作成（Hello World、Editor Extension）
3. **Phase 4.3**: ローカル開発環境とデバッグツール
4. **Phase 4.4**: 残りのサンプルプラグイン
5. **Phase 4.5**: ドキュメント強化
6. **Phase 4.6**: テストと品質保証ツール

---

## 変更履歴

| 日付 | 変更内容 | 担当 |
|------|----------|------|
| 2025-11-05 | Phase 4実装計画作成 | AI Agent |

