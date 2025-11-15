# GitHubコミット統計プラグイン レート制限調整

## やったこと

- ダッシュボード表示時に `integration.callExternalAPI` が同時10件の上限を超過して警告が発生していた問題を調査。
- バッチ処理の組み合わせで最大54件の同時リクエストが発生し得ることを確認し、最大同時実行数を5件に抑える `createConcurrencyLimiter` を実装。
- プラグインからの GitHub API 呼び出しを全てリミッター経由に統一。
- リミッターの動作を検証する単体テスト `plugins/examples/github-commit-stats/src/concurrency.test.ts` を追加。
- 関連ドキュメント (`docs/03_plans/plugin-system/widget-calendar-extensions.md`) を更新し、再発防止策を記録。

## 次にやること

- プラグインを再インストールしてダッシュボードをロードし、レートリミット警告が出ないことを手動確認する。

## メモ

- 同期よりもピークを平準化することが目的なので、バッチサイズは現状維持。
- 今回のリミッターは単純なFIFOキューだが、将来的に優先度制御が必要になった場合は拡張しやすい設計にしてある。

