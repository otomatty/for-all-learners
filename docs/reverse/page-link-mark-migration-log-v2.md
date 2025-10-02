# PageLink Mark 移行 作業ログ (v2)

更新日: 2025-09-22
ブランチ: `fix/preserve-bold-in-links`

## 追加分概要 (v1 → v2 差分)

| 項目             | v1 状態                  | v2 追加/変更                          | 目的                         |
| ---------------- | ------------------------ | ------------------------------------- | ---------------------------- |
| Link 状態管理    | 未導入                   | `state` (pending/exists/missing) 属性 | UX 明確化 / 後続 UI 条件分岐 |
| 0 件結果処理     | exact 不在時は未更新     | missing へ即更新 (`exists:false`)     | フィードバック高速化         |
| 並び順           | `searchPages` ソート無し | `updated_at` 昇順                     | 安定した候補順序             |
| 非同期安全条件   | plId + href + title      | plId + title + state=pending          | 誤更新更なる抑止             |
| レガシー装飾制御 | なし                     | `useLegacyLinkDecorations` オプション | 段階的廃止戦略               |

## 時系列ログ (v2 追加フェーズ)

1. `PageLinkMark` に `state` / `exists` の三相モデル導入
2. InputRule 生成時: 内部リンク → pending / 外部リンク → exists
3. 非同期検索: exact ヒット → exists update / ヒットなし → missing update
4. `searchPages` に `order('updated_at', { ascending: true })` 追加
5. Tag サジェストは `searchPages` 再利用のため自動で新順序反映
6. レガシー装飾トグル (`useLegacyLinkDecorations`) 追加し存在チェック Decoration を外せる構造

## 現在の構造

```
[User Input '[Title]']
  → InputRule: remove brackets, insert text, add Mark(pageLinkMark: state=pending, href='#')
    → async searchPages(title)
       ├ exact match: update Mark (href=/pages/{id}, pageId, state=exists, exists=true)
       └ no match: update Mark (href='#', state=missing, exists=false)
```

## Mark 属性仕様 (v2)

| 属性      | 型        | 説明                     | 例                              | 更新タイミング     |
| --------- | --------- | ------------------------ | ------------------------------- | ------------------ | --------- | ------------------ |
| href      | string    | a タグ遷移先             | `/pages/xxx` / `#` / `https://` | 生成 / 解決後      |
| pageId    | string?   | 内部ページ ID            | `c1f...`                        | 解決後             |
| pageTitle | string?   | ブラケット入力時タイトル | `Design Doc`                    | 生成時保持         |
| external  | boolean   | 外部リンクフラグ         | true                            | 生成時判定         |
| plId      | string    | 一意 ID                  | `lk9saf-abc123`                 | 生成時             |
| exists    | boolean?  | 存在結果                 | true/false                      | 解決後 or 外部即時 |
| state     | 'pending' | 'exists'                 | 'missing'                       | 表示状態           | `pending` | ライフサイクル全般 |

## ペンディング課題 / 次タスク候補

| 分類   | タスク                                         | 優先度 | メモ                        |
| ------ | ---------------------------------------------- | ------ | --------------------------- |
| UX     | pending/missing のスタイル適用 (CSS)           | 中     | 状態属性のみ実装済          |
| 機能   | 未存在マークで新規作成操作 (Cmd+Enter)         | 中     | Page 作成 API 必要          |
| 機能   | Link 編集ダイアログ / 更新コマンド             | 中     | updatePageLink コマンド追加 |
| 安定性 | async 更新範囲最適化 (局所探索)                | 低     | 現状全文走査                |
| 安定性 | 解決メトリクス計測 (遅延, 失敗率)              | 中     | デバッグ支援                |
| 移行   | legacy OFF デフォルト化 & existencePlugin 削除 | 高     | Mark 安定後                 |
| 互換   | 旧 JSON 正規化 (残存ブラケット →Mark)          | 低     | 後方互換整備                |
| 拡張   | 外部リンクアイコン表示                         | 低     | data-external 使用          |
| 拡張   | Escape 記法 (\[title]) サポート                | 低     | InputRule 拡張              |

## リスクアップデート

| リスク         | 現状対策                      | 追加案                     |
| -------------- | ----------------------------- | -------------------------- |
| 誤更新 (race)  | plId + state=pending チェック | from/to メモ化で O(1) 更新 |
| UI 不明瞭      | 状態属性のみ                  | CSS 速やか適用             |
| パフォーマンス | 小規模想定                    | 大規模時 index 導入        |

## 完了条件 (次マイルストーン)

- legacy デフォルト OFF で主要操作 (入力 / 変換 / サジェスト) 正常動作
- pending→exists/missing 遷移平均 < 400ms (キャッシュ外でも)
- missing への新規作成ショートカット実装 (任意)

## すぐ着手推奨 (順)

1. CSS スタイル適用 (pending/missing) 反映
2. legacy OFF テスト (Editor 設定切替)
3. 新規作成コマンド仕様策定 + 実装
4. updatePageLink / unsetPageLink UI

---

(この v2 ログは v1 を補完する増分版です)
