# PageLink ▶ PageLinkMark 移行サマリ (WIP)

最終更新: 2025-09-23
担当: (記入してください)
関連ブランチ: `fix/preserve-bold-in-links`

## 1. 背景と目的

従来の `page-link.ts` は Decoration ベースで以下の複数責務を一体化:

- ブラケット `[Title]` の a 化 / 存在色分け / クリック遷移
- ページ未存在時の新規作成トリガ
- アイコン (`[user.icon]`) とタグ (`#tag`) の特殊レンダリング
- bracket 自動補完 / サジェスト UI

このモノリシック実装を Mark ベースへ段階移行し、

1. 検出 → Mark 化 → 状態遷移 (pending→exists/missing) を統一モデルへ
2. 後続の Tag/Icon/QuickActions を独立拡張で差し替え可能に
3. 不要な再計算/Decoration ループを削減しパフォーマンス・保守性を向上

## 2. 現状の構成 (2025-09-23 時点)

| コンポーネント                  | 状態         | 役割                                                        |
| ------------------------------- | ------------ | ----------------------------------------------------------- |
| `PageLink` (legacy)             | 部分残存     | クリック遷移 / 旧サジェスト / 一部デコレーション副作用      |
| `PageLinkMark`                  | 新規主軸     | `[Title]` → Mark 化, 属性: `state`, `exists`, `pageId` など |
| `page-link-preview-mark-plugin` | 継続         | Mark レンダリング支援 (hover 等)                            |
| `useLinkExistenceChecker`       | 旧モデル依存 | `existencePluginKey` を利用 (移行対象)                      |
| `globals.css`                   | 更新         | `a[data-state]` スタイル (pending / exists / missing)       |
| suggestion plugin               | 旧中核       | 即時 Mark 化へ改修済 (候補確定時に直接 PageLinkMark)        |

## 3. 直近実装した変更

| 項目                   | 概要                                            | 備考                      |
| ---------------------- | ----------------------------------------------- | ------------------------- |
| サジェスト即時リンク化 | 候補確定時に `[title]` を挿入せず直で Mark 付与 | InputRule 依存減          |
| 初期マイグレーション   | 既存文書内の `[Title]` をロード時に Mark 化     | pending 生成 (検索まだ)   |
| pending スタイル       | ドット/点線/低彩度表示                          | `a[data-state="pending"]` |
| bullet 余白調整        | `li > a.page-link-mark:first-child` マージン    | 視認性改善                |
| コード文脈抑止         | InputRule 内で code / codeBlock を除外          | 誤リンク防止              |

## 4. まだ残るギャップ / 未移行要素

| カテゴリ               | 現状                                        | 解決方針                                        | 優先度 |
| ---------------------- | ------------------------------------------- | ----------------------------------------------- | ------ |
| 存在判定 (初期)        | マイグレーション Mark は検索未実行          | onCreate 後 `refreshPageLinkMarks()` 呼び出し   | 高     |
| アップデート Hook      | `useLinkExistenceChecker` が旧 meta を使用  | Mark 属性更新にリライト or 廃止                 | 高     |
| アイコン `[user.icon]` | legacy クリックロジック依存                 | `UserIconMark` (Node/Mark) 導入 or Deprecate    | 中     |
| タグ `#tag`            | 旧 Decoration に依存                        | `TagMark` 導入 or 廃止判断                      | 中     |
| plId 生成              | Date+Math.random                            | 連番カウンタへ単純化 (デバッグ性向上)           | 中     |
| 重複ロジック           | InputRule & suggestion 非同期解決コード重複 | 共通ユーティリティ抽出                          | 中     |
| missing 長期監視       | サイレント失敗                              | dev モードで 3s 超 pending を warn              | 低     |
| legacy PageLink 削除   | 依存残り                                    | クリック/新規作成を Mark ベースへ移し Flag 削除 | 高     |

## 5. 今後の段階的ロードマップ (提案)

| ステージ | 目的               | アクション                                             | 完了条件                         |
| -------- | ------------------ | ------------------------------------------------------ | -------------------------------- |
| Stage 1  | 初期存在解決安定化 | マイグレーション後 refresh 呼び出し / plId カウンタ化  | pending → exists/missing 99% <2s |
| Stage 2  | Hook 移行          | `useLinkExistenceChecker` を廃止 & Mark コマンドへ統合 | 旧キー参照ゼロ                   |
| Stage 3  | クリック/作成移行  | legacy PageLink の handleClick を Mark 専用 plugin へ  | legacy 拡張 editor から除去      |
| Stage 4  | 拡張分離           | Tag/Icon を各 Mark/Node 化                             | 旧特殊処理削除 / docs 更新       |
| Stage 5  | クリーンアップ     | 共通ユーティリティ化 / メトリクス統合                  | 重複ゼロ / lint pass             |

