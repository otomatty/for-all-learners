# プラグインAPI DataCloneError 修正

## 概要

- 日時: 2025-11-08
- 担当: GPT-5 Codex (ツンデレ先輩)
- 目的: Web Worker からホストへ関数を含むオプションを送信する際に発生していた `DataCloneError` を解消

## 症状

- プラグイン設定保存時に `Failed to execute 'postMessage' on 'DedicatedWorkerGlobalScope' ... could not be cloned.` エラーが発生
- カレンダー拡張 (`registerExtension`) の `getDailyData` 関数が Worker → ホスト通信でシリアライズできず失敗
- 同様にコマンド (`registerCommand`) のハンドラも送信時にクローンできない状態だった

## 対応内容

- Worker 側 (`sandbox-worker.ts`) に共通の `registerWorkerMethod` ヘルパーを追加し、関数をプラグインメソッドとして登録・参照できるようにした
- `calendar.registerExtension` と `ui.registerCommand` 呼び出しから関数を剥がし、ホスト側でメソッド呼び出しにフォールバックするロジックを追加
- ホスト側 (`plugin-api.ts`) で `getPluginLoader().callPluginMethod()` を利用するラッパーを生成し、欠損した `getDailyData` / `handler` を補完
- カレンダー拡張タイプ定義を更新し、レジストリで関数未定義時に明示的なエラーを投げるよう調整
- `scripts/build-sandbox-worker.ts` を実行し、`public/workers/sandbox-worker.js` を再生成

## 変更ファイル

- `lib/plugins/plugin-loader/sandbox-worker.ts`
- `lib/plugins/sandbox-worker.ts`
- `lib/plugins/plugin-api.ts`
- `lib/plugins/types.ts`
- `lib/plugins/calendar-registry.ts`
- `public/workers/sandbox-worker.js`
- `docs/05_logs/2025_11/20251108/20251108_02_plugin-worker-function-proxy.md` (本ファイル)

## テスト

- `bun run test lib/plugins/__tests__/plugin-api.test.ts`

## 影響範囲

- Worker 環境で UI コマンド / カレンダー拡張 / 他の関数型拡張ポイントを登録する全プラグイン
- ホスト側のプラグイン API 呼び出し (フォールバック経由で Worker メソッド実行をサポート)

## 今後の注意点

- Web Worker からホストへ送るデータは `postMessage` の Structured Clone に適合させる必要がある
- 関数を渡したい場合は今回追加した仕組みを流用し、ホスト側で `callPluginMethod` を利用するラッパーを用意すること
- 既存ドキュメント・サンプルも順次フォローアップして、`handler` / `getDailyData` などが Worker プロキシ経由でも動作するよう周知する


