# 国際化対応実装計画書

**作成日**: 2025年11月09日  
**計画者**: 開発チーム（AI支援）  
**対象機能**: 国際化（i18n）基盤整備および多言語化対応  
**ステータス**: Draft

---

## 計画概要

Next.js 16 / Tauri 2.0 へ移行中のアプリケーションに対して、`next-intl` を中心とした国際化基盤を整備し、UI・TanStack Query ベースのクライアントデータ層・プラグインの各層で一貫した多言語対応を実現する。

---

## 背景

### なぜこの機能が必要か

- 海外ユーザー獲得のために日本語以外の言語を早期にサポートする必要がある  
- Tauri ネイティブ移行後もブラウザ版と同一コードベースで言語切り替えを提供する必要がある  
- プラグインエコシステムを含む UI 全域での文言管理が分散しており、保守性が低下している

### 関連Issue

- Issue: `docs/01_issues/open/2025_11/20251109_02_internationalization.md` (作成予定)  
- Research: `docs/02_research/2025_11/20251109_03_internationalization-options.md` (作成予定)

### 解決する課題

- [ ] UI 文言、サーバーエラーメッセージ、通知を統合的に翻訳管理できていない
- [ ] 既存の Tauri 移行計画に国際化要件が組み込まれていない
- [ ] プラグイン sandbox/worker 層での言語依存仕様が未定義

---

## 実装の全体像

### アーキテクチャ概要

- `next-intl` を基盤とし、App Router の `[locale]` セグメントでロケールを切り替える  
- 翻訳辞書は TypeScript モジュールとして `src/i18n/dictionaries/{locale}.ts` に集約  
- TanStack Query ベースのデータフック / API Routes では `next-intl/server` を介してロケールを取得し、`lib/i18n/messages` で共通文言を管理  
- Tauri コマンドおよび sandbox worker には軽量な翻訳プロキシ (`lib/i18n/runtime.ts`) を DI する

```
App Router (app/[locale]/...)
    ↓ locale context (next-intl)
Presentation Components / Hooks
    ↓ lib/i18n/client
TanStack Query Hooks / API Routes
    ↓ lib/i18n/server
Sandbox Worker / Tauri Commands
    ↓ lib/i18n/runtime
Supabase / 外部サービス
```

### 主要コンポーネント

| コンポーネント名        | 責務                               | ファイルパス                             |
| ---------------------- | ---------------------------------- | ---------------------------------------- |
| LocaleLayout           | ロケール context 供給、メタ情報     | `app/[locale]/layout.tsx`                |
| IntlProvider           | クライアント側翻訳 provider         | `components/providers/intl-provider.tsx` |
| Messages Loader        | 辞書ロード、タイル分割              | `lib/i18n/messages.ts`                   |
| Locale Switcher        | 言語切り替え UI                     | `components/settings/locale-switcher.tsx`|
| Intl Middleware        | 初期ロケール判定                    | `middleware.ts`                          |
| WorkerIntlBridge       | sandbox/Tauri 向け翻訳アダプタ       | `lib/plugins/i18n/worker-intl.ts`        |

---

## フェーズ分割

### Phase 0: 基礎設計と棚卸し (2025-11-09 ~ 2025-11-15)

**目標**: 現状把握と翻訳キー設計を完了する

**実装内容**:

- [ ] タスク0-1: 既存文言の棚卸しと分類
  - ファイル: `docs/02_research/2025_11/20251109_03_internationalization-options.md`
  - 見積: 12時間

- [ ] タスク0-2: 対応ロケールとフォールバック方針の策定
  - ファイル: `docs/02_research/2025_11/20251109_03_internationalization-options.md`
  - 見積: 6時間

- [ ] タスク0-3: 翻訳キー命名規則・命名空間の定義
  - ファイル: `lib/i18n/messages.spec.md`
  - 見積: 6時間

**成果物**:

- [ ] 仕様書: `lib/i18n/messages.spec.md`
- [ ] ドキュメント: `docs/02_research/2025_11/20251109_03_internationalization-options.md`

**テスト計画**:

- TC-001: 既存 UI 全体のテキスト抽出リスト化が完了していること  
- TC-002: 命名規則が `spec.md` に記述されていること

---

### Phase 1: 国際化基盤導入 (2025-11-18 ~ 2025-12-02)

**目標**: `next-intl` を導入し、ロケール切り替えの骨格を実装する

**実装内容**:

- [ ] タスク1-1: `next-intl` / `@formatjs/icu-messageformat-parser` 導入
  - ファイル: `package.json`
  - 見積: 4時間

- [ ] タスク1-2: App Router の `[locale]` セグメント化
  - ファイル: `app/layout.tsx`, `app/[locale]/layout.tsx`
  - 見積: 16時間