## 6. 技術的詳細メモ

### 6.1 Mark 属性モデル

| 属性        | 用途                 | 更新タイミング               |
| ----------- | -------------------- | ---------------------------- | -------- | ------------------- |
| `href`      | ナビゲーション先     | 解決成功時 or 外部リンク即時 |
| `pageId`    | 内部ページ ID        | 解決成功時・新規作成後       |
| `pageTitle` | 未存在時の元タイトル | 初期生成時保持               |
| `state`     | `pending             | exists                       | missing` | 初期生成 → 解決結果 |
| `exists`    | boolean 補助         | state に冗長、将来削除可     |
| `plId`      | 一意識別子           | 生成時。位置再算出/差分検出  |

### 6.2 即時リンク化 (Suggestion → Mark)

- 旧: `[title]` テキスト挿入 → InputRule が後段で発火
- 新: 候補確定時に直接テキスト + Mark（state=pending/exists）生成 → 非同期検索
- 利点: 入力体験の一貫性、余計な括弧フラッシュ除去、競合レース低減

### 6.3 非同期解決フロー (内部ページ)

1. Mark 生成 (state=pending, href="#")
2. `searchPages(title)`
3. 見つかる → state=exists, href=/pages/:id, pageId 設定
4. 見つからない → state=missing (ユーザー操作で後続作成可能)

### 6.4 マイグレーション上の注意

- 既存 `[Title]` を段落テキスト中に多数含む場合、初回変換が小さな再レイアウトコストになる → 分割/遅延最適化は必要なら後続
- コードブロック中 `[ ... ]` はリンク化抑止（実装済）

## 7. リスクと緩和

| リスク       | 内容                                 | 緩和策                              |
| ------------ | ------------------------------------ | ----------------------------------- |
| 解決遅延     | 検索遅延で pending 長時間            | バッチ API / キャッシュ層を検討     |
| ID 衝突      | plId 重複で更新失敗                  | カウンタ化 + dev 警告               |
| 既存依存壊れ | 外部で legacy クリック挙動参照       | Feature Flag & 段階削除             |
| スタイル崩れ | Mark 専用 class によるセレクタ未更新 | `grep` で `page-link-mark` 利用監査 |

## 8. メトリクス / 監視案

| 指標                       | 目的                    | 収集方法                                    |
| -------------------------- | ----------------------- | ------------------------------------------- |
| 平均解決時間(ms)           | 検索/更新レイテンシ監視 | markPending/markResolved タイムスタンプ差分 |
| missing 率                 | 新規ページ創出需要把握  | 解決結果カウント                            |
| 長期 pending 件数          | 異常検出                | 3s 超残存 plId ログ                         |
| Suggestion 選択 → 解決時間 | UX 体験計測             | client performance.now 差分                 |

## 9. 次アクション (短期 TODO 提案)

- [ ] onCreate 後 `editor.commands.refreshPageLinkMarks()` 実行
- [ ] plId 連番化ユーティリティ導入 `pageLinkIdGenerator.ts`
- [ ] Hook 移行: `useLinkExistenceChecker` → 削除 & refresh コマンド統合
- [ ] legacy PageLink の suggestion 部分を独立ファイルへ抽出 (分離容易化)
- [ ] 共通 `resolvePageLinkAsync(title, plId, view)` ユーティリティ抽出
- [ ] dev: 3 秒超 pending warn ロガー

## 10. Open Questions

| 質問                 | 選択肢                            | メモ                           |
| -------------------- | --------------------------------- | ------------------------------ |
| Tag / Icon の扱い    | Deprecate / Mark 化 / Node 化     | 使用頻度と UX 期待値の調査必要 |
| `exists` 属性冗長性  | 残置 / 削除                       | state が真実なので削除可能性大 |
| 新規ページ作成トリガ | クリック時 / ホバー時プリフェッチ | 体験テスト要                   |

---

更新時は CHANGELOG 反映と、移行完了後に legacy ファイル削除 PR を作成してください。
