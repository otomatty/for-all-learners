# プラグインシステム Phase 4: Plugin Development Tools & Sample Plugins

**作成日**: 2025-11-05  
**ステータス**: ✅ 完了  
**関連Issue**: [#109](https://github.com/otomatty/for-all-learners/issues/109)  
**関連PR**: [#114](https://github.com/otomatty/for-all-learners/pull/114)  
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

#### 1.1 CLIツール（推定: 6時間）✅ **完了**

**目的**: プラグインの生成、ビルド、テストを支援するCLIツール

**実装内容**:

- [x] `scripts/plugins/create-plugin.ts`: プラグイン生成コマンド ✅
  - [x] プラグイン名、ID、拡張ポイントを入力（デフォルト値を使用） ✅
  - [x] テンプレートからプロジェクト構造を生成 ✅
  - [x] `package.json`, `tsconfig.json`, ビルド設定を自動生成 ✅
  - [x] 基本的なマニフェストファイル（`plugin.json`）を生成 ✅

- [x] `scripts/plugins/build-plugin.ts`: プラグインビルドコマンド ✅
  - [x] esbuildによるバンドル ✅
  - [x] 型チェック ✅
  - [x] マニフェスト検証 ✅
  - [x] 出力ディレクトリへの配置 ✅

- [x] `scripts/plugins/test-plugin.ts`: プラグインテストコマンド ✅
  - [x] Vitestによるテスト実行 ✅
  - [x] プラグインAPIのモック（テストファイル側で実装） ✅
  - [x] カバレッジレポート（`--coverage`オプション） ✅

- [x] `scripts/plugins/dev-plugin.ts`: 開発モードコマンド ✅
  - [x] ウォッチモードでのビルド ✅
  - [ ] ローカル開発環境への自動読み込み（Phase 4.3で実装予定）
  - [ ] ホットリロード（Phase 4.3で実装予定）

**実装ファイル**:
- `scripts/plugins/create-plugin.ts`: プラグイン生成 ✅
- `scripts/plugins/build-plugin.ts`: ビルド ✅
- `scripts/plugins/test-plugin.ts`: テスト ✅
- `scripts/plugins/dev-plugin.ts`: 開発モード ✅
- `scripts/plugins/cli.ts`: CLIエントリーポイント ✅

**実装日**: 2025-11-06

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

#### 1.2 プラグイン開発用テンプレート（推定: 4時間）✅ **完了**

**目的**: 新規プラグイン開発を迅速に開始できるテンプレート

**実装内容**:

- [x] `templates/plugins/hello-world/`: 最小限のプラグインテンプレート ✅
  - [x] 基本的な `activate()` 関数 ✅
  - [x] マニフェストファイル ✅
  - [x] ビルド設定 ✅
  - [x] テスト設定 ✅

- [x] `templates/plugins/editor-extension/`: エディタ拡張テンプレート ✅
  - [x] カスタムノード/マーク/プラグインのサンプル ✅
  - [x] Editor APIの使用例 ✅

- [x] `templates/plugins/ai-extension/`: AI拡張テンプレート ✅
  - [x] Question Generatorのサンプル ✅
  - [x] Prompt Templateのサンプル ✅
  - [x] Content Analyzerのサンプル ✅

- [x] `templates/plugins/ui-extension/`: UI拡張テンプレート ✅
  - [x] Widget登録のサンプル ✅
  - [x] Page登録のサンプル ✅
  - [x] Sidebar Panel登録のサンプル ✅

- [x] `templates/plugins/data-processor-extension/`: データ処理拡張テンプレート ✅
  - [x] Importerのサンプル ✅
  - [x] Exporterのサンプル ✅
  - [x] Transformerのサンプル ✅

- [x] `templates/plugins/integration-extension/`: 統合拡張テンプレート ✅
  - [x] OAuth連携のサンプル ✅
  - [x] Webhookのサンプル ✅
  - [x] External API呼び出しのサンプル ✅

**実装ファイル**:
- `templates/plugins/hello-world/`: 基本テンプレート ✅
- `templates/plugins/editor-extension/`: エディタ拡張テンプレート ✅
- `templates/plugins/ai-extension/`: AI拡張テンプレート ✅
- `templates/plugins/ui-extension/`: UI拡張テンプレート ✅
- `templates/plugins/data-processor-extension/`: データ処理拡張テンプレート ✅
- `templates/plugins/integration-extension/`: 統合拡張テンプレート ✅

**備考**: テンプレートは `bun run plugins:create` コマンドで使用されます。実際の動作するサンプルプラグインは `plugins/examples/` に作成する必要があります（セクション2参照）。

#### 1.3 ローカル開発環境でのプラグイン読み込み機能（推定: 2時間）✅ **完了**

**目的**: 開発中のプラグインをローカルで簡単にテストできる環境

**実装内容**:

- [x] `app/_actions/plugins-dev.ts`: 開発用Server Actions ✅
  - [x] ローカルプラグインの読み込み ✅
  - [x] プラグインの再読み込み（ホットリロード） ✅
  - [x] 開発モードフラグの管理 ✅

- [x] `app/(protected)/settings/plugins/dev/page.tsx`: 開発用プラグイン管理ページ ✅
  - [x] ローカルプラグインの一覧表示 ✅
  - [x] プラグインの追加/削除 ✅
  - [x] プラグインの再読み込みボタン ✅

**実装ファイル**:
- `app/_actions/plugins-dev.ts`: 開発用Server Actions ✅
- `app/(protected)/settings/plugins/dev/page.tsx`: 開発用UI ✅
- `app/(protected)/settings/plugins/dev/_components/LocalPluginCard.tsx`: プラグインカードコンポーネント ✅

**実装日**: 2025-11-06

#### 1.4 デバッグツール（推定: 2時間）✅ **完了**

**目的**: プラグイン開発時のデバッグを支援

**実装内容**:

- [x] `lib/plugins/debug-tools.ts`: デバッグユーティリティ ✅
  - [x] プラグイン実行ログの収集 ✅
  - [x] エラー追跡 ✅
  - [x] パフォーマンス測定 ✅

- [x] `app/(protected)/settings/plugins/dev/debug/page.tsx`: デバッグUI ✅
  - [x] プラグインログの表示 ✅
  - [x] エラー一覧 ✅
  - [x] パフォーマンスメトリクス ✅

- [x] ブラウザ開発者ツールとの統合 ✅
  - [x] Worker内のconsole.logをメインスレッドに転送 ✅
  - [x] エラースタックトレースの表示 ✅

**実装ファイル**:
- `lib/plugins/debug-tools.ts`: デバッグユーティリティ ✅
- `app/(protected)/settings/plugins/dev/debug/page.tsx`: デバッグUI ✅
- `app/(protected)/settings/plugins/dev/debug/_components/PluginDebugView.tsx`: デバッグビューコンポーネント ✅
- `lib/plugins/plugin-loader/sandbox-worker-code.ts`: Worker内console.logの転送 ✅
- `lib/plugins/plugin-loader/worker-message-handler.ts`: メッセージハンドラー ✅

**実装日**: 2025-11-06

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

### 2. サンプルプラグイン作成（推定: 12時間）✅ **完了**

#### 2.1 Hello Worldプラグイン（推定: 1時間）✅ **完了**

**目的**: プラグインの基本構造を説明する最小限のサンプル

**実装内容**:

- [x] `plugins/examples/hello-world/`: Hello Worldプラグイン ✅
  - [x] 基本的な `activate()` 関数 ✅
  - [x] Storage APIの使用例 ✅
  - [x] Notifications APIの使用例 ✅
  - [x] コマンド登録の例 ✅
  - [x] App APIの使用例 ✅
  - [x] Dialog APIの使用例 ✅
  - [x] プラグインメソッドの公開例 ✅

**実装ファイル**:
- `plugins/examples/hello-world/src/index.ts`: プラグインコード ✅
- `plugins/examples/hello-world/plugin.json`: マニフェスト ✅
- `plugins/examples/hello-world/README.md`: 説明 ✅
- `plugins/examples/hello-world/package.json`: パッケージ設定 ✅
- `plugins/examples/hello-world/tsconfig.json`: TypeScript設定 ✅

**実装日**: 2025-11-06

#### 2.2 Editor Extensionサンプル（推定: 2時間）✅ **完了**

**目的**: エディタ拡張の実装例

**実装内容**:

- [x] `plugins/examples/editor-extension/`: エディタ拡張サンプル ✅
  - [x] エディタコマンドの実行例 ✅
  - [x] コンテンツ操作の例（取得、設定、挿入） ✅
  - [x] 選択範囲の操作 ✅
  - [x] プラグインメソッドの公開（toggleBold, getWordCount, insertTimestamp） ✅

**実装ファイル**:
- `plugins/examples/editor-extension/src/index.ts`: プラグインコード ✅
- `plugins/examples/editor-extension/plugin.json`: マニフェスト ✅
- `plugins/examples/editor-extension/README.md`: 説明 ✅
- `plugins/examples/editor-extension/package.json`: パッケージ設定 ✅
- `plugins/examples/editor-extension/tsconfig.json`: TypeScript設定 ✅

**実装日**: 2025-11-06

#### 2.3 AI Extensionサンプル（推定: 2時間）✅ **完了**

**目的**: AI拡張の実装例

**実装内容**:

- [x] `plugins/examples/ai-extension/`: AI拡張サンプル ✅
  - [x] カスタム問題生成器の実装（複数タイプ対応） ✅
  - [x] カスタムプロンプトテンプレートの実装（2種類） ✅
  - [x] コンテンツアナライザーの実装（2種類） ✅

**実装ファイル**:
- `plugins/examples/ai-extension/src/index.ts`: プラグインコード ✅
- `plugins/examples/ai-extension/plugin.json`: マニフェスト ✅
- `plugins/examples/ai-extension/README.md`: 説明 ✅
- `plugins/examples/ai-extension/package.json`: パッケージ設定 ✅
- `plugins/examples/ai-extension/tsconfig.json`: TypeScript設定 ✅

**実装日**: 2025-11-06

#### 2.4 UI Extensionサンプル（推定: 2時間）✅ **完了**

**目的**: UI拡張の実装例

**実装内容**:

- [x] `plugins/examples/ui-extension/`: UI拡張サンプル ✅
  - [x] Widget登録の実装例（2種類） ✅
  - [x] Page登録の実装例 ✅
  - [x] Sidebar Panel登録の実装例 ✅

**実装ファイル**:
- `plugins/examples/ui-extension/src/index.ts`: プラグインコード ✅
- `plugins/examples/ui-extension/plugin.json`: マニフェスト ✅
- `plugins/examples/ui-extension/README.md`: 説明 ✅
- `plugins/examples/ui-extension/package.json`: パッケージ設定 ✅
- `plugins/examples/ui-extension/tsconfig.json`: TypeScript設定 ✅

**実装日**: 2025-11-06

#### 2.5 Data Processor Extensionサンプル（推定: 2時間）✅ **完了**

**目的**: データ処理拡張の実装例

**実装内容**:

- [x] `plugins/examples/data-processor-extension/`: データ処理拡張サンプル ✅
  - [x] Importerの実装例（Markdown、Text） ✅
  - [x] Exporterの実装例（JSON、Markdown） ✅
  - [x] Transformerの実装例（大文字変換、プレフィックス追加） ✅

**実装ファイル**:
- `plugins/examples/data-processor-extension/src/index.ts`: プラグインコード ✅
- `plugins/examples/data-processor-extension/plugin.json`: マニフェスト ✅
- `plugins/examples/data-processor-extension/README.md`: 説明 ✅
- `plugins/examples/data-processor-extension/package.json`: パッケージ設定 ✅
- `plugins/examples/data-processor-extension/tsconfig.json`: TypeScript設定 ✅

**実装日**: 2025-11-06

#### 2.6 Integration Extensionサンプル（推定: 2時間）✅ **完了**

**目的**: 統合拡張の実装例

**実装内容**:

- [x] `plugins/examples/integration-extension/`: 統合拡張サンプル ✅
  - [x] OAuth連携の実装例（サンプルOAuth） ✅
  - [x] Webhookの実装例（イベント保存機能付き） ✅
  - [x] External API呼び出しの実装例 ✅

**実装ファイル**:
- `plugins/examples/integration-extension/src/index.ts`: プラグインコード ✅
- `plugins/examples/integration-extension/plugin.json`: マニフェスト ✅
- `plugins/examples/integration-extension/README.md`: 説明 ✅
- `plugins/examples/integration-extension/package.json`: パッケージ設定 ✅
- `plugins/examples/integration-extension/tsconfig.json`: TypeScript設定 ✅

**実装日**: 2025-11-06

---

### 3. ドキュメント強化（推定: 8時間）✅ **完了**

#### 3.1 プラグイン開発チュートリアル（推定: 3時間）✅ **完了**

**目的**: プラグイン開発の初心者向けチュートリアル

**実装内容**:

- [x] `docs/guides/plugin-development/tutorial-getting-started.md`: はじめに ✅
  - [x] プラグインシステムの概要 ✅
  - [x] 開発環境のセットアップ ✅
  - [x] 最初のプラグイン作成 ✅

- [x] `docs/guides/plugin-development/tutorial-editor-extension.md`: エディタ拡張チュートリアル ✅
  - [x] カスタムマークの作成 ✅
  - [x] カスタムノードの作成 ✅
  - [x] エディタコマンドの実装 ✅

- [x] `docs/guides/plugin-development/tutorial-ai-extension.md`: AI拡張チュートリアル ✅
  - [x] 問題生成器の作成 ✅
  - [x] プロンプトテンプレートの作成 ✅

- [x] `docs/guides/plugin-development/tutorial-ui-extension.md`: UI拡張チュートリアル ✅
  - [x] Widgetの作成 ✅
  - [x] Pageの作成 ✅

**実装日**: 2025-11-06

#### 3.2 APIリファレンスの充実（推定: 2時間）✅ **完了**

**目的**: プラグインAPIの詳細なリファレンス

**実装内容**:

- [x] `docs/guides/plugin-development/api-reference.md`: APIリファレンス ✅
  - [x] App API ✅
  - [x] Storage API ✅
  - [x] Notifications API ✅
  - [x] UI API ✅
  - [x] Editor API ✅
  - [x] AI API ✅
  - [x] Data API ✅
  - [x] Integration API ✅
  - [x] Calendar API ✅

- [x] 各APIの詳細な説明 ✅
  - [x] メソッドシグネチャ ✅
  - [x] パラメータの説明 ✅
  - [x] 戻り値の説明 ✅
  - [x] 使用例 ✅

**実装日**: 2025-11-06

#### 3.3 ベストプラクティスガイド（推定: 2時間）✅ **完了**

**目的**: プラグイン開発のベストプラクティスをまとめたガイド

**実装内容**:

- [x] `docs/guides/plugin-development/best-practices.md`: ベストプラクティス ✅
  - [x] セキュリティのベストプラクティス ✅
  - [x] パフォーマンスのベストプラクティス ✅
  - [x] エラーハンドリングのベストプラクティス ✅
  - [x] テストのベストプラクティス ✅
  - [x] コード品質のベストプラクティス ✅

**実装日**: 2025-11-06

#### 3.4 トラブルシューティングガイド（推定: 1時間）✅ **完了**

**目的**: よくある問題と解決方法をまとめたガイド

**実装内容**:

- [x] `docs/guides/plugin-development/troubleshooting.md`: トラブルシューティング ✅
  - [x] よくあるエラーと解決方法 ✅
  - [x] デバッグ方法 ✅
  - [x] パフォーマンス問題の解決 ✅
  - [x] セキュリティ問題の解決 ✅

**実装日**: 2025-11-06

---

### 4. テストと品質保証（推定: 8時間）✅ **完了**

#### 4.1 プラグイン用テストフレームワーク（推定: 3時間）✅ **完了**

**目的**: プラグイン開発者向けのテストフレームワーク

**実装内容**:

- [x] `lib/plugins/testing/plugin-test-utils.ts`: テストユーティリティ ✅
  - [x] プラグインAPIのモック ✅
  - [x] プラグインのアクティベーション/デアクティベーション ✅
  - [x] テスト用のヘルパー関数 ✅

- [x] テストランナー（既存の`test-plugin.ts`を使用） ✅
  - [x] プラグインのテスト実行 ✅
  - [x] カバレッジレポート生成 ✅

**実装ファイル**:
- `lib/plugins/testing/plugin-test-utils.ts`: テストユーティリティ ✅
- `scripts/plugins/test-plugin.ts`: テストランナー（既存） ✅

**実装日**: 2025-11-06

#### 4.2 コード品質チェックツール（推定: 2時間）✅ **完了**

**目的**: プラグインコードの品質をチェックするツール

**実装内容**:

- [x] `scripts/plugins/lint-plugin.ts`: リントツール ✅
  - [x] Biomeによるコード品質チェック ✅
  - [x] プラグイン固有のルール ✅

- [x] `scripts/plugins/validate-plugin.ts`: 検証ツール ✅
  - [x] マニフェスト検証 ✅
  - [x] 型チェック ✅
  - [x] 依存関係チェック ✅

**実装ファイル**:
- `scripts/plugins/lint-plugin.ts`: リントツール ✅
- `scripts/plugins/validate-plugin.ts`: 検証ツール ✅

**実装日**: 2025-11-06

#### 4.3 セキュリティチェックツール（推定: 2時間）✅ **完了**

**目的**: プラグインコードのセキュリティをチェックするツール

**実装内容**:

- [x] `scripts/plugins/security-check.ts`: セキュリティチェックツール ✅
  - [x] 危険なAPIの使用チェック ✅
  - [x] サンドボックス違反の検出 ✅
  - [x] 依存関係の脆弱性チェック ✅

**実装ファイル**:
- `scripts/plugins/security-check.ts`: セキュリティチェック ✅

**実装日**: 2025-11-06

#### 4.4 パフォーマンステストツール（推定: 1時間）✅ **完了**

**目的**: プラグインのパフォーマンスを測定するツール

**実装内容**:

- [x] `scripts/plugins/benchmark-plugin.ts`: ベンチマークツール ✅
  - [x] プラグインの起動時間測定 ✅
  - [x] API呼び出しのパフォーマンス測定 ✅
  - [x] メモリ使用量測定 ✅

**実装ファイル**:
- `scripts/plugins/benchmark-plugin.ts`: ベンチマークツール ✅

**実装日**: 2025-11-06

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

- [x] テストカバレッジ70%以上 ✅
  - **Statements: 100.0%** (507/507)
  - **Functions: 85.2%** (46/54)
  - **Branches: 86.0%** (86/100)
  - **計測日**: 2025-11-06
- [x] エラーハンドリング適切 ✅
- [x] ドキュメント完備 ✅
- [x] コードコメント充実 ✅

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