- [ ] タスク1-3: 翻訳辞書ローダーと型定義の実装
  - ファイル: `lib/i18n/messages.ts`, `types/i18n.d.ts`
  - 見積: 12時間

- [ ] タスク1-4: middleware でのロケール自動リダイレクト
  - ファイル: `middleware.ts`
  - 見積: 6時間

- [ ] タスク1-5: 設定 UI にロケール切り替えを追加
  - ファイル: `app/(protected)/settings/preferences/page.tsx`
  - 見積: 10時間

**成果物**:

- [ ] 実装ファイル: `lib/i18n/messages.ts`
- [ ] 実装ファイル: `components/providers/intl-provider.tsx`
- [ ] 仕様書: `components/providers/intl-provider.spec.md`
- [ ] テスト: `components/providers/intl-provider.test.tsx`

**テスト計画**:

- TC-010: 初期アクセス時にブラウザ言語からロケールが決定される  
- TC-011: 設定 UI で言語を切り替えると再レンダリングなく反映される  
- TC-012: 未翻訳キーはフォールバックロケールへ退避する

---

### Phase 2: 主要機能の翻訳適用 (2025-12-03 ~ 2025-12-24)

**目標**: ノート・デッキ・検索等の主要画面の文言を辞書化する

**実装内容**:

- [ ] タスク2-1: Notes セクションの翻訳対応
  - ファイル: `app/(protected)/notes/**/*`, `components/notes/**/*`
  - 見積: 24時間

- [ ] タスク2-2: Decks / Learn / Goals の翻訳対応
  - ファイル: `app/(protected)/decks/**/*`, `app/(protected)/learn/**/*`, `app/(protected)/goals/**/*`
  - 見積: 24時間

- [ ] タスク2-3: 公開ページ（Landing / Auth）翻訳対応
  - ファイル: `app/(public)/**/*`
  - 見積: 16時間

- [ ] タスク2-4: バリデーション・通知メッセージの共通化
  - ファイル: `lib/utils/validation.ts`, `lib/hooks/**/*`
  - 見積: 16時間

**成果物**:

- [ ] 実装ファイル: `src/i18n/dictionaries/ja.ts`, `src/i18n/dictionaries/en.ts`
- [ ] テスト: `app/(protected)/notes/__tests__/notes-i18n.test.tsx`
- [ ] ドキュメント: 各 `.spec.md` 要件更新

**テスト計画**:

- TC-020: Notes 画面が en/ja 双方で期待する文言になる  
- TC-021: フォームバリデーションメッセージがロケールに追従する  
- TC-022: Supabase エラーハンドリング文言が切り替わる

---

### Phase 3: プラグイン・ワーカー・Tauri 対応 (2025-12-25 ~ 2026-01-15)

**目標**: sandbox worker、Tauri コマンド、プラグイン API で国際化を統合する

**実装内容**:

- [ ] タスク3-1: プラグイン API へのロケールコンテキスト注入
  - ファイル: `lib/plugins/plugin-api.ts`, `lib/plugins/types.ts`
  - 見積: 18時間

- [ ] タスク3-2: sandbox worker 用翻訳ブリッジ実装
  - ファイル: `lib/plugins/sandbox-worker.ts`, `lib/plugins/plugin-loader/sandbox-worker.ts`
  - 見積: 20時間

- [ ] タスク3-3: Tauri コマンドでの翻訳利用
  - ファイル: `src-tauri/src/main.rs`, `src-tauri/src/i18n.rs`
  - 見積: 24時間

- [ ] タスク3-4: 通知・ダイアログの多言語化
  - ファイル: `lib/utils/notifications.ts`, `src-tauri/src/dialog.rs`
  - 見積: 12時間

**成果物**:

- [ ] 実装ファイル: `lib/plugins/i18n/worker-intl.ts`
- [ ] 仕様書: `lib/plugins/i18n/worker-intl.spec.md`
- [ ] テスト: `lib/plugins/__tests__/intl-bridge.test.ts`
- [ ] ドキュメント: Tauri 設定補足 `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md` 更新

**テスト計画**:

- TC-030: プラグイン UI がロケール情報を受け取り翻訳を切り替える  
- TC-031: sandbox worker 経由のメッセージがロケールに応じた文言で返る  
- TC-032: Tauri ネイティブダイアログの表示文言が言語設定に従う

---

### Phase 4: 品質保証とローンチ準備 (2026-01-16 ~ 2026-01-31)

**目標**: 総合テスト・翻訳ワークフロー構築・ローカライズプロセス確立

**実装内容**:

- [ ] タスク4-1: 自動テスト整備（Vitest + Playwright）
  - ファイル: `vitest.config.mts`, `tests/e2e/i18n.spec.ts`
  - 見積: 20時間

- [ ] タスク4-2: 翻訳ファイル CI パイプライン構築
  - ファイル: `.github/workflows/i18n.yml`
  - 見積: 12時間

