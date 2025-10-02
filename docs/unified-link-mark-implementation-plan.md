# UnifiedLinkMark 実装プラン (v0.1)

最終更新: 2025-09-25
対象: ブランチ `fix/preserve-bold-in-links`

---

## ゴール

- `[Title]`/`#タグ` を統合する `unilink` マークを導入
- 入力直後の pending → exists/missing 自動遷移
- Realtime/Broadcast/Visibility による自動再解決
- 既存 `PageLinkMark` (および legacy decoration) 段階的置換

## スコープ外

- バッチ検索 API / 永続キャッシュ / 別名

## 前提

- 仕様: `docs/unified-link-mark-spec.md`
- Supabase 認証/検索ユーティリティ既存 (`lib/.../services`)

---

## フェーズ分割とタスク

### P0: 下準備 (ユーティリティ/基盤)

- [ ] U0-1: 正規化 util `normalizeTitleToKey(raw)`
- [ ] U0-2: Mark 更新ヘルパ `updateUnilinkAttrs(tr,pos,attrs)`
- [ ] U0-3: 30s TTL メモリキャッシュ `resolvedCache`
- [ ] U0-4: ReconcileQueue (100ms debounce)/inflight デデュープ
- [ ] U0-5: BroadcastChannel ラッパ `unilinkChannel`
- [ ] U0-6: Realtime リスナー足場 (後で配線)

### P1: マーク骨格

- [ ] U1-1: `lib/tiptap-extensions/unified-link-mark.ts` 追加
  - schema attrs: variant/raw/text/key/pageId/href/state/exists/created/meta
  - parse+renderDOM: `a.unilink` + data-attrs
  - InputRules: tag/bracket (タグは `#` で `#` 非表示)
  - 生成時 `pending` で resolver enqueue
- [ ] U1-2: Editor 統合: `usePageEditorLogic` に登録 (PageLinkMark より前)
- [ ] U1-3: 既存データ migration: `[Title]` 文字列/旧 mark → `unilink`

### P2: 解決ロジック

- [ ] U2-1: `resolveKey(key)` 実装 (searchPages 完全一致優先)
- [ ] U2-2: enqueue 処理と `updateAttributes` 適用
- [ ] U2-3: 失敗時 pending 維持 (ログのみ)

### P3: 自動再解決 (リアルタイム)

- [x] U3-1: Local create → BroadcastChannel 送信
- [x] U3-2: Realtime INSERT 受信 → key 抽出 → ReconcileQueue
- [x] U3-3: Visibility/Online → stale keys バッチ再解決
- [x] U3-4: MarkIndex 実装 (最初は都度スキャン、後で最適化)

### P4: 既存機能の置換/調整

- [ ] U4-1: legacy `page-link.ts` の suggestion を Unified 経由に
- [ ] U4-2: 旧 `PageLinkMark` を非推奨化 (互換ロードのみ)
- [ ] U4-3: CSS は既存 `a[data-state]` を再利用、`.unilink--tag` 追加

### P5: 仕上げ

- [ ] U5-1: 型/ESLint/ビルド通過
- [ ] U5-2: 基本テスト (7+)
- [ ] U5-3: 軽い e2e 確認 (ブラウザ 2 タブ)
- [ ] U5-4: ドキュメント更新 (README/仕様差分)

---

## アーキテクチャ断面

- Editor Extension 層: Mark/Commands/InputRules/PluginView
- Infra 層: searchPages, page create API, Realtime, Broadcast
- Orchestrator: ReconcileQueue + MarkIndex + Cache

---

## リスクと緩和

- 過剰リクエスト → TTL キャッシュ + デバウンス + キー重複排除
- DOM 更新ループ → `updateAttributes` のみに限定し選択範囲保持
- マイグレーション破壊 → feature flag で段階導入

---

## 測定

- unilink.resolve.ms, unilink.reconcile.updated, unilink.cache.hit

---

## ロールアウト案

- Staging 環境で P1-P3 段階投入 → 実使用監視 → P4-P5
