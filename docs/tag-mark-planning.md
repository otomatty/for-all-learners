# TagMark 移行計画 / 現状整理 (WIP)

最終更新: 2025-09-23
関連ブランチ: `fix/preserve-bold-in-links`
オーナー: (記入)

## 1. ゴール概要

`#tag` 記法を PageLinkMark と同じ Mark モデルに統一し、入力確定と同時に:

1. `TagMark` を付与 (pending 状態)
2. 非同期で pages テーブルへタイトル検索 (`searchPages`) し存在判定
3. `exists` / `missing` の state へ更新
4. UI は `a[data-state]` の既存スタイルを流用

## 2. 現状 (2025-09-23)

| 項目                   | 状態   | 詳細                                                                     |
| ---------------------- | ------ | ------------------------------------------------------------------------ |
| #入力 → 候補サジェスト | 動作   | 既存 suggestion plugin (tag-link 拡張) が候補を表示 (ブラケットと同系統) |
| 候補確定後の挙動       | 不完全 | まだ即時 Mark 化せずプレーンテキスト or 旧処理                           |
| 既存ページ存在色分け   | 未実装 | #記法は PageLinkMark の state スタイル適用対象外                         |
| 非同期存在確認         | 未実装 | `#tag` 単体では DB 照合していない                                        |
| PageLinkMark インフラ  | 利用可 | state/pending 解決や searchPages 利用パターンが流用可能                  |

## 3. 課題整理

| 課題            | 説明                            | 解決アプローチ                    |
| --------------- | ------------------------------- | --------------------------------- |
| Mark 不在       | plain テキストのまま            | TagMark 導入 (属性 state/href...) |
| 重複ロジック    | PageLinkMark と類似処理が二重化 | 共通ユーティリティ抽出 (後続)     |
| 解決タイミング  | InputRule 後非同期処理無し      | 生成直後に `searchPages` 実行     |
| サジェスト確定  | 括弧挿入方式前提                | クリック/Enter 時に直接 Mark 付与 |
| 日本語/記号対応 | 現行パターン未確定              | v1: 英数\_-/ v2 で拡張            |

## 4. TagMark 仕様 (ドラフト)

| 属性      | 型        | 例                   | 説明                    |
| --------- | --------- | -------------------- | ----------------------- | --------- | ------------ |
| `href`    | string    | `#` or `/pages/uuid` | ページ解決前は `#` 固定 |
| `tagName` | string    | `foo_bar`            | 元テキスト (`#` なし)   |
| `tmId`    | string    | `tm-abc123`          | 一意 ID (位置追跡)      |
| `state`   | 'pending' | 'exists'             | 'missing'               | `pending` | 状態遷移管理 |
| `exists`  | boolean?  | true                 | 冗長 (将来削除可)       |
| `pageId`  | string?   | `uuid`               | exists 時に設定         |

### 4.1 InputRule (v1)

- 正規表現: `/\B#([A-Za-z0-9_\-]{1,50})$/`
- 変換: `#tag` のテキスト全体をそのまま (ハッシュ含め) Mark 化
- コード/インラインコード内ではスキップ

### 4.2 サジェスト確定ハンドラ

- 既存 suggestion plugin (tag-link) の確定イベントで:
  1. 範囲を `tag` の生テキストに置換 (先頭に `#` を含める)
  2. 即時 TagMark 付与 → pending
  3. `searchPages(tagNameNormalized)` で結果取得 → Mark 更新

### 4.3 存在判定

- `searchPages` 再利用 (PageLink と同一エンドポイント)
- タイトル完全一致 (ケースは現状 searchPages に準拠)
- underscore `_` → space 変換は当面無し（必要なら PageLink と統一）

## 5. 状態遷移

```
#tag 入力確定
  → TagMark(state=pending, href="#")
    → searchPages(tag)
      → ヒットあり: state=exists, href=/pages/:id, pageId=id
      → ヒットなし: state=missing, href="#"
```

## 6. 実装ステップ (v1)

| 順  | タスク               | 内容                                               | 備考                          |
| --- | -------------------- | -------------------------------------------------- | ----------------------------- |
| 1   | TagMark ファイル作成 | Mark 定義 + InputRule + 非同期解決                 | PageLinkMark 縮小版           |
| 2   | Editor 組込          | `usePageEditorLogic` へ追加                        | PageLinkMark の後 / legacy 前 |
| 3   | サジェスト改修       | tag-link suggestion の確定を Mark 生成へ           | 即時色分け準備                |
| 4   | CSS                  | `.tag-link-mark` (任意) or 既存 a[data-state] 流用 | 視覚差別化は後続              |
| 5   | 動作確認             | #入力 → 存在ページ → 青 / 未存在 → 赤              | pending→exists/missing        |
| 6   | ドキュメント         | migration summary に TagMark 節追記                | v1 完了宣言                   |

## 7. リスク & 緩和

| リスク           | 内容                        | 緩和                                 |
| ---------------- | --------------------------- | ------------------------------------ |
| searchPages 遅延 | pending 長期化              | キャッシュ or バッチ化 (後)          |
| 誤検出           | 文中 `C#` 等がタグ化        | 正規表現改善 (前後文脈判定)          |
| エスケープ       | `\#notTag` 未対応           | v2 で追加 (前文字 `\\` ならスキップ) |
| 重複コード       | PageLinkMark 同様処理コピー | ユーティリティ抽出 (v2)              |

## 8. 今後の改善 (v2 以降)

- 共通ヘルパ: `createAsyncLinkMark(markType, title, options)`
- 日本語/全角タグ対応 (正規表現拡張)
- Tag 一覧ダイアログ/補完の ranking (人気順 / 最近使用)
- `#` を Mark から除外しテキストレイアウト最適化
- ページ未存在時「＋作成」Quick Action 提示

## 9. 計測 (任意)

| 指標             | 目的           | 実装                                      |
| ---------------- | -------------- | ----------------------------------------- |
| Tag 解決平均時間 | UX レイテンシ  | pending→exists/missing タイムスタンプ差分 |
| missing 率       | ページ不足把握 | 解決結果集計                              |
| 誤検出率         | 誤タグ化監視   | undo / 直後削除率推計                     |

## 10. Open Questions

| 質問               | 選択肢              | コメント                 |
| ------------------ | ------------------- | ------------------------ |
| `_` → space 正規化 | する / しない       | v1 はしないで簡潔化      |
| タグ=ページ同一か  | 共有 / 分離スキーマ | 現在は共有 (pages)       |
| 大文字小文字       | 区別 / 非区別       | searchPages 仕様調査必要 |

---

(次の更新で: 具体コード差分リンク/テスト計画を追記)