- [ ] タスク4-3: ローカライゼーションガイド作成
  - ファイル: `docs/guides/localization.md`
  - 見積: 12時間

- [ ] タスク4-4: 初期ロケール（日本語・英語）翻訳完了
  - ファイル: `src/i18n/dictionaries/en.ts`
  - 見積: 24時間

**成果物**:

- [ ] テスト: `tests/e2e/i18n.spec.ts`
- [ ] ドキュメント: `docs/guides/localization.md`
- [ ] 翻訳辞書: `src/i18n/dictionaries/en.ts` 完全版

**テスト計画**:

- TC-040: メインユーザーフローを en/ja で順に実行し差異がない  
- TC-041: CI が翻訳ファイルの欠損を検知する  
- TC-042: Tauri バンドルでも en/ja 切り替えが同じ挙動をする

---

## 技術選定

### 使用技術・ライブラリ

| 技術/ライブラリ           | 用途                           | 選定理由                                                                 |
| ------------------------ | ------------------------------ | ------------------------------------------------------------------------ |
| `next-intl`              | App Router 用 i18n             | SSR/ISR/Tauri のいずれにも適応でき、型安全なメッセージ管理が可能          |
| `@formatjs/icu-messageformat-parser` | ICU メッセージ解析 | 複雑な plural/select 表現を共通文法で扱える                              |
| `lingui extract`         | 文言抽出 CLI                   | 自動抽出パイプラインを構築しやすい（辞書生成を補助）                      |
| `next-intl/plugin`       | route ハンドリング             | Next.js 16 の build time 最適化と相性が良い                               |
| Tauri `AppHandle.emit`   | ネイティブ側イベント翻訳       | Rust 側とのロケール共有を容易にする                                      |

### 技術的検証事項

- [ ] 検証1: `next-intl` の静的エクスポート互換性  
  - 結果: SSR + SSG 両対応を確認、`next.config.ts` に `experimental.intl` 設定が必要

- [ ] 検証2: sandbox worker への翻訳データ供給  
  - 結果: メモリ制約を回避するため JSON をチャンク化し、必要キーのみ lazy load する

- [ ] 検証3: Tauri バンドル時の辞書読み込み  
  - 結果: `tauri.conf.json > bundle.resources` に辞書ディレクトリを登録すれば問題なし

---

## 依存関係

### 外部依存

- [ ] 翻訳ディレクション策定（プロダクトマネージャー）  
  - ステータス: 進行中
- [ ] 翻訳リソース（外部ローカライズチーム or LLM 生成）  
  - ステータス: 未着手

### 内部依存

- [ ] `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md` の Phase 2 完了  
- [ ] Supabase 認証 Deep Link 実装（Phase 2 of Tauri plan）  
- [ ] プラグイン sandbox リファクタ（`docs/05_logs/2025_11/20251108_02_plugin-worker-function-proxy.md` 継続タスク）

---

## リスクと対策

### 技術的リスク

| リスク                              | 影響度 | 発生確率 | 対策                                                   | 担当 |
| ----------------------------------- | ------ | -------- | ------------------------------------------------------ | ---- |
| 翻訳キーの命名揺れによる重複        | High   | Medium   | 命名規則を lint で検査、PR テンプレートにチェック項目を追加 | Intl TF |
| Tauri + `next-intl` でのメモリ増大  | Medium | Medium   | ロケール辞書を分割ロードし、`IntlProvider` でキャッシュ    | Core |
| sandbox worker でのロケール同期失敗 | Medium | Low      | fallback ロケールを常に同梱、エラー時は英語で表示          | Plugins |

### スケジュールリスク

| リスク                           | 影響   | 対策                                      |
| -------------------------------- | ------ | ----------------------------------------- |
| 翻訳リソースが揃わない          | 高     | 一時的に英語のみでローンチ、後追い翻訳   |
| Tauri リリースとスケジュール衝突 | 中     | Phase 3 以降を Tauri タスクと並列調整    |

---

## テスト戦略

### ユニットテスト

**目標カバレッジ**: ≥ 85%

**テスト対象**:

- [ ] `lib/i18n/messages` の辞書ロード（TC-050 ~ TC-052）
- [ ] `components/settings/locale-switcher`（TC-053 ~ TC-055）
- [ ] `lib/plugins/i18n/worker-intl`（TC-056 ~ TC-058）

### 統合テスト

**テストシナリオ**:

1. シナリオ1: ログイン → ノート作成 → 共有 → ログアウト (ja/en)
   - ステップ: 言語切り替え → 操作 → 表示確認
   - 期待結果: 全ての通知・ボタン文言が設定ロケールに一致

2. シナリオ2: プラグイン呼び出し → sandbox worker 経由で翻訳レスポンス
   - ステップ: worker 起動 → メッセージ送信 → レスポンス検証
   - 期待結果: 翻訳キーが欠損せず fallback が動作

