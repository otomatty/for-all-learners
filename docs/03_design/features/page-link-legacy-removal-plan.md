# PageLink Legacy Decoration 段階的削除計画

## 現状

- Decoration ベース `pageLink` Extension は Mark 化移行後も以下を保持:
  - bracketPlugin / suggestionPlugin / previewPlugin / existencePlugin
  - 装飾生成時に既に `pageLinkMark` が付与されている箇所はスキップ
- Mark 実装側で: 変換(InputRule), 非同期解決, 位置インデックス, metrics, refresh コマンド完備
- デフォルトで `useLegacyLinkDecorations=false`

## ゴール

1. 装飾コードを段階的に縮小し最終的に撤去
2. 副作用 (hover preview や suggestion) を Mark ベースに再実装
3. API / コマンド / スタイルを Mark 単体で完結

## 段階

### Phase A: 機能同等性確保

- [x] Mark 変換 / 解決 / missing 表示
- [x] 状態スタイル (pending / exists / missing)
- [x] メトリクス & refresh コマンド
- [x] Hover preview を Mark 属性 (pageId or pageTitle) 参照に差し替え (新 `page-link-preview-mark-plugin.ts`)
- [x] suggestionPlugin が Mark 変換フローで `[title]` を挿入後 InputRule による Mark 化に委譲 (暗黙的に達成)

### Phase B: Legacy 依存縮小

- [x] existencePlugin の判定ロジックを Mark 版へポーティング / 不要化 (state 属性に統一) → コード削除完了
- [x] previewPlugin を Mark 版に切替 → 旧実装コード完全削除済み
- [ ] bracketPlugin が単に InputRule を補完するなら撤去 (重複回避)

### Phase C: 安全サンプリング

- [ ] 本番で legacy OFF 稼働 (既にデフォルト OFF) を一定期間観測
- [ ] エラー/metrics (missing 比率, 平均解決時間) を収集し閾値内を確認

### Phase D: コード除去

- [ ] page-link.ts から decoration 生成ループ削除
- [ ] 未使用 plugin key / 定数削除
- [ ] ドキュメント & CHANGELOG 更新 (破壊的変更が無いことを明示)

## 影響分析

| 項目                                   | 影響                                                       | Mitigation                              |
| -------------------------------------- | ---------------------------------------------------------- | --------------------------------------- |
| 既存コンテンツ内のブラケット生テキスト | InputRule の適用時のみ Mark 化。履歴差分未適用分が残りうる | refreshPageLinkMarks + 手動再保存ガイド |
| Preview 機能                           | Legacy previewPlugin に依存                                | Mark 属性対応版へ移植                   |
| 存在チェック                           | state='pending' 解決後 exists/missing に収束               | existencePlugin を廃止                  |

## 追加タスク候補

- Batched searchPages API (複数タイトルまとめ解決)
- Post-resolve キャッシュ (同一タイトル短期再入力高速化)
- createPageFromLink を実行時に Editor 側で新規ページタブ開く UX
- existencePlugin 除去 → state 属性ベースに統一 (実施済み)
- Decoration 生成ループ削除 (bracket -> Mark 移行完了後)
- bracketPlugin 依存解除 (InputRule のみで自動閉じ補完が十分か検証)

## 完了条件 (Definition of Done)

- `page-link.ts` から Decorations 由来 DOM 生成コードが完全削除 (未)
- Hover preview / suggestion / resolve が Mark のみで動作 (preview 達成 / existence & decoration 生成残)
- metrics で missing 比率 < 5% (サンプル >= 200) を観測
- README / Docs 更新済み (本ドキュメント改訂継続)
