# リンク機能実装調査レポート

調査日: 2025 年 10 月 10 日
対象: メモ機能のリンク実装

## 概要

学習アプリのメモ機能では、以下の 2 つの主要なリンク実装が存在します：

1. **PageLinkMark** - 従来の `[Title]` 形式のブラケットリンク実装
2. **UnifiedLinkMark** - 統合リンクマーク実装（開発中）

現在、UnifiedLinkMark への移行が進行中であり、段階的に旧実装から置き換えられています。

---

## 1. リンク実装の全体像

### 1.1 実装方式の変遷

```
Phase 1: Decoration ベース実装 (旧)
  ↓
Phase 2: Mark ベース実装への移行 (PageLinkMark)
  ↓
Phase 3: 統合リンクマーク実装 (UnifiedLinkMark) ← 現在
```

### 1.2 現在の状態

- **デフォルト**: UnifiedLinkMark が有効（`useLegacyLinkDecorations=false`）
- **Legacy**: PageLink（Decoration ベース）は段階的に削除中
- **ブランチ**: `fix/preserve-bold-in-links`

---

## 2. UnifiedLinkMark 実装詳細

### 2.1 基本概念

**ファイル**: `lib/tiptap-extensions/unified-link-mark.ts`

UnifiedLinkMark は、`[Title]` 形式と `#タグ` 形式の両方を単一の Mark で処理する統合実装です。

#### 主要な特徴

1. **単一 Mark 実装**: 複数の記法を`unilink` Mark として統一
2. **非同期解決**: リンク先の存在確認を非同期で実行
3. **状態管理**: `pending` → `exists` or `missing` のステートマシン
4. **キャッシュ機能**: 30 秒 TTL のメモリキャッシュで検索を最適化
5. **リトライ機能**: ネットワーク失敗時の指数バックオフ

### 2.2 属性定義

```typescript
export interface UnifiedLinkAttributes {
  variant: "bracket" | "tag"; // リンクの種類
  raw: string; // ユーザ入力の生テキスト
  text: string; // 表示用テキスト
  key: string; // 正規化されたキー
  pageId?: string | null; // リンク先ページID
  href: string; // リンク先URL
  state: "pending" | "exists" | "missing" | "error"; // 解決状態
  exists: boolean; // 存在フラグ
  created?: boolean; // セッション中に作成されたか
  meta?: object; // メタ情報（将来の拡張用）
  markId: string; // 一意識別子
}
```

### 2.3 入力検出（InputRule）

#### ブラケットリンク: `[Title]`

```typescript
// 検出パターン
/\[([^\[\]]+)\]$/

// 処理フロー
1. [text] を検出
2. text を抽出
3. 外部リンク判定 (http/https)
4. Mark生成（state: "pending"）
5. 非同期で存在確認
```

#### タグリンク: `#タグ` (計画中)

```typescript
// 検出パターン
/\B#([\p{Letter}\p{Number}\p{Mark}\p{Connector_Punctuation}\p{Ideographic}]{1,50})/u;

// 終端条件: 空白/句読点/記号で終了
```

### 2.4 正規化ルール

**ファイル**: `lib/unilink/utils.ts`

```typescript
function normalizeTitleToKey(raw: string): string {
  return raw
    .trim() // 1. 前後空白除去
    .replace(/\s+/g, " ") // 2. 連続空白→単一スペース
    .replace(/　/g, " ") // 3. 全角スペース→半角
    .replace(/_/g, " ") // 4. アンダースコア→スペース
    .normalize("NFC"); // 5. Unicode正規化
}
```

### 2.5 非同期解決プロセス

```typescript
// 解決フロー
1. Mark生成時: state="pending", pageId=null
2. キューに追加 (resolverQueue)
3. バッチ処理 (10件ずつ)
4. キャッシュチェック (30秒TTL)
5. searchPages(key) 実行
6. 結果により状態更新:
   - 存在: state="exists", pageId設定, href="/pages/{id}"
   - 不在: state="missing", href="#"
   - エラー: state="error"
```

#### リトライ戦略

```typescript
// 最大2回リトライ
// 指数バックオフ: 100ms, 200ms, 400ms
async function searchPagesWithRetry(key: string, maxRetries = 2);
```

### 2.6 クリック動作

**ファイル**: `lib/unilink/resolver.ts`

```typescript
// state別の動作
- exists: 通常のページ遷移
- missing: ページ作成ダイアログ表示
- pending: 解決中メッセージ表示
```

### 2.7 スタイリング

```typescript
// CSSクラス
class="unilink underline cursor-pointer"

// data属性
data-variant="bracket" | "tag"
data-state="pending" | "exists" | "missing" | "error"
data-exists="true" | "false"
data-page-id="{pageId}"
data-mark-id="{markId}"
```

---

## 3. PageLinkMark 実装（旧実装）

### 3.1 基本情報

**ファイル**: `lib/tiptap-extensions/page-link-mark.ts`

ブラケットリンク専用の Mark 実装。UnifiedLinkMark への移行中。

### 3.2 主要な違い