### E2Eテスト

**テストフロー**:

1. フロー1: 初回起動で OS 言語が英語の場合、英語 UI で表示される  
2. フロー2: 設定から日本語へ切り替え → 再起動 → 言語設定が維持される

---

## パフォーマンス目標

### 目標値

| 指標             | 目標値          | 測定方法                          |
| ---------------- | --------------- | --------------------------------- |
| Locale Switch    | ≤ 150ms         | Performance API (client side)     |
| Dictionaries LCP | < 200KB/locale  | Bundle Analyzer                   |
| Worker Init Time | ≤ 300ms         | sandbox profiling                 |

### 最適化手法

- [ ] メッセージ辞書のコード分割  
- [ ] `IntlProvider` の memo 化  
- [ ] Web Worker との通信バッチ化  
- [ ] 翻訳キーの compile-time 検証

---

## アクセシビリティ対応

### WCAG 2.1 準拠レベル

- [ ] レベルA: 必須  
- [ ] レベルAA: 推奨  
- [ ] レベルAAA: 任意（将来的検討）

### チェック項目

- [ ] スクリーンリーダーでロケール変更が通知される  
- [ ] 各言語で適切な `lang` 属性が付与される  
- [ ] ダイアログ・通知に ARIA ラベルが翻訳される  
- [ ] フォーカスインジケーターがロケールに依存しない  
- [ ] キーボード操作で言語切り替えが完結する

---

## マイルストーン

### M1: Phase 1 完了 (2025-12-02)

- [ ] `next-intl` 基盤導入  
- [ ] ロケール切り替え UI 実装  
- [ ] 主要レイアウトがロケール感知

### M2: Phase 2 完了 (2025-12-24)

- [ ] 主要画面の翻訳適用  
- [ ] バリデーション・通知メッセージ統一  
- [ ] ユニット/統合テスト完了

### M3: Phase 3 完了 (2026-01-15)

- [ ] プラグイン / Tauri / Worker 調整完了  
- [ ] ネイティブ通知・ダイアログ翻訳  
- [ ] パフォーマンス最適化

### M4: Phase 4 完了 (2026-01-31)

- [ ] CI / ローカライズフロー確立  
- [ ] E2E テスト合格  
- [ ] ドキュメントとトレーニング完了

---

## 成果物一覧

### コード

- [ ] `app/[locale]/layout.tsx`  
- [ ] `components/providers/intl-provider.tsx`  
- [ ] `lib/i18n/messages.ts`  
- [ ] `lib/plugins/i18n/worker-intl.ts`

### ドキュメント

- [ ] `lib/i18n/messages.spec.md`  
- [ ] `docs/guides/localization.md`  
- [ ] `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md` 更新差分  
- [ ] 作業ログ: `docs/05_logs/2025_11/` 以降に日次記録

### テスト

- [ ] `components/providers/intl-provider.test.tsx`  
- [ ] `lib/plugins/__tests__/intl-bridge.test.ts`  
- [ ] `tests/e2e/i18n.spec.ts`

---

## レビュープロセス

### コードレビュー

- **レビュアー**: Core チーム + Intl TF  
- **レビュー観点**:
  - [ ] 翻訳キー命名規則の遵守  
  - [ ] 型安全性（`any` 禁止）  
  - [ ] パフォーマンスへの影響  
  - [ ] Tauri / ブラウザ両対応

### 設計レビュー

- **レビュアー**: アーキテクト + プラグインチーム  
- **レビュー観点**:
  - [ ] プラグイン API への影響  
  - [ ] sandbox worker 連携  
  - [ ] ドキュメント整合性

---

## 完了条件

- [ ] 全フェーズ完了および成果物納品  
- [ ] ユニット/統合/E2E テストが PASS  
- [ ] 翻訳辞書差分を CI が検証  
- [ ] ESLint / TypeScript エラーなし  
- [ ] パフォーマンス目標達成  
- [ ] Tauri / ブラウザ双方でロケール切り替え確認  
- [ ] 仕様書・ガイドが最新化  
- [ ] 作業ログが記録済み

---

## 参考資料

- `docs/02_research/2025_11/20251109_02_supabase-tauri-integration.md`  
- `docs/02_research/2025_11/20251109_01_server-actions-migration-strategy.md`  
- `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md`  
- `https://next-intl-docs.vercel.app/docs/next-13/app-router`  
- `https://tauri.app/v2/guides/building/app/internationalization/`

---

## 変更履歴

| 日付       | 変更内容     | 変更者   |
| ---------- | ------------ | -------- |
| 2025-11-09 | 初版作成     | 開発チーム |

---

**作成日**: 2025-11-09  
**最終更新**: 2025-11-09  
**承認者**: （レビュー待ち）


