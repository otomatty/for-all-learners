# PageLink Mark 移行 作業ログ

最終更新: 2025-09-22
ブランチ: `fix/preserve-bold-in-links`

## 背景

- 既存 `page-link.ts` でブラケット記法 `[Title]` を Decoration ベースでリンク表示。
- Bold との共存時に DOM ラップ順や編集性、属性型安全性に課題。
- 将来的にリンクを Mark として正規化し、他マーク (strong, italic 等) と自然に重畳可能にする必要。

## 目的

1. 角括弧入力を Mark 化して `<a><strong>...</strong></a>` の構造を安定化
2. Decoration 依存の複雑化を低減しメンテ性向上
3. 遅延存在確認 (pageId 付与) の再設計土台を作る

## 実施ステップ (時系列)

| 時刻順 | 内容                  | ファイル            | 備考                                                 |
| ------ | --------------------- | ------------------- | ---------------------------------------------------- | ---------------------------- |
| 1      | 既存実装調査          | `page-link.ts`      | Decoration による `nodeName:'a'` 生成と bracket 隠し |
| 2      | 型エラー解消          | `page-link.ts`      | `Record<string,string                                | boolean>` を排除し helper 化 |
| 3      | Mark スケルトン作成   | `page-link-mark.ts` | 基本 attributes / commands 実装                      |
| 4      | Editor へ組込         | `tiptap-editor.tsx` | `PageLinkMark` 追加 (StarterKit 後)                  |
| 5      | Decoration 競合ガード | `page-link.ts`      | 既存 Mark がある場合 Decoration スキップ             |
| 6      | InputRule 追加        | `page-link-mark.ts` | `[Title]` 終了時 Mark 化                             |
| 7      | 非同期存在解決(暫定)  | `page-link-mark.ts` | `searchPages` 結果で `pageId` / `href` 更新          |
| 8      | 全体型検証            | 各                  | `get_errors` でエラーなし確認                        |

## 変更詳細

### 新規

- `lib/tiptap-extensions/page-link-mark.ts`: Mark 定義 + InputRule + 非同期属性更新
- `docs/reverse/page-link-mark-migration-log.md` (本書)

### 既存編集

- `components/tiptap-editor.tsx`: Mark 追加
- `lib/tiptap-extensions/page-link.ts`: ガード挿入 + attrs helper で型安全化

## 現状仕様 (2025-09-22)

- 入力: `[Some Title]` → 角括弧除去 + `pageLinkMark` 付与
- 外部: `http(s)://` で始まる文字列は `external` 属性 + 直接 `href`
- 内部: 一旦 `href:'#'` / `pageTitle` 保持 → 非同期 exact match 成功で `href:'/pages/{id}'` & `pageId` 付与
- Decoration: 旧ロジックは存続しブラケット非表示および Mark 未適用ケース対応

## 既知の制限 / 技術的負債

- 非同期更新時の位置トラッキングが単純走査 (競合編集で外れる可能性)
- `exact match` の比較単純 (case / trim 未対応)
- 未存在ページは視覚区別が旧 Decoration (色) 依存 / Mark 側で未統一
- 外部リンク判定が `^https?://` のみ
- Decoration 残留による二重機構 (移行コスト)

## リスク

| 項目           | 内容                                                     | 緩和策                                  |
| -------------- | -------------------------------------------------------- | --------------------------------------- |
| Race condition | 非同期検索結果到着後、テキストが変更され別 Mark を誤更新 | Mark ID メタ導入 (次フェーズ)           |
| 重複適用       | InputRule + 既存 Decoration 両方適用                     | ガード済 (Mark 存在チェック)            |
| パフォーマンス | doc.descendants 走査が多い                               | 範囲限定 / mark index キャッシュ (後続) |

## 計測候補 KPI

- Mark 化後 `[Title]` 入力から `pageId` 反映までの平均遅延
- 1,000 行文書での入力レイテンシ (ms)
- 競合編集時誤更新率 (テストで検出)

## 次フェーズへの入口

→ 別ドキュメント `page-link-mark-migration-plan.md` を参照予定

## 要約

初期 Mark 化 (入力 / 表示 / 非同期基本) まで完了。残タスクは位置同期強化と Decoration フェーズアウト。