| 項目       | PageLinkMark   | UnifiedLinkMark        |
| ---------- | -------------- | ---------------------- |
| 対応記法   | `[Title]` のみ | `[Title]` + `#タグ`    |
| Mark 名    | `pageLinkMark` | `unilink`              |
| キャッシュ | なし           | 30 秒 TTL              |
| リトライ   | なし           | あり（指数バックオフ） |
| バッチ処理 | なし           | あり（10 件ずつ）      |
| 状態管理   | 簡易的         | 詳細（error 含む）     |

### 3.3 コマンド

```typescript
- setPageLink: リンク設定
- togglePageLink: リンクトグル
- unsetPageLink: リンク削除
- createPageFromLink: ページ作成
- updatePageLink: リンク更新
- refreshPageLinkMarks: 再解決
```

---

## 4. PageLink Extension（Decoration ベース・Legacy）

### 4.1 基本情報

**ファイル**: `lib/tiptap-extensions/page-link.ts`

Decoration（装飾）ベースの旧実装。現在は段階的に削除中。

### 4.2 構成要素

```typescript
1. bracketPlugin: ブラケット検出
2. suggestionPlugin: サジェスト機能
3. pageLinkPreviewMarkPlugin: プレビュー表示（Mark版に移行済み）
4. existencePlugin: 存在チェック（削除済み）
5. previewPlugin: プレビュー（削除済み）
```

### 4.3 削除計画

**ファイル**: `docs/page-link-legacy-removal-plan.md`

#### Phase A: 機能同等性確保 ✅ 完了

- Mark 変換/解決/missing 表示
- 状態スタイル実装
- Hover preview 実装
- メトリクス実装

#### Phase B: Legacy 依存縮小

- ✅ existencePlugin 削除完了
- ✅ previewPlugin 削除完了
- ⏳ bracketPlugin 削除予定

#### Phase C: 安全サンプリング

- 本番環境での観測
- エラー/メトリクス収集

#### Phase D: コード除去

- Decoration 生成ループ削除
- 未使用 plugin 削除
- ドキュメント更新

---

## 5. サポート機能

### 5.1 プレビュー機能

**ファイル**: `lib/tiptap-extensions/page-link-preview-mark-plugin.ts`

- Mark ベースでホバー時にページプレビューを表示
- Tippy.js + React で実装
- PageLinkPreviewCard コンポーネントを使用

### 5.2 メトリクス

#### 基本メトリクス

**ファイル**: `lib/metrics/pageLinkMetrics.ts`

```typescript
- markPending: 解決開始
- markResolved: 解決完了
- markMissing: 未存在確定
```

#### UnifiedLink 専用メトリクス

**ファイル**: `lib/unilink/metrics.ts`

```typescript
- markUnifiedPending: 解決開始
- markUnifiedResolved: 解決完了
- markUnifiedMissing: 未存在確定
- markUnifiedError: エラー発生
- markUnifiedCacheHit: キャッシュヒット
```

### 5.3 Realtime 同期（P3 追加）

**ファイル**: `lib/unilink/`

- `broadcast-channel.ts`: クロスタブ通信
- `realtime-listener.ts`: Supabase Realtime 連携
- `auto-reconciler.ts`: 自動調整機能
- `mark-index.ts`: Mark 効率的検索

---

## 6. アーキテクチャ図

```
┌─────────────────────────────────────────┐
│         TipTap Editor                   │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   UnifiedLinkMark (unilink)      │  │
│  ├──────────────────────────────────┤  │
│  │ - InputRule: [text], #tag        │  │
│  │ - State: pending→exists/missing  │  │
│  │ - Commands: insert, refresh      │  │
│  └──────────────────────────────────┘  │
│           ↓                             │
│  ┌──────────────────────────────────┐  │
│  │   Resolver Queue                 │  │
│  │   (非同期バッチ処理)              │  │
│  └──────────────────────────────────┘  │
│           ↓                             │
│  ┌──────────────────────────────────┐  │
│  │   Cache (30s TTL)                │  │
│  └──────────────────────────────────┘  │
│           ↓                             │
│  ┌──────────────────────────────────┐  │
│  │   searchPages API                │  │
│  │   (Supabase検索)                 │  │
│  └──────────────────────────────────┘  │
│           ↓                             │
│  ┌──────────────────────────────────┐  │
│  │   Mark State Update              │  │
│  │   (exists/missing/error)         │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

---

## 7. データフロー

### 7.1 リンク作成フロー

```
1. ユーザー入力: [Page Title]
   ↓
2. InputRule検出
   ↓
3. Mark生成 (state: "pending")
   markId: "unilink-{timestamp}-{random}"
   key: normalizeTitleToKey("Page Title")
   ↓
4. Resolver Queueに追加
   ↓
5. キャッシュチェック
   Hit → state: "exists"
   Miss → 次へ
   ↓
6. searchPages(key)
   ↓
7. 結果判定
   - 完全一致あり → state: "exists", pageId設定
   - 一致なし → state: "missing"
   - エラー → state: "error"
   ↓
8. Mark更新
   ↓
