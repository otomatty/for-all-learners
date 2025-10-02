# PageLink Mark 移行計画 (v2)

更新日: 2025-09-22
ブランチ: `fix/preserve-bold-in-links`

v1 からの更新点:

- 状態属性 (pending/exists/missing) 実装済
- 0 件結果で missing 反映
- 並び順制御 (updated_at 昇順)
- レガシー装飾フラグ導入

## ゴール再確認

Decoration 方式を完全除去し Mark ベースへ統一。リンクライフサイクル (入力 → 解決 → 表示/編集 → 再解決) の責務を明確化。

## 現在のフェーズ位置

Phase 2 の一部完了 (状態導入 & レガシーフラグ)。残: 局所更新最適化 / CSS / legacy OFF 切替。

## フェーズ再定義 (v2)

| Phase | 内容                             | 完了条件                                   | 状態   |
| ----- | -------------------------------- | ------------------------------------------ | ------ |
| 1     | Mark 基礎 + InputRule            | 角括弧 →Mark 変換                          | DONE   |
| 2     | 状態管理 + 安全更新 + 並び順     | state=3 相 / 並び順適用 / race 低減        | 進行中 |
| 3     | UX 拡張 (CSS, 新規作成, 編集 UI) | 視覚差 + 作成/編集可能                     | 未着手 |
| 4     | Legacy 削除                      | existencePlugin 未使用 / フラグ OFF デフォ | 未着手 |
| 5     | 観測 & 最適化                    | メトリクス / 局所探索 / ドキュメント       | 未着手 |

## 残タスク詳細

### Phase 2 (残)

- [ ] pending/missing CSS 適用
- [ ] 局所探索: 挿入時の from オフセット記録 (WeakMap<plId, posRange>)
- [ ] 再解決 API 下準備 (後続 Phase 用)

### Phase 3

- [ ] 新規ページ作成コマンド `createPageFromLink({ pageTitle, plId })`
- [ ] Link 編集コマンド `updatePageLink(attrs)` / UI ボタン
- [ ] 外部リンクアイコン (after 疑似要素 or inline svg)
- [ ] Missing hover で tooltip "未作成: Cmd+Enter で作成"

### Phase 4

- [ ] Editor 初期化: `useLegacyLinkDecorations: false` デフォルト
- [ ] `page-link.ts` からリンク Decoration ロジック削除
- [ ] existencePlugin 除去 / 関連 import 削除
- [ ] 回帰テスト (InputRule + サジェスト + Hover preview)

### Phase 5

- [ ] メトリクス計測実装 (events: linkPending, linkResolved, linkMissing)
- [ ] パフォーマンス: 大文書での更新時間サンプリング
- [ ] ADR 作成 (Mark-based Link Architecture)
- [ ] ドキュメント最終統合 (README / Dev Guide)

## コマンド仕様案 (ドラフト)

```
setPageLink({ href, pageId?, pageTitle?, external?, plId? })
updatePageLink({ plId, href?, pageId?, pageTitle?, external? })
unsetPageLink({ plId })
createPageFromLink({ plId, pageTitle }) -> server action -> update mark
```

Validation: plId 必須 (update/unset/createPage) / href sanitize。

## イベント & Metrics (提案)

| Event        | 発火条件                   | Payload              |
| ------------ | -------------------------- | -------------------- |
| linkPending  | InputRule で内部リンク生成 | { plId, title }      |
| linkResolved | exact match 解決           | { plId, pageId, ms } |
| linkMissing  | 0 件確定                   | { plId, title, ms }  |

`ms` = 解決完了時刻 - 生成時刻 (plId→timestamp Map で計測)。

## リスク & 緩和 (更新)

| リスク                     | 追加                   | 緩和                             |
| -------------------------- | ---------------------- | -------------------------------- |
| 局所探索未実装で O(N) 走査 | 大文書で遅延           | 位置インデックス導入             |
| createPage の失敗          | Mark が missing のまま | リトライ UI / エラー属性付与     |
| Legacy 削除後不具合        | フォールバック不能     | rollout 前に feature flag テスト |

## 優先度付きロードマップ (次 1〜2 スプリント想定)

1. (P1) CSS 状態スタイル + legacy OFF テスト
2. (P1) 局所探索最適化 + metrics 計測フック
3. (P2) createPageFromLink & update UI
4. (P2) Legacy 削除 & クリーンアップ
5. (P3) ドキュメント & ADR / 仕上げ

## 成功指標 (刷新)

| 指標             | 目標                          |
| ---------------- | ----------------------------- |
| 解決平均遅延     | < 400ms (P95)                 |
| missing 誤判定率 | 0% (タイトル存在再確認で防止) |
| 競合誤更新       | 0 件 (自動テスト)             |
| 大文書入力遅延   | +5ms 未満 (baseline 比)       |

## CSS 推奨サンプル

```css
/* state-based link visuals */
a[data-state="pending"] {
  color: #6b7280;
  text-decoration: underline dotted;
}
a[data-state="missing"] {
  color: #dc2626;
}
a[data-state="exists"][data-external="true"] {
  position: relative;
}
a[data-state="exists"][data-external="true"]::after {
  content: "↗";
  font-size: 0.75em;
  margin-left: 2px;
}
```

## アクションアイテム (開始点)

- [ ] Tailwind or global CSS へ state スタイル追加
- [ ] Editor 設定で legacy OFF 試行
- [ ] metrics Hook 雛形追加 (`lib/metricsParser.ts` か新規 module)

---

この v2 計画は v1 を上書きし、現状反映した最新版です。
