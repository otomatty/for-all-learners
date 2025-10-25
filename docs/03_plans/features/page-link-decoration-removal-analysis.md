# PageLink Decoration 生成ループ撤去影響分析

最終更新: 2025-09-23

## 目的

Decoration ベース実装 (page-link.ts 内の旧ブラケット/存在判定/特殊表示) を削除してもユーザーフローを破壊しないかを体系的に検証し、残存ギャップと対処方針を明確化する。

## 結論サマリ

- コアフロー ( `[Title]` → Mark 化 → 非同期解決 → hover preview → 未存在クリックで新規作成 ) は Mark 実装のみで再現済み。
- 削除により失われる/変化するのは: ① 即時色分け(=pending 期間の発生), ② 非アクティブ段落ロック, ③ アイコン(`[user.icon]`) / タグ(`#tag`) の特殊レンダリング。
- これらはいずれも致命的ではなく、必要なら別途 Mark / Node 拡張で再導入可能。
- 削除前に追加すると安全性が高まる最小修正: コードブロック/インラインコード内での自動 Mark 化抑止。

## 旧 Decoration ループ機能一覧

| ID  | 機能                            | 説明                                                                    |
| --- | ------------------------------- | ----------------------------------------------------------------------- |
| D1  | ブラケット即時 a 化             | `[Title]` 入力済みテキストをブラケット含めた Decoration で a に置換表示 |
| D2  | 既存/未作成色分け即時反映       | existencePlugin Map に基づき青/赤クラス付与                             |
| D3  | コード文脈抑制                  | codeBlock / code mark 内は a 生成しない                                 |
| D4  | アイコン表示                    | `[user.icon]` を span(user-icon-wrapper) に変換                         |
| D5  | タグリンク化                    | `#tag` を a に変換                                                      |
| D6  | 未存在クリック → 新規ページ作成 | `data-page-title` 属性をトリガにクリックで Supabase へ挿入              |
| D7  | 既存/新規ページ遷移             | クリック時に適切な URL へ遷移                                           |
| D8  | 外部リンク即時化                | `[https://...]` を target=\_blank a に                                  |
| D9  | 非アクティブ段落ロック          | キャレット段落以外の link 部分を contentEditable=false                  |
| D10 | `[` 自動 `[]` 補完              | bracketPlugin により末尾で自動挿入                                      |
| D11 | 入力途中サジェスト              | suggestionPlugin による `[ti` 途中検索候補表示                          |

## Mark 実装での再現状況

| ID  | 状態              | 根拠 / 実装箇所                                | 備考                                              |
| --- | ----------------- | ---------------------------------------------- | ------------------------------------------------- |
| D1  | 再現 (トリガ差異) | InputRule (`page-link-mark.ts`)                | `]` タイプ確定時に変換、即時視覚差異は十分        |
| D2  | 仕様変化          | pending → 解決後 exists/missing                | 即色 → 短 pending。スタイルで状態明確化済み       |
| D3  | 未実装 (ギャップ) | InputRule にコード文脈判定なし                 | 追加容易 (selection.$from 親/marks)               |
| D4  | 未再現            | Decoration 専用処理のみ                        | 廃止 or IconMark 要検討                           |
| D5  | 未再現            | 同上                                           | TagMark 導入可                                    |
| D6  | 再現              | Mark の `data-page-title` + DOM click ハンドラ | 属性保持確認済み                                  |
| D7  | 再現              | `handleClick` / `handleDOMEvents.click`        | Mark/Decoration 両対応構造                        |
| D8  | 再現              | InputRule: external=true, href=URL             | 即 state=exists                                   |
| D9  | 未再現            | Mark 版で contentEditable 制御なし             | 実害小。必要なら別プラグイン化                    |
| D10 | 再現 (そのまま)   | bracketPlugin                                  | 将来 InputRule 拡張へ内包可                       |
| D11 | 再現              | suggestionPlugin                               | Mark 化後も `[title]` 文字列挿入 → InputRule 発火 |

## ギャップ詳細と影響評価

| ギャップ                | 影響                                     | リスクレベル               | 対処優先度                |
| ----------------------- | ---------------------------------------- | -------------------------- | ------------------------- |
| D3 コード文脈抑制欠如   | コード例示中の `[text]` が誤ってリンク化 | 中                         | 高 (削除前に修正推奨)     |
| D4 アイコン特殊表示消失 | 既存表示依存ユーザに視覚後退             | 仕様利用頻度次第           | 中 (利用低なら deprecate) |
| D5 タグリンク化消失     | タグ内ナビゲーション喪失                 | 機能要求があるなら UX 低下 | 中                        |
| D9 段落ロック消失       | 誤操作防止効果低下 / 但し編集一貫性向上  | 低                         | 低                        |

## 推奨最小追加パッチ (削除前)

```ts
// page-link-mark.ts InputRule handler 先頭付近
const $from = state.selection.$from;
if (
  $from.parent.type.name === "codeBlock" ||
  $from.marks().some((m) => m.type.name === "code")
) {
  return; // コード/インラインコード内では変換しない
}
```

## アイコン/タグの選択肢

| 方針      | 概要                              | 実装概略                        | 工数感 |
| --------- | --------------------------------- | ------------------------------- | ------ |
| Deprecate | 表示機能を廃止し単なる文字列に    | Docs に非推奨記載               | 最小   |
| Mark 化   | `TagMark` / `UserIconMark` を追加 | 正規表現 InputRule + renderHTML | 小～中 |
| Node 化   | `icon` インライン Node            | Node schema + paste/input rule  | 中     |

## 推奨ステップ

1. (必須) D3: コード文脈抑止を InputRule に追加
2. (判断) D4/D5 の継続要否をログ/DB/ヒアリングで確認
3. (必要なら) TagMark / IconMark 導入 → 旧 Decoration ループ削除
4. Docs/CHANGELOG に差分と pending→exists 遷移説明を追加
5. 14 日観測 (missing 比率, 解決時間) → 安定後クリーンアップ

## リスク緩和策

- 削除直後 1 リリース分 feature flag (万一復帰用に commit 残し revert 容易化)
- Metrics: missing 比率急上昇監視 (例: >20%)
- エディタロード時、doc 内に `[` / `]` 残存パターンで Mark 未変換が多い場合警告ログ (運用用)

## 変更による既知の仕様差異 (Changelog 用抜粋案)

- CHANGE: PageLink 解決は即時色分けから `pending → exists/missing` へ遷移表示に変更
- REMOVED: legacy existencePlugin / decoration-based inline link rendering
- (Optional) REMOVED/DEPRECATED: `[user.icon]` inline avatar, `#tag` auto-linking (後継 Mark 追加予定なら NOTE に変更)

## 判断フレームワーク (再発防止 / 設計基準)

| 項目       | 基準                                                              |
| ---------- | ----------------------------------------------------------------- |
| 非同期解決 | Mark 属性 plId による一意識別 + index で位置安定性を確保すること  |
| 視覚状態   | DOM は data-state に一本化 (pending/exists/missing)               |
| 新規作成   | `data-page-title` が唯一トリガ (複数メカニズムを持たない)         |
| 拡張性     | 追加表現 (Tag/Icon) は Decoration ではなく独立 Mark / Node で行う |

## 次アクション (選択式)

A. 最小パッチ (コード文脈抑止) 追加後に Decoration ループ削除へ進む
B. Tag/Icon 後継 Mark を先行実装してから削除
C. 一旦 Deprecate としてリリースし利用状況を観測後に完全削除

---

必要な方針を指示してください (例: "A で進めて削除" / "B で TagMark も実装" 等)。
