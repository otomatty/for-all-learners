# プラグインシステム セキュリティ機能

## 概要

このドキュメントでは、プラグインシステムに実装されているセキュリティ機能について詳細に説明します。これらの機能は、Issue #96（Plugin System Security Enhancement）の一環として実装されました。

**関連Issue**: [Issue #96 - Plugin System Security Enhancement](https://github.com/otomatty/for-all-learners/issues/96)

---

## セキュリティ機能一覧

### ✅ Content Security Policy (CSP)

**実装状況**: 完了  
**重要度**: 高

#### 概要

Content Security Policy (CSP) は、XSS攻撃やコードインジェクション攻撃を防ぐための重要なセキュリティ機能です。

#### 実装内容

- **CSPヘッダーの設定** (`middleware.ts`)
  - すべてのリクエストに対してCSPヘッダーを自動設定
  - リクエストごとに新しいnonceを生成（将来のカスタムスクリプト用）
  
- **CSPディレクティブ** (`lib/utils/csp.ts`)
  - `script-src`: `'self' 'unsafe-inline' blob:` (Next.js互換性のため)
  - `style-src`: `'self' 'unsafe-inline' https://cdn.jsdelivr.net`
  - `worker-src`: `'self' blob:` (プラグインWeb Worker用)
  - `connect-src`: `'self' https://*.supabase.co https://*.supabase.io wss://*.supabase.co`
  - `font-src`: `'self' data: https://fonts.gstatic.com` (Google Fonts用)
  - `img-src`: `'self' data: https: blob:`
  - `object-src`: `'none'` (Flash/Java防止)
  - `frame-ancestors`: `'none'` (クリックジャッキング防止)

- **その他のセキュリティヘッダー**
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`

- **CSP違反レポート収集** (`app/api/csp/report/route.ts`)
  - CSP違反が発生した場合、自動的にレポートを収集
  - セキュリティ監視に活用

#### 技術的詳細

**Next.js互換性の考慮**:
- Next.jsが生成するインラインスクリプト/スタイルにはnonceが付かないため、`unsafe-inline`を許可
- CSPの仕様上、nonceと`unsafe-inline`を同時に指定すると`unsafe-inline`が無視されるため、Next.js互換性を優先して`unsafe-inline`のみを使用
- 開発環境では`unsafe-eval`も許可（デバッグ用）

**実装ファイル**:
- `middleware.ts`: CSPヘッダー設定
- `lib/utils/csp.ts`: Nonce生成とCSPヘッダー構築
- `app/api/csp/report/route.ts`: CSP違反レポート収集エンドポイント

**テスト**: ✅ 12テストケース全てパス
- `lib/utils/__tests__/csp.test.ts`: 8テスト
- `app/api/csp/report/__tests__/route.test.ts`: 4テスト

---

### ✅ サンドボックス分離

**実装状況**: 完了  
**重要度**: 高

#### 概要

プラグインコードは、Web Workerによる完全な分離環境で実行されます。これにより、プラグインがメインスレッドや他のプラグインに影響を与えることができません。

#### 実装内容

- **Web Workerによる分離** (`lib/plugins/plugin-loader/worker-manager.ts`)
  - 各プラグインは独立したWeb Workerで実行
  - Worker間の通信はメッセージパッシングによる
  
- **Worker管理**
  - プラグインの起動時にWorkerを作成
  - プラグインの終了時にWorkerを適切に破棄
  - Workerのライフサイクル管理

#### 実装ファイル

- `lib/plugins/plugin-loader/worker-manager.ts`: Worker管理
- `lib/plugins/sandbox-worker.ts`: Worker内でのプラグインコード実行

---

### ✅ コード実行の安全性

**実装状況**: 完了  
**重要度**: 高

#### 概要

プラグインコードの実行方法をセキュアな方法に変更しました。`eval()`や`new Function()`の使用を完全に廃止し、Blob URL + `importScripts`アプローチに変更しました。

#### 実装内容

**変更前の問題**:
- `eval()`や`new Function()`を使用していた
- これらはXSS攻撃のリスクがある

**変更後の実装**:
- ✅ `eval()`と`new Function()`の使用を完全に廃止
- ✅ Blob URL + `importScripts`アプローチに変更
- ✅ プラグインコードをIIFEでラップしてスコープを分離

#### 技術的詳細

**実行フロー**:
1. プラグインコードを取得
2. IIFEでラップしてスコープを分離
3. Blob URLを作成
4. Web Worker内で`importScripts`を使用してコードを読み込み
5. 実行

**実装ファイル**:
- `lib/plugins/sandbox-worker.ts`: Worker内でのプラグインコード実行
- `lib/plugins/plugin-loader/sandbox-worker-code.ts`: Workerコード生成
- `lib/plugins/plugin-loader/plugin-loader.ts`: メインローダー

**セキュリティ改善**:
- プラグインコードはBlob URL経由で`importScripts`により読み込まれる
- `eval`や`new Function()`による直接的なコード実行を回避
- IIFEによりプラグインのスコープを完全に分離

---

### ✅ レート制限

**実装状況**: 完了  
**重要度**: 中

#### 概要

プラグインによるAPI呼び出し、ストレージ使用、CPU使用を制限し、リソースの濫用を防ぎます。

#### 実装内容

**制限項目**:
- **API呼び出しレート制限**: プラグインごとのAPI呼び出し回数を制限
- **ストレージ使用レート制限**: ストレージへの書き込み頻度を制限
- **CPU使用レート制限**: プラグインの実行時間を制限

**デフォルト制限値**:
- API呼び出し: 100回/分（プラグインごと）
- ストレージ書き込み: 50回/分（プラグインごと）
- CPU使用: 実行時間の監視（詳細は実行監視セクション参照）

#### 実装ファイル

- `lib/plugins/plugin-rate-limiter.ts`: レート制限ロジック

**動作**:
- プラグインがAPIを呼び出す際、レート制限をチェック
- 制限を超えた場合は、エラーレスポンスを返し、セキュリティ監査ログに記録

---

### ✅ 実行監視

**実装状況**: 完了  
**重要度**: 中

#### 概要

プラグインの実行時間を監視し、タイムアウトしたプラグインを自動的に終了します。

#### 実装内容

**監視項目**:
- プラグインの実行時間
- プラグインのアイドル時間
- 最大実行時間（タイムアウト）

**デフォルト設定**:
- 最大実行時間: 5分（300秒）
- アイドルタイムアウト: 30分（1800秒）

**動作**:
- プラグインが起動すると、実行監視を開始
- 定期的にプラグインの実行時間をチェック
- 最大実行時間を超えた場合、プラグインを強制終了
- タイムアウト時は、セキュリティ監査ログに記録

#### 実装ファイル

- `lib/plugins/plugin-execution-monitor.ts`: 実行監視ロジック

---

### ✅ セキュリティ監査ログ

**実装状況**: 完了  
**重要度**: 高

#### 概要

すべてのセキュリティ関連イベントをログに記録し、管理者が監視・分析できるようにします。

#### 実装内容

**記録されるイベント**:
- API呼び出し (`api_call`)
- API呼び出し失敗 (`api_call_failed`)
- レート制限違反 (`rate_limit_violation`)
- 実行タイムアウト (`execution_timeout`)
- ストレージアクセス (`storage_access`)
- ストレージクォータ超過 (`storage_quota_exceeded`)
- プラグインエラー (`plugin_error`)
- プラグイン終了 (`plugin_terminated`)
- 不正アクセス試行 (`unauthorized_access_attempt`)

**重要度レベル**:
- `low`: 低重要度（通常の操作）
- `medium`: 中重要度（注意が必要）
- `high`: 高重要度（即座に対応が必要）
- `critical`: 緊急（即座に対応が必要）

**ログデータ構造**:
- プラグインID
- ユーザーID（利用可能な場合）
- イベントタイプ
- 重要度
- イベントデータ（詳細情報）
- コンテキスト（追加情報）
- タイムスタンプ

#### 実装ファイル

- `lib/plugins/plugin-security-audit-logger.ts`: 監査ログ記録
- `app/_actions/plugin-security-audit-logs.ts`: ログ取得API
- `app/admin/plugins/security-audit/`: 管理者向けUI

**管理者向けUI機能**:
- ログ一覧表示（ページネーション対応）
- フィルタリング（プラグインID、ユーザーID、イベントタイプ、重要度）
- 検索機能
- 統計情報表示（総イベント数、緊急イベント数など）
- ソート機能

**データベーススキーマ**:
- `plugin_security_audit_logs`テーブル
  - `id`: UUID
  - `plugin_id`: プラグインID
  - `user_id`: ユーザーID（nullable）
  - `event_type`: イベントタイプ
  - `severity`: 重要度
  - `event_data`: イベントデータ（JSON）
  - `context`: コンテキスト（JSON）
  - `created_at`: タイムスタンプ

---

### ✅ コード署名・検証

**実装状況**: 完了  
**重要度**: 高

#### 概要

プラグインコードの真正性を保証するため、コード署名機能を実装しました。署名なしプラグインまたは無効な署名のプラグインは実行を拒否されます。

#### 実装内容

**署名アルゴリズム**:
- **Ed25519**: 推奨（高速・安全）
- **RSA**: 互換性のためサポート

**署名プロセス**:
1. プラグインコードのハッシュを計算（SHA-256）
2. 署名データを構築（pluginId, version, codeHash, timestamp, author）
3. 秘密鍵で署名を生成
4. 署名データをデータベースに保存

**検証プロセス**:
1. プラグイン読み込み時に署名を取得
2. 現在のプラグインコードのハッシュを計算
3. 署名データとハッシュを比較
4. 公開鍵で署名を検証
5. 検証失敗時は読み込みを拒否

**管理者向け機能**:
- 署名状態の表示
- 署名生成（Server Action経由）
- 鍵ペア生成（Ed25519/RSA）
- 署名検証ログの表示

#### 実装ファイル

- `lib/plugins/plugin-signature/signer.ts`: 署名生成ロジック
- `lib/plugins/plugin-signature/verifier.ts`: 署名検証ロジック
- `lib/plugins/plugin-signature/key-manager.ts`: 鍵ペア生成・管理
- `lib/plugins/plugin-signature/types.ts`: 型定義
- `database/migrations/20251105_03_plugin_signatures.sql`: データベーススキーマ
- `app/_actions/plugin-signatures.ts`: Server Actions（署名生成・鍵ペア生成）
- `app/admin/plugins/signatures/`: 管理者向けUI

**データベーススキーマ**:
- `plugin_signatures`テーブル
  - `id`: UUID
  - `plugin_id`: プラグインID
  - `version`: プラグインバージョン
  - `algorithm`: 署名アルゴリズム（ed25519/rsa）
  - `public_key`: 公開鍵（Base64）
  - `signature`: 署名（Base64）
  - `code_hash`: コードハッシュ（SHA-256）
  - `signed_by`: 署名者（ユーザーID）
  - `signed_at`: 署名日時
  - `created_at`: 作成日時

**プラグインローダーへの統合**:
- プラグイン読み込み時に署名検証を実行
- 検証失敗時は読み込みを拒否し、セキュリティ監査ログに記録

---

### ✅ 異常検知アラート

**実装状況**: 完了  
**重要度**: 高

#### 概要

セキュリティ監査ログを分析し、異常パターンを自動検知してアラートを生成します。

#### 実装内容

**検知される異常パターン**:

1. **レート制限スパイク** (`rate_limit_spike`)
   - 5分間で10件以上のレート制限違反
   - 重要度: 高

2. **署名検証失敗スパイク** (`signature_failure_spike`)
   - 10分間で5件以上の署名検証失敗
   - 重要度: 緊急

3. **実行タイムアウトスパイク** (`execution_timeout_spike`)
   - 15分間で5件以上の実行タイムアウト
   - 重要度: 高

4. **ストレージクォータスパイク** (`storage_quota_spike`)
   - 10分間で3件以上のストレージクォータ超過
   - 重要度: 中

5. **不正アクセススパイク** (`unauthorized_access_spike`)
   - 5分間で3件以上の不正アクセス試行
   - 重要度: 緊急

6. **API呼び出し異常** (`api_call_anomaly`)
   - 1分間で100件以上のAPI呼び出し（プラグインごと）
   - 重要度: 中

7. **プラグインエラースパイク** (`plugin_error_spike`)
   - 10分間で10件以上のプラグインエラー
   - 重要度: 高

8. **緊急重要度イベント** (`critical_severity_event`)
   - 緊急（critical）重要度のイベントが発生
   - 重要度: 緊急（即座に検知）

**検知アルゴリズム**:
- 時系列データ分析
- 閾値ベースの検知
- プラグインごとの集計
- 重複アラートの防止

#### 実装ファイル

- `lib/plugins/plugin-security-anomaly-detector.ts`: 異常検知ロジック
- `database/migrations/20251105_04_plugin_security_alerts.sql`: データベーススキーマ
- `app/_actions/plugin-security-alerts.ts`: Server Actions（アラート取得・ステータス更新・手動検知実行）
- `app/admin/plugins/security-alerts/`: 管理者向けUI

**管理者向けUI機能**:
- アラート一覧表示（ページネーション対応）
- フィルタリング（ステータス、重要度、アラートタイプ、プラグインID）
- 検索機能
- 統計情報表示（未対応アラート数、緊急・高重要度アラート数など）
- アラートステータス更新（未対応 → 対応中 → 解決済み）
- 手動検知実行機能

**データベーススキーマ**:
- `plugin_security_alerts`テーブル
  - `id`: UUID
  - `alert_type`: アラートタイプ
  - `severity`: 重要度
  - `status`: ステータス（open/acknowledged/resolved）
  - `plugin_id`: プラグインID（nullable）
  - `user_id`: ユーザーID（nullable）
  - `title`: アラートタイトル
  - `description`: アラート説明
  - `context`: コンテキスト（JSON）
  - `detected_at`: 検知日時
  - `acknowledged_at`: 対応開始日時（nullable）
  - `resolved_at`: 解決日時（nullable）
  - `created_at`: 作成日時

**テスト**: ✅ 43テストケース全てパス
- `lib/plugins/__tests__/plugin-security-anomaly-detector.test.ts`: 異常検知ロジックのテスト
- `app/_actions/__tests__/plugin-security-alerts.test.ts`: Server Actionsのテスト

---

## セキュリティアーキテクチャ

### 多層防御

プラグインシステムは、以下の多層防御アプローチを採用しています：

1. **実行前の防御**:
   - コード署名・検証（改ざん防止）
   - CSP（XSS攻撃防止）

2. **実行時の防御**:
   - サンドボックス分離（Web Worker）
   - レート制限（リソース濫用防止）
   - 実行監視（タイムアウト処理）

3. **実行後の監視**:
   - セキュリティ監査ログ（すべてのイベント記録）
   - 異常検知アラート（自動検知・通知）

### セキュリティイベントフロー

```
プラグイン実行
    ↓
レート制限チェック
    ↓
実行監視開始
    ↓
コード署名検証
    ↓
Web Workerで実行
    ↓
セキュリティ監査ログ記録
    ↓
異常検知（定期的または手動）
    ↓
アラート生成（異常検出時）
```

---

## テスト状況

### 総合テスト結果

- **CSP関連**: ✅ 12テストケース全てパス
- **セキュリティ監査ログ**: ✅ 46テストケース全てパス
- **コード署名・検証**: ✅ テストケース実装済み
- **異常検知アラート**: ✅ 43テストケース全てパス

**合計**: ✅ 100+テストケース全てパス

---

## 運用ガイド

### 管理者向け操作

#### セキュリティ監査ログの確認

1. 管理者ページ → プラグイン → セキュリティ監査ログ
2. フィルターで条件を設定（プラグインID、イベントタイプ、重要度など）
3. ログを確認し、異常なパターンを検出

#### アラートの対応

1. 管理者ページ → プラグイン → セキュリティアラート
2. 未対応アラートを確認
3. アラートをクリックして詳細を確認
4. ステータスを更新（未対応 → 対応中 → 解決済み）

#### プラグインの署名

1. 管理者ページ → プラグイン → コード署名
2. 署名対象のプラグインを選択
3. 鍵ペアを生成（Ed25519推奨）
4. 署名を生成

#### 手動異常検知の実行

1. 管理者ページ → プラグイン → セキュリティアラート
2. 「異常検知を実行」ボタンをクリック
3. 検知結果を確認

### 開発者向け情報

#### CSP違反の対応

CSP違反が発生した場合：
1. ブラウザのコンソールでエラーを確認
2. `/api/csp/report`にレポートが送信される
3. 必要に応じてCSP設定を調整（`lib/utils/csp.ts`）

#### セキュリティ監査ログの記録

プラグイン開発時に新しいセキュリティイベントを記録する場合：
1. `lib/plugins/plugin-security-audit-logger.ts`に新しいメソッドを追加
2. 適切な重要度を設定
3. イベントデータを構造化

---

## 今後の改善予定

### 検討中の機能

1. **自動アラート対応**:
   - 特定のアラートタイプに対して自動対応アクションを実行
   - 例: レート制限スパイク検出時にプラグインを自動無効化

2. **機械学習ベースの異常検知**:
   - 時系列データから学習したモデルによる異常検知
   - より正確な異常パターンの検出

3. **リアルタイム監視ダッシュボード**:
   - WebSocketによるリアルタイム監視
   - セキュリティイベントのリアルタイム表示

4. **セキュリティスコアリング**:
   - プラグインごとのセキュリティスコアを計算
   - スコアに基づいた自動アクション

---

## 関連ドキュメント

- [実装状況](./implementation-status.md)
- [コード署名実装計画](./plugin-code-signing.md)
- [プラグイン開発ガイド](../guides/plugin-development.md)
- [Issue #96 - Plugin System Security Enhancement](https://github.com/otomatty/for-all-learners/issues/96)

---

## 変更履歴

| 日付 | 変更内容 | 担当 |
|------|----------|------|
| 2025-11-05 | セキュリティ機能ドキュメント作成 | AI Agent |
| 2025-11-05 | CSP設定をNext.js互換性のため調整（nonce削除、unsafe-inline使用） | AI Agent |