9. メトリクス記録
```

### 7.2 ページ作成フロー

```
1. ユーザーがmissingリンクをクリック
   ↓
2. handleMissingLinkClick()
   ↓
3. createPageFromMark()
   ↓
4. createPage() Server Action
   ↓
5. ページ作成成功
   ↓
6. Mark更新 (state: "exists", pageId設定)
   ↓
7. BroadcastChannel通知（他タブに伝播）
   ↓
8. キャッシュ更新
```

---

## 8. 設定とオプション

### 8.1 TipTap エディタでの設定

**ファイル**: `components/tiptap-editor.tsx`

```typescript
extensions: [
  UnifiedLinkMark, // UnifiedLinkMarkを追加
  PageLinkMark, // 互換性のため残存（将来削除予定）
  PageLink.configure({
    noteSlug, // ノートSlug
  }),
  // ... その他の拡張
];
```

### 8.2 環境設定

- `useLegacyLinkDecorations`: false（デフォルト）
- キャッシュ TTL: 30 秒
- バッチサイズ: 10 件
- リトライ回数: 最大 2 回

---

## 9. 関連ファイル一覧

### 9.1 実装ファイル

```
lib/tiptap-extensions/
├── unified-link-mark.ts          # UnifiedLinkMark実装
├── page-link-mark.ts             # PageLinkMark実装（旧）
├── page-link.ts                  # PageLink Extension（Legacy）
└── page-link-preview-mark-plugin.ts  # プレビュー機能

lib/unilink/
├── index.ts                      # エクスポート集約
├── utils.ts                      # 正規化・キャッシュ
├── resolver.ts                   # ページ作成・解決
├── metrics.ts                    # メトリクス
├── broadcast-channel.ts          # クロスタブ通信
├── realtime-listener.ts          # Realtime連携
├── auto-reconciler.ts            # 自動調整
├── mark-index.ts                 # Mark検索
└── reconcile-queue.ts            # 調整キュー

lib/utils/
├── searchPages.ts                # ページ検索API
└── transformPageLinks.ts         # リンク変換
```

### 9.2 ドキュメント

```
docs/
├── unified-link-mark-spec.md           # 仕様書
├── page-link-legacy-removal-plan.md    # Legacy削除計画
├── page-link-decoration-removal-analysis.md
├── page-link-mark-migration-summary.md
├── unified-link-mark-implementation-plan.md
├── unified-link-mark-p2-implementation-plan.md
├── unified-link-mark-p2-work-log.md
├── unified-link-mark-p3-summary.md
└── unified-link-mark-p3-work-log.md
```

---

## 10. 今後の計画

### 10.1 短期的な計画

1. **Phase B の完了**

   - bracketPlugin の削除
   - 完全な Mark 実装への移行

2. **タグリンク実装**

   - `#タグ` 形式のサポート追加
   - InputRule の実装

3. **パフォーマンス最適化**
   - バッチ処理の改善
   - キャッシュ戦略の見直し

### 10.2 中長期的な計画

1. **Legacy 完全削除**

   - Phase C/D の実施
   - Decoration ベース実装の完全撤去

2. **機能拡張**

   - Alias/リダイレクトページサポート
   - 差分同期（collaboration 対応）
   - IndexedDB による永続キャッシュ

3. **その他の記法サポート**
   - `[[wiki]]` 形式
   - `@mention` 形式

---

## 11. 課題と制約

### 11.1 現在の課題

1. **Legacy 実装の残存**

   - PageLink と PageLinkMark が混在
   - コードの複雑性増加

2. **パフォーマンス**

   - 大量リンクの一括解決時の負荷
   - キャッシュのメモリ管理

3. **エラーハンドリング**
   - ネットワークエラー時の UX
   - リトライ戦略の改善余地

### 11.2 制約事項

1. **正規化ルール**

   - ケースセンシティブ（将来オプション化予定）
   - Unicode 正規化は NFC のみ

2. **キャッシュ**

   - メモリのみ（ページリロードで消失）
   - TTL 固定（30 秒）

3. **同期**
   - クロスタブは実装済みだが、サーバー同期は未対応

---

## 12. まとめ

### 主要な実装方式

現在の学習アプリのメモ機能におけるリンク実装は、**UnifiedLinkMark**を中心とした統合アプローチを採用しています。

### 特徴

1. **統合設計**: 複数の記法を単一 Mark で処理
2. **非同期解決**: パフォーマンスを考慮したバッチ処理
3. **状態管理**: 明確なステートマシン
4. **段階的移行**: 既存実装との共存を保ちつつ移行

### 推奨される開発方針

1. 新規機能は **UnifiedLinkMark** を使用
2. PageLinkMark は互換性のため残すが新規使用は避ける
3. Legacy 実装（Decoration ベース）は削除予定のため使用禁止
4. メトリクスとエラーハンドリングを適切に実装

---

## 参考資料

- 仕様書: `docs/unified-link-mark-spec.md`
- 削除計画: `docs/page-link-legacy-removal-plan.md`
- 実装: `lib/tiptap-extensions/unified-link-mark.ts`
- ユーティリティ: `lib/unilink/`
