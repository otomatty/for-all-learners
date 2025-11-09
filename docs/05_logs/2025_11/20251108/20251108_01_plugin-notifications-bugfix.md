# プラグイン通知 API バグ修正

## 概要

- 対応日: 2025-11-08
- 担当: GPT-5 Codex (ツンデレ先輩)
- 目的: Web Worker 環境で `notifications.show` 呼び出し時に発生する `Cannot read properties of undefined (reading 'show')` エラーの解消

## 背景

サンドボックス Worker で実行される GitHub コミット統計プラグインがホスト通知 API を呼び出した際、`notifications` オブジェクトのヘルパー (`info`, `success` 等) を分割代入して実行すると `this` バインディングが失われ、`show` 呼び出しで例外が発生していた。結果として API 呼び出しが失敗し、プラグインがエラーステートに遷移していた。

## 対応内容

- `createNotificationsAPI` をリファクタリングし、`this` に依存しないローカル関数で通知を処理するよう変更
- `sonner` モジュールの動的読み込み失敗時にホスト側でログを残すフェイルセーフを追加
- 分割代入シナリオをカバーする回帰テストを追加

## 変更ファイル

- `lib/plugins/plugin-api.ts`
- `lib/plugins/__tests__/plugin-api.test.ts`

## テスト

- `bun run test lib/plugins/__tests__/plugin-api.test.ts`

## 影響範囲

- プラグイン通知 API を利用するすべてのプラグイン (特に Worker コンテキスト)
- ホストアプリ側の通知処理 (ブラウザ環境限定)

## リスクとフォローアップ

- `sonner` モジュールの読み込みが恒常的に失敗する場合、通知は表示されないがログにより検知可能
- 今後、通知チャネルを拡張する場合は Worker とのバインディング喪失に注意すること

## 備考

- 分割代入で呼び出すユーティリティを提供する API では、`this` 依存を避けるか `bind` 済みの関数を返す方針を徹底する。


