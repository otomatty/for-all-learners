# PageLink Mark 移行計画

最終更新: 2025-09-22

## ゴール

Decoration ベースのブラケットリンク実装を完全に Mark ベースへ移行し、以下を達成:

1. マーク重畳 (bold/italic/highlight 等) の自然な共存
2. 入力～存在解決～表示までの責務分離と単純化
3. 型安全 (attrs は string のみ) と拡張性 (属性追加容易)
4. 将来: 未存在ページ作成 UX / リンク編集ダイアログ / バッチ置換を容易に

## フェーズ概要

| フェーズ       | 内容                                                     | 完了条件                                    | 想定期間 |
| -------------- | -------------------------------------------------------- | ------------------------------------------- | -------- |
| Phase 1 (完了) | Mark スケルトン / InputRule / 非同期解決(暫定)           | 基本動作・型エラーなし                      | 済       |
| Phase 2        | 位置トラッキング強化 & 装飾縮小                          | 安定 ID で誤更新 0% / Decoration 機能最小化 | 1-2 日   |
| Phase 3        | UX 拡張 (未存在ページ表示/作成, hover preview Mark 対応) | 既存 preview 流用 / 未存在視覚差            | 1-2 日   |
| Phase 4        | Decoration 廃止 & クリーンアップ                         | `page-link.ts` からリンク装飾削除           | 0.5 日   |
| Phase 5        | リファクタ & ドキュメント                                | Plan/Log 更新 / ADR 起票                    | 0.5 日   |

## 詳細タスク一覧

### Phase 2: 位置 & 安定性

- [ ] Mark 生成時に一意 ID (uuid v4 or incremental) を attrs に付与 (例: `data-pl-id`)
- [ ] 非同期更新は `pageTitle + data-pl-id` の両方一致条件
- [ ] doc.walk 範囲最適化: 直近挿入位置近傍 (from - 50 ~ from + 200) のみ探索
- [ ] Decoration: リンク生成ロジックをオプションフラグ `legacyPageLinkDecorations` で制御 (デフォルト true → false に移行)
- [ ] 外部リンク CSS クラス分離 (`text-external-link`)

### Phase 3: UX / 表示

- [ ] 未存在: Mark に `data-exists="false"` 付与 & CSS (赤色)
- [ ] 存在: Mark に `data-exists="true"` 付与 (青色)
- [ ] Hover preview: 現在 previewPlugin が `a[data-page-id]` を対象 → Mark の生成 anchor も対象化 (ほぼそのまま)
- [ ] 未存在ページ作成コマンド `createPageFromMark` 実装 (server action 呼び出し)
- [ ] コマンドチェーン: 選択範囲が PageLinkMark のとき QuickAction UI 表示

### Phase 4: Cleanup

- [ ] `page-link.ts` から bracketRegex 部分 & リンク inline Decoration 削除
- [ ] `existencePlugin` のマップ更新経路見直し (Mark update 経由に統合)
- [ ] Dead code/Imports 削除 & ESLint pass

### Phase 5: Docs / ADR

- [ ] ADR: "Adopt Mark-based Page Link Architecture"
- [ ] README または開発者向けガイドに追加 (記法説明 / 拡張方法)
- [ ] 計測結果 (遅延, 誤更新率) をログ更新

## 技術方針詳細

### 一意 ID 付与

- `nanoid` など外部依存避けるなら簡易カウンタ + timestamp
- Attr: `data-pl-id` は Mark 内部更新時に保持

### 非同期存在確認

- Debounce (300ms) キュー: 同一タイトル同時多数リクエスト抑制
- キャッシュ Map<title, { id|null, ts }> で短期再問い合わせ回避

### エラーハンドリング

- Supabase エラー時: `data-resolve-error="true"` 付与 (UI で薄い警告色)
- リトライ: 次回入力/キー操作でトリガ

### パフォーマンス

- 大規模文書 (#nodes > 5k) での descendants 全走査禁止 → 局所探索 + index 構築 (Phase 2 完了基準)

## 成功指標 (Exit Criteria)

- Decoration 廃止後も既存文書 (旧 JSON) のロード時にリンクが破綻しない
- `[Title]` 入力 → 存在反映 95% < 400ms (キャッシュヒット時 <100ms)
- 誤更新 (他テキスト Link へ誤属性付与) 0 件 (回帰テスト)
- Bold/Italic/Highlight と干渉なし (複合マークテスト 10 ケース PASS)

## ロールバック戦略

- フラグ `useLegacyPageLink` (default: false) を導入し問題発生時に旧 Decoration パスを一時再有効化
- Mark JSON を破壊しないので双方向変換不要（旧データ → 新 Mark 化は遅延処理）

## リスク & 緩和

| リスク                  | 影響                 | 緩和                                    |
| ----------------------- | -------------------- | --------------------------------------- |
| 非同期整合性破綻        | 誤った `pageId` 表示 | 一意 ID + 二重条件 + 最終確認時再検証   |
| 大量同名タイトル        | キャッシュ汚染       | id 解決は exact match + 冪等更新        |
| InputRule 衝突 (他拡張) | 誤変換               | 優先度管理 / 明示的 Escape (`\\[` 支援) |
| 大規模文書性能          | レイテンシ増         | 局所走査 + lazy 解決                    |

## 作業順序 (短期ロードマップ)

1. 一意 ID 付与 + 非同期更新条件改善 (Phase 2 核心)
2. Decoration フラグ追加 & デフォルト OFF 切替
3. 未存在視覚表示 & Hover preview Mark 対応
4. Cleanup & Docs
5. 計測 + ADR

## 参考

- ProseMirror Marks: https://prosemirror.net/docs/guide/ (構造設計参考)
- Tiptap Input Rules: https://tiptap.dev/guide/input-rules

## メンテナンス指針

- 新しい属性追加時は Mark 定義 `addAttributes` のみ編集し他ロジックは参照
- 検索/解決ロジックは将来的に service 層へ分離しテスト容易化予定

---

以上が段階的移行計画です。実行着手時は Phase 2 タスクを個別 Issue 化し進捗を可視化してください。
